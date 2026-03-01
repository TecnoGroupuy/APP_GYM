const dotenv = require("dotenv");
const connectDatabase = require("../config/database");
const Exercise = require("../models/Exercise");

dotenv.config();

const RAW_EXERCISES = `
Burpees | Total Body | None | Intermediate
Push-ups | Upper Body | None | Beginner
Squats | Lower Body | None | Beginner
Jump Squats | Lower Body | None | Intermediate
Walking Lunges | Lower Body | None | Beginner
Reverse Lunges | Lower Body | None | Beginner
Jump Lunges | Lower Body | None | Advanced
Mountain Climbers | Core/Cardio | None | Intermediate
High Knees | Cardio | None | Beginner
Plank | Core | None | Beginner
Side Plank | Core | None | Beginner
Plank Shoulder Taps | Core | None | Intermediate
Sit-ups | Core | None | Beginner
Crunches | Core | None | Beginner
Russian Twists | Core | None | Intermediate
Bicycle Crunch | Core | None | Intermediate
Leg Raises | Core | None | Intermediate
Flutter Kicks | Core | None | Intermediate
Bear Crawl | Full Body | None | Intermediate
Crab Walk | Full Body | None | Beginner
Skater Jumps | Cardio/Power | None | Intermediate
Tuck Jumps | Power | None | Advanced
Broad Jumps | Power | None | Intermediate
Wall Sit | Lower Body | None | Beginner
Glute Bridge | Lower Body | None | Beginner
Single Leg Glute Bridge | Lower Body | None | Intermediate
Superman Hold | Core | None | Beginner
Inchworm | Full Body | None | Beginner
Spiderman Plank | Core | None | Intermediate
Sprint Intervals | Cardio | None | Advanced
Kettlebell Swings | Total Body | Kettlebell | Intermediate
Goblet Squat | Lower Body | Kettlebell | Beginner
Kettlebell Deadlift | Lower Body | Kettlebell | Beginner
Kettlebell Clean | Full Body | Kettlebell | Intermediate
Kettlebell Snatch | Full Body | Kettlebell | Advanced
Kettlebell Press | Upper Body | Kettlebell | Intermediate
Kettlebell Thruster | Full Body | Kettlebell | Intermediate
Kettlebell Lunges | Lower Body | Kettlebell | Intermediate
Kettlebell High Pull | Upper Body | Kettlebell | Intermediate
Kettlebell Figure 8 | Core | Kettlebell | Intermediate
Dumbbell Squat | Lower Body | Dumbbell | Beginner
Dumbbell Deadlift | Lower Body | Dumbbell | Beginner
Dumbbell Lunges | Lower Body | Dumbbell | Beginner
Dumbbell Thrusters | Full Body | Dumbbell | Intermediate
Dumbbell Shoulder Press | Upper Body | Dumbbell | Beginner
Dumbbell Rows | Upper Body | Dumbbell | Beginner
Renegade Rows | Core/Upper | Dumbbell | Advanced
Dumbbell Snatch | Full Body | Dumbbell | Intermediate
Dumbbell Clean and Press | Full Body | Dumbbell | Intermediate
Farmer Carry | Core/Grip | Dumbbell | Beginner
Barbell Squat | Lower Body | Barbell | Intermediate
Barbell Deadlift | Lower Body | Barbell | Intermediate
Barbell Lunges | Lower Body | Barbell | Intermediate
Barbell Thrusters | Full Body | Barbell | Advanced
Barbell Clean | Full Body | Barbell | Advanced
Barbell Snatch | Full Body | Barbell | Advanced
Barbell Row | Upper Body | Barbell | Intermediate
Barbell Shoulder Press | Upper Body | Barbell | Intermediate
Hip Thrust | Lower Body | Barbell | Intermediate
Good Mornings | Lower Body | Barbell | Intermediate
Box Jumps | Power | Box | Intermediate
Step Ups | Lower Body | Box | Beginner
Lateral Box Step | Lower Body | Box | Beginner
Box Push-ups | Upper Body | Box | Beginner
Depth Jumps | Power | Box | Advanced
Medicine Ball Slams | Power | Medicine Ball | Intermediate
Wall Ball Shots | Full Body | Medicine Ball | Intermediate
Medicine Ball Squat | Lower Body | Medicine Ball | Beginner
Medicine Ball Lunges | Lower Body | Medicine Ball | Beginner
Medicine Ball Russian Twist | Core | Medicine Ball | Intermediate
Battle Rope Waves | Cardio/Power | Battle Rope | Intermediate
Alternating Rope Waves | Cardio | Battle Rope | Beginner
Rope Slams | Power | Battle Rope | Intermediate
Rope Circles | Shoulders | Battle Rope | Intermediate
TRX Rows | Upper Body | TRX | Beginner
TRX Chest Press | Upper Body | TRX | Beginner
TRX Squats | Lower Body | TRX | Beginner
TRX Lunges | Lower Body | TRX | Beginner
TRX Atomic Push-ups | Core | TRX | Advanced
TRX Pike | Core | TRX | Advanced
Jump Rope | Cardio | Rope | Beginner
Double Unders | Cardio | Rope | Advanced
Lateral Jump Rope | Cardio | Rope | Intermediate
Agility Ladder High Knees | Cardio | Ladder | Beginner
Agility Ladder Lateral Shuffle | Cardio | Ladder | Beginner
Agility Ladder In-Out | Cardio | Ladder | Intermediate
Resistance Band Squat | Lower Body | Band | Beginner
Resistance Band Lateral Walk | Lower Body | Band | Beginner
Resistance Band Rows | Upper Body | Band | Beginner
Resistance Band Press | Upper Body | Band | Beginner
Resistance Band Deadlift | Lower Body | Band | Beginner
Sled Push | Lower Body | Sled | Advanced
Sled Pull | Lower Body | Sled | Advanced
Burpee Pull-ups | Full Body | Bar | Advanced
Pull-ups | Upper Body | Bar | Intermediate
Chin-ups | Upper Body | Bar | Intermediate
Hanging Knee Raises | Core | Bar | Intermediate
`;

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

const mapDifficulty = (difficultyRaw) => {
  const value = String(difficultyRaw || "").toLowerCase();
  if (value.includes("beginner")) return "principiante";
  if (value.includes("advanced")) return "avanzado";
  return "intermedio";
};

const mapCategory = (categoryRaw) => {
  const value = String(categoryRaw || "").toLowerCase();
  if (value.includes("core")) return "core";
  if (value.includes("cardio")) return "cardio";
  if (value.includes("mobility")) return "movilidad";
  if (value.includes("full") || value.includes("total")) return "full-body";
  return "fuerza";
};

const mapEquipment = (equipmentRaw) => {
  const value = String(equipmentRaw || "").toLowerCase();
  if (value.includes("none")) return "ninguno";
  if (value.includes("dumbbell")) return "mancuernas";
  if (value.includes("barbell") || value === "bar") return "barra";
  if (value.includes("kettlebell")) return "kettlebell";
  if (value.includes("trx")) return "trx";
  if (value.includes("medicine ball")) return "medicine-ball";
  if (value.includes("band")) return "banda-elastica";
  if (value.includes("box")) return "cajon";
  if (value.includes("rope")) return "cuerda";
  return "ninguno";
};

const mapMuscleGroups = (categoryRaw) => {
  const value = String(categoryRaw || "").toLowerCase();
  const groups = new Set();

  if (value.includes("upper")) {
    groups.add("pecho");
    groups.add("espalda");
    groups.add("hombros");
    groups.add("biceps");
    groups.add("triceps");
  }
  if (value.includes("lower")) {
    groups.add("cuadriceps");
    groups.add("isquiotibiales");
    groups.add("gluteos");
    groups.add("pantorrillas");
  }
  if (value.includes("shoulder")) groups.add("hombros");
  if (value.includes("core")) groups.add("core");
  if (value.includes("full") || value.includes("total")) groups.add("full-body");
  if (value.includes("power") && groups.size === 0) groups.add("full-body");
  if (value.includes("cardio") && groups.size === 0) groups.add("full-body");
  if (groups.size === 0) groups.add("full-body");

  return Array.from(groups);
};

const parseRawExercises = () =>
  RAW_EXERCISES.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, categoryRaw, equipmentRaw, difficultyRaw] = line.split("|").map((part) => part.trim());
      return {
        name,
        categoryRaw,
        equipmentRaw,
        difficultyRaw
      };
    });

const run = async () => {
  try {
    await connectDatabase();

    const rows = parseRawExercises();
    const operations = rows.map((row) => {
      const slug = slugify(row.name);
      const payload = {
        name: row.name,
        slug,
        source: "global-library",
        category: mapCategory(row.categoryRaw),
        difficulty: mapDifficulty(row.difficultyRaw),
        equipment: [mapEquipment(row.equipmentRaw)],
        muscleGroups: mapMuscleGroups(row.categoryRaw),
        description: `${row.name} (${row.categoryRaw})`,
        isActive: true
      };

      return {
        updateOne: {
          filter: { slug },
          update: { $set: payload },
          upsert: true
        }
      };
    });

    const result = await Exercise.bulkWrite(operations);

    console.log("Seed de biblioteca de ejercicios completado");
    console.log(`Total procesados: ${rows.length}`);
    console.log(`Insertados: ${result.upsertedCount || 0}`);
    console.log(`Actualizados: ${result.modifiedCount || 0}`);
    console.log(`Sin cambios: ${(result.matchedCount || 0) - (result.modifiedCount || 0)}`);
    process.exit(0);
  } catch (error) {
    console.error("Error seed ejercicios:", error.message);
    process.exit(1);
  }
};

run();
