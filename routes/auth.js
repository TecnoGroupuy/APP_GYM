const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { rateLimit } = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const loginWindowMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const loginMaxAttempts = Number(process.env.LOGIN_RATE_LIMIT_MAX || 8);

const loginLimiter = rateLimit({
  windowMs: loginWindowMs,
  max: loginMaxAttempts,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos de login. Intenta nuevamente en unos minutos." }
});

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  lastName: user.lastName || "",
  email: user.email,
  phone: user.phone,
  role: user.role,
  roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role || "user"],
  status: user.status || "active",
  trainerInfo: user.trainerInfo,
  plan: user.plan,
  documentNumber: user.documentNumber || "",
  forcePasswordChange: Boolean(user.forcePasswordChange),
  classesLeft: user.plan === "libre" ? "Ilimitadas" : Number(user.classesLeft || 0),
  stats: user.stats,
  progress: user.progress,
  memberSince: user.memberSince
});

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Nombre requerido"),
    body("email").isEmail().withMessage("Email invalido"),
    body("password").isLength({ min: 6 }).withMessage("La contrasena debe tener al menos 6 caracteres")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, phone, password, plan, weight, height } = req.body;

      const existing = await User.findOne({ email: String(email).toLowerCase() });
      if (existing) {
        return res.status(409).json({ message: "El email ya esta registrado" });
      }

      const user = await User.create({
        name,
        email: String(email).toLowerCase(),
        phone,
        password,
        plan: plan || "none",
        status: "active",
        stats: {
          weight: weight || null,
          height: height || null
        }
      });

      const token = signToken(user._id);
      return res.status(201).json({
        token,
        user: serializeUser(user)
      });
    } catch (error) {
      return res.status(500).json({ message: "Error al registrar usuario", error: error.message });
    }
  }
);

router.post(
  "/login",
  loginLimiter,
  [
    body("email").notEmpty().withMessage("Usuario o email requerido"),
    body("password").notEmpty().withMessage("Contrasena requerida")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;
      const identifier = String(email || "").trim();
      const normalizedPhone = identifier.replace(/[^\d]/g, "");

      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { documentNumber: identifier.replace(/[^\dA-Za-z]/g, "") },
          { phone: normalizedPhone }
        ]
      }).select("+password");

      if (!user) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      await User.findByIdAndUpdate(user._id, { $set: { lastLogin: new Date() } });

      const token = signToken(user._id);
      return res.json({
        token,
        user: serializeUser(user)
      });
    } catch (error) {
      return res.status(500).json({ message: "Error al iniciar sesion", error: error.message });
    }
  }
);

router.post(
  "/change-initial-password",
  authMiddleware,
  [
    body("currentPassword").notEmpty().withMessage("Contrasena actual requerida"),
    body("newPassword").isLength({ min: 6 }).withMessage("La nueva contrasena debe tener al menos 6 caracteres")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id).select("+password");
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Contrasena actual incorrecta" });
      }

      user.password = newPassword;
      user.forcePasswordChange = false;
      user.passwordChangedAt = new Date();
      await user.save();

      return res.json({
        message: "Contrasena actualizada",
        user: serializeUser(user)
      });
    } catch (error) {
      return res.status(500).json({ message: "Error al cambiar contrasena", error: error.message });
    }
  }
);

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({
      user: serializeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener usuario", error: error.message });
  }
});

module.exports = router;
