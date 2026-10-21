'use strict';

const VERSION = '2026-10-18-1';
const SCOPE = new URL(self.registration.scope);
const HELLAS_PATH = new URL('./hellas-atlas/', SCOPE).pathname;
function isHellasURL(url) {
  return url.origin === SCOPE.origin &&
    (url.pathname === HELLAS_PATH.slice(0, -1) || url.pathname.startsWith(HELLAS_PATH));
}
const CACHE_PREFIX = `human-story-${encodeURIComponent(SCOPE.pathname)}-`;
const CACHE = `${CACHE_PREFIX}${VERSION}`;
// This release includes the complete local library, including every Ryan recording.
// Regenerate this inventory whenever content or asset filenames change.
const ASSETS = [
  "./app.js",
  "./apple-touch-icon-precomposed.png",
  "./apple-touch-icon.png",
  "./assets/chapters-early-culture-v2.webp",
  "./assets/chapters-future-v2.webp",
  "./assets/chapters-ideas-and-mind-v2.webp",
  "./assets/chapters-learning-and-change-v2.webp",
  "./assets/chapters-origins-v2.webp",
  "./assets/favicon-32.png",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-master.png",
  "./assets/lesson-covers.webp",
  "./audio/c1-w1-example.mp3",
  "./audio/c1-w1.mp3",
  "./audio/c1-w2-example.mp3",
  "./audio/c1-w2.mp3",
  "./audio/c1-w3-example.mp3",
  "./audio/c1-w3.mp3",
  "./audio/c1-w4-example.mp3",
  "./audio/c1-w4.mp3",
  "./audio/c1-w5-example.mp3",
  "./audio/c1-w5.mp3",
  "./audio/c2-w1-example.mp3",
  "./audio/c2-w1.mp3",
  "./audio/c2-w2-example.mp3",
  "./audio/c2-w2.mp3",
  "./audio/c2-w3-example.mp3",
  "./audio/c2-w3.mp3",
  "./audio/c2-w4-example.mp3",
  "./audio/c2-w4.mp3",
  "./audio/c2-w5-example.mp3",
  "./audio/c2-w5.mp3",
  "./audio/c3-w1-example.mp3",
  "./audio/c3-w1.mp3",
  "./audio/c3-w2-example.mp3",
  "./audio/c3-w2.mp3",
  "./audio/c3-w3-example.mp3",
  "./audio/c3-w3.mp3",
  "./audio/c3-w4-example.mp3",
  "./audio/c3-w4.mp3",
  "./audio/c3-w5-example.mp3",
  "./audio/c3-w5.mp3",
  "./audio/c4-w1-example.mp3",
  "./audio/c4-w1.mp3",
  "./audio/c4-w2-example.mp3",
  "./audio/c4-w2.mp3",
  "./audio/c4-w3-example.mp3",
  "./audio/c4-w3.mp3",
  "./audio/c4-w4-example.mp3",
  "./audio/c4-w4.mp3",
  "./audio/c4-w5-example.mp3",
  "./audio/c4-w5.mp3",
  "./audio/c5-w1-example.mp3",
  "./audio/c5-w1.mp3",
  "./audio/c5-w2-example.mp3",
  "./audio/c5-w2.mp3",
  "./audio/c5-w3-example.mp3",
  "./audio/c5-w3.mp3",
  "./audio/c5-w4-example.mp3",
  "./audio/c5-w4.mp3",
  "./audio/c5-w5-example.mp3",
  "./audio/c5-w5.mp3",
  "./audio/f1-w1-example.mp3",
  "./audio/f1-w1.mp3",
  "./audio/f1-w2-example.mp3",
  "./audio/f1-w2.mp3",
  "./audio/f1-w3-example.mp3",
  "./audio/f1-w3.mp3",
  "./audio/f1-w4-example.mp3",
  "./audio/f1-w4.mp3",
  "./audio/f1-w5-example.mp3",
  "./audio/f1-w5.mp3",
  "./audio/f2-w1-example.mp3",
  "./audio/f2-w1.mp3",
  "./audio/f2-w2-example.mp3",
  "./audio/f2-w2.mp3",
  "./audio/f2-w3-example.mp3",
  "./audio/f2-w3.mp3",
  "./audio/f2-w4-example.mp3",
  "./audio/f2-w4.mp3",
  "./audio/f2-w5-example.mp3",
  "./audio/f2-w5.mp3",
  "./audio/f3-w1-example.mp3",
  "./audio/f3-w1.mp3",
  "./audio/f3-w2-example.mp3",
  "./audio/f3-w2.mp3",
  "./audio/f3-w3-example.mp3",
  "./audio/f3-w3.mp3",
  "./audio/f3-w4-example.mp3",
  "./audio/f3-w4.mp3",
  "./audio/f3-w5-example.mp3",
  "./audio/f3-w5.mp3",
  "./audio/f4-w1-example.mp3",
  "./audio/f4-w1.mp3",
  "./audio/f4-w2-example.mp3",
  "./audio/f4-w2.mp3",
  "./audio/f4-w3-example.mp3",
  "./audio/f4-w3.mp3",
  "./audio/f4-w4-example.mp3",
  "./audio/f4-w4.mp3",
  "./audio/f4-w5-example.mp3",
  "./audio/f4-w5.mp3",
  "./audio/f5-w1-example.mp3",
  "./audio/f5-w1.mp3",
  "./audio/f5-w2-example.mp3",
  "./audio/f5-w2.mp3",
  "./audio/f5-w3-example.mp3",
  "./audio/f5-w3.mp3",
  "./audio/f5-w4-example.mp3",
  "./audio/f5-w4.mp3",
  "./audio/f5-w5-example.mp3",
  "./audio/f5-w5.mp3",
  "./audio/m1-w1-example.mp3",
  "./audio/m1-w1.mp3",
  "./audio/m1-w2-example.mp3",
  "./audio/m1-w2.mp3",
  "./audio/m1-w3-example.mp3",
  "./audio/m1-w3.mp3",
  "./audio/m1-w4-example.mp3",
  "./audio/m1-w4.mp3",
  "./audio/m1-w5-example.mp3",
  "./audio/m1-w5.mp3",
  "./audio/m2-w1-example.mp3",
  "./audio/m2-w1.mp3",
  "./audio/m2-w2-example.mp3",
  "./audio/m2-w2.mp3",
  "./audio/m2-w3-example.mp3",
  "./audio/m2-w3.mp3",
  "./audio/m2-w4-example.mp3",
  "./audio/m2-w4.mp3",
  "./audio/m2-w5-example.mp3",
  "./audio/m2-w5.mp3",
  "./audio/m3-w1-example.mp3",
  "./audio/m3-w1.mp3",
  "./audio/m3-w2-example.mp3",
  "./audio/m3-w2.mp3",
  "./audio/m3-w3-example.mp3",
  "./audio/m3-w3.mp3",
  "./audio/m3-w4-example.mp3",
  "./audio/m3-w4.mp3",
  "./audio/m3-w5-example.mp3",
  "./audio/m3-w5.mp3",
  "./audio/m4-w1-example.mp3",
  "./audio/m4-w1.mp3",
  "./audio/m4-w2-example.mp3",
  "./audio/m4-w2.mp3",
  "./audio/m4-w3-example.mp3",
  "./audio/m4-w3.mp3",
  "./audio/m4-w4-example.mp3",
  "./audio/m4-w4.mp3",
  "./audio/m4-w5-example.mp3",
  "./audio/m4-w5.mp3",
  "./audio/m5-w1-example.mp3",
  "./audio/m5-w1.mp3",
  "./audio/m5-w2-example.mp3",
  "./audio/m5-w2.mp3",
  "./audio/m5-w3-example.mp3",
  "./audio/m5-w3.mp3",
  "./audio/m5-w4-example.mp3",
  "./audio/m5-w4.mp3",
  "./audio/m5-w5-example.mp3",
  "./audio/m5-w5.mp3",
  "./audio/manifest.json",
  "./audio/o1-w1-example.mp3",
  "./audio/o1-w1.mp3",
  "./audio/o1-w2-example.mp3",
  "./audio/o1-w2.mp3",
  "./audio/o1-w3-example.mp3",
  "./audio/o1-w3.mp3",
  "./audio/o1-w4-example.mp3",
  "./audio/o1-w4.mp3",
  "./audio/o1-w5-example.mp3",
  "./audio/o1-w5.mp3",
  "./audio/o2-w1-example.mp3",
  "./audio/o2-w1.mp3",
  "./audio/o2-w2-example.mp3",
  "./audio/o2-w2.mp3",
  "./audio/o2-w3-example.mp3",
  "./audio/o2-w3.mp3",
  "./audio/o2-w4-example.mp3",
  "./audio/o2-w4.mp3",
  "./audio/o2-w5-example.mp3",
  "./audio/o2-w5.mp3",
  "./audio/o3-w1-example.mp3",
  "./audio/o3-w1.mp3",
  "./audio/o3-w2-example.mp3",
  "./audio/o3-w2.mp3",
  "./audio/o3-w3-example.mp3",
  "./audio/o3-w3.mp3",
  "./audio/o3-w4-example.mp3",
  "./audio/o3-w4.mp3",
  "./audio/o3-w5-example.mp3",
  "./audio/o3-w5.mp3",
  "./audio/o4-w1-example.mp3",
  "./audio/o4-w1.mp3",
  "./audio/o4-w2-example.mp3",
  "./audio/o4-w2.mp3",
  "./audio/o4-w3-example.mp3",
  "./audio/o4-w3.mp3",
  "./audio/o4-w4-example.mp3",
  "./audio/o4-w4.mp3",
  "./audio/o4-w5-example.mp3",
  "./audio/o4-w5.mp3",
  "./audio/o5-w1-example.mp3",
  "./audio/o5-w1.mp3",
  "./audio/o5-w2-example.mp3",
  "./audio/o5-w2.mp3",
  "./audio/o5-w3-example.mp3",
  "./audio/o5-w3.mp3",
  "./audio/o5-w4-example.mp3",
  "./audio/o5-w4.mp3",
  "./audio/o5-w5-example.mp3",
  "./audio/o5-w5.mp3",
  "./audio/ryan-sample.mp3",
  "./audio/sample-manifest.json",
  "./data.js",
  "./favicon.ico",
  "./human-story-touch-152-v2.png",
  "./human-story-touch-167-v2.png",
  "./human-story-touch-180-v2.png",
  "./human-story-touch-192-v2.png",
  "./human-story-touch-512-v2.png",
  "./index.html",
  "./manifest.webmanifest",
  "./style.css",
  "./offline.js"
];
const URLS = ASSETS.map(path => new URL(path, SCOPE).href);
const URL_SET = new Set(URLS);
const INDEX_URL = new URL('./index.html', SCOPE).href;
const CORE = ['./index.html', './style.css', './app.js', './data.js', './offline.js', './manifest.webmanifest'];
let preparation = null;
let status = { type: 'HUMAN_STORY_OFFLINE_STATUS', version: VERSION, state: 'downloading', completed: 0, total: URLS.length };

async function publish(state, completed) {
  status = { ...status, state, completed };
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    if (client.url.startsWith(SCOPE.href)) client.postMessage(status);
  }
}

async function storeComplete(cache, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    // Never persist a partial audio response. The request deliberately has no Range header.
    const response = await fetch(new Request(url, { cache: 'reload', credentials: 'same-origin', signal: controller.signal }));
    if (response.status !== 200 || response.type === 'opaque') throw new Error('Incomplete resource');
    await cache.put(url, response);
  } finally {
    clearTimeout(timeout);
  }
}

async function inventory(cache) {
  const missing = [];
  for (const url of URLS) {
    const response = await cache.match(url);
    if (!response || response.status !== 200) missing.push(url);
  }
  return missing;
}

async function prepareOffline() {
  if (preparation) return preparation;
  preparation = (async () => {
    try {
      const cache = await caches.open(CACHE);
      const missing = await inventory(cache);
      let completed = URLS.length - missing.length;
      await publish('downloading', completed);
      let cursor = 0;
      // Four concurrent downloads are gentle on mobile connections and resume individually.
      await Promise.all(Array.from({ length: Math.min(4, missing.length) }, async () => {
        while (cursor < missing.length) {
          const url = missing[cursor++];
          try {
            await storeComplete(cache, url);
            completed += 1;
            if (completed % 8 === 0 || completed === URLS.length) await publish('downloading', completed);
          } catch (_) {
            // Keep successful files. A retry downloads only the ones still missing.
          }
        }
      }));
      const remaining = await inventory(cache);
      if (remaining.length) {
        await publish('error', URLS.length - remaining.length);
        return;
      }
      await publish('ready', URLS.length);
      // CacheStorage is shared by all Pages projects on this origin; only remove our scope.
      for (const key of await caches.keys()) {
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE) await caches.delete(key);
      }
    } catch (_) {
      await publish('error', status.completed);
    }
  })();
  try { await preparation; } finally { preparation = null; }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE.map(path => storeComplete(cache, new URL(path, SCOPE).href)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  // Finish activation promptly, so online reading/playback is not blocked while
  // the whole library downloads. offline.js starts the durable message event.
  event.waitUntil((async () => {
    await self.clients.claim();
    // An older worker may have served Human Story's cached document for this
    // separate app. Reload only those windows after its routes are excluded.
    const windows = await self.clients.matchAll({ type: 'window' });
    // Do not await navigation here: a navigation may wait for activation to finish.
    for (const client of windows) {
      if (isHellasURL(new URL(client.url))) client.navigate(client.url).catch(() => {});
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'HUMAN_STORY_PREPARE_OFFLINE') return;
  event.waitUntil(prepareOffline());
});

async function rangedAudio(response, range) {
  const data = await response.arrayBuffer();
  const size = data.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
  const invalid = () => new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' } });
  if (!match || (!match[1] && !match[2]) || !size) return invalid();
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return invalid();
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return invalid();
    end = Math.min(end, size - 1);
  }
  const headers = new Headers(response.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Content-Type', 'audio/mpeg');
  headers.delete('Content-Encoding');
  return new Response(data.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers });
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  // Hellas is independently hosted below this scope and must use its own files.
  if (isHellasURL(url)) return;
  url.search = '';
  url.hash = '';
  const isNavigation = event.request.mode === 'navigate';
  const cacheURL = isNavigation ? INDEX_URL : url.href;
  if (!isNavigation && !URL_SET.has(cacheURL)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(cacheURL);
    if (cached?.status === 200) {
      const range = event.request.headers.get('range');
      if (range && /\.mp3$/i.test(url.pathname)) return rangedAudio(cached, range);
      return cached;
    }
    // During the first download users can already read and play audio online.
    // Only the complete-library job writes to the versioned cache.
    return fetch(event.request);
  })());
});
