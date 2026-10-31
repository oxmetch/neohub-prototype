// Офлайн-кэш: при установке скачиваем всё приложение, дальше отдаём из кэша.
const CACHE = 'neohub-e924bbf8ce';
const FILES = [
  './',
  'index.html',
  'app.js',
  'app.css',
  'manifest.webmanifest',
  'fonts/inter.css',
  'assets/02TZP22XHBT2AKM3W4B77C7T5D.png',
  'assets/0XFANK06CPPXY0A8GKK10NW7X4.jpg',
  'assets/15V8KXS0D6WFW4TRMF8H4MXAS0.png',
  'assets/1D30VH5P8M6FZCAC1FX98RSTSP.jpg',
  'assets/1R8NQD6K296AVZ0QB6XCJE32PF.png',
  'assets/1TZYA62XQVG1PH4XZCB6Q76Y25.png',
  'assets/1X83DQXCD43YSABT03GTCWSSXT.jpg',
  'assets/23P8EWR1W686R5QAKN8HFHXPF8.png',
  'assets/2CK7Q3PA1NV8BG8MF6JC0CVCKF.png',
  'assets/2Z2SEGR0TAR682EZN5JHNV4JFR.jpg',
  'assets/3DS9DW049ESW26AGQKB3MRD9TW.png',
  'assets/3J6NJAE9H9X35NNFDC9X7F2M2K.png',
  'assets/3K4SGH9QZ2NQGAPQPSXGVSM1ER.png',
  'assets/3Z5ATW16WPE7PBFRGD739RWTC4.png',
  'assets/404EQ93S2Q49JWG2RP77P1Z2KD.png',
  'assets/44BWX1TW4VPSCZR5ZJ2MM363NH.jpg',
  'assets/4XM3SYW68WQZ52BJ2VYR0M99RJ.png',
  'assets/5GBF76KN0ZP8PNGGXPY5YAEYMN.jpg',
  'assets/5W4D5DK67ZRVTY8AXJ07GEFKPX.png',
  'assets/60J69E6545JSVSGAFA7CP5VKPF.png',
  'assets/61W1ZWCNBMGF50KA27DVEXRTVJ.png',
  'assets/64EYK6JG1KG8AYR7XEJ441PAGX.png',
  'assets/6EPEWDBYHZ4JGVD6Y0ZM1CEV19.png',
  'assets/748MX77249VSKWSVD27C8F21NF.jpg',
  'fonts/inter-cyrillic-ext.woff2',
  'fonts/inter-cyrillic.woff2',
  'fonts/inter-latin-ext.woff2',
  'fonts/inter-latin.woff2',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('index.html')))
  );
});
