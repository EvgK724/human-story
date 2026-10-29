import {parseNumber, bmi, bmiCategory, referenceWeightRange, creatinineMgDl, convertCreatinine, cockcroftGault, idealWeightDevine, adjustedWeight, ckdEpi2021, gfrCategory} from './calculations.js?v=20261029-2';

const $ = selector => document.querySelector(selector);
const inputIds = ['weight', 'height', 'age', 'creatinine', 'manual-weight'];
const modeNames = {actual:'Фактическая', ideal:'Devine', adjusted:'Скорректированная', manual:'Заданная вручную'};
const touched = new Set();
let required = new Set();
let unit = 'umol';
let canonicalCreatinine = null;
let result = null;
let toastTimer;
let announcementTimer;
let demo = false;
const format = (value, digits=1) => new Intl.NumberFormat('ru-RU', {maximumFractionDigits:digits, minimumFractionDigits:0}).format(value);
const fixed = (value, digits=1) => new Intl.NumberFormat('ru-RU', {maximumFractionDigits:digits, minimumFractionDigits:digits}).format(value);
const raw = id => $('#'+id).value.trim();
const selectedSex = () => $('input[name="sex"]:checked')?.value || '';
const unitName = value => value === 'umol' ? 'мкмоль/л' : 'мг/дл';

function toast(text) {
  $('#toast').textContent = text;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}
function showError(id, message) {
  const element = $('#'+id);
  const error = $('#'+id+'-error');
  if (!error) return;
  const visible = !!message && (touched.has(id) || required.has(id));
  error.textContent = visible ? message : '';
  error.hidden = !visible;
  if (element) {
    if (visible) element.setAttribute('aria-invalid','true');
    else element.removeAttribute('aria-invalid');
  }
}
function numberField(id, min, max, label, integer=false) {
  const text = raw(id);
  const value = parseNumber(text);
  let error = '';
  if (!text) error = 'Введите '+label+'.';
  else if (value === null) error = 'Введите число, например 70 или 70,5.';
  else if (value < min || value > max || (integer && !Number.isInteger(value))) {
    error = integer ? `Укажите полных лет: от ${min} до ${max}.` : `Допустимо от ${format(min)} до ${format(max)}.`;
  }
  showError(id, error);
  return error ? null : value;
}
function updateCanonicalCreatinine() {
  canonicalCreatinine = creatinineMgDl(parseNumber(raw('creatinine')), unit);
}
function massForCalculation(values) {
  const mode = $('#weight-mode').value;
  const {weight, height, sex} = values;
  let mass = null;
  let error = '';
  if (mode === 'actual') mass = weight;
  if (mode === 'manual') mass = numberField('manual-weight',10,500,'массу для расчёта');
  if (mode === 'ideal' || mode === 'adjusted') {
    if (height === null) error = 'Для этого режима нужен корректный рост.';
    else if (!sex) error = 'Для Devine выберите пол.';
    else if (height < 152.4) error = 'Devine здесь доступен при росте от 152,4 см. Выберите фактическую или заданную массу.';
    else {
      const ideal = idealWeightDevine(height, sex);
      if (mode === 'ideal') mass = ideal;
      else if (weight === null) error = 'Для скорректированной массы введите фактическую массу.';
      else if (weight < ideal) error = 'Фактическая масса ниже Devine. Этот режим не применяется; выберите другую массу.';
      else mass = adjustedWeight(weight, ideal);
    }
  }
  $('#mass-error').textContent = error;
  $('#mass-error').hidden = !error;
  $('#weight-mode').setAttribute('aria-invalid', String(!!error));
  return {mass, mode, error};
}
function configureMassMode() {
  const mode = $('#weight-mode').value;
  $('#manual-mass-field').hidden = mode !== 'manual';
  $('#mass-mode-summary').textContent = modeNames[mode];
  const explanations = {
    actual:'По умолчанию используется фактическая масса. При ожирении, отёках или выраженном дефиците массы выбор требует клинической оценки.',
    ideal:'Devine — расчётная масса, не индивидуальная цель. Нужны рост от 152,4 см и пол; фактическая масса продолжает использоваться для ИМТ.',
    adjusted:'Devine + 0,4 × (фактическая − Devine). Режим доступен, когда фактическая масса не ниже Devine. Выбор зависит от клинической ситуации.',
    manual:'Эта масса используется только для Кокрофта–Голта. ИМТ рассчитывается по фактической массе из верхнего поля.'
  };
  $('#mass-explanation').textContent = explanations[mode];
}
function calculate() {
  const weight = numberField('weight',10,500,'массу тела');
  const height = numberField('height',100,250,'рост');
  const age = numberField('age',18,120,'возраст',true);
  const sex = selectedSex();
  const creatinineText = raw('creatinine');
  const creatinineInput = parseNumber(creatinineText);
  const creatinineError = !creatinineText ? 'Введите креатинин крови.' : creatinineInput === null || creatinineInput <= 0 || canonicalCreatinine === null ? 'Креатинин должен быть положительным числом.' : '';
  showError('creatinine', creatinineError);
  showError('sex', sex ? '' : 'Выберите пол для формулы.');
  const creatinine = creatinineError ? null : canonicalCreatinine;
  const conversion = creatinine === null ? null : convertCreatinine(creatinine,'mgdl',unit === 'umol' ? 'mgdl' : 'umol');
  $('#conversion-note').textContent = conversion === null ? 'Можно вводить точку или запятую.' : `Это ${format(conversion,4)} ${unitName(unit === 'umol' ? 'mgdl' : 'umol')}. При смене единиц значение переводится.`;
  const mass = massForCalculation({weight,height,sex});
  const underage = raw('age') && parseNumber(raw('age')) !== null && parseNumber(raw('age')) < 18;
  const bmiValue = underage ? null : bmi(weight,height);
  const category = bmiCategory(bmiValue);
  const range = underage ? null : referenceWeightRange(height);
  const crcl = cockcroftGault({age,weightKg:mass.mass,creatinine,unit:'mgdl',sex});
  const egfr = ckdEpi2021({age,creatinine,unit:'mgdl',sex});
  const gfr = gfrCategory(egfr);
  result = {weight,height,age,sex,creatinine,bmi:bmiValue,category,crcl,egfr,gfr,mass:mass.mass,mode:mass.mode,range};

  $('#bmi-value').textContent = bmiValue === null ? '—' : fixed(bmiValue,2);
  $('#bmi-status').textContent = category ? category.label : underage ? 'Взрослая классификация не применяется до 18 лет' : 'Введите массу и рост';
  $('#bmi-status').dataset.category = category?.key || '';
  $('#bmi-marker').hidden = bmiValue === null;
  if (bmiValue !== null) $('#bmi-marker').style.left = `${Math.max(0,Math.min(100,(bmiValue-10)/35*100))}%`;
  $('#bmi-range').textContent = range ? `${fixed(range.min)} – <${fixed(range.max)} кг` : '—';
  $('#crcl-value').textContent = crcl === null ? '—' : fixed(crcl);
  $('#crcl-status').textContent = crcl !== null ? 'Расчёт по Кокрофту–Голту' : mass.error ? 'Проверьте выбор массы для формулы' : 'Нужны масса, возраст, пол и креатинин';
  $('#used-weight').textContent = mass.mass === null ? '—' : `${format(mass.mass,2)} кг · ${modeNames[mass.mode].toLowerCase()}`;
  $('#used-creatinine').textContent = creatinine === null ? '—' : `${format(creatinine,4)} мг/дл`;
  const notes = [];
  if (creatinine !== null && (creatinine < .2 || creatinine > 20)) notes.push('Необычное значение креатинина: проверьте число и единицы измерения.');
  if (crcl !== null && crcl > 200) notes.push('Высокая расчётная величина: проверьте массу и применимость формулы.');
  if (crcl !== null && bmiValue >= 30 && mass.mode === 'actual') notes.push('При ожирении фактическая масса может завышать клиренс. Выбор массы — в дополнительных параметрах.');
  $('#renal-caution').textContent = notes.join(' ');
  $('#renal-caution').hidden = notes.length === 0;
  $('#gfr-value').textContent = egfr === null ? '—' : fixed(egfr);
  $('#gfr-category').hidden = !gfr;
  $('#gfr-category').textContent = gfr?.key || '';
  $('#gfr-category').dataset.category = gfr?.key || '';
  $('#gfr-status').textContent = gfr ? gfr.label : 'Введите возраст, пол и креатинин';
  document.querySelectorAll('[data-bmi-min]').forEach(row => row.classList.toggle('current-range',bmiValue !== null && bmiValue >= Number(row.dataset.bmiMin) && bmiValue < Number(row.dataset.bmiMax)));
  document.querySelectorAll('[data-gfr]').forEach(row => row.classList.toggle('current-range',row.dataset.gfr === gfr?.key));
  $('#copy-result').disabled = bmiValue === null && crcl === null && egfr === null;
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => {
    $('#result-announcement').textContent = `${bmiValue === null ? 'ИМТ не рассчитан.' : `ИМТ ${fixed(bmiValue,2)}. ${category.label}.`} ${crcl === null ? 'Клиренс не рассчитан.' : `Клиренс креатинина ${fixed(crcl)} миллилитров в минуту.`} ${egfr === null ? 'СКФ не рассчитана.' : `Расчётная СКФ ${fixed(egfr)}. Категория ${gfr.key}. ${gfr.label}.`}`;
  },600);
}
function changeUnit(next) {
  if (unit === next) return;
  if (canonicalCreatinine !== null) {
    const converted = convertCreatinine(canonicalCreatinine,'mgdl',next);
    // Display precision does not replace the underlying concentration during unit toggles.
    $('#creatinine').value = Number(converted.toPrecision(12)).toString().replace('.',',');
  }
  unit = next;
  document.querySelectorAll('[data-unit]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.unit===unit)));
  $('#creatinine-unit').textContent = unitName(unit);
  $('#creatinine').placeholder = unit === 'umol' ? '88,4' : '1,0';
  calculate();
}
function reset() {
  $('#calculator-form').reset();
  unit = 'umol';
  canonicalCreatinine = null;
  touched.clear();
  required.clear();
  demo = false;
  $('#example-note').hidden = true;
  $('#weight-options').open = false;
  document.querySelectorAll('[data-unit]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.unit===unit)));
  $('#creatinine-unit').textContent = unitName(unit);
  $('#creatinine').placeholder = '88,4';
  configureMassMode();
  calculate();
}
function useExample() {
  reset();
  $('#weight').value = '70';
  $('#height').value = '175';
  $('#age').value = '60';
  $('#creatinine').value = '88,4';
  $('input[name="sex"][value="male"]').checked = true;
  demo = true;
  $('#example-note').hidden = false;
  updateCanonicalCreatinine();
  calculate();
}
function resultText() {
  if (!result) return '';
  const r = result;
  const lines = ['Мера · ИМТ и клиренс',new Date().toLocaleString('ru-RU')];
  if (demo) lines.push('УЧЕБНЫЙ ПРИМЕР');
  lines.push('');
  if(r.weight!==null)lines.push(`Фактическая масса: ${format(r.weight,2)} кг`);
  if(r.height!==null)lines.push(`Рост: ${format(r.height,2)} см`);
  if(r.age!==null)lines.push(`Возраст: ${r.age} лет`);
  if(r.sex)lines.push(`Пол для формулы: ${r.sex==='female'?'женский':'мужской'}`);
  if(r.bmi!==null)lines.push('',`ИМТ: ${fixed(r.bmi,2)} кг/м²`,`${r.category.label} (по значению до округления)`);
  if(r.creatinine!==null)lines.push('',`Креатинин: ${format(r.creatinine*88.4,4)} мкмоль/л / ${format(r.creatinine,6)} мг/дл`);
  if(r.crcl!==null)lines.push('',`Масса для Кокрофта–Голта: ${format(r.mass,4)} кг (${modeNames[r.mode].toLowerCase()})`,`Клиренс креатинина: ${fixed(r.crcl)} мл/мин`,'Кокрофт–Голт; без индексации на 1,73 м². Это не рСКФ CKD-EPI.','Для взрослых при стабильном креатинине. Дозирование — по инструкции препарата и клинической ситуации.');
  if(r.egfr!==null)lines.push('',`Расчётная СКФ CKD-EPI 2021: ${fixed(r.egfr)} мл/мин/1,73 м²`,`Категория СКФ: ${r.gfr.key} · ${r.gfr.label} (до округления)`,'Это не диагноз ХБП. Для ХБП изменения должны сохраняться ≥3 месяцев; G1–G2 требуют других признаков повреждения почек.');
  if(r.bmi===null)lines.push('','ИМТ не рассчитан: недостаточно корректных данных.');
  if(r.crcl===null)lines.push('','Клиренс не рассчитан: недостаточно корректных данных.');
  if(r.egfr===null)lines.push('','СКФ не рассчитана: недостаточно корректных данных.');
  return lines.join('\n');
}
async function copy(text, success) {
  try {
    if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    toast(success);
  } catch {
    $('#copy-text').value = text;
    $('#copy-dialog').showModal();
    $('#copy-text').focus();
    $('#copy-text').select();
  }
}
function navigate() {
  const route = ['calculate','help','qr'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'calculate';
  for(const name of ['calculate','help','qr'])$('#'+name+'-view').hidden=name!==route;
  document.querySelectorAll('[data-nav]').forEach(link => {
    if(link.dataset.nav===route)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  window.scrollTo({top:0,left:0,behavior:'instant'});
}
$('#calculator-form').addEventListener('input',event => {
  if(event.target.id==='creatinine')updateCanonicalCreatinine();
  if(event.target.id==='weight-mode')configureMassMode();
  if(demo){demo=false;$('#example-note').hidden=true;}
  calculate();
});
$('#calculator-form').addEventListener('change',event => {
  if(event.target.id==='weight-mode'){configureMassMode();calculate();}
  if(event.target.name==='sex'){touched.add('sex');calculate();}
});
inputIds.forEach(id=>$('#'+id).addEventListener('blur',()=>{touched.add(id);calculate();}));
$('#calculator-form').addEventListener('submit',event => {
  event.preventDefault();
  required = new Set();
  const renalStarted = !!(raw('age') || raw('creatinine') || selectedSex() || $('#weight-mode').value!=='actual');
  if(renalStarted){required.add('age');required.add('sex');required.add('creatinine');const mode=$('#weight-mode').value;if(mode==='actual'||mode==='adjusted')required.add('weight');if(mode==='ideal'||mode==='adjusted')required.add('height');if(mode==='manual')required.add('manual-weight');}
  if(!renalStarted || raw('height')){required.add('weight');required.add('height');}
  calculate();
  if(result.bmi===null && result.crcl===null && result.egfr===null){
    const invalid=$('#calculator-form [aria-invalid="true"]');
    if(invalid){if(invalid.closest('details'))invalid.closest('details').open=true;invalid.focus();}
    toast('Проверьте отмеченные поля.');
    return;
  }
  document.activeElement?.blur();
  $('#results').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  $('#results').focus({preventScroll:true});
});
document.querySelectorAll('[data-unit]').forEach(button=>button.addEventListener('click',()=>changeUnit(button.dataset.unit)));
$('#example').addEventListener('click',useExample);
$('#clear-all').addEventListener('click',()=>{reset();$('#weight').focus();toast('Данные очищены.');});
$('#copy-result').addEventListener('click',()=>copy(resultText(),'Результат скопирован.'));
$('#copy-link').addEventListener('click',()=>copy('https://evgk724.github.io/human-story/clinical-calc/','Ссылка скопирована.'));
$('#fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Safari: «Поделиться» → «На экран Домой».');}
  catch{toast('Safari: «Поделиться» → «На экран Домой».');}
});
document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Выйти из полного экрана':'На весь экран'));
window.addEventListener('hashchange',navigate);
configureMassMode();
calculate();
navigate();
