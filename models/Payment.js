const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    amount: { type: Number, required: true },
    amountPaid: { type: Number, default: null },
    planPrice: { type: Number, default: null },
    discount: { type: Number, default: 0 },
    currency: { type: String, default: "UYU" },
    method: {
      type: String,
      enum: ["mercado_pago", "transferencia", "efectivo", "otro"],
      default: "mercado_pago"
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },
    registeredBy: {
      type: String,
      enum: ["manual", "automatic"],
      default: "manual"
    },
    externalId: { type: String, default: null },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    expirationDate: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
