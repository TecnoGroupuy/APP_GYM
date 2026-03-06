const express = require("express");
const User = require("../models/User");
const Payment = require("../models/Payment");
const SiteConfig = require("../models/SiteConfig");
const emailService = require("../services/emailService");
const auth = require("../middleware/auth");
const { generateTemporaryPassword } = require("../utils/security");

const router = express.Router();

const isAdminOrTrainer = (req, res, next) => {
  const roles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
  if (!roles.includes("admin") && !roles.includes("trainer")) {
    return res.status(403).json({ message: "Acceso denegado." });
  }
  return next();
};

const sanitizeDocument = (value) => String(value || "").replace(/[^\dA-Za-z]/g, "").trim();

const parsePaymentMethod = (value) => {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "efectivo") return "efectivo";
  if (raw === "transferencia") return "transferencia";
  if (raw === "mercado pago" || raw === "mercadopago" || raw === "mercado_pago") return "mercado_pago";
  if (raw === "tarjeta" || raw === "otro") return "otro";
  return "otro";
};

const getPlanPassCount = async (planId) => {
  const config = await SiteConfig.findOne({ key: "main" }).lean();
  const configPlans = Array.isArray(config?.plans) ? config.plans : [];
  const matched = configPlans.find((p) => String(p.id) === String(planId));
  const explicitCount = Number(matched?.passCount);
  if (Number.isFinite(explicitCount) && explicitCount >= 0) return explicitCount;
  if (planId === "8pases") return 8;
  if (planId === "12pases") return 12;
  if (planId === "libre") return null;
  return 0;
};

const getPlanPassCountFromPlans = (planId, plans = []) => {
  const matched = plans.find((p) => String(p.id) === String(planId));
  const explicitCount = Number(matched?.passCount);
  if (Number.isFinite(explicitCount) && explicitCount >= 0) return explicitCount;
  if (planId === "8pases") return 8;
  if (planId === "12pases") return 12;
  if (planId === "libre") return null;
  return 0;
};

const toPlanDto = (planId, plansCatalog = []) => {
  const normalizedPlanId = String(planId || "none");
  const matched = plansCatalog.find((p) => String(p.id) === normalizedPlanId);
  if (!matched) {
    return {
      _id: normalizedPlanId,
      id: normalizedPlanId,
      name: normalizedPlanId,
      passCount: null,
      price: 0
    };
  }
  return {
    _id: matched._id || matched.id,
    id: matched.id,
    name: matched.name,
    passCount: matched.passCount === null || matched.passCount === undefined ? null : Number(matched.passCount),
    price: Number(matched.price || 0)
  };
};

const paymentSortDate = (payment) => {
  const value = payment?.paidAt || payment?.createdAt || null;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const normalizeComparable = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const toTitleCase = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

const normalizePhone = (value) => String(value || "").replace(/[^\d]/g, "").trim();

const normalizeStatus = (value) => {
  const normalized = normalizeComparable(value);
  if (normalized === "activo" || normalized === "active") return "active";
  if (normalized === "inactivo" || normalized === "inactive") return "inactive";
  if (normalized === "suspendido" || normalized === "suspended") return "suspended";
  if (normalized === "pendiente" || normalized === "pending") return "pending";
  return "pending";
};

const parseFlexibleDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + Math.floor(value));
    return Number.isNaN(excelEpoch.getTime()) ? null : excelEpoch;
  }

  const raw = String(value).trim();
  if (!raw) return null;
  if (normalizeComparable(raw) === "llamar") return null;

  const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (ddmmyyyy) {
    let first = Number(ddmmyyyy[1]);
    let second = Number(ddmmyyyy[2]);
    let year = Number(ddmmyyyy[3]);
    if (year < 100) year += 2000;
    let day = first;
    let month = second;
    if (first <= 12 && second > 12) {
      month = first;
      day = second;
    }
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addDays = (dateValue, days) => {
  const base = parseFlexibleDate(dateValue);
  if (!base) return null;
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const resolvePlan = (planRaw, plansCatalog = []) => {
  const raw = normalizeComparable(planRaw);
  if (!raw) return { planId: null, planDoc: null, unresolved: false };

  const byText = plansCatalog.find((plan) => normalizeComparable(plan.name) === raw);
  if (byText) return { planId: String(byText.id), planDoc: byText, unresolved: false };

  if (raw.includes("tres veces")) {
    const byThreeTimes =
      plansCatalog.find((plan) => normalizeComparable(plan.description).includes("3 veces")) ||
      plansCatalog.find((plan) => normalizeComparable(plan.name).includes("12")) ||
      plansCatalog.find((plan) => normalizeComparable(plan.id) === "12pases");
    if (byThreeTimes) return { planId: String(byThreeTimes.id), planDoc: byThreeTimes, unresolved: false };
  }

  if (raw.includes("libre")) {
    const byLibre =
      plansCatalog.find((plan) => normalizeComparable(plan.name).includes("libre")) ||
      plansCatalog.find((plan) => normalizeComparable(plan.id) === "libre");
    if (byLibre) return { planId: String(byLibre.id), planDoc: byLibre, unresolved: false };
  }

  const byPartial = plansCatalog.find((plan) => {
    const name = normalizeComparable(plan.name);
    const description = normalizeComparable(plan.description);
    const id = normalizeComparable(plan.id);
    return raw.includes(name) || name.includes(raw) || raw.includes(description) || raw === id;
  });

  if (byPartial) return { planId: String(byPartial.id), planDoc: byPartial, unresolved: false };
  return { planId: null, planDoc: null, unresolved: true };
};

const toStudentActionResponse = (student) => ({
  id: student._id,
  _id: student._id,
  name: student.name || "",
  lastName: student.lastName || "",
  email: student.email || null,
  phone: student.phone || "",
  cedula: student.cedula || student.documentNumber || null,
  roles: Array.isArray(student.roles) && student.roles.length > 0 ? student.roles : [student.role || "user"],
  status: student.status || "pending",
  appAccess: Boolean(student.appAccess),
  invitedAt: student.invitedAt || null,
  plan: student.plan || null,
  fechaAlta: student.fechaAlta || student.createdAt || null
});

router.post("/", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const lastName = String(body.lastName || "").trim();
    const normalizedPhone = normalizePhone(body.phone || "");
    const emailRaw = String(body.email || "").trim().toLowerCase();
    const email = emailRaw || null;
    const cedula = sanitizeDocument(body.cedula || body.documentNumber || "");
    const inviteToApp = Boolean(body.inviteToApp);
    const planIdRaw = String(body.planId || body.plan || "").trim();

    if (!name || !lastName || !normalizedPhone) {
      return res.status(400).json({
        error: "missing_fields",
        message: "Nombre, apellido y telefono son obligatorios"
      });
    }

    const existingByPhone = await User.findOne({ phone: normalizedPhone }).select("_id").lean();
    if (existingByPhone) {
      return res.status(400).json({
        error: "duplicate_phone",
        message: "Ya existe un alumno con ese telefono"
      });
    }

    let safePlan = "none";
    if (planIdRaw) {
      const allowedPlans = new Set(["8pases", "12pases", "libre", "none"]);
      if (allowedPlans.has(planIdRaw)) {
        safePlan = planIdRaw;
      } else {
        const config = await SiteConfig.findOne({ key: "main" }).lean();
        const plansCatalog = Array.isArray(config?.plans) ? config.plans : [];
        const matchedPlan =
          plansCatalog.find((p) => String(p.id || "") === planIdRaw) ||
          plansCatalog.find((p) => String(p._id || "") === planIdRaw);
        safePlan = String(matchedPlan?.id || "none");
      }
    }

    let passwordValue = generateTemporaryPassword(14);
    let appAccess = false;
    let invitedAt = null;
    let status = "pending";

    if (inviteToApp && cedula) {
      passwordValue = generateTemporaryPassword(14);
      appAccess = true;
      invitedAt = new Date();
      status = "active";
    }

    const user = await User.create({
      name,
      lastName,
      phone: normalizedPhone,
      email,
      documentNumber: cedula || undefined,
      birthDate: body.birthDate ? parseFlexibleDate(body.birthDate) : null,
      plan: safePlan,
      emergencyMedical: body.emergencyMedical ? String(body.emergencyMedical).trim() : null,
      medicalEmergency: body.emergencyMedical ? String(body.emergencyMedical).trim() : "",
      emergencyContactName: body.emergencyContactName ? String(body.emergencyContactName).trim() : null,
      emergencyContactPhone: body.emergencyContactPhone ? String(body.emergencyContactPhone).trim() : null,
      role: "user",
      roles: ["user"],
      status,
      fechaAlta: new Date(),
      forcePasswordChange: true,
      appAccess,
      invitedAt,
      password: passwordValue
    });

    const student = {
      id: user._id,
      _id: user._id,
      name: user.name,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email || null,
      cedula: user.documentNumber || null,
      birthDate: user.birthDate || null,
      plan: user.plan || null,
      planId: user.plan || null,
      emergencyMedical: user.emergencyMedical || null,
      emergencyContactName: user.emergencyContactName || null,
      emergencyContactPhone: user.emergencyContactPhone || null,
      roles: user.roles,
      status: user.status,
      fechaAlta: user.fechaAlta || user.createdAt || null,
      forcePasswordChange: Boolean(user.forcePasswordChange),
      appAccess: Boolean(user.appAccess),
      invitedAt: user.invitedAt || null
    };

    if (inviteToApp && !cedula) {
      return res.status(201).json({ success: true, student, warning: "missing_cedula" });
    }

    return res.status(201).json({ success: true, student });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.phone) {
      return res.status(400).json({
        error: "duplicate_phone",
        message: "Ya existe un alumno con ese telefono"
      });
    }
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(400).json({
        error: "duplicate_email",
        message: "Ya existe un alumno con ese email"
      });
    }
    return res.status(500).json({ error: error.message });
  }
});
router.post("/import", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.students) ? req.body.students : [];
    if (!rows.length) {
      return res.status(400).json({ error: "students es requerido y debe contener filas" });
    }

    const config = await SiteConfig.findOne({ key: "main" }).lean();
    const plansCatalog = Array.isArray(config?.plans) ? config.plans : [];

    const existingUsers = await User.find({}).select("email phone").lean();
    const emailSet = new Set(existingUsers.map((u) => String(u.email || "").trim().toLowerCase()).filter(Boolean));
    const phoneSet = new Set(existingUsers.map((u) => normalizePhone(u.phone)).filter(Boolean));

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let idx = 0; idx < rows.length; idx += 1) {
      const source = rows[idx] || {};
      const rowNumber = Number(source.rowNumber || idx + 2);

      try {
        const name = toTitleCase(source.name || source.nombre || "");
        const lastName = toTitleCase(source.lastName || source.apellido || "");
        const email = String(source.email || "").trim().toLowerCase();
        const documentNumber = sanitizeDocument(source.cedula || source.documentNumber || "");
        const phone = normalizePhone(source.phone || source.telefono || "");
        const status = normalizeStatus(source.status || source.estado);
        const birthDate = parseFlexibleDate(source.fechaNacimiento || source.birthDate);
        const paymentDate = parseFlexibleDate(source.fechaPago || source.paymentDate);
        const medicalEmergency = String(source.emergenciaMedica || source.medicalEmergency || "").trim();
        const promocion = String(source.promocion || source.Promocion || "").trim();
        const turno = String(source.turno || source.Turno || "").trim();
        const { planId, planDoc, unresolved } = resolvePlan(source.plan || source.Plan || "", plansCatalog);

        if (!name) {
          skipped += 1;
          errors.push({ row: rowNumber, reason: "Nombre requerido" });
          continue;
        }

        if (!email) {
          skipped += 1;
          errors.push({ row: rowNumber, reason: "Email requerido" });
          continue;
        }

        const normalizedPhone = normalizePhone(phone);
        if (emailSet.has(email) || (normalizedPhone && phoneSet.has(normalizedPhone))) {
          skipped += 1;
          errors.push({ row: rowNumber, reason: "Duplicado por email o telefono" });
          continue;
        }

        if (unresolved) {
          errors.push({ row: rowNumber, reason: `Plan no encontrado (${source.plan || "-"})` });
        }

        const selectedPlanId = planId || "none";
        const passCount = getPlanPassCountFromPlans(selectedPlanId, plansCatalog);
        const calculatedExpiration = paymentDate ? addDays(paymentDate, 30) : null;

        const user = await User.create({
          name,
          lastName,
          email,
          documentNumber: documentNumber || undefined,
          phone: normalizedPhone || undefined,
          role: "user",
          roles: ["user"],
          status,
          isActive: status === "active",
          plan: selectedPlanId,
          planPrice: planDoc ? Number(planDoc.price || 0) : null,
          passesRemaining: passCount === null ? null : Number(passCount || 0),
          classesLeft: passCount === null ? 0 : Number(passCount || 0),
          birthDate,
          medicalEmergency,
          promocion,
          turno,
          planExpires: calculatedExpiration,
          expirationDate: calculatedExpiration,
          nextPaymentDate: calculatedExpiration,
          password: generateTemporaryPassword(14),
          forcePasswordChange: true
        });

        if (paymentDate) {
          await Payment.create({
            user: user._id,
            amount: planDoc ? Number(planDoc.price || 0) : 0,
            currency: "UYU",
            method: "efectivo",
            status: "paid",
            registeredBy: "manual",
            notes: "Importacion alumnos",
            paidAt: paymentDate
          });
        }

        imported += 1;
        emailSet.add(email);
        if (normalizedPhone) phoneSet.add(normalizedPhone);
      } catch (rowError) {
        skipped += 1;
        errors.push({ row: rowNumber, reason: rowError.message });
      }
    }

    return res.json({
      total: rows.length,
      imported,
      skipped,
      errors
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/plans", auth, isAdminOrTrainer, async (_req, res) => {
  try {
    const config = await SiteConfig.findOne({ key: "main" }).lean();
    const plansRaw = Array.isArray(config?.plans) ? config.plans : [];
    const plans = plansRaw.map((plan) => ({
      id: String(plan.id || "").trim() || String(plan._id || "").trim(),
      _id: plan._id || plan.id,
      name: String(plan.name || "").trim(),
      passCount: plan.passCount === null || plan.passCount === undefined ? null : Number(plan.passCount),
      price: Number(plan.price || 0)
    }));
    return res.json({ plans });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/", auth, isAdminOrTrainer, async (_req, res) => {
  try {
    const Student = User;
    const studentsRaw = await Student.find({
      $or: [{ role: "user" }, { roles: "user" }],
      roles: { $nin: ["admin", "trainer"] }
    })
      .populate({ path: "plan", strictPopulate: false })
      .sort({ createdAt: -1 });

    const addDays = (dateValue, days) => {
      const base = dateValue ? new Date(dateValue) : null;
      if (!base || Number.isNaN(base.getTime())) return null;
      const next = new Date(base);
      next.setDate(next.getDate() + days);
      return next;
    };

    const students = await Promise.all(
      studentsRaw.map(async (studentDoc) => {
        const student = studentDoc.toObject ? studentDoc.toObject() : studentDoc;
        const lastPayment = await Payment.findOne({
          $or: [{ student: student._id }, { user: student._id }]
        }).sort({ createdAt: -1 });

        const hasAnyPayment = Boolean(lastPayment);
        const lastPaymentDate = lastPayment?.createdAt || null;
        const expirationDate =
          student.expirationDate || student.planExpires || (lastPayment ? addDays(lastPayment.createdAt, 30) : null);
        const nextPaymentDate = expirationDate;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysFromToday = new Date(today);
        sevenDaysFromToday.setDate(sevenDaysFromToday.getDate() + 7);
        const expirationDateObj = expirationDate ? new Date(expirationDate) : null;
        if (expirationDateObj) expirationDateObj.setHours(0, 0, 0, 0);

        let paymentStatus = "Al día";
        let paymentStatusColor = "green";
        if (!lastPaymentDate && !hasAnyPayment) {
          paymentStatus = "Sin pago";
          paymentStatusColor = "gray";
        } else if (expirationDateObj && expirationDateObj < today) {
          paymentStatus = "Vencido";
          paymentStatusColor = "red";
        } else if (expirationDateObj && expirationDateObj <= sevenDaysFromToday) {
          paymentStatus = "Por vencer";
          paymentStatusColor = "amber";
        } else if (String(student.status || "").toLowerCase() === "pending") {
          paymentStatus = "Pendiente";
          paymentStatusColor = "orange";
        } else if (lastPaymentDate && expirationDateObj && expirationDateObj > today) {
          paymentStatus = "Al día";
          paymentStatusColor = "green";
        }

        return {
          id: student._id,
          _id: student._id,
          name: student.name,
          lastName: student.lastName,
          fullName: `${student.name || ""} ${student.lastName || ""}`.trim(),
          email: student.email,
          cedula: student.cedula || student.documentNumber || null,
          documentNumber: student.cedula || student.documentNumber || null,
          phone: student.phone,
          birthDate: student.birthDate || null,
          emergencyMedical: student.emergencyMedical || student.medicalEmergency || null,
          emergencyContactName: student.emergencyContactName || null,
          emergencyContactPhone: student.emergencyContactPhone || null,
          appAccess: Boolean(student.appAccess),
          invitedAt: student.invitedAt || null,
          roles: Array.isArray(student.roles) && student.roles.length > 0 ? student.roles : [student.role || "user"],
          plan: student.plan,
          status: student.status,
          paymentStatus,
          paymentStatusColor,
          fechaAlta: student.admissionDate || student.memberSince || student.fechaAlta || student.createdAt || null,
          lastPaymentDate,
          expirationDate,
          nextPaymentDate,
          passesRemaining: student.passesRemaining ?? student.plan?.passCount ?? null,
          lastReminderSent: student.lastReminderSent || student.lastPaymentReminder || null
        };
      })
    );

    return res.json({ students });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/:id", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ message: "Alumno no encontrado" });
    }

    const config = await SiteConfig.findOne({ key: "main" }).lean();
    const plansCatalog = Array.isArray(config?.plans) ? config.plans : [];

    return res.json({
      student: {
        _id: user._id,
        id: user._id,
        name: user.name || "",
        lastName: user.lastName || "",
        email: user.email || "",
        cedula: user.cedula || user.documentNumber || null,
        phone: user.phone || "",
        roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role || "user"],
        status: user.status || "pending",
        fechaAlta: user.fechaAlta || user.createdAt || null,
        plan: toPlanDto(user.plan, plansCatalog)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/:id/payments", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "Alumno no encontrado" });
    }

    const payments = await Payment.find({ user: userId }).sort({ paidAt: -1, createdAt: -1 }).lean();
    const sorted = [...payments].sort((a, b) => {
      const dateA = paymentSortDate(a);
      const dateB = paymentSortDate(b);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });

    const paidStatuses = new Set(["paid", "completed"]);
    const totalPaid = sorted.reduce((acc, p) => (paidStatuses.has(String(p.status || "").toLowerCase()) ? acc + Number(p.amount || 0) : acc), 0);
    const latest = sorted[0] || null;
    const planPassCount = await getPlanPassCount(user.plan);

    return res.json({
      payments: sorted.map((p) => ({
        id: p._id,
        date: p.paidAt || p.createdAt || null,
        amount: Number(p.amount || 0),
        planPrice: p.planPrice === null || p.planPrice === undefined ? null : Number(p.planPrice || 0),
        discount: Number(p.discount || 0),
        method: p.method || "otro",
        reference: p.reference || p.externalId || "",
        status: p.status || "pending",
        registeredBy: p.registeredBy || (p.externalId ? "automatic" : "manual")
      })),
      summary: {
        totalPaid,
        lastPayment: latest
          ? {
              date: latest.paidAt || latest.createdAt || null,
              amount: Number(latest.amount || 0)
            }
          : null,
        expirationDate: user.expirationDate || user.planExpires || null,
        passesRemaining:
          user.passesRemaining === null || user.passesRemaining === undefined ? user.classesLeft ?? 0 : user.passesRemaining,
        planPassCount
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/:id/payments", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Alumno no encontrado" });
    }

    const amount = Number(req.body?.amount || 0);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Monto invalido" });
    }
    const basePrice = Number(req.body?.basePrice || amount || 0);
    const incomingDiscount = Number(req.body?.discount || 0);
    const discount = Math.min(Math.max(0, incomingDiscount), Math.max(0, basePrice));

    const paymentDate = req.body?.paymentDate ? new Date(req.body.paymentDate) : new Date();
    const paidAt = Number.isNaN(paymentDate.getTime()) ? new Date() : paymentDate;

    const payment = await Payment.create({
      user: user._id,
      amount,
      amountPaid: amount,
      planPrice: basePrice,
      discount,
      currency: "UYU",
      method: parsePaymentMethod(req.body?.method),
      status: "paid",
      registeredBy: "manual",
      reference: String(req.body?.reference || "").trim(),
      notes: String(req.body?.notes || "").trim(),
      paidAt
    });

    return res.status(201).json({
      message: "Pago registrado correctamente",
      payment: {
        id: payment._id,
        amount: payment.amount,
        planPrice: payment.planPrice,
        discount: payment.discount,
        method: payment.method,
        status: payment.status,
        reference: payment.reference,
        registeredBy: payment.registeredBy,
        date: payment.paidAt || payment.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:id", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Alumno no encontrado" });
    }

    const body = req.body || {};
    if (body.name !== undefined) user.name = String(body.name || "").trim();
    if (body.lastName !== undefined) user.lastName = String(body.lastName || "").trim();
    if (body.documentNumber !== undefined || body.cedula !== undefined) {
      const normalizedDoc = sanitizeDocument(body.documentNumber ?? body.cedula);
      user.documentNumber = normalizedDoc || undefined;
    }
    if (body.email !== undefined) user.email = String(body.email || "").trim().toLowerCase();
    if (body.phone !== undefined) user.phone = String(body.phone || "").trim();
    if (body.status !== undefined) {
      const normalizedStatus = String(body.status || "pending").trim().toLowerCase();
      if (normalizedStatus === "active" || normalizedStatus === "activo") user.status = "active";
      else if (normalizedStatus === "inactive" || normalizedStatus === "inactivo") user.status = "inactive";
      else if (normalizedStatus === "suspended" || normalizedStatus === "suspendido") user.status = "suspended";
      else user.status = "pending";
    }
    if (body.birthDate !== undefined) {
      user.birthDate = body.birthDate ? parseFlexibleDate(body.birthDate) : null;
    }
    if (body.emergencyMedical !== undefined) {
      const value = body.emergencyMedical ? String(body.emergencyMedical).trim() : null;
      user.emergencyMedical = value;
      user.medicalEmergency = value || "";
    }
    if (body.emergencyContactName !== undefined) {
      user.emergencyContactName = body.emergencyContactName ? String(body.emergencyContactName).trim() : null;
    }
    if (body.emergencyContactPhone !== undefined) {
      user.emergencyContactPhone = body.emergencyContactPhone ? String(body.emergencyContactPhone).trim() : null;
    }
    if (body.appAccess !== undefined) {
      user.appAccess = Boolean(body.appAccess);
      if (!user.appAccess) {
        user.invitedAt = null;
      }
    }
    if (body.fechaAlta !== undefined) {
      const parsedFechaAlta = body.fechaAlta ? parseFlexibleDate(body.fechaAlta) : null;
      user.fechaAlta = parsedFechaAlta;
      user.admissionDate = parsedFechaAlta;
      user.memberSince = parsedFechaAlta;
    }

    if (body.passesRemaining !== undefined) {
      user.passesRemaining = body.passesRemaining === null ? null : Number(body.passesRemaining || 0);
      if (user.plan !== "libre" && user.passesRemaining !== null) {
        user.classesLeft = Number(user.passesRemaining || 0);
      }
    }

    if (body.expirationDate !== undefined) {
      user.expirationDate = body.expirationDate ? parseFlexibleDate(body.expirationDate) : null;
      user.planExpires = user.expirationDate;
    }

    if (body.nextPaymentDate !== undefined) {
      user.nextPaymentDate = body.nextPaymentDate ? parseFlexibleDate(body.nextPaymentDate) : null;
    }

    await user.save();
    return res.json({ message: "Alumno actualizado correctamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:id/plan", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Alumno no encontrado" });
    }

    const incomingPlanId = String(req.body?.planId || "").trim();
    if (!incomingPlanId) {
      return res.status(400).json({ message: "planId requerido" });
    }

    const config = await SiteConfig.findOne({ key: "main" }).lean();
    const plansCatalog = Array.isArray(config?.plans) ? config.plans : [];
    const matchedPlan =
      plansCatalog.find((p) => String(p.id || "") === incomingPlanId) ||
      plansCatalog.find((p) => String(p._id || "") === incomingPlanId) ||
      plansCatalog.find((p) => normalizeComparable(p.name) === normalizeComparable(incomingPlanId));

    const planId = String(matchedPlan?.id || incomingPlanId);
    const allowedPlans = new Set(["8pases", "12pases", "libre", "none"]);
    if (!allowedPlans.has(planId)) {
      return res.status(400).json({ message: "planId invalido" });
    }

    user.plan = planId;
    await user.save();
    return res.json({ message: "Plan actualizado correctamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:id/deactivate", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const id = req.params.id;
    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Alumno no encontrado" });
    }

    student.status = "inactive";
    student.appAccess = false;
    student.invitedAt = null;
    student.isActive = false;
    student.deactivatedAt = new Date();

    await student.save();
    console.log(`[students] deactivate applied to student ${id}`);
    return res.json({ success: true, student: toStudentActionResponse(student) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put("/:id/activate", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const id = req.params.id;
    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Alumno no encontrado" });
    }

    student.status = "active";
    student.isActive = true;
    student.deactivatedAt = null;
    student.deactivationReason = "";

    await student.save();
    console.log(`[students] activate applied to student ${id}`);
    return res.json({ success: true, student: toStudentActionResponse(student) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put("/:id/suspend", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const id = req.params.id;
    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Alumno no encontrado" });
    }

    student.status = "suspended";
    student.appAccess = false;
    student.invitedAt = null;
    student.isActive = false;

    await student.save();
    console.log(`[students] suspend applied to student ${id}`);
    return res.json({ success: true, student: toStudentActionResponse(student) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/:id/invite", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const id = req.params.id;
    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Alumno no encontrado" });
    }

    const cedula = sanitizeDocument(student.cedula || student.documentNumber || "");
    if (!cedula) {
      return res.status(400).json({
        error: "missing_cedula",
        message: "El alumno no tiene cédula registrada"
      });
    }

    const tempPassword = generateTemporaryPassword(14);
    student.password = tempPassword;
    student.forcePasswordChange = true;
    student.status = "active";
    student.appAccess = true;
    student.invitedAt = new Date();
    student.isActive = true;

    await student.save();

    if (student.email) {
      await emailService.send({
        to: student.email,
        subject: "¡Bienvenido a Boot Camp!",
        text: `Tu usuario es tu número de teléfono y tu contraseña temporal es: ${tempPassword}. Al ingresar por primera vez deberás cambiarla.`,
        html: `<p>Tu usuario es tu número de teléfono.</p><p><strong>Contraseña temporal:</strong> ${tempPassword}</p><p>Al ingresar por primera vez deberás cambiarla.</p>`
      });
    }

    console.log(`[students] invite applied to student ${id}`);
    return res.json({ success: true, student: toStudentActionResponse(student) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;


