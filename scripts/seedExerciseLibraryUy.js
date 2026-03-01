const dotenv = require("dotenv");
const connectDatabase = require("../config/database");
const Exercise = require("../models/Exercise");

dotenv.config();

const EXERCISES = [
  // CUERPO LIBRE
  ["Sentadillas", "Piernas", "ninguno"],
  ["Sentadillas con salto", "Piernas", "ninguno"],
  ["Sentadillas sumo", "Piernas", "ninguno"],
  ["Sentadilla contra la pared", "Piernas", "ninguno"],
  ["Zancadas adelante", "Piernas", "ninguno"],
  ["Zancadas atras", "Piernas", "ninguno"],
  ["Zancadas caminando", "Piernas", "ninguno"],
  ["Zancadas con salto", "Piernas", "ninguno"],
  ["Puente de gluteos", "Piernas", "ninguno"],
  ["Puente de gluteos a una pierna", "Piernas", "ninguno"],
  ["Peso muerto a una pierna (sin peso)", "Piernas", "ninguno"],
  ["Elevaciones de talones", "Piernas", "ninguno"],
  ["Flexiones", "Tren superior", "ninguno"],
  ["Flexiones abiertas", "Tren superior", "ninguno"],
  ["Flexiones cerradas", "Tren superior", "ninguno"],
  ["Flexiones con aplauso", "Tren superior", "ninguno"],
  ["Flexiones inclinadas", "Tren superior", "ninguno"],
  ["Plancha", "Core", "ninguno"],
  ["Plancha lateral", "Core", "ninguno"],
  ["Plancha con toque de hombro", "Core", "ninguno"],
  ["Plancha con rodillas al pecho", "Core", "ninguno"],
  ["Plancha con salto", "Core", "ninguno"],
  ["Escaladores", "Core/Cardio", "ninguno"],
  ["Abdominales tradicionales", "Core", "ninguno"],
  ["Abdominales bicicleta", "Core", "ninguno"],
  ["Elevaciones de piernas", "Core", "ninguno"],
  ["Giros de abdomen", "Core", "ninguno"],
  ["Superman", "Core", "ninguno"],
  ["Bird-dog", "Core", "ninguno"],
  ["Burpees", "Cardio", "ninguno"],
  ["Burpees con salto alto", "Cardio", "ninguno"],
  ["Burpees con flexion", "Cardio", "ninguno"],
  ["Rodillas arriba", "Cardio", "ninguno"],
  ["Talones a la cola", "Cardio", "ninguno"],
  ["Saltos laterales", "Cardio", "ninguno"],
  ["Saltos en largo", "Potencia", "ninguno"],
  ["Saltos rodillas al pecho", "Potencia", "ninguno"],
  ["Caminata de oso", "Funcional", "ninguno"],
  ["Caminata de cangrejo", "Funcional", "ninguno"],
  ["Caminata con manos", "Funcional", "ninguno"],
  ["Sprints cortos", "Cardio", "ninguno"],

  // MANCUERNAS
  ["Sentadilla con mancuernas", "Piernas", "mancuernas"],
  ["Sentadilla + press", "Total", "mancuernas"],
  ["Zancadas con mancuernas", "Piernas", "mancuernas"],
  ["Peso muerto con mancuernas", "Piernas", "mancuernas"],
  ["Remo con mancuernas", "Espalda", "mancuernas"],
  ["Press de hombros", "Hombros", "mancuernas"],
  ["Press pecho en el suelo", "Pecho", "mancuernas"],
  ["Cargada con mancuernas", "Total", "mancuernas"],
  ["Arranque con mancuerna", "Total", "mancuernas"],
  ["Remo en plancha", "Core/Tren superior", "mancuernas"],
  ["Caminata con peso", "Funcional", "mancuernas"],
  ["Estocadas laterales con mancuernas", "Piernas", "mancuernas"],

  // PESA RUSA
  ["Sentadilla con pesa rusa", "Piernas", "kettlebell"],
  ["Balanceo con pesa rusa", "Total", "kettlebell"],
  ["Peso muerto con pesa rusa", "Piernas", "kettlebell"],
  ["Cargada con pesa rusa", "Total", "kettlebell"],
  ["Press con pesa rusa", "Hombros", "kettlebell"],
  ["Zancadas con pesa rusa", "Piernas", "kettlebell"],
  ["Giro con pesa rusa", "Core", "kettlebell"],
  ["Sentadilla sumo con pesa rusa", "Piernas", "kettlebell"],
  ["Balanceo a una mano", "Total", "kettlebell"],

  // BARRA
  ["Sentadilla con barra", "Piernas", "barra"],
  ["Peso muerto con barra", "Piernas", "barra"],
  ["Zancadas con barra", "Piernas", "barra"],
  ["Remo con barra", "Espalda", "barra"],
  ["Press de hombros con barra", "Hombros", "barra"],
  ["Sentadilla + press con barra", "Total", "barra"],
  ["Cargada con barra", "Total", "barra"],
  ["Peso muerto rumano", "Piernas", "barra"],
  ["Buenos dias", "Piernas/Core", "barra"],

  // CAJON
  ["Saltos al cajon", "Potencia", "cajon"],
  ["Subidas al cajon", "Piernas", "cajon"],
  ["Subidas laterales al cajon", "Piernas", "cajon"],
  ["Flexiones con manos en cajon", "Pecho", "cajon"],
  ["Saltos bajando del cajon", "Potencia", "cajon"],

  // BALON MEDICINAL
  ["Lanzamientos al piso", "Potencia", "medicine-ball"],
  ["Sentadilla con balon", "Piernas", "medicine-ball"],
  ["Zancadas con balon", "Piernas", "medicine-ball"],
  ["Giros con balon", "Core", "medicine-ball"],
  ["Lanzamientos a la pared", "Total", "medicine-ball"],

  // SOGA
  ["Soga simple", "Cardio", "cuerda"],
  ["Soga alternada", "Cardio", "cuerda"],
  ["Soga doble", "Cardio avanzado", "cuerda"],
  ["Saltos laterales con soga", "Cardio", "cuerda"],

  // TRX
  ["Remo en TRX", "Espalda", "trx"],
  ["Flexiones en TRX", "Pecho", "trx"],
  ["Sentadillas en TRX", "Piernas", "trx"],
  ["Zancadas en TRX", "Piernas", "trx"],
  ["Plancha en TRX", "Core", "trx"],
  ["Rodillas al pecho en TRX", "Core", "trx"],

  // BANDAS
  ["Sentadilla con banda", "Piernas", "banda-elastica"],
  ["Caminata lateral con banda", "Gluteos", "banda-elastica"],
  ["Remo con banda", "Espalda", "banda-elastica"],
  ["Press con banda", "Pecho", "banda-elastica"],
  ["Peso muerto con banda", "Piernas", "banda-elastica"],

  // CUERDA DE BATALLA
  ["Ondas con cuerda", "Cardio", "cuerda"],
  ["Ondas alternadas", "Cardio", "cuerda"],
  ["Golpes con cuerda", "Potencia", "cuerda"],
  ["Circulos con cuerda", "Hombros", "cuerda"],

  // BARRA FIJA
  ["Dominadas", "Espalda", "barra"],
  ["Dominadas asistidas", "Espalda", "barra"],
  ["Elevaciones de rodillas colgado", "Core", "barra"],
  ["Dominadas agarre cerrado", "Espalda", "barra"],
  ["Burpees con dominada", "Total", "barra"]
];

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

const mapCategory = (valueRaw) => {
  const value = String(valueRaw || "").toLowerCase();
  if (value.includes("cardio")) return "cardio";
  if (value.includes("core")) return "core";
  if (value.includes("total") || value.includes("funcional")) return "full-body";
  return "fuerza";
};

const mapDifficulty = (valueRaw) => {
  const value = String(valueRaw || "").toLowerCase();
  if (value.includes("avanzado")) return "avanzado";
  if (value.includes("beginner")) return "principiante";
  if (value.includes("intermedio")) return "intermedio";
  return "intermedio";
};

const mapMuscleGroups = (valueRaw) => {
  const value = String(valueRaw || "").toLowerCase();
  const set = new Set();
  if (value.includes("piernas")) {
    set.add("cuadriceps");
    set.add("isquiotibiales");
    set.add("gluteos");
    set.add("pantorrillas");
  }
  if (value.includes("espalda")) set.add("espalda");
  if (value.includes("hombros")) set.add("hombros");
  if (value.includes("pecho")) set.add("pecho");
  if (value.includes("core")) set.add("core");
  if (value.includes("tren superior")) {
    set.add("pecho");
    set.add("espalda");
    set.add("hombros");
    set.add("biceps");
    set.add("triceps");
  }
  if (value.includes("total") || value.includes("funcional")) set.add("full-body");
  if (set.size === 0) set.add("full-body");
  return Array.from(set);
};

const run = async () => {
  try {
    await connectDatabase();

    let inserted = 0;
    let skipped = 0;

    for (const [name, categoryLabel, equipment] of EXERCISES) {
      const slug = slugify(name);
      const existing = await Exercise.findOne({
        $or: [{ slug }, { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }]
      }).select("_id");

      if (existing) {
        skipped += 1;
        continue;
      }

      await Exercise.create({
        name,
        slug,
        source: "uy-functional",
        category: mapCategory(categoryLabel),
        difficulty: mapDifficulty(categoryLabel),
        equipment: [equipment],
        muscleGroups: mapMuscleGroups(categoryLabel),
        description: `${name} (${categoryLabel})`,
        isActive: true
      });

      inserted += 1;
    }

    console.log("Carga UY de biblioteca completada");
    console.log(`Total evaluados: ${EXERCISES.length}`);
    console.log(`Insertados nuevos: ${inserted}`);
    console.log(`Ya existentes (omitidos): ${skipped}`);
    process.exit(0);
  } catch (error) {
    console.error("Error cargando biblioteca UY:", error.message);
    process.exit(1);
  }
};

run();
