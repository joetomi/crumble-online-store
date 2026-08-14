import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Arabic Crumble storefront", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="ar"[^>]*dir="rtl"/i);
  assert.match(html, /<title>Crumble \| Crunch your mood!<\/title>/i);
  assert.match(html, /قرمشة تغيّر مزاجك/);
  assert.match(html, /كيف تبي تطلب/);
  assert.match(html, /Crumble Classic/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders the content dashboard", async () => {
  const response = await render("/admin");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /لوحة تحكم المحتوى/);
  assert.match(html, /المتجر يتغيّر من ملف واحد/);
  assert.match(html, /تصدير JSON/);
});

test("keeps content and deployment configuration centralized", async () => {
  const [storeJson, packageJson, vercelConfig, envExample] = await Promise.all([
    readFile(new URL("../data/store.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  const store = JSON.parse(storeJson);
  assert.equal(store.boxes[0].capacity, 4);
  assert.equal(store.boxes[0].price, 40);
  assert.ok(store.products.length >= 7);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(vercelConfig, /vercel-build/);
  assert.match(envExample, /TELEGRAM_BOT_TOKEN/);
  assert.match(envExample, /TELEGRAM_CHAT_ID/);
});
