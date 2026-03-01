const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    price: { type: Number, required: true, min: 0 },
    passCount: { type: Number, default: null, min: 0 },
    features: [{ type: String, trim: true }],
    popular: { type: Boolean, default: false }
  },
  { _id: false }
);

const announcementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    sector: { type: String, required: true, trim: true },
    title: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "", trim: true },
    linkUrl: { type: String, default: "", trim: true },
    active: { type: Boolean, default: true }
  },
  { _id: false }
);

const siteConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "main" },
    logoUrl: { type: String, default: "", trim: true },
    plans: {
      type: [planSchema],
      default: [
        {
          id: "8pases",
          name: "8 PASES",
          description: "2 veces por semana",
          price: 1300,
          features: ["8 clases mensuales", "Acceso a horarios diurnos", "Valido 30 dias", "Reserva online"],
          popular: false
        },
        {
          id: "12pases",
          name: "12 PASES",
          description: "3 veces por semana",
          price: 1600,
          features: ["12 clases mensuales", "Todos los horarios", "Valido 30 dias", "Reserva online", "1 clase invitado"],
          popular: true
        },
        {
          id: "libre",
          name: "PASE LIBRE",
          description: "Todos los dias",
          price: 1900,
          features: ["Clases ilimitadas", "Prioridad de reserva", "Valido 30 dias", "2 clases invitado", "Plan nutricional basico"],
          popular: false
        }
      ]
    },
    announcements: {
      type: [announcementSchema],
      default: [
        {
          id: "hero-main",
          sector: "hero-right",
          title: "Comunidad Boot Camp",
          imageUrl: "",
          linkUrl: "",
          active: true
        }
      ]
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteConfig", siteConfigSchema);
