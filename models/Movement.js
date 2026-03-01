const mongoose = require("mongoose");

const movementSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    type: { type: String, required: true, trim: true },
    registeredBy: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    month: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Movement", movementSchema);
