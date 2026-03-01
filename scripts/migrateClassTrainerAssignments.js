const dotenv = require("dotenv");
const connectDatabase = require("../config/database");
const User = require("../models/User");
const ClassModel = require("../models/Class");

dotenv.config();

const normalize = (value) => String(value || "").trim().toLowerCase();

const run = async () => {
  try {
    await connectDatabase();

    const trainers = await User.find({ role: "trainer", isActive: { $ne: false } }).select("name trainerInfo.aliases");
    const trainerByKey = new Map();

    trainers.forEach((trainer) => {
      const keys = new Set([
        String(trainer._id),
        trainer.name,
        trainer.name?.split(" ")[0],
        ...(Array.isArray(trainer?.trainerInfo?.aliases) ? trainer.trainerInfo.aliases : [])
      ]);

      keys.forEach((k) => {
        const nk = normalize(k);
        if (nk) trainerByKey.set(nk, trainer);
      });
    });

    const classes = await ClassModel.find({});
    let updatedCount = 0;
    let alreadyOk = 0;
    let unresolved = 0;

    for (const cls of classes) {
      const rawTrainer = String(cls.trainer || "").trim();
      const normalized = normalize(rawTrainer);

      if (!normalized) {
        unresolved += 1;
        continue;
      }

      const exactById = trainers.find((t) => String(t._id) === rawTrainer);
      if (exactById) {
        alreadyOk += 1;
        continue;
      }

      const match = trainerByKey.get(normalized);
      if (!match) {
        unresolved += 1;
        continue;
      }

      cls.trainer = String(match._id);
      await cls.save();
      updatedCount += 1;
    }

    console.log("Migracion de clases->trainerId completada");
    console.log(`Actualizadas: ${updatedCount}`);
    console.log(`Ya correctas: ${alreadyOk}`);
    console.log(`Sin match: ${unresolved}`);
    process.exit(0);
  } catch (error) {
    console.error("Error migrando clases:", error.message);
    process.exit(1);
  }
};

run();
