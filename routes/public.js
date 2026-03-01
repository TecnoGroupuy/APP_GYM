const express = require("express");
const ClassModel = require("../models/Class");
const SiteConfig = require("../models/SiteConfig");

const router = express.Router();

const dayOrder = {
  Lunes: 1,
  Martes: 2,
  Miercoles: 3,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sabado: 6,
  Sábado: 6,
  Domingo: 7
};

const getSiteConfig = async () => {
  let config = await SiteConfig.findOne({ key: "main" });
  if (!config) {
    config = await SiteConfig.create({ key: "main" });
  }
  return config;
};

router.get("/landing-data", async (_req, res) => {
  try {
    const [classes, config] = await Promise.all([
      ClassModel.find({ active: true }).sort({ day: 1, time: 1 }),
      getSiteConfig()
    ]);

    const grouped = new Map();
    classes.forEach((cls) => {
      if (!grouped.has(cls.day)) grouped.set(cls.day, []);
      grouped.get(cls.day).push(cls.time);
    });

    const schedule = Array.from(grouped.entries())
      .map(([day, times]) => ({
        day,
        hours: times.sort().join(" | ")
      }))
      .sort((a, b) => (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99));

    return res.json({
      logoUrl: config.logoUrl || "",
      plans: config.plans || [],
      announcements: (config.announcements || []).filter((a) => a.active),
      schedule
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
