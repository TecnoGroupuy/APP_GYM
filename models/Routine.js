const mongoose = require("mongoose");

const routineExerciseSchema = new mongoose.Schema(
  {
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise"
    },
    // Legacy support for older routines
    name: { type: String, trim: true },
    order: { type: Number, required: true },
    sets: { type: Number, default: 3 },
    reps: { type: String, default: "10-12" },
    rest: { type: String, default: "60 segundos" },
    weight: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    alternatives: [
      {
        exercise: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
        reason: { type: String, trim: true }
      }
    ],
    completed: { type: Boolean, default: false },
    actualWeight: { type: String, trim: true },
    actualReps: { type: String, trim: true },
    perceivedEffort: { type: Number, min: 1, max: 10 },
    painLevel: { type: Number, min: 0, max: 10 }
  },
  { _id: true }
);

const routineLevelExerciseSchema = new mongoose.Schema(
  {
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
    order: { type: Number, default: 0 },
    sets: { type: Number, default: 3 },
    reps: { type: String, default: "10-12" },
    rest: { type: String, default: "60 segundos" },
    weight: { type: String, trim: true, default: "" },
    tempo: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    alternatives: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exercise" }]
  },
  { _id: true }
);

const routineLevelSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true, min: 1, max: 10 },
    name: { type: String, trim: true, default: "" },
    durationWeeks: { type: Number, default: 2, min: 1 },
    config: {
      frequency: { type: String, trim: true, default: "" },
      sets: { type: Number, default: 3 },
      reps: { type: String, default: "10-12" },
      rest: { type: String, default: "60 segundos" },
      intensity: {
        type: String,
        enum: ["muy-ligero", "ligero", "moderado", "pesado", "muy-pesado", "maximo"],
        default: "moderado"
      },
      rpe: { type: Number, min: 1, max: 10, default: 7 }
    },
    exercises: [routineLevelExerciseSchema],
    progressionCriteria: {
      minAttendance: { type: Number, default: 75 },
      minPerformance: { type: Number, default: 6 },
      tests: [
        {
          name: { type: String, trim: true },
          description: { type: String, trim: true },
          target: { type: String, trim: true }
        }
      ]
    },
    activeFrom: { type: Date, default: null },
    activeUntil: { type: Date, default: null },
    results: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      attendanceRate: { type: Number, default: 0 },
      avgPerformance: { type: Number, default: 0 },
      notes: { type: String, trim: true, default: "" }
    }
  },
  { _id: true }
);

const routineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    exercises: [routineExerciseSchema],
    category: {
      type: String,
      enum: ["fuerza", "hipertrofia", "resistencia", "perdida-de-peso", "movilidad", "rehabilitacion", "full-body"],
      default: "full-body"
    },
    difficulty: {
      type: String,
      enum: ["principiante", "intermedio", "avanzado", "elite", "Principiante", "Intermedio", "Avanzado"],
      default: "intermedio"
    },
    duration: { type: Number, default: 45 },
    frequency: { type: String, trim: true, default: "" },
    scheduledFor: { type: Date, default: null },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },
    status: {
      type: String,
      enum: ["draft", "active", "completed", "cancelled"],
      default: "draft"
    },
    isProgressive: { type: Boolean, default: true },
    totalLevels: { type: Number, default: 4, min: 1, max: 10 },
    currentLevel: { type: Number, default: 1, min: 1, max: 10 },
    levels: [routineLevelSchema],
    progressionMode: {
      type: String,
      enum: ["auto", "manual", "trainer-approved"],
      default: "trainer-approved"
    },
    progress: {
      timesCompleted: { type: Number, default: 0 },
      lastCompleted: { type: Date, default: null },
      currentStreak: { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
      currentWeek: { type: Number, default: 1, min: 1 },
      totalWeeks: { type: Number, default: 8, min: 1 },
      startedAt: { type: Date, default: null },
      estimatedEnd: { type: Date, default: null },
      actualEnd: { type: Date, default: null },
      levelHistory: [
        {
          level: { type: Number, min: 1, max: 10 },
          completedAt: { type: Date, default: null },
          attendanceRate: { type: Number, default: 0 },
          avgPerformance: { type: Number, default: 0 }
        }
      ],
      streak: { type: Number, default: 0 },
      totalSessions: { type: Number, default: 0 },
      totalSessionsCompleted: { type: Number, default: 0 }
    },
    userRating: { type: Number, min: 1, max: 5 },
    userFeedback: { type: String, trim: true },
    isTemplate: { type: Boolean, default: false },
    templateName: { type: String, trim: true, default: "" },
    timesUsedAsTemplate: { type: Number, default: 0 },
    // Legacy support
    completed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

routineSchema.pre("validate", function preValidate(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  if (Array.isArray(this.exercises)) {
    this.exercises = this.exercises.map((exercise, index) => ({
      ...(exercise?.toObject ? exercise.toObject() : exercise),
      order: Number.isFinite(exercise.order) ? exercise.order : index
    }));
  }

  if (!Array.isArray(this.levels)) {
    this.levels = [];
  }

  if (this.isProgressive && this.levels.length > 0) {
    this.totalLevels = this.levels.length;
    const totalWeeks = this.levels.reduce((sum, level) => sum + Number(level.durationWeeks || 0), 0);
    if (!this.progress) this.progress = {};
    this.progress.totalWeeks = totalWeeks > 0 ? totalWeeks : this.progress.totalWeeks || 8;
    if (!this.currentLevel || this.currentLevel < 1) {
      this.currentLevel = 1;
    }
    if (this.currentLevel > this.totalLevels) {
      this.currentLevel = this.totalLevels;
    }
  }

  if (!this.progress.startedAt && this.status === "active") {
    this.progress.startedAt = new Date();
  }

  if (this.progress.startedAt && !this.progress.estimatedEnd && this.progress.totalWeeks) {
    const estimated = new Date(this.progress.startedAt);
    estimated.setDate(estimated.getDate() + Number(this.progress.totalWeeks || 0) * 7);
    this.progress.estimatedEnd = estimated;
  }

  return next();
});

module.exports = mongoose.model("Routine", routineSchema);
