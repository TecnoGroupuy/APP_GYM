const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    date: {
      type: Date
    },
    day: {
      type: String,
      trim: true
    },
    hour: {
      type: String,
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required() {
        return !this.student;
      }
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required() {
        return !this.student;
      }
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required() {
        return !this.student;
      }
    },
    checkInMethod: {
      type: String,
      enum: ["app", "manual_trainer", "manual_admin", "manual_reception", "qr", "card"],
      required() {
        return !this.student;
      }
    },
    manualEntry: {
      receptionistName: { type: String, trim: true },
      trainerName: { type: String, trim: true },
      notes: { type: String, trim: true },
      idCardShown: { type: Boolean, default: false },
      phoneConfirmation: { type: Boolean, default: false }
    },
    status: {
      type: String,
      enum: ["present", "late", "absent", "cancelled", "no_show"],
      default: "present"
    },
    scheduledTime: {
      type: Date,
      required() {
        return !this.student;
      }
    },
    checkInTime: {
      type: Date,
      default: Date.now
    },
    delayMinutes: {
      type: Number,
      default: 0
    },
    isValidated: {
      type: Boolean,
      default: true
    },
    validatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    isPreRegistered: {
      type: Boolean,
      default: false
    },
    preRegisteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    preRegistrationDate: Date,

    // Legacy fields kept for compatibility with existing trainer/admin flows.
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    checkedInAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    },
    performance: {
      intensity: { type: Number, min: 1, max: 10 },
      technique: { type: Number, min: 1, max: 10 },
      effort: { type: Number, min: 1, max: 10 }
    }
  },
  { timestamps: true }
);

attendanceSchema.index(
  { class: 1, user: 1 },
  { unique: true, partialFilterExpression: { class: { $exists: true }, user: { $exists: true } } }
);
attendanceSchema.index({ checkInTime: -1 });
attendanceSchema.index({ checkInMethod: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
