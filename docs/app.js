'use strict';

(() => {
  const STORE = 'human-story.progress.v1';
  const raw = window.HUMAN_DATA || {};
  const data = {
    source: raw.source || { title: 'How It Works · Story of Humans', status: 'pending' },
    lessons: Array.isArray(raw.lessons) ? raw.lessons.filter(x => x && typeof x.id === 'string') : [],
    words: Array.isArray(raw.words) ? raw.words.filter(x => x && typeof x.id === 'string' && typeof x.en === 'string' && typeof x.ru === 'string') : [],
    questions: Array.isArray(raw.questions) ? raw.questions.filter(x => x && typeof x.id === 'string' && typeof x.prompt === 'string' && Array.isArray(x.options) && x.options.length >= 2 && Number.isInteger(x.answer) && x.answer >= 0 && x.answer < x.options.length) : []
  };
  const ready = data.source.status === 'ready';
  const $ = (q, root = document) => root.querySelector(q);
  const main = $('#main');
  const dialog = $('#dialog');
  let currentView = 'explore';
  let currentLesson = null;
  let lessonSearch = '';
  let lessonFilter = 'all';
  let wordSearch = '';
  let wordFilter = 'all';
  let session = null;
  let activeAudio = null;
  let storageError = '';

  const iconPaths = {
    explore: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'm15.5 8.5-2 5-5 2 2-5 5-2Z'],
    practice: ['m13 2-8 12h6l-1 8 9-13h-6l1-7Z'],
    words: ['M3 5h6a3 3 0 0 1 3 3v13a4 4 0 0 0-4-3H3V5Z', 'M21 5h-6a3 3 0 0 0-3 3v13a4 4 0 0 1 4-3h5V5Z'],
    progress: ['M4 20h16', 'M7 16v-5', 'M12 16V5', 'M17 16V8'],
    arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
    back: ['M19 12H5', 'm11 6-6 6 6 6'],
    clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M12 7v5l3 2'],
    bookmark: ['M6 3h12v18l-6-4-6 4V3Z'],
    check: ['m5 12 4 4L19 6'],
    close: ['m6 6 12 12', 'M18 6 6 18'],
    sound: ['m11 4-6 5H2v6h3l6 5V4Z', 'M15 8a6 6 0 0 1 0 8', 'M18 5a10 10 0 0 1 0 14'],
    search: ['M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z', 'm16 16 5 5'],
    repeat: ['M20 7v5h-5', 'M4 17v-5h5', 'M19 10a7 7 0 0 0-12-5L4 8', 'M5 14a7 7 0 0 0 12 5l3-3'],
    download: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 16v5h16v-5'],
    upload: ['M12 16V4', 'm7 9 5-5 5 5', 'M4 17v4h16v-4'],
    info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M12 11v6', 'M12 7h.01'],
    star: ['m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3L7.5 14 3 9.6l6.2-.9L12 3Z'],
    layers: ['m12 3 10 6-10 6L2 9l10-6Z', 'm3 13 9 5 9-5', 'm3 17 9 5 9-5'],
    calendar: ['M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z', 'M7 3v4', 'M17 3v4', 'M3 11h18'],
    play: ['m9 5 11 7-11 7V5Z'],
    pause: ['M8 5v14', 'M16 5v14']
  };
  function icon(name, className = '') {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    node.setAttribute('viewBox', '0 0 24 24'); node.setAttribute('class', `icon ${className}`); node.setAttribute('aria-hidden', 'true');
    (iconPaths[name] || iconPaths.explore).forEach(d => { const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d); node.append(path); });
    return node;
  }
  function h(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'className') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === 'value') node.value = value;
      else if (key === 'checked') node.checked = !!value;
      else if (key === 'disabled') node.disabled = !!value;
      else node.setAttribute(key, value === true ? '' : String(value));
    }
    children.flat(Infinity).filter(x => x !== null && x !== undefined && x !== false).forEach(child => node.append(child instanceof Node ? child : document.createTextNode(String(child))));
    return node;
  }
  function button(label, handler, className = 'btn', attrs = {}) { return h('button', { type: 'button', className, onclick: handler, ...attrs }, label); }
  function toast(message, type = '') {
    const node = h('div', { className: `toast ${type}`, role: type === 'error' ? 'alert' : 'status' }, message);
    $('#toasts').append(node); setTimeout(() => node.remove(), type === 'error' ? 11000 : 6000);
  }
  function dateKey(value = new Date()) {
    const d = value instanceof Date ? value : new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function addDays(days) { const d = new Date(); d.setDate(d.getDate() + days); return dateKey(d); }
  function formatDate(value) {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return '';
    return `${Number(match[3])} ${['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][Number(match[2]) - 1]}`;
  }
  const plural = (n, one, few, many) => n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;
  const lessonById = id => data.lessons.find(x => x.id === id);
  const wordById = id => data.words.find(x => x.id === id);
  const usableURL = value => typeof value === 'string' && value.trim() && !/^(?:javascript|vbscript|data):/i.test(value.trim());
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const clone = value => JSON.parse(JSON.stringify(value));
  const freshProgress = () => ({ version: 1, completedLessons: {}, bookmarks: [], favoriteWords: [], words: {}, sessions: [], activity: [], lastLessonId: null, updatedAt: null });
  const safeId = value => typeof value === 'string' && value.length > 0 && value.length <= 250 && !['__proto__', 'prototype', 'constructor'].includes(value);
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function normalizeProgress(value, strict = false) {
    if (!isObject(value) || (value.version !== undefined && value.version !== 1)) throw new Error('Версия данных прогресса не поддерживается.');
    const result = freshProgress();
    const timestamp = value => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
    if (strict && (!isObject(value.completedLessons) || !isObject(value.words) || !Array.isArray(value.sessions) || !Array.isArray(value.bookmarks))) throw new Error('В резервной копии отсутствуют обязательные данные прогресса.');
    if (isObject(value.completedLessons)) Object.entries(value.completedLessons).slice(0, 10000).forEach(([id, date]) => { if (safeId(id) && timestamp(date)) result.completedLessons[id] = date; });
    ['bookmarks', 'favoriteWords'].forEach(key => { if (Array.isArray(value[key])) result[key] = [...new Set(value[key].filter(safeId))].slice(0, 10000); });
    if (isObject(value.words)) Object.entries(value.words).slice(0, 10000).forEach(([id, record]) => {
      if (safeId(id) && isObject(record) && Number.isInteger(record.stage) && record.stage >= 0 && record.stage <= 3 && /^\d{4}-\d{2}-\d{2}$/.test(record.due || '') && timestamp(record.due) && timestamp(record.lastReviewed)) result.words[id] = { stage: record.stage, due: record.due, lastReviewed: record.lastReviewed, result: record.result === 'known' ? 'known' : 'again', reviews: Math.max(1, Math.min(100000, Number(record.reviews) || 1)) };
    });
    if (Array.isArray(value.sessions)) result.sessions = value.sessions.filter(s => isObject(s) && safeId(s.id) && timestamp(s.date) && Number.isInteger(s.total) && s.total >= 1 && s.total <= 5 && Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= s.total).slice(-500).map(s => ({ id: s.id, date: s.date, type: s.type === 'words' ? 'words' : 'questions', total: s.total, correct: s.correct, questionIds: Array.isArray(s.questionIds) ? s.questionIds.filter(safeId).slice(0, 5) : [], wrongIds: Array.isArray(s.wrongIds) ? s.wrongIds.filter(safeId).slice(0, 5) : [] }));
    if (Array.isArray(value.activity)) result.activity = value.activity.filter(a => isObject(a) && safeId(a.id) && timestamp(a.date) && typeof a.title === 'string' && ['lesson', 'word', 'session'].includes(a.type)).slice(-500).map(a => ({ id: a.id, date: a.date, type: a.type, title: a.title.slice(0, 300), score: Number.isInteger(a.score) ? a.score : null, total: Number.isInteger(a.total) ? a.total : null }));
    result.lastLessonId = safeId(value.lastLessonId) ? value.lastLessonId : null;
    result.updatedAt = timestamp(value.updatedAt) ? value.updatedAt : null;
    return result;
  }
  let progress;
  try { const stored = localStorage.getItem(STORE); progress = stored ? normalizeProgress(JSON.parse(stored)) : freshProgress(); }
  catch (_) { progress = freshProgress(); storageError = 'Не удалось прочитать локальный прогресс. Данные не перезаписываются автоматически. Можно восстановить резервную копию в разделе «Прогресс».'; }
  function saveProgress(next) {
    next.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STORE, JSON.stringify(next)); }
    catch (_) { toast('Не удалось сохранить прогресс в браузере. Проверьте доступ к хранилищу и попробуйте ещё раз.', 'error'); return false; }
    progress = next; storageError = ''; return true;
  }
  function mutate(fn) { const next = clone(progress); fn(next); return saveProgress(next); }
  function activity(next, type, title, extra = {}) { next.activity.push({ id: uid(), date: new Date().toISOString(), type, title, ...extra }); next.activity = next.activity.slice(-500); }
  const isDue = word => !!progress.words[word.id] && progress.words[word.id].due <= dateKey();
  function wordStatus(word) {
    const r = progress.words[word.id];
    return !r ? { label: 'Новое слово', className: 'new' } : isDue(word) ? { label: 'Пора повторить', className: '' } : { label: `Повторение ${formatDate(r.due)}`, className: 'future' };
  }

  function nav(view, lessonId = null) {
    currentView = view; currentLesson = lessonId;
    render(); window.scrollTo({ top: 0, behavior: 'instant' }); main.focus({ preventScroll: true });
  }
  const navigation = [ ['explore', 'Исследовать'], ['practice', 'Тренировка'], ['words', 'Слова'], ['progress', 'Прогресс'] ];
  navigation.forEach(([key, label]) => $('#navigation').append(button([icon(key), h('span', {}, label)], () => {
    if (session && !session.finished && currentView === 'practice' && key !== 'practice') { askExit(() => { session = null; nav(key); }); return; }
    nav(key);
  }, 'nav-button', { 'data-view': key })));
  document.querySelectorAll('.brand,.mobile-brand').forEach(node => node.addEventListener('click', event => { event.preventDefault(); if (session && !session.finished) askExit(() => { session = null; nav('explore'); }); else nav('explore'); }));

  function render() {
    document.querySelectorAll('.nav-button').forEach(node => { const active = node.dataset.view === currentView; node.classList.toggle('active', active); if (active) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current'); });
    $('#view-label').textContent = currentLesson ? 'Чтение главы' : navigation.find(x => x[0] === currentView)?.[1] || 'Исследовать';
    main.replaceChildren();
    if (storageError) main.append(h('div', { className: 'storage-alert', role: 'alert' }, storageError));
    if (currentLesson && ready && lessonById(currentLesson)) renderReader(lessonById(currentLesson));
    else if (currentView === 'practice') session ? renderSession() : renderPractice();
    else if (currentView === 'words') renderWords();
    else if (currentView === 'progress') renderProgress();
    else renderExplore();
  }
  function pageHead(title, description, eyebrow, actions = []) { return h('header', { className: 'page-head' }, h('div', {}, h('div', { className: 'eyebrow' }, eyebrow), h('h1', {}, title), h('p', {}, description)), actions.length ? h('div', { className: 'head-actions' }, actions) : null); }
  function emptyState(title = 'Материалы пока не добавлены', description = 'Главы, словарь и вопросы появятся после добавления материала из книги.', name = 'words') { return h('section', { className: 'empty-state' }, h('div', { className: 'empty-icon' }, icon(name)), h('div', {}, h('h2', {}, title), h('p', {}, description), h('div', { className: 'empty-tag' }, 'Ожидаем исходный материал'))); }
  function sourceLabel() { return data.source.title || 'How It Works · Story of Humans'; }
  function sourcePages(lesson) {
    const pages = lesson?.sourcePages;
    if (!Array.isArray(pages)) return typeof pages === 'string' || typeof pages === 'number' ? String(pages) : '';
    const numbers = [...new Set(pages.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    const ranges = [];
    for (let i = 0; i < numbers.length; i++) {
      const first = numbers[i]; let last = first;
      while (numbers[i + 1] === last + 1) last = numbers[++i];
      ranges.push(first === last ? String(first) : `${first}–${last}`);
    }
    return ranges.join(', ');
  }
  function lessonArt(lesson, className) {
    if (!lesson.coverPosition) return h('img', { className, src: lesson.cover, alt: '', loading: 'lazy' });
    const art = h('div', { className: `${className} sprite-cover`, 'aria-hidden': 'true' });
    art.style.backgroundImage = `url("${lesson.cover}")`;
    art.style.backgroundPosition = lesson.coverPosition;
    if (lesson.coverSize) art.style.backgroundSize = lesson.coverSize;
    return art;
  }
  function orbitArt() { return h('div', { className: 'hero-art', 'aria-hidden': 'true' }, h('span', { className: 'orbit-ring' }), h('span', { className: 'orbit-axis' }), h('span', { className: 'orbit-axis two' }), h('span', { className: 'orbit-center' }), h('span', { className: 'orbit-star' }), h('span', { className: 'orbit-star two' }), h('span', { className: 'orbit-dot' }), h('span', { className: 'orbit-dot two' }), h('span', { className: 'orbit-dot three' }), h('span', { className: 'hero-art-caption' }, 'THE HUMAN STORY')); }
  function renderExplore() {
    const continuation = ready && lessonById(progress.lastLessonId) && !progress.completedLessons[progress.lastLessonId] ? lessonById(progress.lastLessonId) : null;
    main.append(h('section', { className: 'hero' }, h('div', { className: 'hero-copy' }, h('div', { className: 'eyebrow' }, 'ИСТОРИЯ, В КОТОРОЙ ЕСТЬ ВЫ'), h('h1', {}, 'Откуда мы.', h('br'), h('em', {}, 'Как мы стали собой.')), h('p', {}, 'Читайте об истории человека, открывайте английские слова и проверяйте себя — шаг за шагом.'), h('div', { className: 'hero-bottom' }, continuation ? button(['Продолжить чтение', icon('arrow')], () => openLesson(continuation.id), 'btn btn-primary') : ready && data.lessons.length ? button(['Начать путешествие', icon('arrow')], () => openLesson(data.lessons[0].id), 'btn btn-primary') : null, h('span', { className: 'source-chip' }, icon('words'), sourceLabel()))), orbitArt()));
    main.append(h('div', { className: 'section-head' }, h('h2', {}, 'Главы исследования'), h('span', { className: 'section-count' }, ready ? `${data.lessons.length} ${plural(data.lessons.length, 'глава', 'главы', 'глав')}` : 'Скоро здесь')));
    if (!ready || !data.lessons.length) {
      main.append(emptyState('Ваша история начинается здесь', 'Сейчас в приложении ещё нет глав из книги. После добавления материала здесь появятся чтение, словарь и короткие тренировки.'));
      main.append(h('div', { className: 'mini-grid' }, miniCard('words', 'Читайте с интересом', 'Небольшие главы в удобном формате для телефона.'), miniCard('sound', 'Слушайте и запоминайте', 'Английские слова, перевод и настоящее произношение.'), miniCard('practice', 'Проверяйте себя', 'До пяти вопросов за раз. Объяснение после каждого ответа.')));
      main.append(h('p', { className: 'source-note' }, icon('info'), 'Содержание книги не заменено примерами. Учебные материалы появятся после загрузки источника.'));
      return;
    }
    const query = h('input', { type: 'search', placeholder: 'Найти главу…', value: lessonSearch, 'aria-label': 'Поиск глав', oninput: event => { lessonSearch = event.target.value; updateLessons(); } });
    const filters = h('select', { className: 'filter-select', 'aria-label': 'Фильтр глав', onchange: event => { lessonFilter = event.target.value; updateLessons(); } }, h('option', { value: 'all' }, 'Все главы'), ...[...new Set(data.lessons.map(l => l.theme).filter(Boolean))].map(theme => h('option', { value: `theme:${theme}` }, theme)), h('option', { value: 'saved' }, 'Закладки'), h('option', { value: 'unread' }, 'Ещё не прочитано'), h('option', { value: 'done' }, 'Прочитано'));
    filters.value = lessonFilter;
    main.append(h('div', { className: 'toolbar' }, h('label', { className: 'search-box' }, icon('search'), query), filters), h('section', { id: 'lesson-list', className: 'lesson-grid', 'aria-label': 'Главы книги' }));
    updateLessons();
  }
  function miniCard(name, title, description) { return h('div', { className: 'mini-card' }, icon(name, 'mini-icon'), h('h3', {}, title), h('p', {}, description)); }
  function updateLessons() {
    const target = $('#lesson-list'); if (!target) return;
    const query = lessonSearch.trim().toLowerCase();
    const lessons = data.lessons.filter(l => (!query || [l.title, l.subtitle, l.era].filter(Boolean).join(' ').toLowerCase().includes(query)) && (lessonFilter === 'all' || lessonFilter === `theme:${l.theme}` || lessonFilter === 'saved' && progress.bookmarks.includes(l.id) || lessonFilter === 'unread' && !progress.completedLessons[l.id] || lessonFilter === 'done' && !!progress.completedLessons[l.id]));
    target.replaceChildren();
    if (!lessons.length) { target.append(h('div', { className: 'no-results', style: 'grid-column:1/-1' }, 'Ничего не найдено. Попробуйте другой запрос или фильтр.')); return; }
    lessons.forEach(lesson => {
      const index = data.lessons.indexOf(lesson) + 1;
      const completed = !!progress.completedLessons[lesson.id];
      const saved = progress.bookmarks.includes(lesson.id);
      const cover = usableURL(lesson.cover) ? lessonArt(lesson, 'lesson-image') : h('div', { className: 'lesson-cover-placeholder', 'aria-hidden': 'true' }, h('span', {}, String(index).padStart(2, '0')));
      target.append(h('article', { className: 'lesson-card' }, h('span', { className: 'lesson-number' }, `ГЛАВА ${String(index).padStart(2, '0')}`), button([cover, h('div', { className: 'lesson-card-body' }, lesson.era ? h('div', { className: 'lesson-kicker' }, lesson.era) : null, h('h3', {}, lesson.title || 'Глава'), lesson.subtitle ? h('p', {}, lesson.subtitle) : null, h('div', { className: 'lesson-meta' }, lesson.minutes ? h('span', {}, icon('clock'), `${lesson.minutes} мин чтения`) : null, sourcePages(lesson) ? h('span', {}, icon('words'), `Стр. ${sourcePages(lesson)}`) : null))], () => openLesson(lesson.id), 'lesson-open', { 'aria-label': `Читать: ${lesson.title}` }), h('div', { className: 'lesson-card-footer' }, h('span', { className: `reading-state ${completed ? 'done' : progress.lastLessonId === lesson.id ? 'continue' : ''}` }, completed ? '✓ Прочитано' : progress.lastLessonId === lesson.id ? 'Чтение начато' : 'Открыть главу'), button(icon('bookmark'), () => { toggleArray('bookmarks', lesson.id); updateLessons(); }, `icon-btn ${saved ? 'active' : ''}`, { 'aria-label': saved ? 'Убрать закладку' : 'Добавить в закладки', 'aria-pressed': String(saved) }))));
    });
  }
  function toggleArray(field, id) { return mutate(next => { next[field] = next[field].includes(id) ? next[field].filter(x => x !== id) : [...next[field], id]; }); }
  function openLesson(id) { mutate(next => { next.lastLessonId = id; }); nav('explore', id); }
  function renderReader(lesson) {
    const completed = !!progress.completedLessons[lesson.id];
    const saved = progress.bookmarks.includes(lesson.id);
    const article = h('article', { className: 'reader' }, button([icon('back'), 'Все главы'], () => nav('explore'), 'btn btn-quiet back-link'));
    article.append(h('header', { className: 'reader-head' }, h('div', { className: 'eyebrow' }, lesson.era || 'ИСТОРИЯ ЧЕЛОВЕКА'), h('h1', {}, lesson.title || 'Глава'), lesson.subtitle ? h('p', {}, lesson.subtitle) : null, h('div', { className: 'reader-tools' }, lesson.minutes ? [icon('clock'), `${lesson.minutes} мин чтения`] : null, sourcePages(lesson) ? [h('span', { className: 'divider-dot' }), `Стр. ${sourcePages(lesson)}`] : null, button(icon('bookmark'), () => { if (toggleArray('bookmarks', lesson.id)) render(); }, `icon-btn ${saved ? 'active' : ''}`, { 'aria-label': saved ? 'Убрать закладку' : 'Сохранить главу', 'aria-pressed': String(saved) }))));
    if (usableURL(lesson.cover)) article.append(lessonArt(lesson, 'reader-image'));
    const sections = Array.isArray(lesson.sections) ? lesson.sections : [];
    sections.forEach(section => {
      const block = h('section', { className: 'reader-section' }, section.title ? h('h2', {}, section.title) : null);
      const paragraphs = Array.isArray(section.body) ? section.body : String(section.body || '').split(/\n\s*\n/);
      paragraphs.filter(Boolean).forEach(text => block.append(h('p', {}, String(text))));
      article.append(block);
    });
    if (!sections.length) article.append(h('div', { className: 'content-warning' }, 'Текст этой главы пока не добавлен.'));
    const words = data.words.filter(w => w.lessonId === lesson.id);
    if (words.length) article.append(h('div', { className: 'section-head' }, h('h2', {}, 'Слова из главы'), h('span', { className: 'section-count' }, words.length)), h('div', { className: 'reader-word-list' }, words.map(w => button([w.en, icon('arrow')], () => openWord(w), 'word-chip'))));
    article.append(h('p', { className: 'reader-source' }, sourceLabel(), sourcePages(lesson) ? ` · Страницы источника: ${sourcePages(lesson)}` : ''), h('div', { className: 'reader-actions' }, button([icon(completed ? 'check' : 'bookmark'), completed ? 'Глава прочитана' : 'Отметить прочитанной'], () => {
      if (completed) return;
      if (mutate(next => { next.completedLessons[lesson.id] = new Date().toISOString(); activity(next, 'lesson', lesson.title); })) { render(); toast('Глава отмечена прочитанной.', 'success'); }
    }, completed ? 'btn btn-success' : 'btn btn-primary', { disabled: completed || !sections.length }), button(['Проверить себя', icon('arrow')], () => startSession('questions', data.questions.filter(q => q.lessonId === lesson.id)), 'btn', { disabled: !data.questions.some(q => q.lessonId === lesson.id), 'aria-label': data.questions.some(q => q.lessonId === lesson.id) ? 'Тренировка по главе' : 'К этой главе пока нет вопросов' })));
    main.append(article);
  }

  function renderPractice() {
    main.append(pageHead('Маленький шаг.\nБольшое открытие.', 'Не больше пяти вопросов за раз. Сначала ваш ответ, затем объяснение — без спешки и таймера.', 'КОРОТКИЕ ТРЕНИРОВКИ'));
    const questionCount = ready ? data.questions.length : 0;
    const wordPool = vocabularyQuestions();
    const due = ready ? data.words.filter(isDue).length : 0;
    if (!ready) main.append(h('div', { className: 'content-warning' }, h('strong', {}, 'Тренировки пока недоступны. '), 'Вопросы и слова появятся после добавления материала из книги.'));
    const latest = [...progress.sessions].reverse().find(s => s.wrongIds.length);
    main.append(h('div', { className: 'training-grid' }, trainingCard('practice', 'Пять вопросов\nоб истории', 'Проверьте понимание прочитанного. После каждого ответа — понятное объяснение.', [questionCount ? `До ${Math.min(5, questionCount)} вопросов` : 'Пока нет вопросов', 'В вашем темпе'], 'Начать тренировку', () => startSession('questions'), !questionCount), trainingCard('words', 'Слова, которые\nостаются с вами', 'Узнавайте английские слова и возвращайтесь к ним в нужный момент.', [due ? `${due} ${plural(due, 'слово', 'слова', 'слов')} к повторению` : 'Короткая практика', wordPool.length ? `До ${Math.min(5, wordPool.length)} вопросов` : 'Пока нет слов'], 'Тренировать слова', () => startSession('words'), !ready || !wordPool.length, true)));
    main.append(h('p', { className: 'training-hint' }, questionCount || wordPool.length ? 'Результат сохраняется после завершения тренировки. Незаконченная сессия не входит в статистику.' : 'Кнопки станут доступны, когда появятся настоящие учебные материалы. Для словарной тренировки нужны хотя бы два разных перевода.'));
    if (latest && ready) main.append(h('section', { className: 'panel', style: 'margin-top:28px' }, h('h2', {}, 'Вернуться к сложному'), h('p', {}, `В одной из последних тренировок осталось ${latest.wrongIds.length} ${plural(latest.wrongIds.length, 'сложное задание', 'сложных задания', 'сложных заданий')}. Закрепите их отдельно.`), button([icon('repeat'), 'Повторить ошибки'], () => replaySavedMistakes(latest), 'btn')));
  }
  function trainingCard(name, title, description, meta, label, action, disabled, amber = false) { return h('section', { className: `training-card ${amber ? 'amber' : ''}` }, h('span', { className: 'large-icon' }, icon(name)), h('h2', {}, title), h('p', {}, description), h('div', { className: 'training-meta' }, meta.map(text => h('span', {}, text))), button([label, icon('arrow')], action, amber ? 'btn btn-amber' : 'btn btn-primary', { disabled, 'aria-describedby': undefined })); }
  function shuffle(values) { const a = [...values]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function vocabularyQuestions() {
    if (!ready) return [];
    return data.words.filter(w => w.en.trim() && w.ru.trim()).flatMap(word => {
      const meaningTokens = value => value.toLowerCase().split(/[^а-яё]+/).filter(x => x.length > 3);
      const ownMeanings = new Set(data.words.filter(w => w.en.toLowerCase() === word.en.toLowerCase()).flatMap(w => meaningTokens(w.ru)));
      const other = [...new Set(data.words.filter(w => w.en.toLowerCase() !== word.en.toLowerCase() && w.ru.trim() && !meaningTokens(w.ru).some(token => ownMeanings.has(token))).map(w => w.ru))];
      if (!other.length) return [];
      const options = shuffle([word.ru, ...shuffle(other).slice(0, 3)]);
      return [{ id: `vocabulary:${word.id}`, wordId: word.id, lessonId: word.lessonId, prompt: `Что означает «${word.en}» в этом примере?${word.example ? `\n\n${word.example}` : ''}`, options, answer: options.indexOf(word.ru), explanation: `${word.en} — ${word.ru}.${word.example ? `\n\n${word.example}` : ''}${word.translation ? `\n${word.translation}` : ''}` }];
    });
  }
  function startSession(type, supplied) {
    if (!ready) return;
    let pool = supplied || (type === 'words' ? vocabularyQuestions() : data.questions);
    if (!pool.length) { toast('Для этой тренировки пока нет заданий.'); return; }
    pool = shuffle(pool);
    if (type === 'words' && !supplied) pool.sort((a, b) => Number(isDue(wordById(b.wordId) || {})) - Number(isDue(wordById(a.wordId) || {})));
    session = { id: uid(), type, questions: pool.slice(0, 5), index: 0, selected: null, checked: false, answers: [], finished: false, persisted: false };
    currentLesson = null; currentView = 'practice'; render(); window.scrollTo({ top: 0, behavior: 'instant' }); main.focus({ preventScroll: true });
  }
  function renderSession() {
    if (session.finished) { renderSummary(); return; }
    const q = session.questions[session.index];
    const correct = session.selected === q.answer;
    const wrapper = h('div', { className: 'practice-layout' }, h('div', { className: 'session-top' }, h('span', {}, `Вопрос ${session.index + 1} из ${session.questions.length}`), button([icon('close'), 'Завершить'], () => askExit(() => { session = null; nav('practice'); }), 'btn btn-quiet btn-small')));
    wrapper.append(h('div', { className: 'session-track', role: 'progressbar', 'aria-label': 'Ход тренировки', 'aria-valuemin': '0', 'aria-valuemax': session.questions.length, 'aria-valuenow': session.index }, h('span', { style: `width:${session.index / session.questions.length * 100}%` })));
    const options = h('div', { className: 'options', role: 'group', 'aria-label': 'Варианты ответа' });
    q.options.forEach((option, index) => options.append(button([h('span', { className: 'option-letter' }, session.checked && index === q.answer ? '✓' : session.checked && index === session.selected ? '×' : String.fromCharCode(65 + index)), h('span', {}, String(option))], () => { session.selected = index; render(); main.querySelectorAll('.option')[index]?.focus({ preventScroll: true }); }, `option ${session.selected === index ? 'selected' : ''} ${session.checked && index === q.answer ? 'correct' : ''} ${session.checked && index === session.selected && !correct ? 'incorrect' : ''}`, { 'aria-pressed': String(session.selected === index), disabled: session.checked })));
    const feedback = session.checked ? h('div', { className: `feedback ${correct ? '' : 'wrong'}`, role: 'status', 'aria-live': 'polite', tabindex: '-1' }, h('h2', {}, correct ? 'Верно. Отличный шаг.' : 'Разберёмся вместе.'), h('p', { style: 'white-space:pre-line' }, q.explanation || (correct ? 'Вы выбрали правильный вариант.' : `Правильный ответ: ${q.options[q.answer]}.`))) : null;
    const lesson = lessonById(q.lessonId);
    const card = h('section', { className: 'question-card' }, h('div', { className: 'question-kicker' }, session.type === 'words' ? 'СЛОВАРНАЯ ПРАКТИКА' : 'ПОНИМАНИЕ ПРОЧИТАННОГО'), h('h1', { style: 'white-space:pre-line' }, q.prompt), options, feedback, h('div', { className: 'question-actions' }, button(session.checked ? [session.index + 1 === session.questions.length ? 'Посмотреть результат' : 'Следующий вопрос', icon('arrow')] : 'Проверить ответ', () => {
      if (!session.checked) { session.checked = true; session.answers[session.index] = { id: q.id, selected: session.selected, correct: session.selected === q.answer, wordId: q.wordId || null }; render(); $('#main .feedback')?.focus({ preventScroll: true }); $('#main .feedback')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      else if (session.index + 1 < session.questions.length) { session.index++; session.selected = null; session.checked = false; render(); window.scrollTo({ top: 0, behavior: 'instant' }); main.focus({ preventScroll: true }); }
      else { finishSession(); }
    }, 'btn btn-primary', { disabled: session.selected === null })), lesson ? h('div', { className: 'question-source' }, `Из главы «${lesson.title}»`, sourcePages(lesson) ? ` · Стр. ${sourcePages(lesson)}` : '') : null);
    wrapper.append(card); main.append(wrapper);
  }
  function finishSession() {
    const result = { id: session.id, date: new Date().toISOString(), type: session.type, total: session.questions.length, correct: session.answers.filter(x => x.correct).length, questionIds: session.questions.map(x => x.id), wrongIds: session.answers.filter(x => !x.correct).map(x => x.id) };
    const ok = mutate(next => {
      if (next.sessions.some(s => s.id === result.id)) return;
      next.sessions.push(result); next.sessions = next.sessions.slice(-500);
      activity(next, 'session', session.type === 'words' ? 'Словарная тренировка' : 'Тренировка по истории', { score: result.correct, total: result.total });
      if (session.type === 'words') session.answers.forEach(a => { if (wordById(a.wordId)) applyWordReview(next, a.wordId, a.correct ? 'known' : 'again'); });
    });
    session.finished = true; session.persisted = ok; session.result = result;
    render(); window.scrollTo({ top: 0, behavior: 'instant' }); main.focus({ preventScroll: true });
  }
  function renderSummary() {
    const s = session;
    const wrong = s.questions.filter(q => s.result.wrongIds.includes(q.id));
    const allCorrect = s.result.correct === s.result.total;
    const card = h('section', { className: 'session-summary' }, h('div', { className: 'summary-orbit' }, icon(allCorrect ? 'star' : 'check')), h('div', { className: 'eyebrow' }, 'ШАГ СДЕЛАН'), h('h1', {}, allCorrect ? 'Отлично получилось.' : 'Вы стали знать больше.'), h('div', { className: 'score', 'aria-label': `${s.result.correct} правильных ответов из ${s.result.total}` }, s.result.correct, h('span', {}, ` / ${s.result.total}`)), h('p', {}, allCorrect ? 'Все ответы верны. Вернитесь позже, чтобы закрепить то, что запомнили.' : 'Ошибки показывают, к чему полезно вернуться. Можно повторить только сложные задания.'), !s.persisted ? h('div', { className: 'storage-alert', role: 'alert' }, 'Результат ещё не сохранён. ', button('Попробовать сохранить', () => finishSession(), 'btn btn-small')) : h('p', { className: 'review-note' }, 'Результат сохранён на этом устройстве.'), h('div', { className: 'summary-actions' }, wrong.length ? button([icon('repeat'), 'Повторить ошибки'], () => { const type = s.type; startSession(type, wrong); }, 'btn btn-primary') : button(['К главам', icon('arrow')], () => { session = null; nav('explore'); }, 'btn btn-primary'), button('Завершить', () => { session = null; nav('practice'); }, 'btn')));
    if (wrong.length) card.append(h('div', { className: 'mistake-list' }, h('h2', {}, 'Что стоит повторить'), wrong.map(q => h('div', { className: 'mistake-item' }, q.prompt, h('strong', {}, q.options[q.answer])))));
    main.append(h('div', { className: 'practice-layout' }, card));
  }
  function replaySavedMistakes(record) { const pool = record.type === 'words' ? vocabularyQuestions() : data.questions; const questions = pool.filter(q => record.wrongIds.includes(q.id)); if (!questions.length) { toast('Эти задания больше не входят в текущий набор материалов.'); return; } startSession(record.type, questions); }
  function askExit(callback) {
    const body = openDialog('Выйти из тренировки?');
    body.append(h('p', { className: 'muted' }, 'Незаконченная тренировка не сохранится в статистике. Результаты предыдущих занятий останутся.'), h('div', { className: 'dialog-footer' }, button('Продолжить', () => dialog.close(), 'btn btn-primary'), button('Выйти', () => { dialog.close(); callback(); }, 'btn')));
  }

  function renderWords() {
    main.append(pageHead('Слова с историей.', 'Откройте перевод, послушайте произношение и отметьте, что уже запомнили.', 'ЛИЧНЫЙ СЛОВАРЬ'));
    if (!ready || !data.words.length) { main.append(emptyState('Словарь ждёт первые слова', 'Здесь будут слова из добавленных глав: английское написание, перевод, примеры и доступная аудиозапись.')); return; }
    const due = data.words.filter(isDue).length;
    const tabs = h('div', { className: 'tabs', role: 'group', 'aria-label': 'Фильтр слов' });
    [['all', 'Все слова'], ['due', `Повторить · ${due}`], ['saved', 'Избранное']].forEach(([value, label]) => tabs.append(button(label, () => { wordFilter = value; render(); }, `tab ${value === wordFilter ? 'active' : ''}`, { 'aria-pressed': String(value === wordFilter) })));
    main.append(h('div', { className: 'toolbar' }, h('label', { className: 'search-box' }, icon('search'), h('input', { type: 'search', value: wordSearch, placeholder: 'Найти слово или перевод…', 'aria-label': 'Поиск по словарю', oninput: event => { wordSearch = event.target.value; updateWords(); } })), tabs), h('section', { id: 'word-list', className: 'word-grid', 'aria-label': 'Английские слова' }), h('p', { className: 'review-note' }, 'Повторения: через 1, 3, 7 и 14 дней. «Знаю» увеличивает интервал, «Повторить» возвращает слово на следующий день.'));
    updateWords();
  }
  function updateWords() {
    const target = $('#word-list'); if (!target) return;
    const query = wordSearch.trim().toLowerCase();
    const words = data.words.filter(w => (!query || [w.en, w.ru].join(' ').toLowerCase().includes(query)) && (wordFilter === 'all' || wordFilter === 'due' && isDue(w) || wordFilter === 'saved' && progress.favoriteWords.includes(w.id)));
    target.replaceChildren();
    if (!words.length) { target.append(h('div', { className: 'no-results', style: 'grid-column:1/-1' }, wordFilter === 'due' && !query ? 'На сегодня всё. Новые слова можно изучать во вкладке «Все слова».' : 'Здесь пока нет слов. Попробуйте другой фильтр или запрос.')); return; }
    words.forEach(word => {
      const status = wordStatus(word);
      const favorite = progress.favoriteWords.includes(word.id);
      target.append(h('article', { className: 'word-card' }, button([h('strong', {}, word.en), word.ipa ? h('span', { className: 'ipa' }, word.ipa) : null, data.words.some(w => w.id !== word.id && w.en.toLowerCase() === word.en.toLowerCase()) ? h('span', { className: 'word-context' }, lessonById(word.lessonId)?.title || '') : null, h('span', { className: `word-review ${status.className}` }, status.label)], () => openWord(word), 'word-open', { 'aria-label': `Открыть слово ${word.en}` }), h('div', { className: 'word-controls' }, usableURL(word.audio) ? button(icon('sound'), () => playAudio(word.audio), 'icon-btn', { 'aria-label': `Прослушать ${word.en}` }) : null, button(icon('bookmark'), () => { if (toggleArray('favoriteWords', word.id)) updateWords(); }, `icon-btn ${favorite ? 'active' : ''}`, { 'aria-label': favorite ? `Убрать ${word.en} из избранного` : `Добавить ${word.en} в избранное`, 'aria-pressed': String(favorite) }))));
    });
  }
  async function playAudio(url, onError) {
    if (!usableURL(url)) return;
    if (activeAudio) { activeAudio.pause(); activeAudio = null; }
    const audio = new Audio(url); activeAudio = audio;
    try { await audio.play(); }
    catch (_) { const message = 'Не удалось воспроизвести запись. Проверьте подключение или попробуйте позже.'; if (onError) onError(message); else toast(message, 'error'); }
  }
  function applyWordReview(next, id, result) {
    const old = next.words[id];
    const stage = result === 'again' ? 0 : old && old.result === 'known' ? Math.min(old.stage + 1, 3) : 0;
    next.words[id] = { stage, due: addDays([1, 3, 7, 14][stage]), lastReviewed: new Date().toISOString(), result, reviews: (old?.reviews || 0) + 1 };
  }
  function openWord(word) {
    const body = openDialog('Карточка слова');
    const translation = h('div', { className: 'translation', hidden: true, tabindex: '-1' }, h('h3', {}, word.ru), word.translation ? h('p', {}, word.translation) : null);
    const actions = h('div', { className: 'word-detail-actions', hidden: true }, button([icon('repeat'), 'Повторить'], () => review('again'), 'btn'), button([icon('check'), 'Знаю'], () => review('known'), 'btn btn-success'));
    const reveal = button('Показать перевод', () => { reveal.hidden = true; translation.hidden = false; actions.hidden = false; translation.focus({ preventScroll: true }); }, 'btn btn-primary', { style: 'width:100%' });
    const audioError = h('div', { className: 'audio-error', role: 'alert', hidden: true });
    const favorite = button([icon('bookmark'), progress.favoriteWords.includes(word.id) ? 'В избранном' : 'В избранное'], () => { if (toggleArray('favoriteWords', word.id)) { favorite.replaceChildren(icon('bookmark'), document.createTextNode(progress.favoriteWords.includes(word.id) ? 'В избранном' : 'В избранное')); favorite.setAttribute('aria-pressed', String(progress.favoriteWords.includes(word.id))); render(); } }, 'btn btn-quiet btn-small word-favorite', { 'aria-pressed': String(progress.favoriteWords.includes(word.id)) });
    function review(result) {
      if (mutate(next => { applyWordReview(next, word.id, result); activity(next, 'word', word.en); })) { dialog.close(); render(); toast(`«${word.en}» — повторение ${formatDate(progress.words[word.id].due)}.`, 'success'); }
    }
    body.append(h('div', { className: 'word-detail' }, h('div', { className: 'word-language' }, 'ENGLISH → РУССКИЙ'), h('h2', {}, word.en), word.ipa ? h('p', { className: 'phonetic' }, word.ipa) : null, usableURL(word.audio) ? h('div', { className: 'audio-line' }, button([icon('sound'), 'Послушать'], () => { audioError.hidden = true; playAudio(word.audio, message => { audioError.textContent = message; audioError.hidden = false; }); }, 'btn btn-small')) : h('p', { className: 'audio-caption' }, 'Аудиозапись для этого слова пока не добавлена.'), audioError, word.example ? h('div', { className: 'word-example' }, h('div', { className: 'label' }, 'В КОНТЕКСТЕ'), h('p', {}, word.example), usableURL(word.exampleAudio) ? button([icon('sound'), 'Послушать пример'], () => { audioError.hidden = true; playAudio(word.exampleAudio, message => { audioError.textContent = message; audioError.hidden = false; }); }, 'btn btn-small') : null) : null, reveal, translation, actions, h('p', { className: 'review-note' }, 'Сначала вспомните значение сами. Затем проверьте перевод и выберите, насколько хорошо вы его помните.'), favorite));
  }

  function progressStat(label, value, sub) { return h('div', { className: 'progress-stat' }, h('div', { className: 'stat-label' }, label), h('div', { className: 'stat-value' }, value), h('div', { className: 'stat-sub' }, sub)); }
  function renderProgress() {
    const completed = data.lessons.filter(l => progress.completedLessons[l.id]).length;
    const learned = data.words.filter(w => progress.words[w.id]).length;
    const totalAnswered = progress.sessions.reduce((n, s) => n + s.total, 0);
    const correct = progress.sessions.reduce((n, s) => n + s.correct, 0);
    const accuracy = totalAnswered ? `${Math.round(correct / totalAnswered * 100)}%` : '—';
    main.append(pageHead('Ваша история\nпродолжается.', 'Каждая прочитанная глава, новое слово и короткая тренировка складываются в путь.', 'ЛИЧНЫЙ ПРОГРЕСС'));
    main.append(h('section', { className: 'progress-stats', 'aria-label': 'Ваши результаты' }, progressStat('Прочитано глав', completed, `Из ${ready ? data.lessons.length : 0} доступных`), progressStat('Слов в изучении', learned, 'После первого повторения'), progressStat('Тренировок', progress.sessions.length, 'Завершённые сессии'), progressStat('Точность ответов', accuracy, totalAnswered ? `${correct} из ${totalAnswered} верно` : 'Пока нет результатов')));
    const activityList = h('ul', { className: 'activity-list' });
    [...progress.activity].reverse().slice(0, 8).forEach(a => activityList.append(h('li', { className: 'activity-row' }, h('span', { className: 'activity-icon' }, icon(a.type === 'lesson' ? 'words' : a.type === 'word' ? 'sound' : 'practice')), h('div', { className: 'activity-copy' }, h('strong', {}, a.title), h('span', {}, `${a.type === 'lesson' ? 'Глава прочитана' : a.type === 'word' ? 'Слово повторено' : 'Тренировка завершена'} · ${formatDate(a.date)}`)), a.type === 'session' && a.total ? h('span', { className: 'activity-score' }, `${a.score}/${a.total}`) : null)));
    const history = h('section', { className: 'panel' }, h('h2', {}, 'Последние шаги'), progress.activity.length ? activityList : h('div', { className: 'progress-empty' }, icon('explore'), h('h3', {}, 'У каждого пути есть начало'), h('p', {}, ready ? 'Прочитайте главу или завершите тренировку. Ваши результаты появятся здесь.' : 'Когда материалы будут добавлены, здесь начнёт собираться ваша история занятий.')));
    if (ready && data.lessons.length) history.append(h('div', { className: 'mastery-line' }, h('span', {}, 'Прочитано'), h('span', {}, `${completed} из ${data.lessons.length}`)), h('div', { className: 'mastery-track', role: 'progressbar', 'aria-label': 'Прочитанные главы', 'aria-valuemin': '0', 'aria-valuemax': data.lessons.length, 'aria-valuenow': completed }, h('span', { style: `width:${completed / data.lessons.length * 100}%` })));
    const storage = h('section', { className: 'panel' }, h('h2', {}, 'Ваш прогресс — с вами'), h('p', {}, 'Результаты сохраняются в этом браузере. Скачайте копию, чтобы перенести их на другое устройство.'), h('p', { className: 'backup-description' }, 'Обновление материалов сохраняет прогресс. При очистке данных браузера локальные результаты удаляются. Резервная копия содержит результаты и закладки.'), h('div', { className: 'backup-actions' }, button([icon('download'), 'Скачать копию'], downloadBackup, 'btn'), button([icon('upload'), 'Восстановить прогресс'], openRestore, 'btn btn-quiet')));
    const audioError = h('p', { className: 'audio-error', hidden: true, role: 'alert' });
    const voice = h('section', { className: 'panel' }, h('h2', {}, 'Голос Ryan'), h('p', {}, 'Британский английский. Короткий образец произношения:'), h('p', { style: 'color:#d7e5f8;margin-top:12px' }, '“Human. Human history.”'), button([icon('sound'), 'Послушать образец'], () => { audioError.hidden = true; playAudio('./audio/ryan-sample.mp3', message => { audioError.textContent = message; audioError.hidden = false; }); }, 'btn'), audioError, h('p', { className: 'backup-description' }, 'Это образец голоса, а не материал из книги.'));
    const install = h('section', { className: 'panel install-panel' }, h('img', { src: '/human-story-touch-180-v2.png', width: '66', height: '66', alt: '', style: 'border-radius:15px;margin-bottom:18px' }), h('h2', {}, 'Всегда под рукой'), h('p', {}, 'Откройте приложение в Safari и дождитесь появления глав. Затем нажмите «Поделиться» → «На экран „Домой“».'), h('p', { className: 'backup-description' }, 'Уже добавленный значок может сохранить старую картинку. Перед заменой сохраните копию прогресса.'), h('a', { className: 'btn', href: '/human-story-touch-512-v2.png', download: 'Human-Story-icon.png' }, [icon('download'), 'Скачать иконку']), h('p', { className: 'backup-description' }, 'Прочитанные страницы и прослушанные записи доступны без интернета.'));
    main.append(h('div', { className: 'progress-columns' }, h('div', {}, history, install), h('div', {}, storage, voice)));
  }
  function downloadBackup() {
    const backup = { format: 'human-story-progress', version: 1, exportedAt: new Date().toISOString(), progress: clone(progress) };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = h('a', { href: url, download: `Human-Story-прогресс-${dateKey()}.json` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function mergeProgress(current, incoming) {
    const next = clone(current);
    next.bookmarks = [...new Set([...current.bookmarks, ...incoming.bookmarks])];
    next.favoriteWords = [...new Set([...current.favoriteWords, ...incoming.favoriteWords])];
    Object.entries(incoming.completedLessons).forEach(([id, date]) => { if (!next.completedLessons[id] || date > next.completedLessons[id]) next.completedLessons[id] = date; });
    Object.entries(incoming.words).forEach(([id, value]) => { if (!next.words[id] || value.lastReviewed > next.words[id].lastReviewed) next.words[id] = value; });
    ['sessions', 'activity'].forEach(key => { const unique = new Map([...current[key], ...incoming[key]].map(x => [x.id, x])); next[key] = [...unique.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-500); });
    if (!next.lastLessonId) next.lastLessonId = incoming.lastLessonId;
    return next;
  }
  function openRestore() {
    const body = openDialog('Восстановить прогресс');
    const file = h('input', { type: 'file', accept: '.json,application/json', required: true });
    const merge = h('input', { type: 'checkbox', checked: true });
    const error = h('div', { className: 'form-error', hidden: true, role: 'alert' });
    const submit = button('Восстановить', null, 'btn btn-primary', { type: 'submit' });
    body.append(h('p', { className: 'muted' }, 'Выберите JSON-файл, скачанный в разделе «Прогресс». Материалы книги при этом не меняются.'), h('form', { onsubmit: async event => {
      event.preventDefault(); error.hidden = true; submit.disabled = true;
      try {
        const source = file.files?.[0]; if (!source) throw new Error('Выберите файл резервной копии.');
        if (source.size > 5 * 1024 * 1024) throw new Error('Файл слишком большой для резервной копии прогресса (максимум 5 МБ).');
        let backup; try { backup = JSON.parse(await source.text()); } catch (_) { throw new Error('Файл не читается как JSON. Выберите резервную копию Human Story.'); }
        if (backup.format !== 'human-story-progress' || backup.version !== 1) throw new Error('Этот файл не является резервной копией Human Story поддерживаемой версии.');
        const imported = normalizeProgress(backup.progress, true);
        const next = merge.checked ? mergeProgress(progress, imported) : imported;
        if (!saveProgress(next)) throw new Error('Не удалось записать восстановленный прогресс. Попробуйте ещё раз.');
        dialog.close(); render(); toast(merge.checked ? 'Прогресс объединён с резервной копией.' : 'Прогресс восстановлен из резервной копии.', 'success');
      } catch (e) { error.textContent = e.message; error.hidden = false; } finally { submit.disabled = false; }
    } }, h('label', { className: 'field' }, h('span', {}, 'Файл резервной копии'), file), h('label', { className: 'check-row' }, merge, h('span', {}, 'Объединить с текущим прогрессом. Если снять отметку, текущий прогресс будет заменён копией.')), error, h('div', { className: 'dialog-footer' }, button('Отмена', () => dialog.close(), 'btn'), submit)));
  }
  function openDialog(title) {
    if (dialog.open) dialog.close();
    const body = h('div', { className: 'dialog-body' });
    $('#dialog-content').replaceChildren(h('div', { className: 'dialog-header' }, h('h2', { id: 'dialog-title' }, title), button(icon('close'), () => dialog.close(), 'icon-btn', { 'aria-label': 'Закрыть окно' })), body);
    dialog.showModal(); return body;
  }
  dialog.addEventListener('close', () => { if (activeAudio) { activeAudio.pause(); activeAudio = null; } });
  window.addEventListener('storage', event => {
    if (event.key !== STORE || !event.newValue) return;
    try { progress = normalizeProgress(JSON.parse(event.newValue)); if (!session || session.finished) render(); }
    catch (_) { toast('Другая вкладка сохранила данные, которые не удалось прочитать. Текущий прогресс не изменён.', 'error'); }
  });

  render();
})();
