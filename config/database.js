const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI no está definido");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB conectado");
  } catch (error) {
    console.error("Error conectando MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase;
