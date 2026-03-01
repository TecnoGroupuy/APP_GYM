const dotenv = require("dotenv");
const connectDatabase = require("../config/database");
const ClassModel = require("../models/Class");

dotenv.config();

const WEEKDAYS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];

const normalizeDay = (value) => {
  const normalized = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const dayMap = {
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miercoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sabado",
    domingo: "Domingo"
  };

  return dayMap[normalized] || String(value || "").trim();
};

const classKey = (item) =>
  `${String(item.name || "").trim()}|${normalizeDay(item.day)}|${String(item.time || "").trim()}|${String(
    item.trainer || ""
  ).trim()}`;

const run = async () => {
  try {
    await connectDatabase();

    const activeClasses = await ClassModel.find({ active: true }).sort({ day: 1, time: 1 });
    const mondayTemplates = activeClasses.filter((item) => normalizeDay(item.day) === "Lunes");

    if (mondayTemplates.length === 0) {
      console.log("No hay clases activas en Lunes para usar como plantilla.");
      process.exit(0);
    }

    const targetClasses = [];
    mondayTemplates.forEach((baseClass) => {
      WEEKDAYS.forEach((targetDay) => {
        targetClasses.push({
          name: String(baseClass.name || "").trim(),
          day: targetDay,
          time: String(baseClass.time || "").trim(),
          duration: String(baseClass.duration || "45 min").trim(),
          trainer: String(baseClass.trainer || "").trim(),
          spots: Number(baseClass.spots || 1),
          active: true
        });
      });
    });

    const upsertOps = targetClasses.map((item) => ({
      updateOne: {
        filter: {
          name: item.name,
          day: item.day,
          time: item.time,
          trainer: item.trainer
        },
        update: {
          $set: {
            duration: item.duration,
            spots: item.spots,
            active: true
          }
        },
        upsert: true
      }
    }));

    const writeResult = await ClassModel.bulkWrite(upsertOps);
    const targetKeys = new Set(targetClasses.map((item) => classKey(item)));

    const allActiveAfterUpsert = await ClassModel.find({ active: true }).select("_id name day time trainer");
    const toDeactivateIds = allActiveAfterUpsert
      .filter((item) => !targetKeys.has(classKey(item)))
      .map((item) => item._id);

    let deactivatedCount = 0;
    if (toDeactivateIds.length > 0) {
      const deactivation = await ClassModel.updateMany({ _id: { $in: toDeactivateIds } }, { $set: { active: false } });
      deactivatedCount = deactivation.modifiedCount || 0;
    }

    const finalActive = await ClassModel.countDocuments({ active: true });

    console.log("Sincronizacion completada");
    console.log(`Plantillas de lunes: ${mondayTemplates.length}`);
    console.log(`Objetivo lunes-viernes: ${targetClasses.length}`);
    console.log(`Insertadas: ${writeResult.upsertedCount || 0}`);
    console.log(`Actualizadas: ${writeResult.modifiedCount || 0}`);
    console.log(`Desactivadas fuera del esquema: ${deactivatedCount}`);
    console.log(`Clases activas finales: ${finalActive}`);

    process.exit(0);
  } catch (error) {
    console.error("Error al sincronizar clases:", error.message);
    process.exit(1);
  }
};

run();
