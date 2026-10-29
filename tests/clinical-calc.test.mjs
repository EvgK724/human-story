import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNumber, bmi, bmiCategory, referenceWeightRange,
  creatinineMgDl, convertCreatinine, cockcroftGault,
  idealWeightDevine, adjustedWeight, ckdEpi2021, gfrCategory,
} from '../docs/clinical-calc/calculations.js';

const near = (actual, expected, tolerance = 1e-10) => {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);
};

const male = { age: 60, weightKg: 70, creatinine: 1, unit: 'mgdl', sex: 'male' };

test('decimal input accepts comma/point, blanks and malformed numbers do not become zero', () => {
  for (const [raw, expected] of [['70', 70], [' 70,5 ', 70.5], ['70.5', 70.5], ['.5', 0.5], [',5', 0.5], ['0', 0], [70, 70]]) {
    assert.equal(parseNumber(raw), expected);
  }
  for (const raw of ['', ' ', null, undefined, false, '-2', -2, Infinity, NaN, 'Infinity', '1e3', '1,234.5', '1.234,5', '1 000', '1..2', '.', ',', '70kg']) {
    assert.equal(parseNumber(raw), null, `Unexpected accepted input ${String(raw)}`);
  }
});

test('BMI uses kilograms and centimetres without intermediate rounding', () => {
  near(bmi(70, 175), 22.857142857142858);
  near(bmi(70.5, 175.5), 22.889424598826313);
  assert.equal(bmi(0, 175), null);
  assert.equal(bmi(70, 0), null);
  assert.equal(bmi('70', 175), null);
  assert.equal(bmi(9, 175), null);
  assert.equal(bmi(501, 175), null);
  assert.equal(bmi(70, 99), null);
  assert.equal(bmi(70, 251), null);
});

test('BMI categories honor exact boundaries, including displayed values close to a cutoff', () => {
  for (const [value, key] of [[18.49999, 'underweight'], [18.5, 'normal'], [24.99999, 'normal'], [25, 'overweight'], [29.99999, 'overweight'], [30, 'obesity1'], [34.99999, 'obesity1'], [35, 'obesity2'], [39.99999, 'obesity2'], [40, 'obesity3'], [70, 'obesity3']]) {
    assert.equal(bmiCategory(value).key, key);
  }
  assert.deepEqual(bmiCategory(23), { key: 'normal', label: 'Нормальная масса тела', min: 18.5, max: 25 });
  for (const value of [null, NaN, Infinity, 0, -1]) assert.equal(bmiCategory(value), null);
});

test('reference weight range uses BMI 18.5 inclusive to 25 exclusive', () => {
  const range = referenceWeightRange(175);
  near(range.min, 56.65625);
  near(range.max, 76.5625);
  assert.equal(bmiCategory(bmi(range.min, 175)).key, 'normal');
  assert.equal(bmiCategory(bmi(range.max, 175)).key, 'overweight');
  assert.equal(referenceWeightRange(0), null);
});

test('Cockcroft–Gault known male/female cases and equivalent creatinine units', () => {
  near(cockcroftGault(male), 77.77777777777777);
  near(cockcroftGault({ ...male, sex: 'female' }), 66.11111111111111);
  near(cockcroftGault({ ...male, creatinine: 88.4, unit: 'umol' }), 77.77777777777777);
  near(cockcroftGault({ ...male, creatinine: 88.4, unit: 'umol', sex: 'female' }), 66.11111111111111);
  near(cockcroftGault({ ...male, age: 80, weightKg: 60, creatinine: 2, sex: 'female' }), 21.25);
});

test('Cockcroft–Gault rejects incomplete, nonfinite, zero creatinine, pediatric and invalid sex input', () => {
  assert.equal(cockcroftGault(), null);
  assert.equal(cockcroftGault(null), null);
  for (const extra of [{ age: 17 }, { age: 121 }, { age: NaN }, { weightKg: 0 }, { weightKg: 501 }, { creatinine: 0 }, { creatinine: -1 }, { creatinine: Infinity }, { sex: '' }, { sex: 'unknown' }, { unit: 'mg/L' }]) {
    assert.equal(cockcroftGault({ ...male, ...extra }), null);
  }
  assert.ok(cockcroftGault({ ...male, age: 18 }) > 0);
  assert.ok(cockcroftGault({ ...male, age: 120 }) > 0);
  assert.ok(cockcroftGault({ ...male, creatinine: 0.2 }) > 300, 'No arbitrary result cap or creatinine rounding');
});

test('creatinine conversion preserves concentration through round trips', () => {
  near(creatinineMgDl(88.4, 'umol'), 1);
  near(convertCreatinine(1.7, 'mgdl', 'umol'), 150.28);
  const source = 97.3;
  near(convertCreatinine(convertCreatinine(source, 'umol', 'mgdl'), 'mgdl', 'umol'), source);
  assert.equal(convertCreatinine(10, 'umol', 'umol'), 10);
  for (const args of [[0, 'umol', 'mgdl'], [1, 'unknown', 'mgdl'], [1, 'mgdl', 'unknown'], [NaN, 'mgdl', 'umol']]) assert.equal(convertCreatinine(...args), null);
});

test('Devine and adjusted weight use explicit sex and height limits', () => {
  near(idealWeightDevine(152.4, 'male'), 50);
  near(idealWeightDevine(152.4, 'female'), 45.5);
  near(idealWeightDevine(177.8, 'male'), 73);
  near(idealWeightDevine(177.8, 'female'), 68.5);
  assert.equal(idealWeightDevine(150, 'male'), null);
  assert.equal(idealWeightDevine(177.8, ''), null);
  near(adjustedWeight(100, 73), 83.8);
  near(adjustedWeight(73, 73), 73);
  assert.equal(adjustedWeight(60, 73), null);
  assert.equal(adjustedWeight(100, NaN), null);
});


test('underweight severity uses raw BMI at 16, 17 and 18.5 boundaries', () => {
  for (const [value, severity, min, max] of [[15.99999, 'severe', 0, 16], [16, 'moderate', 16, 17], [16.99999, 'moderate', 16, 17], [17, 'mild', 17, 18.5], [18.49999, 'mild', 17, 18.5]]) {
    const category = bmiCategory(value);
    assert.equal(category.key, 'underweight');
    assert.equal(category.severity, severity);
    assert.equal(category.min, min);
    assert.equal(category.max, max);
  }
  assert.equal(bmiCategory(18.5).key, 'normal');
  assert.equal(bmiCategory(18.5).severity, undefined);
});

test('CKD-EPI 2021 independently calculated reference values exercise both creatinine branches', () => {
  // Expected values calculated with Python Decimal at 40-digit precision.
  near(ckdEpi2021(male), 86.162620779669046);
  near(ckdEpi2021({ ...male, sex: 'female' }), 64.495000353945031);
  near(ckdEpi2021({ ...male, age: 40, creatinine: 0.7 }), 119.456468227015922);
  near(ckdEpi2021({ ...male, age: 40, creatinine: 0.5, sex: 'female' }), 121.519342171252229);
  near(ckdEpi2021({ ...male, age: 18 }), 111.882257070599460);
  near(ckdEpi2021({ ...male, weightKg: 140 }), ckdEpi2021(male));
});

test('CKD-EPI units agree without intermediate rounding and invalid inputs return null', () => {
  near(ckdEpi2021({ ...male, creatinine: 88.4, unit: 'umol' }), ckdEpi2021(male));
  near(ckdEpi2021({ ...male, creatinine: 44.2, unit: 'umol', sex: 'female' }), ckdEpi2021({ ...male, creatinine: 0.5, sex: 'female' }));
  assert.equal(ckdEpi2021(), null);
  assert.equal(ckdEpi2021(null), null);
  for (const extra of [{ age: 17 }, { age: 121 }, { age: NaN }, { age: '60' }, { creatinine: 0 }, { creatinine: -1 }, { creatinine: Infinity }, { creatinine: '1' }, { sex: '' }, { sex: 'unknown' }, { unit: 'mg/L' }]) {
    assert.equal(ckdEpi2021({ ...male, ...extra }), null);
  }
  assert.ok(ckdEpi2021({ ...male, age: 120 }) > 0);
});

test('GFR categories use unrounded values at all KDIGO category boundaries', () => {
  for (const [value, key] of [[0, 'G5'], [14.99999, 'G5'], [15, 'G4'], [29.99999, 'G4'], [30, 'G3b'], [44.99999, 'G3b'], [45, 'G3a'], [59.99999, 'G3a'], [60, 'G2'], [89.99999, 'G2'], [90, 'G1'], [180, 'G1']]) {
    assert.equal(gfrCategory(value).key, key);
  }
  assert.deepEqual(gfrCategory(90), { key: 'G1', label: 'Нормальная или высокая', min: 90, max: Infinity });
  for (const value of [null, undefined, NaN, Infinity, -1, '60']) assert.equal(gfrCategory(value), null);
});
