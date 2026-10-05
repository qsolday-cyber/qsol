import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

// Strict CSP, injected at build time (Vite's dev server needs inline scripts for HMR).
// The same policy is sent as a header from vercel.json.
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.devnet.solana.com wss://api.devnet.solana.com",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

// frame-ancestors is header-only (browsers ignore it in <meta>); vercel.json sends it as a header.
const csp = (): Plugin => ({
  name: "quantum-vault-csp",
  apply: "build",
  transformIndexHtml: (html) =>
    html.replace(
      "<head>",
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP.replace("; frame-ancestors 'none'", "")}" />`
    ),
});

export default defineConfig({
  plugins: [react(), tailwindcss(), csp()],
  build: { target: "es2022", sourcemap: false },
});
