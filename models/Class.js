const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    day: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    duration: { type: String, default: "45 min" },
    trainer: { type: String, required: true, trim: true },
    spots: { type: Number, required: true, min: 1 },
    booked: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);
