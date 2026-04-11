/**
 * After `next build` with output: 'standalone', the static files and public
 * folder need to be copied into the standalone directory for the server to
 * serve them correctly.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standaloneDir = path.join(root, ".next", "standalone");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Copy .next/static → .next/standalone/.next/static
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
if (fs.existsSync(staticSrc)) {
  console.log("Copying .next/static → standalone...");
  copyRecursive(staticSrc, staticDest);
}

// Copy public → .next/standalone/public
const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneDir, "public");
if (fs.existsSync(publicSrc)) {
  console.log("Copying public → standalone...");
  copyRecursive(publicSrc, publicDest);
}

// Copy .env.local → .next/standalone/.env.local
const envSrc = path.join(root, ".env.local");
const envDest = path.join(standaloneDir, ".env.local");
if (fs.existsSync(envSrc)) {
  console.log("Copying .env.local → standalone...");
  fs.copyFileSync(envSrc, envDest);
}

console.log("Done! Standalone directory is ready.");
