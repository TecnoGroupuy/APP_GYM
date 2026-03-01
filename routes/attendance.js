const express = require("express");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const ClassModel = require("../models/Class");
const auth = require("../middleware/auth");

const router = express.Router();

const dayIndex = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6
};

const buildScheduledDate = (classData) => {
  const now = new Date();
  const target = new Date(now);
  const classDay = dayIndex[String(classData.day || "").toLowerCase()] ?? now.getDay();
  const diff = (classDay - now.getDay() + 7) % 7;
  target.setDate(now.getDate() + diff);

  const [hh, mm] = String(classData.time || "00:00")
    .split(":")
    .map((v) => Number(v));
  target.setHours(Number.isNaN(hh) ? 0 : hh, Number.isNaN(mm) ? 0 : mm, 0, 0);
  return target;
};

const isAdminOrTrainer = (req) => {
  const roles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
  return roles.includes("admin") || roles.includes("trainer");
};

router.post("/manual", auth, async (req, res) => {
  try {
    if (!isAdminOrTrainer(req)) {
      return res.status(403).json({ message: "Solo admin o trainer puede registrar asistencia manual" });
    }

    const {
      userId,
      classId,
      checkInMethod,
      status = "present",
      delayMinutes = 0,
      notes = "",
      idCardShown = false,
      phoneConfirmation = false,
      newUserData
    } = req.body;

    const manualMethods = ["manual_trainer", "manual_admin", "manual_reception"];
    if (!manualMethods.includes(checkInMethod)) {
      return res.status(400).json({ message: "checkInMethod invalido para registro manual" });
    }

    let user = userId ? await User.findById(userId).select("+password") : null;
    let isNewUser = false;
    let tempPassword;

    if (!user && newUserData) {
      tempPassword = Math.random().toString(36).slice(-8);
      user = new User({
        name: newUserData.name,
        phone: newUserData.phone,
        email: newUserData.email || `${String(newUserData.phone || "").replace(/\s+/g, "")}@temp.bootcamp`,
        password: tempPassword,
        plan: newUserData.plan || "8pases",
        status: "active",
        roles: ["user"],
        isTemporary: true,
        memberSince: new Date()
      });
      await user.save();
      isNewUser = true;
    }

    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado o datos insuficientes" });
    }

    const classData = await ClassModel.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: "Clase no encontrada" });
    }

    const existingAttendance = await Attendance.findOne({
      user: user._id,
      class: classId
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: "Este usuario ya tiene asistencia registrada en esta clase",
        existing: existingAttendance
      });
    }

    const attendance = new Attendance({
      user: user._id,
      class: classId,
      registeredBy: req.user.userId,
      checkInMethod,
      status,
      delayMinutes: Number(delayMinutes || 0),
      scheduledTime: buildScheduledDate(classData),
      checkInTime: new Date(),
      manualEntry: {
        receptionistName: checkInMethod === "manual_reception" ? req.user.name : null,
        trainerName: checkInMethod === "manual_trainer" ? req.user.name : null,
        notes,
        idCardShown: Boolean(idCardShown),
        phoneConfirmation: Boolean(phoneConfirmation)
      },

      // compatibility
      trainer: req.user.userId,
      checkedInAt: new Date(),
      notes
    });

    await attendance.save();

    const userUpdate = {
      $inc: {
        "progress.totalWorkouts": 1,
        "progress.workoutsThisMonth": 1
      },
      $set: { lastAttendance: new Date() }
    };

    if (user.plan !== "libre" && Number(user.classesLeft || 0) > 0) {
      userUpdate.$inc.classesLeft = -1;
    }

    await User.findByIdAndUpdate(user._id, userUpdate);

    const populatedAttendance = await Attendance.findById(attendance._id).populate("user", "name phone plan classesLeft");

    return res.json({
      message: isNewUser ? "Nuevo usuario creado y asistencia registrada" : "Asistencia registrada",
      attendance: populatedAttendance,
      isNewUser,
      tempPassword: isNewUser ? tempPassword : undefined
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/search", auth, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || String(query).trim().length < 3) {
      return res.status(400).json({ message: "Minimo 3 caracteres" });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } }
      ],
      status: { $in: ["active", "pending"] }
    })
      .select("name phone email plan classesLeft status memberSince")
      .limit(10);

    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/today", auth, async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendances = await Attendance.find({
      checkInTime: { $gte: today, $lt: tomorrow }
    })
      .populate("user", "name phone plan")
      .populate("class", "name time trainer")
      .populate("registeredBy", "name")
      .sort({ checkInTime: -1 });

    const byMethod = {
      app: attendances.filter((a) => a.checkInMethod === "app").length,
      manual: attendances.filter((a) => String(a.checkInMethod).startsWith("manual")).length,
      qr: attendances.filter((a) => a.checkInMethod === "qr").length
    };

    return res.json({
      total: attendances.length,
      byMethod,
      attendances
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:id/validate", auth, async (req, res) => {
  try {
    if (!isAdminOrTrainer(req)) {
      return res.status(403).json({ message: "Solo admin o trainer puede validar asistencias" });
    }

    const { isValid, reason } = req.body;
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      {
        isValidated: Boolean(isValid),
        validatedBy: req.user.userId,
        "manualEntry.notes": reason || ""
      },
      { new: true }
    );

    if (!attendance) {
      return res.status(404).json({ message: "Asistencia no encontrada" });
    }

    return res.json({
      message: isValid ? "Asistencia validada" : "Asistencia invalidada",
      attendance
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
