const CACHE_NAME = 'meu-consultorio-v4';
const BASE = '/psicoterapeutas';

// Dynamic route patterns: [id] segments that only have a placeholder '_' in the build
const DYNAMIC_ROUTES = [
  /\/pacientes\/[^/]+\//,
  /\/blog\/[^/]+\//,
  /\/blog\/editar\/[^/]+\//,
  /\/conteudo\/conteudos\/[^/]+\//,
  /\/academico\/disciplinas\/[^/]+\//,
];

// Given a path like /psicoterapeutas/pacientes/uuid-here/index.txt
// rewrite to /psicoterapeutas/pacientes/_/index.txt
function rewriteDynamicPath(pathname) {
  const rel = pathname.replace(BASE, '');
  for (const pattern of DYNAMIC_ROUTES) {
    if (pattern.test(rel)) {
      // Replace the dynamic segment with '_'
      // e.g. /pacientes/abc-123/ -> /pacientes/_/
      // e.g. /blog/editar/abc-123/ -> /blog/editar/_/
      const parts = rel.split('/').filter(Boolean);
      // Find which part is the dynamic ID (the one after the known prefix)
      const prefixes = [
        ['pacientes'],
        ['blog'],
        ['blog', 'editar'],
        ['conteudo', 'conteudos'],
        ['academico', 'disciplinas'],
      ];
      for (const prefix of prefixes) {
        if (parts.length > prefix.length &&
            prefix.every((p, i) => parts[i] === p) &&
            parts[prefix.length] !== '_') {
          parts[prefix.length] = '_';
          return BASE + '/' + parts.join('/');
        }
      }
    }
  }
  return null;
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Skip external requests
  if (url.hostname !== self.location.hostname) return;

  // Rewrite dynamic route RSC data (index.txt) and HTML requests to placeholder '_'
  const rewritten = rewriteDynamicPath(url.pathname);
  if (rewritten) {
    // For RSC data fetches (index.txt) or HTML navigation
    const newUrl = new URL(url);
    newUrl.pathname = rewritten;

    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) return res;
        // Original 404'd → try the placeholder
        return fetch(newUrl.href);
      }).catch(() => fetch(newUrl.href).catch(() => caches.match(BASE + '/')))
    );
    return;
  }

  // For navigation requests (HTML pages), network first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request).then(r => r || caches.match(BASE + '/')))
    );
    return;
  }

  // For static assets (_next/static), cache-first
  if (url.pathname.includes('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Everything else: network-first
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
