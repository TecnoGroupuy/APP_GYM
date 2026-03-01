const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDatabase = require("../config/database");
const User = require("../models/User");

dotenv.config();

const run = async () => {
  try {
    await connectDatabase();
    const hashedPassword = await bcrypt.hash("trainer123", 10);

    const trainer = await User.findOneAndUpdate(
      { email: "ale@bootcamp.uy" },
      {
        $set: {
          name: "Alejandro Trainer",
          email: "ale@bootcamp.uy",
          password: hashedPassword,
          phone: "099123456",
          role: "trainer",
          trainerInfo: {
            specialties: ["Funcional", "HIIT", "Fuerza"],
            aliases: ["Ale", "Alejandro", "Alejandro Trainer"],
            bio: "Entrenador certificado con 5 anos de experiencia",
            schedule: [
              { day: "Lunes", startTime: "07:00", endTime: "12:00" },
              { day: "Lunes", startTime: "17:00", endTime: "21:00" }
            ]
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log("Entrenador listo:", trainer.email);
    process.exit(0);
  } catch (error) {
    console.error("Error creando entrenador:", error.message);
    process.exit(1);
  }
};

run();
