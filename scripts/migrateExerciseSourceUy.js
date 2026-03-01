const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const connectDatabase = require("../config/database");
const Exercise = require("../models/Exercise");

dotenv.config();

const parseUyNamesFromSeed = () => {
  const filePath = path.join(__dirname, "seedExerciseLibraryUy.js");
  const content = fs.readFileSync(filePath, "utf8");
  const names = new Set();
  const regex = /\["([^"]+)",\s*"[^"]+",\s*"[^"]+"\]/g;
  let match = regex.exec(content);
  while (match) {
    names.add(match[1]);
    match = regex.exec(content);
  }
  return names;
};

const parseUyNamesFromMigration = () => {
  const filePath = path.join(__dirname, "migrateExerciseNamesUy.js");
  const content = fs.readFileSync(filePath, "utf8");
  const names = new Set();
  const regex = /\["[^"]+",\s*"([^"]+)"\]/g;
  let match = regex.exec(content);
  while (match) {
    names.add(match[1]);
    match = regex.exec(content);
  }
  return names;
};

const run = async () => {
  try {
    await connectDatabase();

    const uyNames = new Set([
      ...parseUyNamesFromSeed(),
      ...parseUyNamesFromMigration()
    ]);

    const query = {
      $or: [
        { name: { $in: Array.from(uyNames) } },
        { description: /Nombre tecnico:/i }
      ]
    };

    const result = await Exercise.updateMany(query, {
      $set: { source: "uy-functional" }
    });

    const untouched = await Exercise.countDocuments({ source: { $ne: "uy-functional" } });

    console.log("Migracion source=uy-functional completada");
    console.log(`Marcados como uy-functional: ${result.modifiedCount || 0}`);
    console.log(`Ya marcados previamente: ${(result.matchedCount || 0) - (result.modifiedCount || 0)}`);
    console.log(`Ejercicios con otro source: ${untouched}`);
    process.exit(0);
  } catch (error) {
    console.error("Error migrando source UY:", error.message);
    process.exit(1);
  }
};

run();
