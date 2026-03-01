const dotenv = require("dotenv");
const connectDatabase = require("../config/database");
const ClassModel = require("../models/Class");

dotenv.config();

const seedClasses = [
  { name: "Funcional Intenso", day: "Lunes", time: "07:00", duration: "45 min", trainer: "Ale", spots: 12, booked: 0 },
  { name: "Funcional Intenso", day: "Lunes", time: "18:00", duration: "45 min", trainer: "Ale", spots: 12, booked: 0 },
  { name: "Funcional Intenso", day: "Lunes", time: "19:00", duration: "45 min", trainer: "Maria", spots: 12, booked: 0 },
  { name: "Funcional Intenso", day: "Martes", time: "07:00", duration: "45 min", trainer: "Maria", spots: 12, booked: 0 },
  { name: "Funcional Intenso", day: "Martes", time: "18:00", duration: "45 min", trainer: "Ale", spots: 12, booked: 0 },
  { name: "Funcional Intenso", day: "Miercoles", time: "19:00", duration: "45 min", trainer: "Ale", spots: 12, booked: 0 },
  { name: "Funcional Intenso", day: "Jueves", time: "20:00", duration: "45 min", trainer: "Maria", spots: 12, booked: 0 },
  { name: "Funcional Intenso", day: "Viernes", time: "18:00", duration: "45 min", trainer: "Ale", spots: 12, booked: 0 }
];

const run = async () => {
  try {
    await connectDatabase();

    const operations = seedClasses.map((item) => ({
      updateOne: {
        filter: { day: item.day, time: item.time, trainer: item.trainer, name: item.name },
        update: { $set: item },
        upsert: true
      }
    }));

    const result = await ClassModel.bulkWrite(operations);
    console.log("Seed de clases completado");
    console.log(`Insertadas: ${result.upsertedCount || 0}`);
    console.log(`Actualizadas: ${result.modifiedCount || 0}`);
    process.exit(0);
  } catch (error) {
    console.error("Error en seed de clases:", error.message);
    process.exit(1);
  }
};

run();
