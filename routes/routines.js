const express = require("express");
const Routine = require("../models/Routine");
const Exercise = require("../models/Exercise");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

const canManageRoutines = (req) => {
  const roles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
  return roles.includes("admin") || roles.includes("trainer");
};

const normalizeSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

const DEFAULT_LEVEL_CONFIGS = [
  {
    level: 1,
    name: "Adaptacion",
    durationWeeks: 2,
    config: { frequency: "2 veces/semana", sets: 2, reps: "12-15", rest: "90 seg", intensity: "ligero", rpe: 6 }
  },
  {
    level: 2,
    name: "Fundacion",
    durationWeeks: 2,
    config: { frequency: "3 veces/semana", sets: 3, reps: "10-12", rest: "75 seg", intensity: "moderado", rpe: 7 }
  },
  {
    level: 3,
    name: "Progresion",
    durationWeeks: 2,
    config: { frequency: "3-4 veces/semana", sets: 3, reps: "8-10", rest: "60 seg", intensity: "pesado", rpe: 8 }
  },
  {
    level: 4,
    name: "Intensificacion",
    durationWeeks: 2,
    config: { frequency: "4 veces/semana", sets: 4, reps: "6-8 / 15-20", rest: "45-90 seg", intensity: "muy-pesado", rpe: 9 }
  }
];

const mapLevelExercise = (ex, idx) => ({
  exercise: ex.exerciseId || ex.exercise || null,
  order: Number.isFinite(ex.order) ? ex.order : idx,
  sets: Number(ex.sets || 3),
  reps: ex.reps || "10-12",
  rest: ex.rest || "60 segundos",
  weight: ex.weight || "",
  tempo: ex.tempo || "",
  notes: ex.notes || "",
  alternatives: Array.isArray(ex.alternatives) ? ex.alternatives.map((alt) => alt.exercise || alt.exerciseId || alt) : []
});

const buildLevels = ({ levels = [], exercises = [], frequency = "" }) => {
  if (Array.isArray(levels) && levels.length > 0) {
    return levels.map((level, idx) => ({
      level: Number(level.level || idx + 1),
      name: level.name || `Nivel ${idx + 1}`,
      durationWeeks: Number(level.durationWeeks || 2),
      config: {
        frequency: level?.config?.frequency || frequency || "",
        sets: Number(level?.config?.sets || 3),
        reps: level?.config?.reps || "10-12",
        rest: level?.config?.rest || "60 segundos",
        intensity: level?.config?.intensity || "moderado",
        rpe: Number(level?.config?.rpe || 7)
      },
      exercises: (Array.isArray(level.exercises) ? level.exercises : exercises).map(mapLevelExercise),
      progressionCriteria: {
        minAttendance: Number(level?.progressionCriteria?.minAttendance || 75),
        minPerformance: Number(level?.progressionCriteria?.minPerformance || 6),
        tests: Array.isArray(level?.progressionCriteria?.tests) ? level.progressionCriteria.tests : []
      }
    }));
  }

  return DEFAULT_LEVEL_CONFIGS.map((template) => ({
    ...template,
    config: {
      ...template.config,
      frequency: template.config.frequency || frequency || ""
    },
    exercises: exercises.map((ex, idx) => ({
      exercise: ex.exerciseId || ex.exercise || null,
      order: Number.isFinite(ex.order) ? ex.order : idx,
      sets: Number(ex.sets || template.config.sets || 3),
      reps: ex.reps || template.config.reps || "10-12",
      rest: ex.rest || template.config.rest || "60 segundos",
      weight: ex.weight || "",
      notes: ex.notes || ""
    })),
    progressionCriteria: {
      minAttendance: 75,
      minPerformance: 6,
      tests: []
    }
  }));
};

router.get("/exercises", auth, async (req, res) => {
  try {
    const { category, muscle, difficulty, search } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (muscle) query.muscleGroups = muscle;
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: "i" } },
        { technicalName: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const exercises = await Exercise.find(query).sort({ "usageStats.timesUsed": -1, name: 1 });
    return res.json(exercises);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/exercises", auth, async (req, res) => {
  try {
    if (!canManageRoutines(req)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const canonicalName = req.body.name || req.body.displayName || req.body.technicalName;
    const slug = req.body.slug ? normalizeSlug(req.body.slug) : normalizeSlug(canonicalName);
    const exercise = new Exercise({
      ...req.body,
      name: canonicalName,
      slug,
      createdBy: req.user.userId
    });

    await exercise.save();
    return res.status(201).json(exercise);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/exercises/:id", auth, async (req, res) => {
  try {
    if (!canManageRoutines(req)) {
      return res.status(403).json({ message: "No autorizado" });
    }
    const payload = { ...req.body };
    if (!payload.name && (payload.displayName || payload.technicalName)) {
      payload.name = payload.displayName || payload.technicalName;
    }
    if (payload.slug || payload.name) {
      payload.slug = normalizeSlug(payload.slug || payload.name);
    }
    const exercise = await Exercise.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });
    if (!exercise) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }
    return res.json(exercise);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/templates", auth, async (_req, res) => {
  try {
    const templates = await Routine.find({ isTemplate: true, status: { $ne: "cancelled" } })
      .populate("exercises.exercise", "name media category")
      .populate("assignedBy", "name")
      .sort({ timesUsedAsTemplate: -1, createdAt: -1 });

    return res.json(templates);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    if (!canManageRoutines(req)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const {
      userId,
      name,
      description,
      category,
      difficulty,
      exercises = [],
      levels = [],
      isProgressive = true,
      totalLevels,
      currentLevel,
      progressionMode = "trainer-approved",
      duration,
      frequency,
      scheduledFor,
      validFrom,
      validUntil,
      isTemplate,
      templateName
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const mappedExercises = exercises.map((ex, idx) => ({
      exercise: ex.exerciseId || ex.exercise || null,
      name: ex.name || "",
      order: Number.isFinite(ex.order) ? ex.order : idx,
      sets: Number(ex.sets || 3),
      reps: ex.reps || "10-12",
      rest: ex.rest || "60 segundos",
      weight: ex.weight || "",
      notes: ex.notes || "",
      alternatives: Array.isArray(ex.alternatives)
        ? ex.alternatives.map((alt) => ({
            exercise: alt.exercise || alt.exerciseId,
            reason: alt.reason || ""
          }))
        : []
    }));

    const mappedLevels = buildLevels({
      levels,
      exercises,
      frequency
    });

    const computedTotalLevels = Number(totalLevels || mappedLevels.length || 4);
    const computedCurrentLevel = Math.min(
      Math.max(Number(currentLevel || 1), 1),
      computedTotalLevels
    );
    const computedTotalWeeks = mappedLevels.reduce((sum, level) => sum + Number(level.durationWeeks || 0), 0) || 8;

    const routine = new Routine({
      name,
      description,
      slug: normalizeSlug(name),
      user: userId,
      assignedBy: req.user.userId,
      exercises: mappedExercises,
      category: category || "full-body",
      difficulty: difficulty || "intermedio",
      duration: Number(duration || 45),
      frequency: frequency || "",
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      isProgressive: Boolean(isProgressive),
      totalLevels: computedTotalLevels,
      currentLevel: computedCurrentLevel,
      levels: mappedLevels,
      progressionMode,
      progress: {
        currentWeek: 1,
        totalWeeks: computedTotalWeeks,
        startedAt: new Date(),
        estimatedEnd: (() => {
          const end = new Date();
          end.setDate(end.getDate() + computedTotalWeeks * 7);
          return end;
        })(),
        timesCompleted: 0,
        totalSessions: mappedExercises.length * computedTotalWeeks,
        totalSessionsCompleted: 0
      },
      isTemplate: Boolean(isTemplate),
      templateName: templateName || "",
      status: "active"
    });

    await routine.save();

    for (const ex of mappedExercises) {
      if (ex.exercise) {
        await Exercise.findByIdAndUpdate(ex.exercise, { $inc: { "usageStats.timesUsed": 1 } });
      }
    }

    await routine.populate("exercises.exercise");
    await routine.populate("levels.exercises.exercise");
    return res.status(201).json(routine);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/user/:userId", auth, async (req, res) => {
  try {
    const routines = await Routine.find({ user: req.params.userId, status: { $ne: "cancelled" } })
      .populate("exercises.exercise", "name media category muscleGroups")
      .populate("levels.exercises.exercise", "name media category muscleGroups")
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 });
    return res.json(routines);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const routine = await Routine.findById(req.params.id)
      .populate("exercises.exercise")
      .populate("levels.exercises.exercise")
      .populate("user", "name email stats")
      .populate("assignedBy", "name");

    if (!routine) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }
    return res.json(routine);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    if (!canManageRoutines(req)) {
      return res.status(403).json({ message: "No autorizado" });
    }
    const payload = { ...req.body };
    if (payload.name) payload.slug = normalizeSlug(payload.name);
    const routine = await Routine.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    })
      .populate("exercises.exercise")
      .populate("levels.exercises.exercise");
    if (!routine) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }
    return res.json(routine);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/progress/user/:userId", auth, async (req, res) => {
  try {
    const routines = await Routine.find({ user: req.params.userId, status: { $ne: "cancelled" } })
      .select("name category difficulty isProgressive totalLevels currentLevel levels progress status")
      .sort({ createdAt: -1 });

    const summary = routines.map((routine) => {
      const totalWeeks = Number(routine?.progress?.totalWeeks || 0);
      const currentWeek = Number(routine?.progress?.currentWeek || 1);
      const progressPercent = totalWeeks > 0 ? Math.min(Math.round((currentWeek / totalWeeks) * 100), 100) : 0;
      return {
        id: routine._id,
        name: routine.name,
        category: routine.category,
        difficulty: routine.difficulty,
        status: routine.status,
        isProgressive: Boolean(routine.isProgressive),
        currentLevel: Number(routine.currentLevel || 1),
        totalLevels: Number(routine.totalLevels || 1),
        currentWeek,
        totalWeeks,
        progressPercent
      };
    });

    return res.json({ routines: summary });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/progression/level-up", auth, async (req, res) => {
  try {
    if (!canManageRoutines(req)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const routine = await Routine.findById(req.params.id);
    if (!routine) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }

    const totalLevels = Number(routine.totalLevels || routine.levels?.length || 1);
    if (routine.currentLevel >= totalLevels) {
      return res.status(400).json({ message: "La rutina ya esta en el nivel maximo" });
    }

    const previousLevel = Number(routine.currentLevel || 1);
    const currentLevelData = Array.isArray(routine.levels)
      ? routine.levels.find((level) => Number(level.level) === previousLevel)
      : null;
    const levelCompleted = Boolean(currentLevelData?.results?.completed);
    if (!levelCompleted) {
      return res.status(400).json({
        message: "Debes completar el nivel actual antes de subir"
      });
    }

    routine.currentLevel = previousLevel + 1;
    routine.progress.levelHistory = Array.isArray(routine.progress.levelHistory) ? routine.progress.levelHistory : [];
    routine.progress.levelHistory.push({
      level: previousLevel,
      completedAt: new Date(),
      attendanceRate: Number(req.body?.attendanceRate || 0),
      avgPerformance: Number(req.body?.avgPerformance || 0)
    });

    const weeksUntilPreviousLevel = (routine.levels || [])
      .filter((level) => Number(level.level) <= previousLevel)
      .reduce((sum, level) => sum + Number(level.durationWeeks || 0), 0);
    routine.progress.currentWeek = Math.max(Number(routine.progress.currentWeek || 1), weeksUntilPreviousLevel + 1);

    await routine.save();
    await routine.populate("levels.exercises.exercise", "name media category");
    return res.json({ message: "Nivel actualizado", routine });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/progression/adjust", auth, async (req, res) => {
  try {
    if (!canManageRoutines(req)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const { currentLevel, currentWeek, note } = req.body || {};
    const routine = await Routine.findById(req.params.id);
    if (!routine) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }

    const totalLevels = Number(routine.totalLevels || routine.levels?.length || 1);
    if (currentLevel !== undefined) {
      const level = Number(currentLevel);
      if (!Number.isFinite(level) || level < 1 || level > totalLevels) {
        return res.status(400).json({ message: `Nivel invalido. Debe estar entre 1 y ${totalLevels}` });
      }
      routine.currentLevel = level;
    }

    if (currentWeek !== undefined) {
      const week = Number(currentWeek);
      const totalWeeks = Number(routine.progress?.totalWeeks || 1);
      if (!Number.isFinite(week) || week < 1 || week > totalWeeks) {
        return res.status(400).json({ message: `Semana invalida. Debe estar entre 1 y ${totalWeeks}` });
      }
      routine.progress.currentWeek = week;
    }

    if (note) {
      routine.userFeedback = String(note).trim();
    }

    await routine.save();
    return res.json({ message: "Progresion ajustada", routine });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (!canManageRoutines(req)) {
      return res.status(403).json({ message: "No autorizado" });
    }
    const routine = await Routine.findByIdAndUpdate(req.params.id, { status: "cancelled" }, { new: true });
    if (!routine) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }
    return res.json({ message: "Rutina cancelada" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/:id/complete", auth, async (req, res) => {
  try {
    const { exercisesData = [] } = req.body;
    const routine = await Routine.findById(req.params.id);
    if (!routine) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }

    for (const data of exercisesData) {
      const exIndex = routine.exercises.findIndex((e) => e._id.toString() === String(data.exerciseRoutineId));
      if (exIndex !== -1) {
        routine.exercises[exIndex].completed = true;
        routine.exercises[exIndex].actualWeight = data.actualWeight;
        routine.exercises[exIndex].actualReps = data.actualReps;
        routine.exercises[exIndex].perceivedEffort = data.perceivedEffort;
        routine.exercises[exIndex].painLevel = data.painLevel;
      }
    }

    routine.progress.timesCompleted += 1;
    routine.progress.lastCompleted = new Date();
    routine.progress.currentStreak += 1;
    routine.progress.streak = (routine.progress.streak || 0) + 1;
    routine.progress.totalSessionsCompleted = Number(routine.progress.totalSessionsCompleted || 0) + 1;
    if (routine.progress.currentStreak > routine.progress.bestStreak) {
      routine.progress.bestStreak = routine.progress.currentStreak;
    }
    if (routine.progress.streak > routine.progress.bestStreak) {
      routine.progress.bestStreak = routine.progress.streak;
    }

    const totalWeeks = Number(routine.progress.totalWeeks || 1);
    const currentWeek = Number(routine.progress.currentWeek || 1);
    if (currentWeek < totalWeeks) {
      routine.progress.currentWeek = currentWeek + 1;
    }

    const levels = Array.isArray(routine.levels) ? routine.levels : [];
    const currentLevelNumber = Number(routine.currentLevel || 1);
    const totalLevels = Number(routine.totalLevels || levels.length || 1);
    const currentLevelData = levels.find((level) => Number(level.level) === currentLevelNumber);
    if (currentLevelData) {
      currentLevelData.results.completed = true;
      currentLevelData.results.completedAt = new Date();
      currentLevelData.results.avgPerformance = Number(req.body?.avgPerformance || currentLevelData.results.avgPerformance || 0);
      currentLevelData.results.attendanceRate = Number(req.body?.attendanceRate || currentLevelData.results.attendanceRate || 0);
      currentLevelData.results.notes = req.body?.notes || currentLevelData.results.notes || "";
    }

    routine.progress.levelHistory = Array.isArray(routine.progress.levelHistory) ? routine.progress.levelHistory : [];
    if (!routine.progress.levelHistory.some((entry) => Number(entry.level) === currentLevelNumber)) {
      routine.progress.levelHistory.push({
        level: currentLevelNumber,
        completedAt: new Date(),
        attendanceRate: Number(req.body?.attendanceRate || 0),
        avgPerformance: Number(req.body?.avgPerformance || 0)
      });
    }

    if (routine.isProgressive && routine.progressionMode === "auto" && currentLevelNumber < totalLevels) {
      routine.currentLevel = currentLevelNumber + 1;
      routine.status = "active";
      routine.completed = false;
    } else if (currentLevelNumber >= totalLevels) {
      routine.status = "completed";
      routine.completed = true;
      routine.progress.actualEnd = new Date();
    } else {
      routine.status = "active";
      routine.completed = false;
    }

    await routine.save();
    return res.json({ message: "Rutina completada", routine });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
