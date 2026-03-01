const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Booking = require("../models/Booking");
const ClassModel = require("../models/Class");
const Routine = require("../models/Routine");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");

const router = express.Router();

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const getMonthSeries = () => {
  const now = new Date();
  const items = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    items.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: monthNames[d.getMonth()]
    });
  }
  return items;
};

router.get("/dashboard", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const nextBooking = await Booking.findOne({ user: req.user.id, status: "booked" })
      .sort({ createdAt: -1 })
      .populate("class", "name day time trainer");

    return res.json({
      user,
      nextClass: nextBooking?.class
        ? {
            id: nextBooking.class._id,
            name: nextBooking.class.name,
            day: nextBooking.class.day,
            time: nextBooking.class.time,
            trainer: nextBooking.class.trainer
          }
        : null
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/routines", auth, async (req, res) => {
  try {
    const routines = await Routine.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.json({ routines });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/progress", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("stats progress progressPhotos");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const monthSeries = getMonthSeries();
    const attendanceMap = new Map(
      (user.progress?.attendanceHistory || []).map((h) => [h.month, h])
    );

    const photoByMonth = new Map();
    (user.progressPhotos || []).forEach((photo) => {
      const d = new Date(photo.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      photoByMonth.set(key, photo);
    });

    const chart = monthSeries.map((m) => {
      const att = attendanceMap.get(m.month);
      const photo = photoByMonth.get(m.key);
      return {
        month: m.month,
        attendance: att?.percentage || 0,
        attended: att?.attended || 0,
        total: att?.total || 0,
        weight: photo?.weight ?? user.stats?.weight ?? 0,
        bodyFat: user.stats?.bodyFat ?? 0
      };
    });

    return res.json({ chart });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/payments", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("plan planExpires");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const payments = await Payment.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(30);
    return res.json({
      plan: user.plan,
      planExpires: user.planExpires,
      payments
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/nutrition", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("nutritionPlan");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const nutritionPlan = user.nutritionPlan || {};
    const meals = Array.isArray(nutritionPlan.meals) ? nutritionPlan.meals : [];

    return res.json({
      nutritionPlan: {
        status: nutritionPlan.status || "none",
        requestedAt: nutritionPlan.requestedAt || null,
        assignedAt: nutritionPlan.assignedAt || null,
        updatedAt: nutritionPlan.updatedAt || null,
        goal: nutritionPlan.goal || "",
        dailyCalories: nutritionPlan.dailyCalories ?? null,
        notes: nutritionPlan.notes || "",
        meals
      },
      hasPlan: nutritionPlan.status === "active" && meals.length > 0
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/nutrition/request", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("nutritionPlan");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const currentStatus = user.nutritionPlan?.status || "none";
    if (currentStatus === "active") {
      return res.status(400).json({ message: "Ya tienes un plan nutricional activo" });
    }

    if (currentStatus === "pending") {
      return res.json({ message: "Tu solicitud ya fue enviada y esta pendiente" });
    }

    user.nutritionPlan = {
      ...(user.nutritionPlan?.toObject ? user.nutritionPlan.toObject() : user.nutritionPlan),
      status: "pending",
      requestedAt: new Date(),
      updatedAt: new Date()
    };

    await user.save();

    return res.json({ message: "Solicitud enviada. Tu entrenador revisara tu plan nutricional." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/profile", auth, async (req, res) => {
  try {
    const payload = {
      ...(req.body.name ? { name: String(req.body.name).trim() } : {}),
      ...(req.body.phone ? { phone: String(req.body.phone).trim() } : {}),
      ...(Array.isArray(req.body.goals) ? { goals: req.body.goals } : {}),
      ...(req.body.stats ? { stats: req.body.stats } : {})
    };

    const user = await User.findByIdAndUpdate(req.user.id, { $set: payload }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    return res.json({ message: "Perfil actualizado", user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
