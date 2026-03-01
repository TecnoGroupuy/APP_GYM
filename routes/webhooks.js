const express = require("express");
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

const resolvePaymentPayload = async (req) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const directStatus = String(body.status || "").toLowerCase();
  const directExternalReference = String(body.external_reference || body.externalReference || "").trim();
  const hasDirectPayment = Boolean(directStatus || directExternalReference);

  if (hasDirectPayment) {
    return body;
  }

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
