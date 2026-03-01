require("dotenv").config();
const mongoose = require("mongoose");
const Exercise = require("../models/Exercise");

const SOURCE = "functionalmovement.com";
const EXERCISE_ENDPOINT = "https://www.functionalmovement.com/exercises/exercises_read?page=1&pageSize=500";

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const hasAny = (text, keywords) => keywords.some((word) => text.includes(word));

const mapCategory = (name, summary, categories = []) => {
  const text = `${name} ${summary}`.toLowerCase();

  if (hasAny(text, ["sprint", "agility", "shuffle", "ladder", "jump", "burpee", "cardio", "run"])) {
    return "cardio";
  }
  if (hasAny(text, ["throw", "slam", "power", "plyo", "explosive"])) {
    return "potencia";
  }
  if (hasAny(text, ["plank", "core", "trunk", "bird dog", "dead bug", "rolling"])) {
    return "core";
  }
  if (hasAny(text, ["squat", "lunge", "hinge", "press", "row", "pull", "carry", "bridge"])) {
    return "fuerza";
  }
  if (
    hasAny(text, [
      "mobility",
      "dorsiflexion",
      "t-spine",
      "rotation",
      "stretch",
      "ankle",
      "hip",
      "toe touch",
      "breath",
      "cervical"
    ])
  ) {
    return "movilidad";
  }

  const categoryString = String(categories || "");
  if (categoryString.includes("39") || categoryString.includes("40")) return "core";
  if (categoryString.includes("43") || categoryString.includes("45")) return "fuerza";
  return "movilidad";
};

const mapDifficulty = (name, summary) => {
  const text = `${name} ${summary}`.toLowerCase();
  if (hasAny(text, ["starter", "assisted", "basic", "beginner"])) return "principiante";
  if (hasAny(text, ["progression", "challenged", "advanced", "single leg", "resisted"])) return "avanzado";
  return "intermedio";
};

const mapMuscles = (name, summary) => {
  const text = `${name} ${summary}`.toLowerCase();
  const groups = new Set();
  if (hasAny(text, ["core", "plank", "trunk", "ab", "bird dog", "rolling"])) groups.add("core");
  if (hasAny(text, ["squat", "lunge", "quad"])) groups.add("cuadriceps");
  if (hasAny(text, ["hamstring", "hinge"])) groups.add("isquiotibiales");
  if (hasAny(text, ["glute", "bridge", "hip extension"])) groups.add("gluteos");
  if (hasAny(text, ["push", "chest"])) groups.add("pecho");
  if (hasAny(text, ["row", "pull", "back", "t-spine"])) groups.add("espalda");
  if (hasAny(text, ["shoulder", "overhead", "cervical"])) groups.add("hombros");
  if (hasAny(text, ["calf", "dorsiflexion", "ankle"])) groups.add("pantorrillas");
  if (hasAny(text, ["full body", "whole body"])) groups.add("full-body");
  return Array.from(groups).slice(0, 4);
};

const mapEquipment = (name, summary) => {
  const text = `${name} ${summary}`.toLowerCase();
  const equipment = [];
  if (text.includes("dowel")) equipment.push("barra");
  if (text.includes("band")) equipment.push("banda-elastica");
  if (text.includes("foam roller")) equipment.push("colchoneta");
  if (text.includes("kettlebell")) equipment.push("kettlebell");
  if (text.includes("dumbbell")) equipment.push("mancuernas");
  if (text.includes("trx")) equipment.push("trx");
  if (text.includes("box")) equipment.push("cajon");
  if (text.includes("rope")) equipment.push("cuerda");
  if (text.includes("med ball") || text.includes("medicine ball")) equipment.push("medicine-ball");
  return equipment.length > 0 ? equipment : ["ninguno"];
};

const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();

async function fetchSourceExercises() {
  const response = await fetch(EXERCISE_ENDPOINT);
  if (!response.ok) {
    throw new Error(`No se pudo leer FMS (${response.status})`);
  }
  const payload = await response.json();
  return Array.isArray(payload?.Data) ? payload.Data : [];
}

async function resolveSlug(baseSlug, exerciseId) {
  const inUse = await Exercise.findOne({ slug: baseSlug }).lean();
  if (!inUse) return baseSlug;
  return `${baseSlug}-fms-${exerciseId}`;
}

async function upsertExercise(raw) {
  const name = cleanText(raw.Name);
  const summary = cleanText(raw.Summary);
  const displayName = name;
  const technicalName = name;
  const category = mapCategory(name, summary, raw.CategoryList);
  const difficulty = mapDifficulty(name, summary);
  const muscleGroups = mapMuscles(name, summary);
  const equipment = mapEquipment(name, summary);
  const requiresEquipment = equipment.some((e) => e !== "ninguno");
  const defaultImage =
    raw.FileUrl && raw.FileUrl !== "/Content/Images/default-exercise.jpg"
      ? `https://www.functionalmovement.com${raw.FileUrl}`
      : "";
  const defaultVideo = raw.UrlName
    ? `https://www.functionalmovement.com/Exercises/${raw.ExerciseID}/${raw.UrlName}`
    : "";
  const baseSlug = slugify(displayName || technicalName || `fms-${raw.ExerciseID}`);

  const existing = await Exercise.findOne({
    source: SOURCE,
    $or: [
      { technicalName },
      { slug: `${baseSlug}-fms-${raw.ExerciseID}` },
      { slug: baseSlug },
      { "media.video": defaultVideo }
    ]
  });

  const payload = {
    name: displayName || technicalName,
    displayName,
    technicalName,
    category,
    difficulty,
    description: summary,
    muscleGroups,
    equipment,
    requiresEquipment,
    media: {
      image: defaultImage,
      video: defaultVideo
    },
    source: SOURCE,
    isActive: true
  };

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return "updated";
  }

  const slug = await resolveSlug(baseSlug, raw.ExerciseID);
  const created = new Exercise({
    ...payload,
    slug
  });
  await created.save();
  return "created";
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Falta MONGODB_URI en bootcamp-backend/.env");
  }

  console.log("Conectando a MongoDB...");
  await mongoose.connect(mongoUri);

  try {
    console.log("Descargando ejercicios de FunctionalMovement...");
    const sourceExercises = await fetchSourceExercises();
    console.log(`Total recibido: ${sourceExercises.length}`);

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const item of sourceExercises) {
      try {
        const result = await upsertExercise(item);
        if (result === "created") created += 1;
        if (result === "updated") updated += 1;
      } catch (error) {
        errors += 1;
        console.error(`Error en ExerciseID=${item?.ExerciseID}: ${error.message}`);
      }
    }

    console.log("Importacion finalizada");
    console.log(`- Creados: ${created}`);
    console.log(`- Actualizados: ${updated}`);
    console.log(`- Errores: ${errors}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
