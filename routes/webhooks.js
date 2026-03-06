const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Payment = require("../models/Payment");
const SiteConfig = require("../models/SiteConfig");

const router = express.Router();

const sanitizeDocument = (value) => String(value || "").replace(/[^\dA-Za-z]/g, "").trim();

const addDays = (dateValue, days) => {
  const base = new Date(dateValue);
  if (Number.isNaN(base.getTime())) return null;
  const updated = new Date(base);
  updated.setDate(updated.getDate() + Number(days || 0));
  return updated;
};

const resolvePlanPassCount = async (userPlanId) => {
  const config = await SiteConfig.findOne({ key: "main" }).lean();
  const configuredPlans = Array.isArray(config?.plans) ? config.plans : [];
  const plan = configuredPlans.find((p) => String(p.id) === String(userPlanId));
  const explicit = Number(plan?.passCount);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;

  if (userPlanId === "8pases") return 8;
  if (userPlanId === "12pases") return 12;
  if (userPlanId === "libre") return null;
  return 0;
};

const fetchMercadoPagoPayment = async (paymentId) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || "";
  if (!accessToken || !paymentId) return null;

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) return null;
  return response.json();
};

const parseSignatureHeader = (signatureHeader) => {
  const parts = String(signatureHeader || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const parsed = {};
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (!key || !value) continue;
    parsed[key.trim()] = value.trim();
  }
  return parsed;
};

const safeCompareHex = (expectedHex, incomingHex) => {
  try {
    const expected = Buffer.from(String(expectedHex || ""), "hex");
    const incoming = Buffer.from(String(incomingHex || ""), "hex");
    if (!expected.length || expected.length !== incoming.length) return false;
    return crypto.timingSafeEqual(expected, incoming);
  } catch (_error) {
    return false;
  }
};

const isMercadoPagoSignatureValid = (req, secret, paymentId) => {
  const signatureHeader = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  if (!signatureHeader || !requestId || !paymentId) return false;

  const parsed = parseSignatureHeader(signatureHeader);
  const ts = parsed.ts;
  const v1 = parsed.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return safeCompareHex(expected, v1);
};

const resolvePaymentPayload = async (req) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const paymentId =
    body?.data?.id ||
    body?.id ||
    req.query?.["data.id"] ||
    req.query?.id ||
    null;

  if (!paymentId) return null;
  return fetchMercadoPagoPayment(paymentId);
};

const findStudentByExternalReference = async (externalReference) => {
  const raw = String(externalReference || "").trim();
  if (!raw) return null;

  if (mongoose.Types.ObjectId.isValid(raw)) {
    const byId = await User.findById(raw);
    if (byId) return byId;
  }

  const normalized = sanitizeDocument(raw);
  if (!normalized) return null;
  return User.findOne({ documentNumber: normalized });
};

router.post("/mercadopago", async (req, res) => {
  try {
    const paymentId =
      req.body?.data?.id ||
      req.body?.id ||
      req.query?.["data.id"] ||
      req.query?.id ||
      null;

    const webhookSecret = String(process.env.MERCADOPAGO_WEBHOOK_SECRET || "").trim();
    const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";

    if (webhookSecret) {
      if (!isMercadoPagoSignatureValid(req, webhookSecret, paymentId)) {
        return res.status(401).json({ ok: false, processed: false, reason: "invalid_signature" });
      }
    } else if (isProduction) {
      return res.status(503).json({ ok: false, processed: false, reason: "webhook_secret_missing" });
    }

    const paymentPayload = await resolvePaymentPayload(req);
    if (!paymentPayload) {
      return res.status(200).json({ ok: true, processed: false, reason: "payment_not_found" });
    }

    const status = String(paymentPayload.status || "").toLowerCase();
    if (status !== "approved") {
      return res.status(200).json({ ok: true, processed: false, reason: "status_not_approved" });
    }

    const externalReference = String(paymentPayload.external_reference || paymentPayload.externalReference || "").trim();
    const student = await findStudentByExternalReference(externalReference);
    if (!student) {
      return res.status(200).json({ ok: true, processed: false, reason: "student_not_found" });
    }

    const externalPaymentId = String(paymentPayload.id || paymentPayload.payment_id || "").trim();
    if (externalPaymentId) {
      const existingPayment = await Payment.findOne({ externalId: externalPaymentId });
      if (existingPayment) {
        return res.status(200).json({ ok: true, processed: true, duplicate: true });
      }
    }

    const paidAt = paymentPayload.date_approved || paymentPayload.date_created || new Date();
    const paidAtDate = new Date(paidAt);
    const safePaidAt = Number.isNaN(paidAtDate.getTime()) ? new Date() : paidAtDate;
    const expirationDate = addDays(safePaidAt, 30);
    const passCount = await resolvePlanPassCount(student.plan);

    await Payment.create({
      user: student._id,
      amount: Number(paymentPayload.transaction_amount || paymentPayload.amount || 0),
      currency: String(paymentPayload.currency_id || "UYU").toUpperCase(),
      method: "mercado_pago",
      status: "paid",
      registeredBy: "automatic",
      externalId: externalPaymentId || null,
      reference: String(paymentPayload.order?.id || externalReference || "").trim(),
      notes: "Pago registrado automaticamente por webhook de Mercado Pago",
      paidAt: safePaidAt
    });

    student.status = "active";
    student.isActive = true;
    student.planExpires = expirationDate;
    student.expirationDate = expirationDate;
    student.nextPaymentDate = expirationDate;
    if (passCount !== null) {
      student.classesLeft = Number(passCount);
      student.passesRemaining = Number(passCount);
    } else {
      student.passesRemaining = null;
    }
    await student.save();

    return res.status(200).json({ ok: true, processed: true });
  } catch (error) {
    console.error("mercadopago webhook error:", error.message);
    return res.status(200).json({ ok: true, processed: false });
  }
});

module.exports = router;
