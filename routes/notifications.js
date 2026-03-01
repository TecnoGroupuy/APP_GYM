const express = require("express");
const auth = require("../middleware/auth");
const emailService = require("../services/emailService");
const User = require("../models/User");
const ClassModel = require("../models/Class");

const router = express.Router();

const isAdmin = (req, res, next) => {
  const roles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
  if (!roles.includes("admin")) {
    return res.status(403).json({ message: "Acceso denegado. Solo administradores." });
  }
  return next();
};

router.post("/send-reminder", auth, async (req, res) => {
  try {
    const { userId, classId } = req.body;
    if (!userId || !classId) {
      return res.status(400).json({ message: "userId y classId son requeridos" });
    }

    const [user, classData] = await Promise.all([
      User.findById(userId).select("name email"),
      ClassModel.findById(classId).select("name day time trainer")
    ]);

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    if (!classData) return res.status(404).json({ message: "Clase no encontrada" });
    if (!user.email) return res.status(400).json({ message: "El usuario no tiene email configurado" });

    const result = await emailService.sendClassReminder(user, classData);
    if (!result.success) {
      return res.status(500).json({ message: "No se pudo enviar el recordatorio", error: result.error?.message });
    }

    return res.json({ message: "Recordatorio enviado" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/bulk", auth, isAdmin, async (req, res) => {
  try {
    const { type, userIds, message, amount, monthsDue } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds debe ser un array con al menos un usuario" });
    }

    const users = await User.find({ _id: { $in: userIds } }).select("name email plan planExpires");
    const results = [];

    for (const user of users) {
      if (!user.email) {
        results.push({ userId: user._id, email: null, success: false, error: "Usuario sin email" });
        continue;
      }

      let result = { success: false, error: new Error("Tipo no soportado") };
      if (type === "payment") {
        result = await emailService.sendPaymentReminder(user, {
          amount: Number(amount || 1900),
          monthsDue: Number(monthsDue || 1)
        });
      } else if (type === "welcome") {
        result = await emailService.sendWelcome(user, message || "Temporal1234");
      } else if (type === "custom") {
        result = await emailService.send({
          to: user.email,
          subject: "Comunicado Boot Camp",
          text: String(message || "Mensaje del equipo Boot Camp"),
          html: `<p>${String(message || "Mensaje del equipo Boot Camp")}</p>`
        });
      }

      results.push({
        userId: user._id,
        email: user.email,
        success: result.success,
        error: result.success ? null : result.error?.message || "Error enviando email"
      });
    }

    const sent = results.filter((r) => r.success).length;
    return res.json({ sent, total: results.length, results });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
