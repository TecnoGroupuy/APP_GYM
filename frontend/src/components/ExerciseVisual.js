import React, { useEffect, useMemo, useRef, useState } from "react";
import "./exercise-visual.css";

/**
 * Props:
 * - exercise?: { movement_pattern, movementPattern, category, display_name, displayName, name }
 * - movementPattern?: string
 * - label?: string
 * - className?: string
 */
export default function ExerciseVisual({
  exercise,
  movementPattern,
  label,
  className = "",
}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [imageError, setImageError] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { root: null, threshold: 0.15 }
    );

    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const pattern = useMemo(
    () =>
      normalizePattern(
        movementPattern ||
          exercise?.movement_pattern ||
          exercise?.movementPattern,
        exercise?.category
      ),
    [movementPattern, exercise?.movement_pattern, exercise?.movementPattern, exercise?.category]
  );

  const svgVisual = useMemo(() => getSvgByPattern(pattern), [pattern]);
  const imageSrc = useMemo(
    () => resolveImageSrc(exercise?.media?.image || exercise?.image || exercise?.media?.gif),
    [exercise?.media?.image, exercise?.image, exercise?.media?.gif]
  );
  const shouldUseImage = Boolean(imageSrc) && !imageError;
  const visualLabel =
    label ||
    exercise?.display_name ||
    exercise?.displayName ||
    exercise?.name ||
    `Ejercicio: ${pattern}`;

  const shouldAnimate = inView && !prefersReducedMotion;

  return (
    <div
      ref={ref}
      className={`exv-wrap ${className} ${shouldAnimate ? "exv-animate" : "exv-static"}`}
      role="img"
      aria-label={visualLabel}
      title={visualLabel}
    >
      <div className="exv-bg" />
      {shouldUseImage ? (
        <img
          src={imageSrc}
          alt={visualLabel}
          loading="lazy"
          onError={() => setImageError(true)}
          className={`exv-photo ${shouldAnimate ? "exv-photo-animate" : ""}`}
        />
      ) : (
        <div className="exv-svg">{svgVisual}</div>
      )}
    </div>
  );
}

function resolveImageSrc(value) {
  const src = String(value || "").trim();
  if (!src || src.includes("/Content/Images/default-exercise.jpg")) return "";
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/exercises/image/") || src.startsWith("/Exercises/Image/")) {
    return `https://www.functionalmovement.com${src}`;
  }
  if (src.startsWith("/")) return src;
  return src;
}

function normalizePattern(pattern, category) {
  const value = String(pattern || "").toLowerCase().trim();
  const known = new Set([
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
    "mobility",
  ]);
  if (known.has(value)) return value;

  const categoryMap = {
    fuerza: "push",
    cardio: "sprint",
    movilidad: "mobility",
    core: "core_dynamic",
    full_body: "combo",
    "full-body": "combo",
    total: "combo",
  };
  const byCategory = categoryMap[String(category || "").toLowerCase().trim()];
  return byCategory || "combo";
}

function getSvgByPattern(pattern) {
  switch (pattern) {
    case "squat":
      return <SvgSquat />;
    case "lunge":
      return <SvgLunge />;
    case "sprint":
      return <SvgSprint />;
    case "core_dynamic":
      return <SvgCoreDynamic />;
    case "core_static":
      return <SvgPlank />;
    case "push":
      return <SvgPushUp />;
    case "pull":
      return <SvgPull />;
    case "jump":
      return <SvgJump />;
    case "rotation":
      return <SvgRotation />;
    case "carry":
      return <SvgCarry />;
    case "agility":
      return <SvgAgility />;
    case "throw":
      return <SvgThrow />;
    case "mobility":
      return <SvgMobility />;
    default:
      return <SvgCombo />;
  }
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(Boolean(mediaQuery.matches));
    onChange();
    mediaQuery.addEventListener?.("change", onChange);
    return () => mediaQuery.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

function SvgBase({ children }) {
  return (
    <svg viewBox="0 0 320 200" width="100%" height="100%" aria-hidden="true">
      <defs>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter="url(#softShadow)">{children}</g>
    </svg>
  );
}

function Head({ cx = 160, cy = 48, r = 18 }) {
  return <circle className="body" cx={cx} cy={cy} r={r} />;
}

function Torso({ x = 148, y = 62, w = 24, h = 52, rx = 12 }) {
  return <rect className="body" x={x} y={y} width={w} height={h} rx={rx} />;
}

function LimbLine({ x1, y1, x2, y2, cls = "body" }) {
  return (
    <line
      className={cls}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth="14"
      strokeLinecap="round"
    />
  );
}

function SvgSquat() {
  return (
    <SvgBase>
      <g className="move1">
        <Head cx={160} cy={40} r={16} />
        <polygon className="body" points="136,62 184,62 176,112 144,112" />
        <polygon className="body" points="146,112 132,140 160,154 166,132" />
        <polygon className="body" points="174,112 188,140 160,154 154,132" />
        <rect className="body" x="122" y="145" width="42" height="10" rx="4" />
        <rect className="body" x="156" y="145" width="42" height="10" rx="4" />
        <rect className="accent pulse" x="114" y="84" width="92" height="8" rx="3" />
      </g>
      <rect className="accent pulse" x="60" y="164" width="200" height="6" rx="3" />
    </SvgBase>
  );
}

function SvgLunge() {
  return (
    <SvgBase>
      <g className="move1">
        <Head cx={150} cy={36} r={14} />
        <polygon className="body" points="128,54 170,54 166,100 136,100" />
        <polygon className="body" points="136,72 106,94 116,108 144,86" />
        <polygon className="body" points="164,72 194,94 184,108 156,86" />
        <polygon className="body" points="142,100 112,128 128,140 154,112" />
        <polygon className="body" points="112,128 136,150 152,140 128,120" />
        <polygon className="body" points="160,100 198,124 188,138 154,114" />
        <rect className="accent pulse" x="116" y="146" width="42" height="8" rx="3" />
        <rect className="accent pulse" x="178" y="138" width="34" height="8" rx="3" />
      </g>
      <rect className="accent pulse" x="70" y="164" width="180" height="6" rx="3" />
    </SvgBase>
  );
}

function SvgSprint() {
  return (
    <SvgBase>
      <g className="move1">
        <Head cx={146} cy={46} r={14} />
        <polygon className="body" points="130,62 168,70 154,104 122,96" />
      </g>
      <g className="move2">
        <polygon className="body" points="122,78 96,94 104,106 130,92" />
        <polygon className="body" points="158,82 196,74 198,88 164,98" />
        <polygon className="body" points="132,100 104,128 118,138 148,112" />
        <polygon className="body" points="152,102 198,124 192,140 148,116" />
        <rect className="body" x="94" y="132" width="34" height="9" rx="4" transform="rotate(-18 111 136)" />
        <rect className="body" x="188" y="136" width="34" height="9" rx="4" transform="rotate(14 205 140)" />
      </g>
      <path className="accent dash" d="M52 126 H92" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path className="accent dash" d="M38 146 H84" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path className="accent dash" d="M70 164 H250" strokeWidth="6" strokeLinecap="round" fill="none" />
    </SvgBase>
  );
}

function SvgCoreDynamic() {
  return (
    <SvgBase>
      <g className="move1">
        <Head cx={160} cy={36} r={14} />
        <polygon className="body" points="138,54 182,54 176,102 144,102" />
        <polygon className="body" points="142,70 110,98 120,112 148,86" />
        <polygon className="body" points="178,70 210,98 200,112 172,86" />
        <polygon className="body" points="148,102 132,144 150,150 162,114" />
        <polygon className="body" points="172,102 188,144 170,150 158,114" />
        <rect className="accent pulse" x="146" y="72" width="28" height="22" rx="5" />
      </g>
      <path className="accent dash" d="M120 162 H200" strokeWidth="7" strokeLinecap="round" fill="none" />
    </SvgBase>
  );
}

function SvgPlank() {
  return (
    <SvgBase>
      <g className="move1">
        <circle className="body" cx="88" cy="106" r="12" />
        <polygon className="body" points="100,102 228,116 224,132 96,118" />
        <polygon className="body" points="132,116 116,150 130,156 148,122" />
        <polygon className="body" points="206,124 222,154 208,160 192,130" />
      </g>
      <path className="accent pulse" d="M112 98 H214" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path className="accent dash" d="M110 164 H228" strokeWidth="6" strokeLinecap="round" fill="none" />
    </SvgBase>
  );
}

function SvgPushUp() {
  return (
    <SvgBase>
      <g className="move1">
        <circle className="body" cx="88" cy="106" r="12" />
        <polygon className="body" points="100,102 214,118 208,134 96,118" />
        <polygon className="body" points="136,118 126,150 142,154 150,124" />
        <polygon className="body" points="176,124 166,154 182,158 190,128" />
        <rect className="accent pulse" x="112" y="100" width="84" height="7" rx="3" />
      </g>
      <rect className="accent bounce" x="121" y="150" width="16" height="8" rx="3" />
      <rect className="accent bounce" x="161" y="155" width="16" height="8" rx="3" />
    </SvgBase>
  );
}

function SvgPull() {
  return (
    <SvgBase>
      <line className="body" x1="80" y1="50" x2="240" y2="50" strokeWidth="12" strokeLinecap="round" />
      <g className="move1">
        <circle className="body" cx="160" cy="84" r="13" />
        <polygon className="body" points="142,98 178,98 174,142 146,142" />
        <polygon className="body" points="146,104 116,72 126,64 156,96" />
        <polygon className="body" points="174,104 204,72 194,64 164,96" />
        <polygon className="body" points="150,142 136,166 150,172 164,148" />
        <polygon className="body" points="170,142 184,166 170,172 156,148" />
        <rect className="accent pulse" x="140" y="112" width="40" height="7" rx="3" />
      </g>
      <circle className="accent pulse" cx="120" cy="70" r="6" />
      <circle className="accent pulse" cx="200" cy="70" r="6" />
    </SvgBase>
  );
}

function SvgJump() {
  return (
    <SvgBase>
      <g className="move1">
        <Head cx={160} cy={42} r={15} />
        <polygon className="body" points="136,62 184,62 176,110 144,110" />
        <polygon className="body" points="140,80 112,104 124,118 150,92" />
        <polygon className="body" points="180,80 208,104 196,118 170,92" />
        <polygon className="body" points="148,110 130,150 148,158 166,120" />
        <polygon className="body" points="172,110 190,150 172,158 154,120" />
        <rect className="accent pulse" x="142" y="74" width="36" height="8" rx="3" />
      </g>
      <path className="accent dash" d="M140 170 C160 150, 180 150, 200 170" fill="none" strokeWidth="6" strokeLinecap="round" />
    </SvgBase>
  );
}

function SvgRotation() {
  return (
    <SvgBase>
      <g className="moveRotate">
        <Head cx={160} cy={40} r={14} />
        <polygon className="body" points="136,58 184,58 176,108 144,108" />
        <polygon className="body" points="144,78 106,92 112,108 150,94" />
        <polygon className="body" points="176,78 214,92 208,108 170,94" />
        <polygon className="body" points="150,108 134,150 152,156 166,118" />
        <polygon className="body" points="170,108 186,150 168,156 154,118" />
        <rect className="accent pulse" x="144" y="74" width="32" height="8" rx="3" />
      </g>
      <path className="accent" d="M110 60 C130 40, 190 40, 210 60" fill="none" strokeWidth="6" strokeLinecap="round" />
      <polygon className="accent" points="210,60 202,56 202,64" />
    </SvgBase>
  );
}

function SvgCarry() {
  return (
    <SvgBase>
      <g className="move1">
        <Head cx={160} cy={38} r={14} />
        <polygon className="body" points="136,56 184,56 176,110 144,110" />
        <polygon className="body" points="146,80 132,118 148,124 160,86" />
        <polygon className="body" points="174,80 188,118 172,124 160,86" />
        <rect className="accent pulse" x="118" y="114" width="26" height="18" rx="4" />
        <rect className="accent pulse" x="176" y="114" width="26" height="18" rx="4" />
        <g className="move2">
          <polygon className="body" points="150,110 132,150 150,158 166,120" />
          <polygon className="body" points="170,110 190,148 172,156 156,120" />
        </g>
      </g>
      <path className="accent dash" d="M90 164 H230" fill="none" strokeWidth="6" strokeLinecap="round" />
    </SvgBase>
  );
}

function SvgAgility() {
  return (
    <SvgBase>
      <g className="ladder">
        <rect className="body thin" x="90" y="140" width="140" height="6" rx="3" />
        <rect className="body thin" x="90" y="120" width="140" height="6" rx="3" />
        <rect className="body thin" x="90" y="100" width="140" height="6" rx="3" />
        <rect className="body thin" x="90" y="80" width="140" height="6" rx="3" />
        <rect className="body thin" x="90" y="80" width="6" height="66" rx="3" />
        <rect className="body thin" x="224" y="80" width="6" height="66" rx="3" />
      </g>
      <g className="feet">
        <rect className="accent step" x="140" y="134" width="14" height="10" rx="4" />
        <rect className="accent step2" x="166" y="118" width="14" height="10" rx="4" />
      </g>
    </SvgBase>
  );
}

function SvgThrow() {
  return (
    <SvgBase>
      <g className="move1">
        <Head />
        <Torso />
        <LimbLine x1={146} y1={80} x2={120} y2={62} />
        <LimbLine x1={174} y1={80} x2={200} y2={62} />
        <LimbLine x1={156} y1={106} x2={140} y2={150} />
        <LimbLine x1={164} y1={106} x2={180} y2={150} />
      </g>
      <circle className="accent throw" cx="210" cy="60" r="8" />
    </SvgBase>
  );
}

function SvgMobility() {
  return (
    <SvgBase>
      <g className="move1">
        <Head cx={150} cy={52} />
        <Torso x={140} y={66} />
        <LimbLine x1={140} y1={82} x2={110} y2={60} />
        <LimbLine x1={160} y1={82} x2={210} y2={50} />
        <LimbLine x1={156} y1={110} x2={130} y2={150} />
        <LimbLine x1={164} y1={110} x2={190} y2={150} />
      </g>
      <path className="accent pulse" d="M95 55 C125 25, 195 25, 225 55" fill="none" strokeWidth="6" strokeLinecap="round" />
    </SvgBase>
  );
}

function SvgCombo() {
  return (
    <SvgBase>
      <g className="move1">
        <Head cx={160} cy={38} r={14} />
        <polygon className="body" points="136,56 184,56 174,108 146,108" />
        <polygon className="body" points="142,78 110,96 118,110 150,92" />
        <polygon className="body" points="178,78 210,96 202,110 170,92" />
        <polygon className="body" points="150,108 132,150 148,156 166,118" />
        <polygon className="body" points="170,108 188,150 172,156 154,118" />
        <rect className="accent pulse" x="142" y="74" width="36" height="8" rx="3" />
      </g>
      <rect className="accent pulse" x="110" y="162" width="100" height="6" rx="3" />
    </SvgBase>
  );
}
