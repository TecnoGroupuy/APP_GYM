const dotenv = require("dotenv");
const connectDatabase = require("../config/database");
const Exercise = require("../models/Exercise");

dotenv.config();

const NAME_MAP = {
  "Agility Ladder High Knees": "Escalera - Rodillas arriba",
  "Agility Ladder In-Out": "Escalera - Entrada y salida",
  "Agility Ladder Lateral Shuffle": "Escalera - Desplazamiento lateral",
  "Push-ups": "Flexiones",
  "Squats": "Sentadillas",
  "Jump Squats": "Sentadillas con salto",
  "Walking Lunges": "Zancadas caminando",
  "Reverse Lunges": "Zancadas atras",
  "Mountain Climbers": "Escaladores",
  Plank: "Plancha",
  "Side Plank": "Plancha lateral",
  "Russian Twists": "Giros de abdomen",
  "Leg Raises": "Elevaciones de piernas",
  "Bear Crawl": "Caminata de oso",
  "Skater Jumps": "Saltos laterales",
  "Wall Sit": "Sentadilla contra la pared",
  Inchworm: "Caminata con manos",
  "Sprint Intervals": "Sprints cortos",
  "Kettlebell Swings": "Balanceo con pesa rusa",
  "Goblet Squat": "Sentadilla con pesa rusa",
  "Kettlebell Clean": "Cargada con pesa rusa",
  "Dumbbell Thrusters": "Sentadilla + press con mancuernas",
  "Renegade Rows": "Remo en plancha con mancuernas",
  "Farmer Carry": "Caminata con peso",
  "Barbell Deadlift": "Peso muerto con barra",
  "Box Jumps": "Saltos al cajon",
  "Medicine Ball Slams": "Lanzamientos al piso",
  "TRX Rows": "Remo en TRX",
  "Jump Rope": "Soga",
  "Double Unders": "Soga doble"
};

const TITLE_CASE = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const inferTechnicalName = (exercise) => {
  if (exercise.technicalName) return exercise.technicalName;

  const fromDescription = String(exercise.description || "").match(/Nombre tecnico:\s*([^|]+)/i);
  if (fromDescription && fromDescription[1]) return fromDescription[1].trim();

  const mapped = Object.entries(NAME_MAP).find(([, display]) => display.toLowerCase() === String(exercise.name || "").toLowerCase());
  if (mapped) return mapped[0];

  return "";
};

const inferDisplayName = (exercise, technicalName) => {
  if (exercise.displayName) return exercise.displayName;
  if (technicalName && NAME_MAP[technicalName]) return NAME_MAP[technicalName];
  if (exercise.name && NAME_MAP[exercise.name]) return NAME_MAP[exercise.name];
  return TITLE_CASE(exercise.name || technicalName || "Ejercicio");
};

const inferDefaults = (exercise, displayName) => {
  const text = `${displayName} ${exercise.category || ""}`.toLowerCase();
  const isCardio = text.includes("cardio") || text.includes("soga") || text.includes("escalera") || text.includes("burpee");
  const isEquipmentByArray = Array.isArray(exercise.equipment) && exercise.equipment.some((item) => item && item !== "ninguno");
  const isEquipmentByName = /(mancuerna|barra|kettlebell|trx|balon|cajon|banda|cuerda)/i.test(text);

  return {
    requiresEquipment: Boolean(exercise.requiresEquipment) || isEquipmentByArray || isEquipmentByName,
    isBootcampKey: Boolean(exercise.isBootcampKey) || /burpee|escalera|sentadilla|flexiones|caminata|soga/i.test(text),
    suggestedDuration: exercise.suggestedDuration || (isCardio ? "30 seg" : "40 seg"),
    suggestedRounds: exercise.suggestedRounds || "3 rondas",
    suggestedByLevel: {
      principiante: exercise?.suggestedByLevel?.principiante || "20-30 seg",
      intermedio: exercise?.suggestedByLevel?.intermedio || "30-40 seg",
      avanzado: exercise?.suggestedByLevel?.avanzado || "40-50 seg"
    }
  };
};

const run = async () => {
  try {
    await connectDatabase();

    const exercises = await Exercise.find({});
    let updated = 0;

    for (const exercise of exercises) {
      const technicalName = inferTechnicalName(exercise);
      const displayName = inferDisplayName(exercise, technicalName);
      const defaults = inferDefaults(exercise, displayName);

      const update = {
        technicalName,
        displayName,
        name: exercise.name || displayName || technicalName,
        requiresEquipment: defaults.requiresEquipment,
        isBootcampKey: defaults.isBootcampKey,
        suggestedDuration: defaults.suggestedDuration,
        suggestedRounds: defaults.suggestedRounds,
        suggestedByLevel: defaults.suggestedByLevel
      };

      await Exercise.updateOne({ _id: exercise._id }, { $set: update });
      updated += 1;
    }

    console.log("Migracion display/technical UY completada");
    console.log(`Ejercicios actualizados: ${updated}`);
    process.exit(0);
  } catch (error) {
    console.error("Error migrando display/technical UY:", error.message);
    process.exit(1);
  }
};

run();
