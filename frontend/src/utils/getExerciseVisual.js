const PATTERNS = new Set([
  "squat",
  "lunge",
  "hinge",
  "push",
  "pull",
  "jump",
  "core_static",
  "core_dynamic",
  "sprint",
  "carry",
  "rotation",
  "agility",
  "throw",
  "combo",
  "mobility"
]);

const EQUIPMENT = new Set([
  "none",
  "dumbbell",
  "kettlebell",
  "barbell",
  "trx",
  "band",
  "box",
  "rope",
  "medball",
  "battle_rope",
  "bar"
]);

const CATEGORY_TO_PATTERN = {
  FUERZA: "push",
  CARDIO: "sprint",
  MOVILIDAD: "mobility",
  CORE: "core_dynamic",
  FULL_BODY: "combo"
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const normalizeCategory = (category) => String(category || "").trim().toUpperCase();

const normalizePattern = (pattern, category) => {
  const direct = normalizeText(pattern);
  if (PATTERNS.has(direct)) return direct;

  if (direct === "core-static") return "core_static";
  if (direct === "core-dynamic") return "core_dynamic";
  if (direct === "full_body") return "combo";

  const categoryPattern = CATEGORY_TO_PATTERN[normalizeCategory(category)];
  if (categoryPattern && PATTERNS.has(categoryPattern)) return categoryPattern;

  if (normalizeCategory(category) === "MOVILIDAD") return "mobility";
  return "core_dynamic";
};

const normalizeEquipment = (equipment) => {
  if (Array.isArray(equipment) && equipment.length > 0) {
    const first = normalizeText(equipment[0]);
    if (EQUIPMENT.has(first)) return first;
  }
  const direct = normalizeText(equipment);
  if (EQUIPMENT.has(direct)) return direct;
  return "none";
};

const buildInlinePoster = (pattern) => {
  const safePattern = String(pattern || "exercise").replace(/_/g, " ").toUpperCase();
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
        <rect width="800" height="450" fill="#0a0a0a"/>
        <rect x="12" y="12" width="776" height="426" fill="#111111" stroke="#ff6b00" stroke-opacity="0.25"/>
        <circle cx="400" cy="170" r="42" fill="#9ca3af"/>
        <rect x="358" y="220" width="84" height="120" rx="20" fill="#6b7280"/>
        <rect x="300" y="238" width="58" height="22" rx="11" fill="#6b7280"/>
        <rect x="442" y="238" width="58" height="22" rx="11" fill="#6b7280"/>
        <rect x="350" y="342" width="26" height="56" rx="13" fill="#6b7280"/>
        <rect x="424" y="342" width="26" height="56" rx="13" fill="#6b7280"/>
        <text x="400" y="85" text-anchor="middle" fill="#ff6b00" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800">${safePattern}</text>
        <text x="400" y="420" text-anchor="middle" fill="#a3a3a3" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="600">BOOT CAMP REFERENCE</text>
      </svg>`
    )
  );
};

export const getExerciseVisual = (exercise = {}) => {
  const pattern = normalizePattern(
    exercise.movement_pattern || exercise.movementPattern,
    exercise.category
  );
  const equipment = normalizeEquipment(exercise.equipment);

  const lottieBase = `/exercise-visuals/lottie/${pattern}.json`;
  const lottieByEquipment =
    equipment !== "none" ? `/exercise-visuals/lottie/${pattern}_${equipment}.json` : null;
  const webpBase = `/exercise-visuals/webp/${pattern}.webp`;
  const gifBase = `/exercise-visuals/gif/${pattern}.gif`;
  const posterSrc = `/exercise-visuals/static/${pattern}.svg`;

  const preferredType = normalizeText(exercise.visual_type || exercise.visualType);
  const type =
    preferredType === "webp" || preferredType === "gif" || preferredType === "static"
      ? preferredType
      : "lottie";

  return {
    type,
    src: lottieByEquipment || lottieBase,
    posterSrc,
    fallbackDataUri: buildInlinePoster(pattern),
    pattern,
    equipment,
    // Optional hints consumed by ExerciseVisual for fallback chain
    lottieCandidates: [lottieByEquipment, lottieBase].filter(Boolean),
    webpSrc: webpBase,
    gifSrc: gifBase
  };
};

export default getExerciseVisual;
