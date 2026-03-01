const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Attendance = require("../models/Attendance");
const Movement = require("../models/Movement");
const SiteConfig = require("../models/SiteConfig");
const auth = require("../middleware/auth");

let PlanModel = null;
try {
  // Optional: some projects expose dedicated Plan model.
  // eslint-disable-next-line global-require
  PlanModel = require("../models/Plan");
} catch (_error) {
  PlanModel = null;
}

let TurnoModel = null;
try {
  // Optional model if project has explicit Turno collection.
  // eslint-disable-next-line global-require
  TurnoModel = require("../models/Turno");
} catch (_error) {
  TurnoModel = null;
}

let ScheduleModel = null;
try {
  // Optional model name alternative.
  // eslint-disable-next-line global-require
  ScheduleModel = require("../models/Schedule");
} catch (_error) {
  ScheduleModel = null;
}

const router = express.Router();

const isAdminOrTrainer = (req, res, next) => {
  const roles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
  if (!roles.includes("admin") && !roles.includes("trainer")) {
    return res.status(403).json({ message: "Acceso denegado." });
  }
  return next();
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const capitalizeWords = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const onlyDigits = (value) => String(value || "").replace(/[^\d]/g, "").trim();

const parseStatus = (value) => {
  const normalized = normalizeText(value);
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

  const raw = String(value || "").trim();
  if (!raw || normalizeText(raw) === "llamar") return null;

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

const getField = (row, aliases) => {
  const entries = Object.entries(row || {});
  const match = entries.find(([key]) => aliases.includes(normalizeText(key)));
  return match ? match[1] : "";
};

const buildClientesSummary = (total) => ({ total, imported: 0, skipped: 0, errors: [], warnings: [] });
const buildGenericSummary = (total) => ({ total, imported: 0, skipped: 0, errors: [] });

const toReasonString = (error) => {
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch (_jsonError) {
    return String(error);
  }
};

const pushRowError = (summary, rowNumber, error) => {
  summary.errors.push({
    row: rowNumber,
    reason: toReasonString(error)
  });
};

const planNameMap = {
  "tres veces a la semana": "12pases",
  "tres veces": "12pases",
  "12 pases": "12pases",
  "12pases": "12pases",
  "dos veces a la semana": "8pases",
  "dos veces": "8pases",
  "8 pases": "8pases",
  "8pases": "8pases",
  libre: "libre",
  "pase libre": "libre",
  "todos los dias": "libre",
  ilimitado: "libre"
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolvePlanByName = async (planRaw, plansCatalog = []) => {
  const originalValue = String(planRaw || "").trim();
  const normalizedPlan = normalizeText(planRaw);
  if (!normalizedPlan) return { planId: null, planPrice: null, unresolved: false };
  const mappedSlug = planNameMap[normalizedPlan] || null;

  if (PlanModel) {
    const orConditions = [
      { name: { $regex: `^${escapeRegex(originalValue)}$`, $options: "i" } }
    ];
    if (mappedSlug) {
      orConditions.push(
        { slug: { $regex: `^${escapeRegex(mappedSlug)}$`, $options: "i" } },
        { id: { $regex: `^${escapeRegex(mappedSlug)}$`, $options: "i" } },
        { name: { $regex: `^${escapeRegex(mappedSlug)}$`, $options: "i" } }
      );
    }

    const fromPlanModel = await PlanModel.findOne({ $or: orConditions })
      .select("_id name price")
      .lean();
    if (fromPlanModel) {
      return {
        planId: String(fromPlanModel._id),
        planPrice: Number(fromPlanModel.price || 0),
        unresolved: false
      };
    }
  }

  const plans = Array.isArray(plansCatalog) ? plansCatalog : [];
  let byExact = null;
  if (mappedSlug) {
    byExact = plans.find((plan) => {
      const planSlug = normalizeText(plan.slug || plan.id || "");
      const planName = normalizeText(plan.name);
      return planSlug === mappedSlug || planName === mappedSlug;
    });
  }
  if (!byExact) {
    byExact = plans.find((plan) => {
      const planSlug = normalizeText(plan.slug || plan.id || "");
      const planName = normalizeText(plan.name);
      return planName === normalizedPlan || planSlug === normalizedPlan;
    });
  }
  if (byExact) {
    return { planId: String(byExact.id), planPrice: Number(byExact.price || 0), unresolved: false };
  }

  return { planId: null, planPrice: null, unresolved: true };
};

const parsePaymentMethod = (value) => {
  const normalized = normalizeText(value);
  if (normalized.includes("transfer")) return "transferencia";
  if (normalized.includes("mercado")) return "mercado_pago";
  if (normalized.includes("tarjeta")) return "otro";
  return "efectivo";
};

const roundDiscountToStep = (value, step = 10) => {
  const rounded = Math.round(Number(value || 0) / step) * step;
  return Math.min(50, Math.max(0, rounded));
};

const buildTurnoResolver = async () => {
  const nameToId = new Map();
  const pushEntry = (name, id) => {
    const normalized = normalizeText(name);
    if (!normalized || !id) return;
    if (!nameToId.has(normalized)) nameToId.set(normalized, id);
  };

  if (TurnoModel) {
    const docs = await TurnoModel.find({}).select("_id name").lean();
    docs.forEach((doc) => pushEntry(doc?.name, doc?._id));
  }
  if (ScheduleModel) {
    const docs = await ScheduleModel.find({}).select("_id name").lean();
    docs.forEach((doc) => pushEntry(doc?.name, doc?._id));
  }

  if (mongoose.connection?.db) {
    const collectionNames = ["turnos", "schedules", "horarios"];
    const existing = await mongoose.connection.db
      .listCollections({}, { nameOnly: true })
      .toArray()
      .then((cols) => new Set(cols.map((c) => c.name)));

    for (const colName of collectionNames) {
      if (!existing.has(colName)) continue;
      const docs = await mongoose.connection.db
        .collection(colName)
        .find({}, { projection: { _id: 1, name: 1, nombre: 1, title: 1 } })
        .limit(500)
        .toArray();
      docs.forEach((doc) => {
        const label = doc?.name || doc?.nombre || doc?.title;
        pushEntry(label, doc?._id);
      });
    }
  }

  return (turnoRaw) => {
    const turnoText = String(turnoRaw || "").trim();
    if (!turnoText) return { turno: "", turnoId: null };
    const turnoId = nameToId.get(normalizeText(turnoText)) || null;
    return { turno: turnoText, turnoId };
  };
};

router.post("/excel", auth, isAdminOrTrainer, async (req, res) => {
  try {
    const clientes = Array.isArray(req.body?.clientes) ? req.body.clientes : [];
    const asistencia = Array.isArray(req.body?.asistencia) ? req.body.asistencia : [];
    const movimientos = Array.isArray(req.body?.movimientos) ? req.body.movimientos : [];

    const clientesSummary = buildClientesSummary(clientes.length);
    const asistenciaSummary = buildGenericSummary(asistencia.length);
    const movimientosSummary = buildGenericSummary(movimientos.length);

    const config = await SiteConfig.findOne({ key: "main" }).lean();
    const plansCatalog = Array.isArray(config?.plans) ? config.plans : [];
    const resolveTurno = await buildTurnoResolver();
    const importDate = new Date();

    const existingUsers = await User.find({}).select("phone name lastName").lean();
    const phoneSet = new Set(existingUsers.map((u) => onlyDigits(u.phone)).filter(Boolean));
    const fullNameSet = new Set(
      existingUsers.map((u) => normalizeText(`${u.name || ""} ${u.lastName || ""}`)).filter(Boolean)
    );

    const importedUsersByName = new Map();

    for (let idx = 0; idx < clientes.length; idx += 1) {
      const row = clientes[idx] || {};
      const rowNumber = idx + 2;
      try {
        const name = capitalizeWords(getField(row, ["nombre"]));
        const lastName = capitalizeWords(getField(row, ["apellido"]));
        const phone = onlyDigits(getField(row, ["whatsapp", "telefono", "celular", "phone"]));
        const birthDate = parseFlexibleDate(getField(row, ["fecha nacimiento", "nacimiento"]));
        const emailRaw = String(getField(row, ["email", "correo", "e-mail"]) || "").trim().toLowerCase();
        const email = emailRaw || null;
        const planName = getField(row, ["plan"]);
        const emergencyContact = String(getField(row, ["emergencia medica", "emergencia"]) || "").trim();
        const turnoRaw = getField(row, ["turno"]);
        const status = parseStatus(getField(row, ["estado"]));

        if (!name || !lastName) {
          clientesSummary.skipped += 1;
          pushRowError(clientesSummary, rowNumber, "Nombre y apellido son requeridos");
          continue;
        }
        if (!phone) {
          clientesSummary.skipped += 1;
          pushRowError(clientesSummary, rowNumber, "Whatsapp/telefono invalido");
          continue;
        }

        const fullNameKey = normalizeText(`${name} ${lastName}`);
        if (phoneSet.has(phone) || fullNameSet.has(fullNameKey)) {
          clientesSummary.skipped += 1;
          pushRowError(clientesSummary, rowNumber, `Duplicate: phone ${phone} or fullName ${name} ${lastName} already exists`);
          continue;
        }

        const planResolved = await resolvePlanByName(planName, plansCatalog);
        if (planResolved.unresolved) {
          clientesSummary.warnings.push({
            row: rowNumber,
            reason: `Plan no encontrado: ${String(planName || "").trim() || "-"} - alumno importado sin plan`
          });
        }
        const { turno, turnoId } = resolveTurno(turnoRaw);

        const hashedPassword = await bcrypt.hash(phone, 10);
        const fechaAlta = new Date(importDate);
        // Payments are NOT imported. They start fresh from first manual registration.
        const user = await User.create({
          name,
          lastName,
          email,
          phone,
          birthDate,
          medicalEmergency: emergencyContact,
          emergencyMedical: emergencyContact || null,
          turno,
          turnoId,
          role: "user",
          roles: ["user"],
          status,
          isActive: status === "active",
          fechaAlta,
          admissionDate: fechaAlta,
          memberSince: fechaAlta,
          plan: planResolved.planId || "none",
          planPrice: planResolved.planPrice,
          password: hashedPassword,
          forcePasswordChange: true
        });

        importedUsersByName.set(fullNameKey, user._id);
        phoneSet.add(phone);
        fullNameSet.add(fullNameKey);
        clientesSummary.imported += 1;
      } catch (rowError) {
        clientesSummary.skipped += 1;
        pushRowError(clientesSummary, rowNumber, rowError);
      }
    }

    const allUsers = await User.find({}).select("_id name lastName").lean();
    const usersByFullName = new Map();
    const usersByFirstName = new Map();
    const usersByLastName = new Map();
    allUsers.forEach((u) => {
      const full = normalizeText(`${u.name || ""} ${u.lastName || ""}`);
      const first = normalizeText(u.name || "");
      const last = normalizeText(u.lastName || "");
      if (full && !usersByFullName.has(full)) usersByFullName.set(full, u._id);
      if (first && !usersByFirstName.has(first)) usersByFirstName.set(first, u._id);
      if (last && !usersByLastName.has(last)) usersByLastName.set(last, u._id);
    });
    importedUsersByName.forEach((userId, key) => usersByFullName.set(key, userId));
    const asistenciaNotFoundNames = [];

    for (let idx = 0; idx < asistencia.length; idx += 1) {
      const row = asistencia[idx] || {};
      const rowNumber = idx + 2;
      try {
        const socio = String(getField(row, ["socio", "nombre", "cliente"]) || "").trim();
        const dateValue = parseFlexibleDate(getField(row, ["fecha", "date"])) || new Date();
        const day = String(getField(row, ["dia", "day"]) || "").trim();
        const hour = String(getField(row, ["hora", "hour"]) || "").trim();
        const socioKey = normalizeText(socio);
        if (!socioKey) {
          asistenciaSummary.skipped += 1;
          pushRowError(asistenciaSummary, rowNumber, "Socio requerido");
          continue;
        }

        const socioParts = socioKey.split(" ").filter(Boolean);
        const firstNameKey = socioParts[0] || "";
        const lastNameKey = socioParts.length > 1 ? socioParts[socioParts.length - 1] : "";

        let userId = usersByFullName.get(socioKey);
        if (!userId && firstNameKey) userId = usersByFirstName.get(firstNameKey);
        if (!userId && lastNameKey) userId = usersByLastName.get(lastNameKey);
        if (!userId) {
          asistenciaSummary.skipped += 1;
          const reason = `Student not found: ${socio}`;
          pushRowError(asistenciaSummary, rowNumber, reason);
          asistenciaNotFoundNames.push({ row: rowNumber, socio });
          continue;
        }

        await Attendance.create({
          student: userId,
          date: dateValue,
          day,
          hour
        });
        asistenciaSummary.imported += 1;
      } catch (rowError) {
        asistenciaSummary.skipped += 1;
        pushRowError(asistenciaSummary, rowNumber, rowError);
      }
    }

    if (asistenciaNotFoundNames.length > 0) {
      console.warn(
        "[import/excel] Asistencia - students not found:",
        asistenciaNotFoundNames.map((item) => `row ${item.row}: ${item.socio}`).join(" | ")
      );
    }

    for (let idx = 0; idx < movimientos.length; idx += 1) {
      const row = movimientos[idx] || {};
      const rowNumber = idx + 2;
      try {
        const date = parseFlexibleDate(getField(row, ["fecha", "date"])) || new Date();
        const type = String(getField(row, ["tipo de movimiento", "tipo"]) || "").trim();
        const registeredBy = String(getField(row, ["registrado por", "registradopor", "usuario"]) || "").trim();
        const description = String(getField(row, ["descripcion", "detalle", "concepto"]) || "").trim();
        const month = String(getField(row, ["mes", "month"]) || "").trim();
        const amount = Number(getField(row, ["monto", "importe", "amount"]) || 0);

        if (!type) {
          movimientosSummary.skipped += 1;
          pushRowError(movimientosSummary, rowNumber, "Tipo de movimiento requerido");
          continue;
        }

        await Movement.create({
          date,
          type,
          registeredBy,
          description,
          month,
          amount: Number.isFinite(amount) ? amount : 0
        });
        movimientosSummary.imported += 1;
      } catch (rowError) {
        movimientosSummary.skipped += 1;
        pushRowError(movimientosSummary, rowNumber, rowError);
      }
    }

    return res.json({
      clientes: clientesSummary,
      asistencia: asistenciaSummary,
      movimientos: movimientosSummary
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// TODO: remove this endpoint before production
router.delete("/reset", auth, isAdminOrTrainer, async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoffDate = new Date("2024-01-01T00:00:00.000Z");

    const [oldPaymentsResult, importedTodayResetResult, usersDeleteResult] = await Promise.all([
      Payment.deleteMany({
        $or: [{ createdAt: { $lt: cutoffDate } }, { date: { $lt: cutoffDate } }]
      }),
      User.collection.updateMany(
        { fechaAlta: { $gte: today } },
        {
          $set: {
            lastPaymentDate: null,
            expirationDate: null,
            nextPaymentDate: null,
            passesRemaining: null
          }
        }
      ),
      User.deleteMany({
        createdAt: { $gte: today },
        $and: [{ $or: [{ role: "user" }, { roles: "user" }] }, { roles: { $nin: ["admin", "trainer"] } }]
      })
    ]);

    return res.json({
      success: true,
      deletedOldPayments: Number(oldPaymentsResult?.deletedCount || 0),
      resetImportedTodayStudents: Number(importedTodayResetResult?.modifiedCount || 0),
      deletedUsers: Number(usersDeleteResult?.deletedCount || 0)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// TODO: remove this endpoint before production
router.delete("/reset-users-today", auth, isAdminOrTrainer, async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await User.deleteMany({
      createdAt: { $gte: today },
      $and: [{ $or: [{ role: "user" }, { roles: "user" }] }, { roles: { $nin: ["admin", "trainer"] } }]
    });

    return res.json({
      success: true,
      deletedUsers: Number(result?.deletedCount || 0)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
