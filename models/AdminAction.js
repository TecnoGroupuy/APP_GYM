const mongoose = require("mongoose");

const adminActionSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    action: {
      type: String,
      enum: [
        "user_created",
        "user_updated",
        "user_deleted",
        "user_deactivated",
        "payment_registered",
        "payment_refunded",
        "plan_changed",
        "trainer_assigned",
        "trainer_removed",
        "role_changed",
        "class_created",
        "class_updated",
        "class_deleted",
        "routine_assigned",
        "note_added",
        "notification_sent"
      ],
      required: true
    },
    targetType: {
      type: String,
      enum: ["user", "payment", "class", "routine", "booking", "system"],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    targetName: { type: String, trim: true },
    previousData: { type: mongoose.Schema.Types.Mixed, default: null },
    newData: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true }
  },
  { timestamps: true }
);

adminActionSchema.index({ admin: 1, createdAt: -1 });
adminActionSchema.index({ action: 1 });
adminActionSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model("AdminAction", adminActionSchema);
