const dotenv = require("dotenv");
const connectDatabase = require("../config/database");
const Exercise = require("../models/Exercise");

dotenv.config();

const MAPPINGS = [
  ["Push-ups", "Flexiones"],
  ["Squats", "Sentadillas"],
  ["Jump Squats", "Sentadillas con salto"],
  ["Walking Lunges", "Zancadas caminando"],
  ["Reverse Lunges", "Zancadas atras"],
  ["Mountain Climbers", "Escaladores"],
  ["Plank", "Plancha"],
  ["Side Plank", "Plancha lateral"],
  ["Russian Twists", "Giros de abdomen"],
  ["Leg Raises", "Elevaciones de piernas"],
  ["Bear Crawl", "Caminata de oso"],
  ["Skater Jumps", "Saltos laterales"],
  ["Wall Sit", "Sentadilla contra la pared"],
  ["Inchworm", "Caminata con manos"],
  ["Sprint Intervals", "Sprints cortos"],
  ["Kettlebell Swings", "Balanceo con pesa rusa"],
  ["Goblet Squat", "Sentadilla con pesa rusa"],
  ["Kettlebell Clean", "Cargada con pesa rusa"],
  ["Dumbbell Thrusters", "Sentadilla + press con mancuernas"],
  ["Renegade Rows", "Remo en plancha con mancuernas"],
  ["Farmer Carry", "Caminata con peso"],
  ["Barbell Deadlift", "Peso muerto con barra"],
  ["Box Jumps", "Saltos al cajon"],
  ["Medicine Ball Slams", "Lanzamientos al piso"],
  ["TRX Rows", "Remo en TRX"],
  ["Jump Rope", "Soga"],
  ["Double Unders", "Soga doble"]
];

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

const run = async () => {
  try {
    await connectDatabase();

    let updated = 0;
    let missing = 0;
    const missingItems = [];

    for (const [technicalName, uyName] of MAPPINGS) {
      const slug = slugify(technicalName);
      const doc = await Exercise.findOne({ slug });

      if (!doc) {
        missing += 1;
        missingItems.push(technicalName);
        continue;
      }

      const nextDescription = doc.description && doc.description.includes("Nombre tecnico:")
        ? doc.description
        : `${doc.description || ""}`.trim()
            ? `${doc.description} | Nombre tecnico: ${technicalName}`
            : `Nombre tecnico: ${technicalName}`;

      doc.name = uyName;
      doc.description = nextDescription;
      await doc.save();
      updated += 1;
    }

    console.log("Migracion de nombres de ejercicios (UY) completada");
    console.log(`Total mappings: ${MAPPINGS.length}`);
    console.log(`Actualizados: ${updated}`);
    console.log(`Sin match: ${missing}`);
    if (missingItems.length) {
      console.log("No encontrados:");
      missingItems.forEach((name) => console.log(`- ${name}`));
    }

    process.exit(0);
  } catch (error) {
    console.error("Error migrando nombres de ejercicios UY:", error.message);
    process.exit(1);
  }
};

run();
