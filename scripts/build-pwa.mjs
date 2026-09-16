import fs from "node:fs/promises";
import path from "node:path";
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const out = path.resolve("out");
const manifest = {
  name: "FitGo · 饮食与训练日志",
  short_name: "FitGo",
  description: "手机端饮食与训练记录",
  lang: "zh-CN",
  start_url: `${base}/`,
  scope: `${base}/`,
  display: "standalone",
  background_color: "#f6f5f1",
  theme_color: "#f6f5f1",
  icons: [
    {
      src: `${base}/icon-512.png`,
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
};
await fs.writeFile(
  path.join(out, "manifest.webmanifest"),
  JSON.stringify(manifest),
);
await fs.writeFile(path.join(out, ".nojekyll"), "");
const files = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(p);
    else if (
      /\.(html|js|css|svg|png|woff2?|txt|webmanifest)$/.test(entry.name) &&
      entry.name !== "sw.js"
    )
      files.push(`${base}/${path.relative(out, p).split(path.sep).join("/")}`);
  }
}
await walk(out);
const build = await fs.readFile(".next/BUILD_ID", "utf8");
await fs.writeFile(
  path.join(out, "sw.js"),
  `const CACHE='gym-${build.trim()}';
const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('gym-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  event.respondWith(caches.match('${base}/index.html').then(cached=>cached||fetch(event.request)));return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
`,
);
console.log(`PWA: ${files.length} local assets prepared for ${base || "/"}`);
