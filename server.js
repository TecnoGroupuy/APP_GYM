const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");
const connectDatabase = require("./config/database");
const { startNotificationJobs } = require("./jobs/notificationJobs");

dotenv.config();
connectDatabase();

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*"
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/static", express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "API operativa" });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return res.status(503).json({
        ok: false,
        message: "MongoDB no conectado",
        readyState: mongoose.connection.readyState
      });
    }

    await mongoose.connection.db.admin().ping();
    return res.json({
      ok: true,
      message: "MongoDB operativo",
      dbName: mongoose.connection.name
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      message: "Error en ping a MongoDB",
      error: error.message
    });
  }
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/classes", require("./routes/classes"));
app.use("/api/user/classes", require("./routes/userClasses"));
app.use("/api/user", require("./routes/user"));
app.use("/api/trainer", require("./routes/trainer"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/public", require("./routes/public"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/routines", require("./routes/routines"));
app.use("/api/students", require("./routes/students"));
app.use("/api/import", require("./routes/import"));
app.use("/api/plans", require("./routes/plans"));
app.use("/api/webhooks", require("./routes/webhooks"));

startNotificationJobs();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
