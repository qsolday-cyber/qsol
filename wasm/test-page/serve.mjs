// Minimal static server for the bare test page, with the same strict CSP the
// real app will ship. Serves ./public and the wasm package.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT ?? 8787);
const ROOT = new URL("./public/", import.meta.url).pathname;
const RPC = process.env.RPC ?? "https://api.devnet.solana.com";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".wasm": "application/wasm", ".css": "text/css", ".json": "application/json" };
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self'",
  `connect-src 'self' ${RPC} wss://api.devnet.solana.com`,
  "img-src 'self' data:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/") path = "/index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      "content-security-policy": CSP,
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch { res.writeHead(404); res.end("not found"); }
}).listen(PORT, "127.0.0.1", () => console.log(`test page: http://127.0.0.1:${PORT}  (RPC ${RPC})`));
