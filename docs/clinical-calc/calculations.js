/** Pure adult calculator functions. Invalid or unsupported input returns null. */
export const MICROMOLES_PER_MG_DL = 88.4;

const finite = value => typeof value === 'number' && Number.isFinite(value);
const between = (value, min, max) => finite(value) && value >= min && value <= max;
const validWeight = value => between(value, 10, 500);
const validHeight = value => between(value, 100, 250);
const validSex = sex => sex === 'male' || sex === 'female';
const finiteResult = value => Number.isFinite(value) ? value : null;

/** Accept a decimal point or comma; never reinterpret grouping or mixed separators. */
export function parseNumber(raw) {
  if (typeof raw === 'number') return finite(raw) && raw >= 0 ? raw : null;
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value)) return null;
  const parsed = Number(value.replace(',', '.'));
  return finite(parsed) && parsed >= 0 ? parsed : null;
}

export function bmi(weightKg, heightCm) {
  if (!validWeight(weightKg) || !validHeight(heightCm)) return null;
  return weightKg / (heightCm / 100) ** 2;
}

/** Classification uses the original value, not a rounded display value. */
export function bmiCategory(value) {
  if (!finite(value) || value <= 0) return null;
  const categories = [
    { key: 'underweight', label: 'Дефицит массы тела', min: 0, max: 18.5 },
    { key: 'normal', label: 'Нормальная масса тела', min: 18.5, max: 25 },
    { key: 'overweight', label: 'Избыточная масса тела', min: 25, max: 30 },
    { key: 'obesity1', label: 'Ожирение I степени', min: 30, max: 35 },
    { key: 'obesity2', label: 'Ожирение II степени', min: 35, max: 40 },
    { key: 'obesity3', label: 'Ожирение III степени', min: 40, max: Infinity },
  ];
  return categories.find(category => value < category.max);
}

/** The upper bound is exclusive: it corresponds to BMI 25, not 24.9. */
export function referenceWeightRange(heightCm) {
  if (!validHeight(heightCm)) return null;
  const heightSquared = (heightCm / 100) ** 2;
  return { min: 18.5 * heightSquared, max: 25 * heightSquared };
}

export function creatinineMgDl(value, unit) {
  if (!finite(value) || value <= 0) return null;
  if (unit === 'mgdl') return value;
  if (unit === 'umol') {
    const mgDl = value / MICROMOLES_PER_MG_DL;
    return mgDl > 0 ? mgDl : null;
  }
  return null;
}

/** Conversion never rounds or changes the represented creatinine concentration. */
export function convertCreatinine(value, from, to) {
  const mgDl = creatinineMgDl(value, from);
  if (mgDl === null) return null;
  if (from === to) return value;
  if (to === 'mgdl') return mgDl;
  if (to === 'umol') return finiteResult(mgDl * MICROMOLES_PER_MG_DL);
  return null;
}

/** Cockcroft–Gault estimates creatinine clearance in mL/min, without BSA indexing. */
export function cockcroftGault(inputs = {}) {
  if (!inputs || typeof inputs !== 'object') return null;
  const { age, weightKg, creatinine, unit, sex } = inputs;
  if (!between(age, 18, 120) || !validWeight(weightKg) || !validSex(sex)) return null;
  const mgDl = creatinineMgDl(creatinine, unit);
  if (mgDl === null || mgDl <= 0) return null;
  return finiteResult(((140 - age) * weightKg / 72 / mgDl) * (sex === 'female' ? 0.85 : 1));
}

/** Devine's formula is not extrapolated below 5 feet (152.4 cm). */
export function idealWeightDevine(heightCm, sex) {
  if (!between(heightCm, 152.4, 250) || !validSex(sex)) return null;
  const inchesAboveFiveFeet = (heightCm - 152.4) / 2.54;
  return (sex === 'female' ? 45.5 : 50) + 2.3 * inchesAboveFiveFeet;
}

/** Selection of this dosing weight is a clinical decision, not an automatic BMI rule. */
export function adjustedWeight(actual, ideal) {
  if (!validWeight(actual) || !validWeight(ideal) || actual < ideal) return null;
  return ideal + 0.4 * (actual - ideal);
}
