const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDatabase = require("../config/database");
const User = require("../models/User");

dotenv.config();

const run = async () => {
  try {
    const name = process.env.SEED_ADMIN_NAME || "Admin Bootcamp";
    const email = (process.env.SEED_ADMIN_EMAIL || "admin@bootcamp.uy").toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD || "Admin12345";
    const phone = process.env.SEED_ADMIN_PHONE || "099000000";
    const plan = process.env.SEED_ADMIN_PLAN || "libre";
    const role = process.env.SEED_ADMIN_ROLE || "admin";

    await connectDatabase();

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          email,
          phone,
          role,
          password: hashedPassword,
          plan,
          memberSince: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log("Seed de usuario completado");
    console.log(`ID: ${result._id}`);
    console.log(`Email: ${result.email}`);
    console.log(`Plan: ${result.plan}`);
    process.exit(0);
  } catch (error) {
    console.error("Error en seed de usuario:", error.message);
    process.exit(1);
  }
};

run();
