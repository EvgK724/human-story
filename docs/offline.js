(() => {
  'use strict';
  const VERSION = '2026-10-18-1';
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  const status = document.createElement('div');
  status.id = 'offline-status';
  status.className = 'offline-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const label = document.createElement('span');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Повторить';
  retry.className = 'offline-retry';
  retry.hidden = true;
  status.append(label, retry);
  footer.append(status);
  let registration;
  let watchdog;
  let acknowledged = false;

  function show(state, completed = 0, total = 0) {
    status.dataset.state = state;
    retry.hidden = state !== 'error';
    if (state === 'ready') {
      label.textContent = 'Готово без интернета';
      clearTimeout(watchdog);
    } else if (state === 'error') {
      label.textContent = 'Не всё удалось сохранить для работы без интернета.';
      clearTimeout(watchdog);
    } else if (state === 'unsupported') {
      label.textContent = 'Для работы без интернета откройте приложение в Safari или Chrome.';
    } else {
      const percent = total ? ` ${Math.floor(completed / total * 100)}%` : '';
      label.textContent = `Сохраняем для работы без интернета…${percent}`;
      clearTimeout(watchdog);
      watchdog = setTimeout(() => show('error'), 90000);
    }
  }

  function requestPreparation() {
    const worker = registration?.active || navigator.serviceWorker.controller;
    if (!worker) return;
    worker.postMessage({ type: 'HUMAN_STORY_PREPARE_OFFLINE' });
  }

  async function start() {
    acknowledged = false;
    show('downloading');
    try {
      // An installed copy can prove readiness even when checking for a new worker
      // is impossible offline. Do not make status depend on a network update.
      registration = await navigator.serviceWorker.getRegistration('./');
      requestPreparation();
      registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      const follow = worker => {
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') requestPreparation();
          if (worker.state === 'redundant' && !acknowledged) show('error');
        });
      };
      follow(registration.installing);
      registration.addEventListener('updatefound', () => follow(registration.installing));
      requestPreparation();
      navigator.serviceWorker.ready.then(() => requestPreparation());
    } catch (_) {
      if (!registration?.active && !navigator.serviceWorker.controller) show('error');
      else requestPreparation();
    }
  }

  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    show('unsupported');
    return;
  }
  navigator.serviceWorker.addEventListener('message', event => {
    const message = event.data;
    if (message?.type !== 'HUMAN_STORY_OFFLINE_STATUS' || message.version !== VERSION) return;
    acknowledged = true;
    show(message.state, message.completed, message.total);
  });
  navigator.serviceWorker.addEventListener('controllerchange', requestPreparation);
  window.addEventListener('online', () => {
    if (status.dataset.state !== 'ready') start();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestPreparation();
  });
  retry.addEventListener('click', start);
  start();
})();
