const express = require("express");
const User = require("../models/User");
const ClassModel = require("../models/Class");
const Booking = require("../models/Booking");
const Attendance = require("../models/Attendance");
const Routine = require("../models/Routine");
const auth = require("../middleware/auth");

const router = express.Router();

const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
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

const getScheduledDate = (classData) => {
  const now = new Date();
  const target = new Date(now);
  const classDay = dayIndex[String(classData?.day || "").toLowerCase()] ?? now.getDay();
  const diff = (classDay - now.getDay() + 7) % 7;
  target.setDate(now.getDate() + diff);

  const [hh, mm] = String(classData?.time || "00:00")
    .split(":")
    .map((v) => Number(v));
  target.setHours(Number.isNaN(hh) ? 0 : hh, Number.isNaN(mm) ? 0 : mm, 0, 0);
  return target;
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

const isTrainer = (req, res, next) => {
  if (req.user.role !== "trainer" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Acceso denegado. Solo entrenadores." });
  }

  return next();
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

const getTrainerClassFilter = async (req) => {
  const trainer = await User.findById(req.user.id).select("name trainerInfo.aliases");
  const firstName = trainer?.name ? trainer.name.split(" ")[0] : null;
  const aliases = Array.isArray(trainer?.trainerInfo?.aliases) ? trainer.trainerInfo.aliases : [];

  const candidates = Array.from(
    new Set(
      [req.user.id, req.user.name, trainer?.name, firstName, ...aliases]
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );

  return { trainer: { $in: candidates } };
};

router.get("/dashboard", auth, isTrainer, async (req, res) => {
  try {
    const trainerFilter = await getTrainerClassFilter(req);
    const today = new Date();
    const todayName = dayNames[today.getDay()];

    const myClassesToday = await ClassModel.find({
      ...trainerFilter,
      day: todayName,
      active: true
    }).sort({ time: 1 });

    const totalStudents = await User.countDocuments({ role: "user", isActive: true });

    const weekClasses = await ClassModel.countDocuments({
      ...trainerFilter,
      active: true
    });

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyAttendance = await Attendance.countDocuments({
      trainer: req.user.id,
      createdAt: { $gte: monthStart }
    });

    return res.json({
      stats: {
        totalStudents,
        weekClasses,
        monthlyAttendance,
        todayClasses: myClassesToday.length
      },
      todayClasses: myClassesToday
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/classes", auth, isTrainer, async (req, res) => {
  try {
    const trainerFilter = await getTrainerClassFilter(req);
    const classes = await ClassModel.find({
      ...trainerFilter,
      active: true
    }).sort({ day: 1, time: 1 });

    return res.json(classes);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/classes", auth, isTrainer, async (req, res) => {
  try {
    const { name, day, time, spots, repeatWeekdays } = req.body || {};
    if (!name || !day || !time || !spots) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
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

    const className = String(name).trim();
    const classTime = String(time).trim();
    const classSpots = Number(spots);
    const trainerRef = String(req.user.id);

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
      trainerId: req.user.id,
      trainerName: req.user.name,
      trainer: req.user.name,
      spots: item.spots,
      booked: item.booked,
      active: item.active
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

router.get("/classes/:classId/students", auth, isTrainer, async (req, res) => {
  try {
    const { classId } = req.params;
    const trainerFilter = await getTrainerClassFilter(req);

    const classData = await ClassModel.findOne({
      _id: classId,
      ...trainerFilter
    });

    if (!classData) {
      return res.status(404).json({ message: "Clase no encontrada o no autorizada" });
    }

    const bookings = await Booking.find({ class: classId, status: "booked" })
      .populate("user", "name email phone stats")
      .populate("class", "name time day spots booked");

    const attendances = await Attendance.find({ class: classId }).populate("user", "name");
    const attendanceByUser = new Map(attendances.map((a) => [a.user._id.toString(), a]));

    const students = bookings
      .filter((booking) => Boolean(booking.user))
      .map((booking) => {
        const userId = booking.user._id.toString();
        const attendance = attendanceByUser.get(userId) || null;

        return {
          bookingId: booking._id,
          userId: booking.user._id,
          name: booking.user.name,
          email: booking.user.email,
          phone: booking.user.phone,
          weight: booking.user.stats?.weight ?? null,
          isPresent: attendance?.status === "present",
          attendance
        };
      });

    return res.json({
      class: {
        id: classData._id,
        name: classData.name,
        day: classData.day,
        time: classData.time,
        spots: classData.spots,
        booked: classData.booked
      },
      students,
      totalRegistered: students.length,
      totalPresent: attendances.filter((a) => a.status === "present").length
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

const updateProgressByAttendance = async (userId, previousStatus, nextStatus) => {
  if (previousStatus !== "present" && nextStatus === "present") {
    await User.findByIdAndUpdate(userId, {
      $inc: {
        "progress.totalWorkouts": 1,
        "progress.workoutsThisMonth": 1
      }
    });
  }

  if (previousStatus === "present" && nextStatus !== "present") {
    await User.findByIdAndUpdate(userId, {
      $inc: {
        "progress.totalWorkouts": -1,
        "progress.workoutsThisMonth": -1
      }
    });
  }
};

router.post("/attendance", auth, isTrainer, async (req, res) => {
  try {
    const { classId, userId, status = "present", notes, performance } = req.body;
    const trainerFilter = await getTrainerClassFilter(req);

    const classData = await ClassModel.findOne({
      _id: classId,
      ...trainerFilter
    });

    if (!classData) {
      return res.status(403).json({ message: "No autorizado para esta clase" });
    }

    const previous = await Attendance.findOne({ class: classId, user: userId });

    const attendance = await Attendance.findOneAndUpdate(
      { class: classId, user: userId },
      {
        class: classId,
        user: userId,
        registeredBy: req.user.id,
        checkInMethod: "manual_trainer",
        scheduledTime: getScheduledDate(classData),
        checkInTime: new Date(),
        manualEntry: {
          trainerName: req.user.name,
          notes: notes || ""
        },
        trainer: req.user.id,
        status,
        notes,
        performance,
        checkedInAt: status === "present" ? new Date() : null
      },
      { upsert: true, new: true }
    );

    await updateProgressByAttendance(userId, previous?.status, status);

    return res.json({ message: "Asistencia registrada", attendance });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/attendance/bulk", auth, isTrainer, async (req, res) => {
  try {
    const { classId, attendances = [] } = req.body;
    const trainerFilter = await getTrainerClassFilter(req);

    const classData = await ClassModel.findOne({
      _id: classId,
      ...trainerFilter
    });

    if (!classData) {
      return res.status(403).json({ message: "No autorizado para esta clase" });
    }

    const results = [];

    for (const att of attendances) {
      const previous = await Attendance.findOne({ class: classId, user: att.userId });

      const attendance = await Attendance.findOneAndUpdate(
        { class: classId, user: att.userId },
        {
          class: classId,
          user: att.userId,
          registeredBy: req.user.id,
          checkInMethod: "manual_trainer",
          scheduledTime: getScheduledDate(classData),
          checkInTime: new Date(),
          manualEntry: {
            trainerName: req.user.name,
            notes: att.notes || ""
          },
          trainer: req.user.id,
          status: att.status || "present",
          notes: att.notes,
          checkedInAt: (att.status || "present") === "present" ? new Date() : null
        },
        { upsert: true, new: true }
      );

      await updateProgressByAttendance(att.userId, previous?.status, attendance.status);
      results.push(attendance);
    }

    return res.json({ message: `${results.length} asistencias registradas`, results });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/students", auth, isTrainer, async (req, res) => {
  try {
    const attendedIds = await Attendance.find({ trainer: req.user.id }).distinct("user");

    const students = await User.find({
      _id: { $in: attendedIds },
      role: "user"
    }).select("name email phone stats progress goals");

    return res.json(students);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/students/:studentId", auth, isTrainer, async (req, res) => {
  try {
    const { studentId } = req.params;

    const hasAttended = await Attendance.exists({
      user: studentId,
      trainer: req.user.id
    });

    if (!hasAttended) {
      return res.status(403).json({ message: "No tienes historial con este alumno" });
    }

    const student = await User.findById(studentId).select("-password");

    const attendanceHistory = await Attendance.find({
      user: studentId,
      trainer: req.user.id
    })
      .populate("class", "name day time")
      .sort({ createdAt: -1 });

    const routines = await Routine.find({
      user: studentId,
      assignedBy: req.user.id
    }).sort({ createdAt: -1 });

    const presentCount = attendanceHistory.filter((a) => a.status === "present").length;
    const averagePerformance =
      attendanceHistory.length > 0
        ? attendanceHistory.reduce((acc, curr) => acc + (curr.performance?.effort || 0), 0) /
          attendanceHistory.length
        : 0;

    return res.json({
      student,
      attendanceHistory,
      routines,
      stats: {
        totalClasses: attendanceHistory.length,
        presentCount,
        averagePerformance
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/routines/assign", auth, isTrainer, async (req, res) => {
  try {
    const {
      userId,
      name,
      description,
      exercises = [],
      duration,
      difficulty,
      category,
      frequency,
      scheduledFor
    } = req.body;

    const mappedExercises = (Array.isArray(exercises) ? exercises : []).map((ex, idx) => ({
      exercise: ex.exerciseId || ex.exercise || null,
      name: ex.name || "",
      order: Number.isFinite(ex.order) ? ex.order : idx,
      sets: Number(ex.sets || 3),
      reps: ex.reps || "10-12",
      rest: ex.rest || "60 segundos",
      weight: ex.weight || "",
      notes: ex.notes || ""
    }));

    const routine = new Routine({
      user: userId,
      name,
      description,
      exercises: mappedExercises,
      duration: Number(duration || 45),
      difficulty: difficulty || "intermedio",
      category: category || "full-body",
      frequency: frequency || "",
      status: "active",
      assignedBy: req.user.id,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null
    });

    await routine.save();
    return res.json({ message: "Rutina asignada", routine });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/students/:studentId/nutrition", auth, isTrainer, async (req, res) => {
  try {
    const { studentId } = req.params;

    const hasAttended = await Attendance.exists({
      user: studentId,
      trainer: req.user.id
    });

    if (!hasAttended) {
      return res.status(403).json({ message: "No tienes historial con este alumno" });
    }

    const nutritionPlan = sanitizeNutritionPlan(req.body || {});
    const student = await User.findByIdAndUpdate(
      studentId,
      {
        $set: {
          nutritionPlan,
          updatedAt: new Date()
        }
      },
      { new: true }
    ).select("-password");

    if (!student) {
      return res.status(404).json({ message: "Alumno no encontrado" });
    }

    return res.json({ message: "Plan nutricional actualizado", nutritionPlan: student.nutritionPlan, student });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
