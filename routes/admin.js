const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const ClassModel = require("../models/Class");
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Attendance = require("../models/Attendance");
const Routine = require("../models/Routine");
const SiteConfig = require("../models/SiteConfig");
const TrainerStudent = require("../models/TrainerStudent");
const AdminAction = require("../models/AdminAction");
const { parse } = require("csv-parse/sync");
const emailService = require("../services/emailService");
const auth = require("../middleware/auth");

const router = express.Router();

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const toDateLabel = (dateValue) => {
  if (!dateValue) return "-";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const timeAgoLabel = (dateValue) => {
  const d = new Date(dateValue);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
};

const normalizePlan = (plan) => {
  if (plan === "libre") return "Pase Libre";
  if (plan === "12pases") return "12 Pases";
  return "8 Pases";
};

const normalizePaymentStatus = (status) => {
  if (status === "paid" || status === "completed") return "completed";
  if (status === "pending") return "pending";
  if (status === "refunded") return "refunded";
  return "failed";
};

const toPaymentMethod = (value) => {
  const raw = String(value || "").toLowerCase();
  if (raw === "mercadopago") return "mercado_pago";
  if (["mercado_pago", "transferencia", "efectivo", "otro"].includes(raw)) return raw;
  return "otro";
};

const getPlanClassCount = (plan) => {
  if (plan === "8pases") return 8;
  if (plan === "12pases") return 12;
  if (plan === "libre") return null;
  return 0;
};

const sanitizeNutritionPlan = (payload = {}) => {
  const meals = Array.isArray(payload.meals)
    ? payload.meals
        .map((meal) => ({
          title: String(meal?.title || "").trim(),
          time: String(meal?.time || "").trim(),
          calories:
            meal?.calories === null || meal?.calories === undefined || meal?.calories === ""
              ? null
              : Number(meal.calories),
          description: String(meal?.description || "").trim(),
          items: Array.isArray(meal?.items)
            ? meal.items.map((item) => String(item).trim()).filter(Boolean)
            : []
        }))
        .filter((meal) => meal.title || meal.time || meal.description || meal.items.length > 0 || meal.calories !== null)
    : [];

  const goal = String(payload.goal || "").trim();
  const notes = String(payload.notes || "").trim();
  const dailyCalories =
    payload.dailyCalories === null || payload.dailyCalories === undefined || payload.dailyCalories === ""
      ? null
      : Number(payload.dailyCalories);

  const statusCandidates = ["none", "pending", "active", "inactive"];
  let status = statusCandidates.includes(payload.status) ? payload.status : null;
  if (!status) {
    status = meals.length > 0 ? "active" : "inactive";
  }

  const now = new Date();
  return {
    status,
    goal,
    notes,
    dailyCalories: Number.isNaN(dailyCalories) ? null : dailyCalories,
    meals,
    updatedAt: now,
    assignedAt: status === "active" ? now : null,
    requestedAt: status === "pending" ? now : null
  };
};

const isAdmin = (req, res, next) => {
  const roles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
  if (!roles.includes("admin")) {
    return res.status(403).json({ message: "Acceso denegado. Solo administradores." });
  }

  return next();
};

const trainerQuery = {
  $or: [{ role: "trainer" }, { roles: "trainer" }]
};

const normalizeCsvHeader = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");

const buildImportPassword = (documentNumber) => String(documentNumber || "").replace(/[^\dA-Za-z]/g, "");
const parseFlexibleDate = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return null;

  const ddmmyyyy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]) - 1;
    const year = Number(ddmmyyyy[3]);
    const parsed = new Date(year, month, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getSiteConfig = async () => {
  let config = await SiteConfig.findOne({ key: "main" });
  if (!config) {
    config = await SiteConfig.create({ key: "main" });
  }
  return config;
};

const resolveTrainer = async (trainerIdOrName) => {
  if (!trainerIdOrName) return null;

  const raw = String(trainerIdOrName).trim();
  if (!raw) return null;

  let trainer = null;
  if (/^[a-f\d]{24}$/i.test(raw)) {
    trainer = await User.findOne({ _id: raw, ...trainerQuery, isActive: { $ne: false } }).select("_id name email");
  }

  if (!trainer) {
    trainer = await User.findOne({ name: raw, ...trainerQuery, isActive: { $ne: false } }).select("_id name email");
  }

  return trainer;
};

const normalizeClassDay = (day) => {
  const raw = String(day || "").trim();
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const dayMap = {
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miercoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sabado",
    domingo: "Domingo"
  };

  return dayMap[normalized] || raw;
};

router.get("/dashboard", auth, isAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [payments, users, classes, attendances, bookings] = await Promise.all([
      Payment.find().sort({ createdAt: -1 }).limit(300).populate("user", "name"),
      User.find().sort({ createdAt: -1 }).limit(300),
      ClassModel.find({ active: true }),
      Attendance.find({ createdAt: { $gte: monthStart } }).sort({ createdAt: -1 }).limit(500),
      Booking.find().sort({ createdAt: -1 }).limit(100).populate("user", "name").populate("class", "name time")
    ]);

    const paidPayments = payments.filter((p) => p.status === "paid");
    const monthlyRevenue = paidPayments
      .filter((p) => new Date(p.paidAt || p.createdAt) >= monthStart)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const presentCount = attendances.filter((a) => a.status === "present").length;
    const attendanceRate = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 0;

    const pendingPayments = payments.filter((p) => p.status === "pending").length;
    const hasUserRole = (u) => (Array.isArray(u.roles) && u.roles.includes("user")) || u.role === "user";
    const activeMembers = users.filter((u) => hasUserRole(u) && u.isActive !== false).length;
    const newMembers = users.filter((u) => hasUserRole(u) && new Date(u.createdAt) >= monthStart).length;

    const monthlyMap = new Map();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap.set(key, { month: monthNames[d.getMonth()], revenue: 0, expenses: 0 });
    }

    paidPayments.forEach((payment) => {
      const d = new Date(payment.paidAt || payment.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlyMap.has(key)) {
        monthlyMap.get(key).revenue += payment.amount || 0;
      }
    });

    const revenueChart = Array.from(monthlyMap.values()).map((item) => ({
      ...item,
      expenses: Math.round(item.revenue * 0.45)
    }));

    const paymentActivity = payments.slice(0, 4).map((p) => ({
      id: `payment-${p._id}`,
      type: "payment",
      user: p.user?.name || "Alumno",
      amount: p.amount,
      date: timeAgoLabel(p.paidAt || p.createdAt),
      status: p.status === "paid" ? "success" : p.status === "pending" ? "warning" : "danger"
    }));

    const bookingActivity = bookings.slice(0, 3).map((b) => ({
      id: `booking-${b._id}`,
      type: "booking",
      user: b.user?.name || "Alumno",
      class: `${b.class?.name || "Clase"} ${b.class?.time || ""}`.trim(),
      date: timeAgoLabel(b.createdAt),
      status: "success"
    }));

    const newUsersActivity = users
      .filter((u) => (Array.isArray(u.roles) && u.roles.includes("user")) || u.role === "user")
      .slice(0, 2)
      .map((u) => ({
        id: `new-${u._id}`,
        type: "new_user",
        user: u.name,
        plan: normalizePlan(u.plan),
        date: timeAgoLabel(u.createdAt),
        status: "success"
      }));

    const recentActivity = [...paymentActivity, ...bookingActivity, ...newUsersActivity]
      .sort((a, b) => (a.date > b.date ? -1 : 1))
      .slice(0, 8);

    return res.json({
      stats: {
        totalRevenue: paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        monthlyRevenue,
        activeMembers,
        newMembers,
        totalClasses: classes.length,
        attendanceRate,
        pendingPayments,
        churnRate: 0
      },
      revenueChart,
      recentActivity
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/users", auth, isAdmin, async (req, res) => {
  try {
    const {
      status,
      role,
      plan,
      search,
      hasDebt,
      page = 1,
      limit = 20
    } = req.query;

    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 20));

    const query = {};
    if (status) query.status = status;
    if (plan) query.plan = plan;
    if (role) {
      query.$or = [{ role }, { roles: role }];
    }
    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$and = (query.$and || []).concat([
        {
          $or: [{ name: regex }, { email: regex }, { phone: regex }, { documentNumber: regex }]
        }
      ]);
    }
    if (hasDebt === "true") {
      query.planExpires = { $lt: new Date() };
      query.status = "active";
    }

    const users = await User.find(query)
      .select("-password")
      .populate("deactivatedBy", "name")
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .skip((parsedPage - 1) * parsedLimit);

    const count = await User.countDocuments(query);

    return res.json({
      users,
      totalPages: Math.ceil(count / parsedLimit),
      currentPage: parsedPage,
      total: count
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/users/:id", auth, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [payments, attendances, futureBookings, routines, attendanceByDay] = await Promise.all([
      Payment.find({ user: userId }).sort({ createdAt: -1 }).limit(20),
      Attendance.find({ user: userId, createdAt: { $gte: threeMonthsAgo } })
        .populate("class", "name day time")
        .populate("trainer", "name")
        .sort({ createdAt: -1 }),
      Booking.find({ user: userId })
        .populate("class", "name day time trainer")
        .sort({ createdAt: -1 })
        .limit(10),
      Routine.find({ user: userId }).populate("assignedBy", "name").sort({ createdAt: -1 }),
      Attendance.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: "classes",
            localField: "class",
            foreignField: "_id",
            as: "classInfo"
          }
        },
        { $unwind: "$classInfo" },
        {
          $group: {
            _id: "$classInfo.day",
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const completedPaid = payments.filter((p) => ["paid", "completed"].includes(p.status));
    const pendingPayments = payments.filter((p) => p.status === "pending");
    const presentCount = attendances.filter((a) => a.status === "present").length;
    const preferredDays = attendanceByDay.sort((a, b) => b.count - a.count).map((d) => ({ day: d._id, count: d.count }));

    return res.json({
      user,
      payments: {
        history: payments,
        totalPaid: completedPaid.reduce((acc, p) => acc + (p.amount || 0), 0),
        pendingAmount: pendingPayments.reduce((acc, p) => acc + (p.amount || 0), 0)
      },
      attendances: {
        history: attendances,
        total: attendances.length,
        present: presentCount,
        rate: attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 0,
        preferredDays
      },
      bookings: futureBookings,
      routines
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/users/:id", auth, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = { ...req.body };
    delete updateData.password;

    const user = await User.findByIdAndUpdate(
      userId,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({ message: "Usuario actualizado", user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/users/:id/nutrition", auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const nutritionPlan = sanitizeNutritionPlan(req.body || {});

    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          nutritionPlan,
          updatedAt: new Date()
        }
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({ message: "Plan nutricional actualizado", nutritionPlan: user.nutritionPlan, user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/users/:id/toggle-status", auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, action } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role || "user"];
    if (userRoles.includes("admin") && action !== "activate") {
      const adminCount = await User.countDocuments({
        $or: [{ role: "admin" }, { roles: "admin" }],
        status: "active"
      });
      if (adminCount <= 1) {
        return res.status(400).json({ message: "No puedes desactivar al unico admin activo" });
      }
    }

    let updateData = {};
    if (action === "activate") {
      updateData = {
        status: "active",
        isActive: true,
        $unset: { deactivationReason: 1, deactivatedAt: 1, deactivatedBy: 1 }
      };
    } else if (action === "deactivate") {
      updateData = {
        status: "inactive",
        isActive: false,
        deactivationReason: reason || "Desactivado por administrador",
        deactivatedAt: new Date(),
        deactivatedBy: req.user.userId
      };
    } else if (action === "suspend") {
      updateData = {
        status: "suspended",
        isActive: false,
        deactivationReason: reason || "Suspendido por administrador",
        deactivatedAt: new Date(),
        deactivatedBy: req.user.userId
      };
    } else {
      return res.status(400).json({ message: "Accion invalida" });
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .select("-password")
      .populate("deactivatedBy", "name");

    return res.json({
      message: `Usuario ${action === "activate" ? "activado" : action === "deactivate" ? "desactivado" : "suspendido"} correctamente`,
      user: updatedUser
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/users/:id/roles", auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { roles } = req.body;

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ message: "Debes enviar un array de roles" });
    }

    const validRoles = ["user", "trainer", "admin"];
    const invalidRoles = roles.filter((r) => !validRoles.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ message: `Roles invalidos: ${invalidRoles.join(", ")}` });
    }

    const nextRoles = Array.from(new Set([...roles, "user"]));
    const priority = ["admin", "trainer", "user"];
    const primaryRole = priority.find((r) => nextRoles.includes(r)) || "user";

    const user = await User.findByIdAndUpdate(
      id,
      { roles: nextRoles, role: primaryRole, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({ message: "Roles actualizados", user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/users/:id/notes", auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    if (!note || !String(note).trim()) {
      return res.status(400).json({ message: "La nota es requerida" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        $push: {
          adminNotes: {
            note: String(note).trim(),
            createdBy: req.user.userId,
            createdAt: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("adminNotes.createdBy", "name");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({ message: "Nota agregada", user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/users/:id/attendance-calendar", auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    const inputMonth = Number(req.query.month || now.getMonth() + 1);
    const inputYear = Number(req.query.year || now.getFullYear());

    const startDate = new Date(inputYear, inputMonth - 1, 1);
    const endDate = new Date(inputYear, inputMonth, 0, 23, 59, 59, 999);

    const attendances = await Attendance.find({
      user: id,
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate("class", "name time");

    const calendar = {};
    attendances.forEach((att) => {
      const date = att.createdAt.toISOString().split("T")[0];
      if (!calendar[date]) calendar[date] = [];
      calendar[date].push({
        class: att.class?.name || "Clase",
        time: att.class?.time || "",
        status: att.status,
        performance: att.performance
      });
    });

    return res.json({ calendar, month: inputMonth, year: inputYear });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/reports/attendance", auth, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate && endDate) {
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const [stats, byDay] = await Promise.all([
      Attendance.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Attendance.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "classes",
            localField: "class",
            foreignField: "_id",
            as: "classInfo"
          }
        },
        { $unwind: "$classInfo" },
        {
          $group: {
            _id: "$classInfo.day",
            count: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    return res.json({ stats, byDay });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/reports/revenue", auth, isAdmin, async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    const byMonth = await Payment.aggregate([
      {
        $match: {
          status: { $in: ["paid", "completed"] },
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const byPlan = await Payment.aggregate([
      {
        $match: {
          status: { $in: ["paid", "completed"] },
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$userInfo.plan",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    return res.json({ byMonth, byPlan });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/members", auth, isAdmin, async (_req, res) => {
  try {
    const users = await User.find({ $or: [{ role: "user" }, { roles: "user" }] }).sort({ createdAt: -1 });
    const payments = await Payment.find({ user: { $in: users.map((u) => u._id) } }).sort({ createdAt: -1 });

    const members = users.map((u) => {
      const userPayments = payments.filter((p) => String(p.user) === String(u._id));
      const lastPaid = userPayments.find((p) => p.status === "paid");
      const pendingDebt = userPayments
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const status = u.isActive === false ? "inactive" : pendingDebt > 0 ? "pending" : "active";

      return {
        id: u._id,
        name: u.name,
        lastName: u.lastName || "",
        fullName: `${u.name || ""} ${u.lastName || ""}`.trim(),
        documentNumber: u.documentNumber || "",
        email: u.email,
        phone: u.phone || "-",
        birthDate: u.birthDate,
        medicalEmergency: u.medicalEmergency || "",
        admissionDate: u.admissionDate || u.memberSince || u.createdAt,
        roles: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role || "user"],
        plan: normalizePlan(u.plan),
        status: u.status || status,
        forcePasswordChange: Boolean(u.forcePasswordChange),
        paymentMethod: u.paymentMethod?.type || "-",
        lastPayment: toDateLabel(lastPaid?.paidAt || lastPaid?.createdAt),
        lastReminderSent: u.lastPaymentReminder ? toDateLabel(u.lastPaymentReminder) : null,
        nextPayment: toDateLabel(u.planExpires),
        classes: u.progress?.totalWorkouts || 0,
        debt: pendingDebt,
        joinDate: toDateLabel(u.memberSince || u.createdAt)
      };
    });

    return res.json({ members });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/users/import-csv", auth, isAdmin, async (req, res) => {
  try {
    const { csvContent } = req.body || {};
    if (!csvContent || typeof csvContent !== "string") {
      return res.status(400).json({ message: "csvContent es requerido" });
    }

    const delimiter = csvContent.includes(";") ? ";" : ",";
    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter,
      trim: true
    });

    const result = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rawMap = {};
      Object.entries(row).forEach(([key, value]) => {
        rawMap[normalizeCsvHeader(key)] = value;
      });

      const firstName = String(rawMap.nombre || "").trim();
      const lastName = String(rawMap.apellido || "").trim();
      const documentNumber = String(rawMap.cedula || rawMap.documento || rawMap.document_number || "").replace(/[^\dA-Za-z]/g, "");
      const emailRaw = String(rawMap.correo || rawMap.email || "").trim();
      const phone = String(rawMap.telefono || rawMap.celular || "").trim();
      const emergency = String(rawMap.emergencia_medica || rawMap.emergencia || "").trim();
      const birthDateRaw = String(rawMap.fecha_nacimiento || "").trim();
      const admissionDateRaw = String(rawMap.fecha_de_alta || rawMap.fecha_alta || "").trim();
      const statusRaw = String(rawMap.estado || "pending").toLowerCase();

      if (!firstName || !documentNumber) {
        result.skipped += 1;
        result.errors.push(`Fila ${i + 2}: nombre y cedula son requeridos`);
        continue;
      }

      const email = emailRaw || `${documentNumber}@temp.bootcamp`;
      const status = ["active", "inactive", "suspended", "pending"].includes(statusRaw) ? statusRaw : "pending";
      const birthDate = parseFlexibleDate(birthDateRaw);
      const admissionDate = parseFlexibleDate(admissionDateRaw) || new Date();
      const importPassword = buildImportPassword(documentNumber) || Math.random().toString(36).slice(-8);

      const existing = await User.findOne({
        $or: [{ documentNumber }, { email: email.toLowerCase() }]
      }).select("+password");

      if (existing) {
        existing.name = firstName;
        existing.lastName = lastName;
        existing.documentNumber = documentNumber;
        existing.phone = phone || existing.phone;
        existing.email = email.toLowerCase();
        existing.birthDate = birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate : existing.birthDate;
        existing.medicalEmergency = emergency;
        existing.admissionDate = admissionDate && !Number.isNaN(admissionDate.getTime()) ? admissionDate : existing.admissionDate;
        existing.status = status;
        existing.isActive = status === "active";
        existing.forcePasswordChange = true;
        existing.roles = Array.from(new Set([...(existing.roles || []), "user"]));
        if (!existing.password) {
          existing.password = importPassword;
        }
        await existing.save();
        result.updated += 1;
        continue;
      }

      await User.create({
        name: firstName,
        lastName,
        documentNumber,
        email: email.toLowerCase(),
        phone,
        birthDate: birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate : null,
        medicalEmergency: emergency,
        admissionDate: admissionDate && !Number.isNaN(admissionDate.getTime()) ? admissionDate : new Date(),
        memberSince: admissionDate && !Number.isNaN(admissionDate.getTime()) ? admissionDate : new Date(),
        status,
        isActive: status === "active",
        roles: ["user"],
        role: "user",
        password: importPassword,
        forcePasswordChange: true,
        isTemporary: true
      });

      result.imported += 1;
    }

    return res.json({
      message: "Importacion CSV procesada",
      ...result
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/users/:id/activate-access", auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const incomingDocumentNumber = buildImportPassword(req.body?.documentNumber);
    if (req.body?.documentNumber && !incomingDocumentNumber) {
      return res.status(400).json({ message: "La cedula ingresada no es valida" });
    }

    if (incomingDocumentNumber) {
      const duplicatedDocument = await User.findOne({
        _id: { $ne: user._id },
        documentNumber: incomingDocumentNumber
      }).select("_id");
      if (duplicatedDocument) {
        return res.status(409).json({ message: "La cedula ya esta registrada en otro usuario" });
      }
      user.documentNumber = incomingDocumentNumber;
    }

    if (!user.email) {
      return res.status(400).json({ message: "El usuario no tiene correo cargado" });
    }

    const passwordSeed = user.documentNumber || user.email;
    const normalizedSeed = buildImportPassword(passwordSeed);
    const accessPassword = normalizedSeed || Math.random().toString(36).slice(-10);
    user.password = accessPassword;
    user.forcePasswordChange = true;
    user.status = "active";
    user.isActive = true;
    user.isTemporary = false;
    await user.save();

    const emailResult = await emailService.sendAccountAccess(user, accessPassword);

    await AdminAction.create({
      admin: req.user.userId,
      action: "user_updated",
      targetType: "user",
      targetId: user._id,
      targetName: `${user.name} ${user.lastName || ""}`.trim(),
      newData: {
        status: "active",
        forcePasswordChange: true,
        username: user.documentNumber || user.email
      },
      reason: "Activacion de acceso por admin",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || ""
    });

    return res.json({
      message: emailResult.success
        ? "Usuario activado y acceso enviado por correo"
        : "Usuario activado, pero fallo envio de correo",
      emailSent: emailResult.success,
      user: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        documentNumber: user.documentNumber,
        email: user.email,
        status: user.status,
        forcePasswordChange: user.forcePasswordChange
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/classes", auth, isAdmin, async (_req, res) => {
  try {
    const [classes, trainers] = await Promise.all([
      ClassModel.find().sort({ day: 1, time: 1 }),
      User.find(trainerQuery).select("_id name")
    ]);

    const trainersById = new Map(trainers.map((t) => [String(t._id), t]));
    const trainersByName = new Map(trainers.map((t) => [t.name, t]));

    return res.json({
      classes: classes.map((c) => ({
        id: c._id,
        name: c.name,
        day: c.day,
        time: c.time,
        trainerId: trainersById.get(String(c.trainer))?._id || trainersByName.get(c.trainer)?._id || null,
        trainerName: trainersById.get(String(c.trainer))?.name || trainersByName.get(c.trainer)?.name || c.trainer,
        trainer: trainersById.get(String(c.trainer))?.name || trainersByName.get(c.trainer)?.name || c.trainer,
        spots: c.spots,
        booked: c.booked,
        active: c.active,
        revenue: (c.booked || 0) * 1900
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/classes", auth, isAdmin, async (req, res) => {
  try {
    const { name, day, time, trainerId, trainer, spots, repeatWeekdays } = req.body;
    if (!name || !day || !time || !spots) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    const resolvedTrainer = await resolveTrainer(trainerId || trainer);
    if (!resolvedTrainer) {
      return res.status(400).json({ message: "Debes asignar un entrenador valido" });
    }

    const normalizedDay = normalizeClassDay(day);
    const shouldRepeatWeekdays =
      repeatWeekdays === true ||
      String(repeatWeekdays || "")
        .trim()
        .toLowerCase() === "true";
    const targetDays =
      normalizedDay === "Lunes" && shouldRepeatWeekdays
        ? ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"]
        : [normalizedDay];
    const trainerRef = String(resolvedTrainer._id);
    const className = String(name).trim();
    const classTime = String(time).trim();
    const classSpots = Number(spots);

    const existing = await ClassModel.find({
      name: className,
      time: classTime,
      trainer: trainerRef,
      day: { $in: targetDays },
      active: true
    }).select("_id day");
    const existingDays = new Set(existing.map((c) => c.day));

    const docsToCreate = targetDays
      .filter((targetDay) => !existingDays.has(targetDay))
      .map((targetDay) => ({
        name: className,
        day: targetDay,
        time: classTime,
        trainer: trainerRef,
        spots: classSpots,
        active: true
      }));

    if (docsToCreate.length > 0) {
      await ClassModel.insertMany(docsToCreate);
    }

    const savedClasses = await ClassModel.find({
      name: className,
      time: classTime,
      trainer: trainerRef,
      day: { $in: targetDays },
      active: true
    });
    const classesByDay = new Map(savedClasses.map((c) => [c.day, c]));
    const orderedClasses = targetDays
      .map((targetDay) => classesByDay.get(targetDay))
      .filter(Boolean);

    const payloadClasses = orderedClasses.map((item) => ({
      id: item._id,
      name: item.name,
      day: item.day,
      time: item.time,
      trainerId: resolvedTrainer._id,
      trainerName: resolvedTrainer.name,
      trainer: resolvedTrainer.name,
      spots: item.spots,
      booked: item.booked,
      active: item.active,
      revenue: (item.booked || 0) * 1900
    }));

    return res.status(docsToCreate.length > 0 ? 201 : 200).json({
      message:
        normalizedDay === "Lunes" && shouldRepeatWeekdays
          ? "Clases de lunes a viernes procesadas"
          : "Clase procesada",
      createdCount: docsToCreate.length,
      skippedDays: targetDays.filter((targetDay) => existingDays.has(targetDay)),
      class: payloadClasses[0] || null,
      classes: payloadClasses
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/classes/:classId", auth, isAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const { name, day, time, trainerId, trainer, spots } = req.body;

    const $set = {
      ...(name ? { name: String(name).trim() } : {}),
      ...(day ? { day: String(day).trim() } : {}),
      ...(time ? { time: String(time).trim() } : {}),
      ...(spots ? { spots: Number(spots) } : {})
    };

    if (trainerId || trainer) {
      const resolvedTrainer = await resolveTrainer(trainerId || trainer);
      if (!resolvedTrainer) {
        return res.status(400).json({ message: "Debes asignar un entrenador valido" });
      }
      $set.trainer = String(resolvedTrainer._id);
    }

    const updated = await ClassModel.findByIdAndUpdate(
      classId,
      { $set },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Clase no encontrada" });
    }

    const resolvedTrainer = await resolveTrainer(updated.trainer);

    return res.json({
      class: {
        id: updated._id,
        name: updated.name,
        day: updated.day,
        time: updated.time,
        trainerId: resolvedTrainer?._id || null,
        trainerName: resolvedTrainer?.name || updated.trainer,
        trainer: resolvedTrainer?.name || updated.trainer,
        spots: updated.spots,
        booked: updated.booked,
        active: updated.active,
        revenue: (updated.booked || 0) * 1900
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/classes/:classId/assign-trainer", auth, isAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const { trainerId } = req.body;

    if (!trainerId) {
      return res.status(400).json({ message: "trainerId es requerido" });
    }

    const trainer = await User.findOne({
      _id: trainerId,
      ...trainerQuery,
      isActive: { $ne: false }
    }).select("_id name email role roles");

    if (!trainer) {
      return res.status(404).json({ message: "Entrenador no encontrado o inactivo" });
    }

    const updated = await ClassModel.findByIdAndUpdate(
      classId,
      { $set: { trainer: String(trainer._id) } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Clase no encontrada" });
    }

    return res.json({
      message: "Entrenador asignado correctamente",
      class: {
        id: updated._id,
        name: updated.name,
        day: updated.day,
        time: updated.time,
        trainer: updated.trainer,
        spots: updated.spots,
        booked: updated.booked,
        active: updated.active
      },
      trainer: {
        id: trainer._id,
        name: trainer.name,
        email: trainer.email
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/classes/:classId/unassign-trainer", auth, isAdmin, async (req, res) => {
  try {
    return res.status(400).json({ message: "Las clases deben tener un entrenador asignado" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/classes/:classId/cancel", auth, isAdmin, async (req, res) => {
  try {
    const updated = await ClassModel.findByIdAndUpdate(
      req.params.classId,
      { $set: { active: false } },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Clase no encontrada" });
    }
    return res.json({ message: "Clase cancelada", class: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/classes/:classId/activate", auth, isAdmin, async (req, res) => {
  try {
    const updated = await ClassModel.findByIdAndUpdate(
      req.params.classId,
      { $set: { active: true } },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Clase no encontrada" });
    }
    return res.json({ message: "Clase activada", class: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/site-config", auth, isAdmin, async (_req, res) => {
  try {
    const config = await getSiteConfig();
    return res.json({
      logoUrl: config.logoUrl || "",
      plans: config.plans || [],
      announcements: config.announcements || []
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/site-config", auth, isAdmin, async (req, res) => {
  try {
    const { logoUrl, plans, announcements } = req.body;
    const config = await getSiteConfig();

    if (typeof logoUrl === "string") {
      config.logoUrl = logoUrl.trim();
    }

    if (Array.isArray(plans) && plans.length > 0) {
      config.plans = plans.map((p) => ({
        id: String(p.id || "").trim(),
        name: String(p.name || "").trim(),
        description: String(p.description || "").trim(),
        price: Number(p.price || 0),
        features: Array.isArray(p.features) ? p.features.map((f) => String(f).trim()).filter(Boolean) : [],
        popular: Boolean(p.popular)
      }));
    }

    if (Array.isArray(announcements)) {
      config.announcements = announcements
        .map((a) => ({
          id: String(a.id || "").trim(),
          sector: String(a.sector || "").trim(),
          title: String(a.title || "").trim(),
          imageUrl: String(a.imageUrl || "").trim(),
          linkUrl: String(a.linkUrl || "").trim(),
          active: Boolean(a.active)
        }))
        .filter((a) => a.id && a.sector);
    }

    await config.save();
    return res.json({
      message: "Configuracion guardada",
      logoUrl: config.logoUrl || "",
      plans: config.plans || [],
      announcements: config.announcements || []
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/trainers", auth, isAdmin, async (_req, res) => {
  try {
    const trainers = await User.find(trainerQuery).sort({ createdAt: -1 });
    const classes = await ClassModel.find({ active: true });
    const attendance = await Attendance.find({ trainer: { $in: trainers.map((t) => t._id) } });

    const mapped = trainers.map((t) => {
      const trainerClasses = classes.filter((c) => c.trainer === t.name || c.trainer === String(t._id));
      const students = new Set(
        attendance
          .filter((a) => String(a.trainer) === String(t._id))
          .map((a) => String(a.user))
      );

      return {
        id: t._id,
        name: t.name,
        email: t.email,
        phone: t.phone || "-",
        specialties: t.trainerInfo?.specialties?.length ? t.trainerInfo.specialties : ["Funcional"],
        classesPerWeek: trainerClasses.length,
        students: students.size,
        rating: 4.8,
        status: t.isActive === false ? "inactive" : "active",
        joinDate: toDateLabel(t.createdAt)
      };
    });

    return res.json({ trainers: mapped });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/trainers/assignable", auth, isAdmin, async (_req, res) => {
  try {
    const [trainers, classes] = await Promise.all([
      User.find({ ...trainerQuery, isActive: { $ne: false } }).select("name email trainerInfo createdAt"),
      ClassModel.find({ active: true }).select("trainer")
    ]);

    const mapped = trainers.map((trainer) => {
      const classesAssigned = classes.filter(
        (cls) => cls.trainer === trainer.name || cls.trainer === String(trainer._id)
      ).length;

      return {
        id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        specialties: trainer.trainerInfo?.specialties || [],
        classesAssigned
      };
    });

    return res.json({ trainers: mapped });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/payments", auth, isAdmin, async (_req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 }).limit(200).populate("user", "name plan");
    return res.json({
      payments: payments.map((p) => ({
        id: p._id,
        user: p.user?.name || "Alumno",
        amount: p.amount,
        plan: normalizePlan(p.user?.plan),
        method: p.method,
        date: toDateLabel(p.paidAt || p.createdAt),
        status: normalizePaymentStatus(p.status)
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/relationships", auth, isAdmin, async (req, res) => {
  try {
    const { trainerId, studentId, status } = req.query;
    const query = {};
    if (trainerId) query.trainer = trainerId;
    if (studentId) query.student = studentId;
    if (status) query.status = status;

    const relationships = await TrainerStudent.find(query)
      .populate("trainer", "name email phone trainerInfo.specialties")
      .populate("student", "name email phone plan status stats")
      .populate("assignedBy", "name")
      .sort({ assignedAt: -1 });

    const stats = {
      total: relationships.length,
      active: relationships.filter((r) => r.status === "active").length,
      inactive: relationships.filter((r) => r.status === "inactive").length,
      avgAttendance:
        relationships.length > 0
          ? Math.round(
              relationships.reduce((acc, r) => acc + (r.stats?.attendanceRate || 0), 0) /
                relationships.length
            )
          : 0
    };

    return res.json({ relationships, stats });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/relationships/assign", auth, isAdmin, async (req, res) => {
  try {
    const { trainerId, studentId, reason } = req.body;
    if (!trainerId || !studentId) {
      return res.status(400).json({ message: "trainerId y studentId son requeridos" });
    }

    const [trainer, student] = await Promise.all([User.findById(trainerId), User.findById(studentId)]);

    const trainerRoles = Array.isArray(trainer?.roles) && trainer.roles.length > 0 ? trainer.roles : [trainer?.role];
    if (!trainer || !trainerRoles.includes("trainer")) {
      return res.status(400).json({ message: "Entrenador no valido" });
    }
    if (!student) {
      return res.status(400).json({ message: "Alumno no encontrado" });
    }

    const relationship = await TrainerStudent.findOneAndUpdate(
      { trainer: trainerId, student: studentId },
      {
        $set: {
          trainer: trainerId,
          student: studentId,
          assignedBy: req.user.userId,
          assignedAt: new Date(),
          status: "active"
        }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await AdminAction.create({
      admin: req.user.userId,
      action: "trainer_assigned",
      targetType: "user",
      targetId: student._id,
      targetName: student.name,
      newData: { trainerId, trainerName: trainer.name },
      reason: reason || "",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || ""
    });

    return res.json({ message: `${student.name} asignado a ${trainer.name}`, relationship });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "El alumno ya esta asignado a este entrenador" });
    }
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/relationships/:id", auth, isAdmin, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const relationship = await TrainerStudent.findById(req.params.id)
      .populate("trainer", "name")
      .populate("student", "name");

    if (!relationship) {
      return res.status(404).json({ message: "Relacion no encontrada" });
    }

    relationship.status = "inactive";
    await relationship.save();

    await AdminAction.create({
      admin: req.user.userId,
      action: "trainer_removed",
      targetType: "user",
      targetId: relationship.student._id,
      targetName: relationship.student.name,
      previousData: {
        trainerId: relationship.trainer._id,
        trainerName: relationship.trainer.name
      },
      reason: reason || "",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || ""
    });

    return res.json({ message: "Asignacion removida" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/supervision/:trainerId", auth, isAdmin, async (req, res) => {
  try {
    const { trainerId } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const students = await TrainerStudent.find({ trainer: trainerId, status: "active" })
      .populate("student", "name email phone plan status stats progress")
      .sort({ assignedAt: -1 });

    const trainerDoc = await User.findById(trainerId).select("name email trainerInfo");
    if (!trainerDoc) {
      return res.status(404).json({ message: "Entrenador no encontrado" });
    }

    const classTrainerCandidates = Array.from(
      new Set(
        [
          String(trainerDoc._id),
          trainerDoc.name,
          trainerDoc.name?.split(" ")[0],
          ...(Array.isArray(trainerDoc?.trainerInfo?.aliases) ? trainerDoc.trainerInfo.aliases : [])
        ]
          .filter(Boolean)
          .map((v) => String(v).trim())
      )
    );

    const classes = await ClassModel.find({
      trainer: { $in: classTrainerCandidates },
      ...dateFilter
    }).sort({ day: 1, time: 1 });

    const attendances = await Attendance.find({
      trainer: trainerId,
      ...dateFilter
    })
      .populate("user", "name")
      .populate("class", "name day time")
      .sort({ createdAt: -1 })
      .limit(50);

    const routines = await Routine.find({
      assignedBy: trainerId,
      ...dateFilter
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const presentCount = attendances.filter((a) => a.status === "present").length;
    const stats = {
      totalStudents: students.length,
      totalClasses: classes.length,
      totalAttendances: attendances.length,
      attendanceRate: attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 0,
      avgPerformance:
        attendances.length > 0
          ? Number(
              (
                attendances.reduce((acc, a) => acc + (a.performance?.effort || 0), 0) / attendances.length
              ).toFixed(1)
            )
          : 0
    };

    return res.json({
      trainer: trainerDoc,
      students,
      classes,
      recentAttendances: attendances.slice(0, 20),
      routines,
      stats
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/payments/overview", auth, isAdmin, async (_req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyPayments = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          status: { $in: ["paid", "completed"] }
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    const byPlan = await Payment.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: { $in: ["paid", "completed"] } } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$userInfo.plan", total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    const byMethod = await Payment.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: { $in: ["paid", "completed"] } } },
      { $group: { _id: "$method", total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    const usersWithDebt = await User.find({
      status: "active",
      planExpires: { $lt: today }
    })
      .select("name email phone plan planExpires debt")
      .sort({ planExpires: 1 });

    const pendingPayments = await Payment.find({ status: "pending" })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    return res.json({
      monthly: {
        total: monthlyPayments[0]?.total || 0,
        count: monthlyPayments[0]?.count || 0
      },
      byPlan,
      byMethod,
      debts: {
        count: usersWithDebt.length,
        total: usersWithDebt.reduce((acc, u) => acc + Number(u.debt || 0), 0),
        users: usersWithDebt
      },
      pending: pendingPayments
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/payments/register", auth, isAdmin, async (req, res) => {
  try {
    const { userId, amount, plan, method, monthsPaid, notes } = req.body;
    if (!userId || !amount || !plan) {
      return res.status(400).json({ message: "userId, amount y plan son requeridos" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const currentExpiry = user.planExpires && user.planExpires > new Date() ? user.planExpires : new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + Number(monthsPaid || 1));

    const payment = await Payment.create({
      user: userId,
      amount: Number(amount),
      method: toPaymentMethod(method),
      status: "paid",
      paidAt: new Date()
    });

    const classCount = getPlanClassCount(plan);
    user.plan = plan;
    user.planExpires = newExpiry;
    user.paymentMethod = { type: toPaymentMethod(method) };
    user.status = "active";
    user.isActive = true;
    if (classCount !== null) user.classesLeft = classCount;
    await user.save();

    await AdminAction.create({
      admin: req.user.userId,
      action: "payment_registered",
      targetType: "payment",
      targetId: payment._id,
      targetName: user.name,
      newData: { amount: Number(amount), plan, method: toPaymentMethod(method), expires: newExpiry },
      reason: notes || "",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || ""
    });

    return res.json({
      message: "Pago registrado correctamente",
      payment,
      user: {
        plan: user.plan,
        planExpires: user.planExpires,
        status: user.status
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/users/:id/deactivate", auth, isAdmin, async (req, res) => {
  try {
    const { reason, type, finalPayment } = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role || "user"];
    if (userRoles.includes("admin")) {
      const adminCount = await User.countDocuments({
        $or: [{ role: "admin" }, { roles: "admin" }],
        status: "active"
      });
      if (adminCount <= 1) {
        return res.status(400).json({ message: "No puedes dar de baja al unico admin" });
      }
    }

    const previousData = {
      status: user.status,
      plan: user.plan,
      planExpires: user.planExpires,
      classesLeft: user.classesLeft
    };

    user.status = "inactive";
    user.isActive = false;
    user.deactivationReason = reason || "";
    user.deactivationType = type || "other";
    user.deactivatedAt = new Date();
    user.deactivatedBy = req.user.userId;
    user.finalPayment = Number(finalPayment || 0);
    user.plan = "none";
    user.classesLeft = 0;
    await user.save();

    await Booking.updateMany(
      { user: user._id, status: "booked" },
      { status: "cancelled", cancellationReason: "Usuario dado de baja", cancelledAt: new Date() }
    );

    await TrainerStudent.updateMany({ student: user._id, status: "active" }, { status: "inactive" });

    await AdminAction.create({
      admin: req.user.userId,
      action: "user_deactivated",
      targetType: "user",
      targetId: user._id,
      targetName: user.name,
      previousData,
      newData: { status: "inactive", reason: reason || "", type: type || "other" },
      reason: reason || "",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || ""
    });

    return res.json({
      message: `${user.name} dado de baja correctamente`,
      user: {
        id: user._id,
        name: user.name,
        status: user.status,
        deactivatedAt: user.deactivatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/users/:id/history", auth, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const [user, actions, payments, attendances, relationships] = await Promise.all([
      User.findById(userId).select("-password"),
      AdminAction.find({ targetId: userId }).populate("admin", "name").sort({ createdAt: -1 }),
      Payment.find({ user: userId }).sort({ createdAt: -1 }),
      Attendance.find({ user: userId })
        .populate("class", "name day time")
        .populate("trainer", "name")
        .sort({ createdAt: -1 }),
      TrainerStudent.find({ student: userId }).populate("trainer", "name").sort({ assignedAt: -1 })
    ]);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({
      user,
      adminHistory: actions,
      payments,
      attendances,
      trainerHistory: relationships
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
