/* Service worker do Corpo Humano 3D: permite instalar o app e usá-lo offline.
   Ao publicar mudanças grandes, aumente VERSAO para limpar o cache antigo. */
const VERSAO = "v1";
const CACHE = "corpo-humano-" + VERSAO;

// Arquivos essenciais guardados já na instalação (o restante é guardado conforme é usado).
const ESSENCIAIS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icones/icone-192.png",
  "./icones/icone-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith("corpo-humano-") && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const mesmaOrigem = url.origin === self.location.origin;
  const fonte = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!mesmaOrigem && !fonte) return;

  // Página: tenta a rede primeiro (para receber atualizações); sem internet, usa o cache.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copia)); return r; })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Demais arquivos (scripts, modelos, imagens, fontes): cache primeiro, atualizando em segundo plano.
  e.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(req).then((emCache) => {
        const rede = fetch(req)
          .then((r) => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; })
          .catch(() => emCache);
        return emCache || rede;
      })
    )
  );
});
