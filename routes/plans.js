const express = require("express");
const SiteConfig = require("../models/SiteConfig");
const auth = require("../middleware/auth");

const router = express.Router();

const isAdminOrTrainer = (req, res, next) => {
  const roles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
  if (!roles.includes("admin") && !roles.includes("trainer")) {
    return res.status(403).json({ message: "Acceso denegado." });
  }
  return next();
};

router.get("/", auth, isAdminOrTrainer, async (_req, res) => {
  try {
    const config = await SiteConfig.findOne({ key: "main" }).lean();
    const plansRaw = Array.isArray(config?.plans) ? config.plans : [];
    const plans = plansRaw.map((plan) => ({
      _id: plan._id || plan.id,
      name: String(plan.name || "").trim(),
      passCount: plan.passCount === null || plan.passCount === undefined ? null : Number(plan.passCount),
      price: Number(plan.price || 0)
    }));
    return res.json({ plans });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;

