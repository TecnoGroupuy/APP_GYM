const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true, default: "" },
    technicalName: { type: String, trim: true, default: "" },
    slug: { type: String, unique: true, required: true, trim: true },
    category: {
      type: String,
      enum: ["fuerza", "cardio", "movilidad", "core", "full-body", "potencia"],
      required: true
    },
    muscleGroups: [
      {
        type: String,
        enum: [
          "pecho",
          "espalda",
          "hombros",
          "biceps",
          "triceps",
          "core",
          "cuadriceps",
          "isquiotibiales",
          "gluteos",
          "pantorrillas",
          "full-body"
        ]
      }
    ],
    difficulty: {
      type: String,
      enum: ["principiante", "intermedio", "avanzado"],
      default: "intermedio"
    },
    media: {
      icon: { type: String, trim: true },
      image: { type: String, trim: true },
      gif: { type: String, trim: true },
      video: { type: String, trim: true },
      videoDuration: Number
    },
    description: { type: String, trim: true },
    instructions: [{ type: String, trim: true }],
    tips: [{ type: String, trim: true }],
    commonMistakes: [{ type: String, trim: true }],
    variations: [
      {
        name: { type: String, trim: true },
        difficulty: { type: String, trim: true },
        media: {
          image: { type: String, trim: true },
          video: { type: String, trim: true }
        }
      }
    ],
    equipment: [
      {
        type: String,
        enum: [
          "ninguno",
          "mancuernas",
          "barra",
          "kettlebell",
          "banda-elastica",
          "trx",
          "cajon",
          "cuerda",
          "colchoneta",
          "medicine-ball"
        ]
      }
    ],
    caloriesPerMinute: Number,
    requiresEquipment: { type: Boolean, default: false },
    isBootcampKey: { type: Boolean, default: false },
    suggestedDuration: { type: String, trim: true, default: "" },
    suggestedRounds: { type: String, trim: true, default: "" },
    suggestedByLevel: {
      principiante: { type: String, trim: true, default: "" },
      intermedio: { type: String, trim: true, default: "" },
      avanzado: { type: String, trim: true, default: "" }
    },
    source: {
      type: String,
      trim: true,
      default: "general"
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    usageStats: {
      timesUsed: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

exerciseSchema.pre("validate", function preValidate(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  }
  return next();
});

module.exports = mongoose.model("Exercise", exerciseSchema);
