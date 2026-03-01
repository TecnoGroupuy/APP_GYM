const express = require("express");
const mongoose = require("mongoose");
const ClassModel = require("../models/Class");
const Booking = require("../models/Booking");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/available", authMiddleware, async (req, res) => {
  try {
    const [user, classes, trainers] = await Promise.all([
      User.findById(req.user.id).select("plan classesLeft"),
      ClassModel.find({ active: true }).sort({ day: 1, time: 1 }),
      User.find({ role: "trainer" }).select("_id name")
    ]);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const bookings = await Booking.find({
      user: req.user.id,
      class: { $in: classes.map((c) => c._id) },
      status: "booked"
    }).select("class");

    const bookedClassIds = new Set(bookings.map((b) => String(b.class)));
    const trainerById = new Map(trainers.map((t) => [String(t._id), t.name]));

    return res.json({
      summary: {
        plan: user.plan,
        classesLeft: user.plan === "libre" ? "Ilimitadas" : Number(user.classesLeft || 0)
      },
      classes: classes.map((cls) => ({
        id: cls._id,
        name: cls.name,
        day: cls.day,
        time: cls.time,
        duration: cls.duration,
        trainer: trainerById.get(String(cls.trainer)) || cls.trainer,
        spots: cls.spots,
        booked: cls.booked,
        availableSpots: Math.max(0, cls.spots - cls.booked),
        isFull: cls.booked >= cls.spots,
        isBooked: bookedClassIds.has(String(cls._id))
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al listar clases disponibles", error: error.message });
  }
});

router.post("/:classId/book", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.classId)) {
      return res.status(400).json({ message: "ID de clase invalido" });
    }

    const user = await User.findById(req.user.id).select("plan classesLeft");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const classData = await ClassModel.findOne({ _id: req.params.classId, active: true });
    if (!classData) {
      return res.status(404).json({ message: "Clase no encontrada" });
    }

    const existing = await Booking.findOne({
      user: req.user.id,
      class: classData._id
    });

    if (existing && existing.status === "booked") {
      return res.status(409).json({ message: "Ya tenes una reserva para esta clase" });
    }

    if (classData.booked >= classData.spots) {
      return res.status(400).json({ message: "No hay cupos disponibles" });
    }

    if (user.plan !== "libre" && Number(user.classesLeft || 0) <= 0) {
      return res.status(400).json({
        message: "No tenes clases disponibles en tu plan",
        code: "NO_CLASSES_LEFT",
        plan: user.plan,
        classesLeft: Number(user.classesLeft || 0)
      });
    }

    await Booking.findOneAndUpdate(
      { user: req.user.id, class: classData._id },
      { $set: { status: "booked", bookedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    classData.booked += 1;
    await classData.save();

    let remaining = user.plan === "libre" ? "Ilimitadas" : Number(user.classesLeft || 0);
    if (user.plan !== "libre") {
      remaining = Math.max(0, Number(user.classesLeft || 0) - 1);
      await User.findByIdAndUpdate(req.user.id, { $set: { classesLeft: remaining } });
    }

    return res.status(201).json({
      message: "Clase reservada con exito",
      classesLeft: remaining
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Ya tenes una reserva para esta clase" });
    }
    return res.status(500).json({ message: "Error al reservar clase", error: error.message });
  }
});

router.delete("/:classId/book", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.classId)) {
      return res.status(400).json({ message: "ID de clase invalido" });
    }

    const user = await User.findById(req.user.id).select("plan classesLeft");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const classData = await ClassModel.findOne({ _id: req.params.classId, active: true });
    if (!classData) {
      return res.status(404).json({ message: "Clase no encontrada" });
    }

    const booking = await Booking.findOne({
      user: req.user.id,
      class: classData._id,
      status: "booked"
    });

    if (!booking) {
      return res.status(404).json({ message: "No tienes una reserva activa para esta clase" });
    }

    booking.status = "cancelled";
    await booking.save();

    classData.booked = Math.max(0, Number(classData.booked || 0) - 1);
    await classData.save();

    let classesLeft = user.plan === "libre" ? "Ilimitadas" : Number(user.classesLeft || 0);
    if (user.plan !== "libre") {
      classesLeft = Number(user.classesLeft || 0) + 1;
      await User.findByIdAndUpdate(req.user.id, { $set: { classesLeft } });
    }

    return res.json({
      message: "Reserva cancelada con exito",
      classesLeft
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al cancelar reserva", error: error.message });
  }
});

module.exports = router;
