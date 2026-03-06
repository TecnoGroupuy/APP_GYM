const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");
const helmet = require("helmet");
const connectDatabase = require("./config/database");
const { startNotificationJobs } = require("./jobs/notificationJobs");

dotenv.config();
connectDatabase();

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

const allowedOrigins = String(process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/static", express.static(path.join(__dirname, "public")));

app.use((error, _req, res, next) => {
  if (error?.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Origen no permitido" });
  }
  return next(error);
});

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
