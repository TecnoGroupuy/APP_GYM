const mongoose = require("mongoose");

const trainerStudentSchema = new mongoose.Schema(
  {
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    status: {
      type: String,
      enum: ["active", "inactive", "completed"],
      default: "active"
    },
    stats: {
      totalClasses: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 0 },
      lastClass: { type: Date, default: null },
      nextClass: { type: Date, default: null }
    },
    trainerNotes: [
      {
        note: { type: String, trim: true },
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ["progress", "issue", "goal", "general"], default: "general" }
      }
    ],
    goals: [
      {
        description: { type: String, trim: true },
        deadline: { type: Date, default: null },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date, default: null }
      }
    ],
    routinesAssigned: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Routine"
      }
    ],
    evaluations: [
      {
        date: { type: Date, default: Date.now },
        weight: { type: Number, default: null },
        bodyFat: { type: Number, default: null },
        muscleMass: { type: Number, default: null },
        notes: { type: String, trim: true },
        photos: [{ type: String, trim: true }]
      }
    ]
  },
  { timestamps: true }
);

trainerStudentSchema.index({ trainer: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("TrainerStudent", trainerStudentSchema);
