// shot.mjs — full-page screenshot (or JS evaluation) with headless Chromium over CDP.
//
//   node shot.mjs <url> <out.png|-> <width> <height> [cookie=value] [js-expression]
//
// Pass "-" as out together with a js-expression to print its value instead of a PNG.
// An empty cookie argument ("") sets no cookie. Needs Node 22+ and chromium on PATH
// (or CHROMIUM=/path/to/chrome).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, out, w, h, cookie = "", expr = ""] = process.argv.slice(2);
if (!url || !out || !w || !h) {
  console.error("usage: node shot.mjs <url> <out.png|-> <width> <height> [cookie=value] [js-expression]");
  process.exit(2);
}
const bin = process.env.CHROMIUM ?? "chromium";
const port = 9300 + Math.floor(Math.random() * 600);
const profile = mkdtempSync(join(tmpdir(), "shot-"));
const chrome = spawn(bin, ["--headless=new", "--disable-gpu", "--no-sandbox",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--window-size=${w},${h}`, "about:blank"], { stdio: "ignore", detached: true });
chrome.on("error", (e) => { console.error(`shot: FAIL: cannot start ${bin}: ${e.message}`); process.exit(1); });

// Wait for Chromium to exit before deleting its profile; it writes until then.
const cleanup = async () => {
  if (chrome.exitCode === null) {
    const exited = new Promise((r) => chrome.once("exit", r));
    // Kill the whole process group: Chromium helpers outlive the main process.
    try { process.kill(-chrome.pid, "SIGTERM"); } catch { chrome.kill(); }
    await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))]);
  }
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (error) {
    console.error(`shot: warning: could not delete temp profile ${profile}: ${error.message}`);
  }
};
try {
  let tabs;
  for (let i = 0; i < 50 && !tabs; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); }
    catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  if (!tabs) throw new Error("Chromium's debugging port never answered");
  const page = tabs.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
  let id = 0; const pending = new Map();
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

  await send("Network.enable");
  if (cookie.includes("=")) {
    const [name, ...rest] = cookie.split("=");
    await send("Network.setCookie", { name, value: rest.join("="), url });
  }
  await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
  await send("Page.enable");
  const nav = await send("Page.navigate", { url });
  if (nav.result?.errorText) throw new Error(`navigation failed: ${nav.result.errorText}`);
  await new Promise((r) => setTimeout(r, 4000));

  if (expr !== "") {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(`expression threw: ${JSON.stringify(r.result.exceptionDetails)}`);
    console.log(JSON.stringify(r.result?.result?.value));
  }
  if (out !== "-") {
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(out, Buffer.from(shot.result.data, "base64"));
    console.log(out);
  }
  ws.close();
} catch (error) {
  console.error(`shot: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
