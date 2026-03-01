const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true
    },
    status: {
      type: String,
      enum: ["booked", "cancelled", "attended", "no_show"],
      default: "booked"
    },
    bookedAt: {
      type: Date,
      default: Date.now
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderSentAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, class: 1 }, { unique: true });

module.exports = mongoose.model("Booking", bookingSchema);
