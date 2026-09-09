const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEBOUNCE_MS = 1500;

const WATCH_DIRS = [ROOT, path.join(ROOT, "css"), path.join(ROOT, "js"), path.join(ROOT, "images")];

let timer = null;
let pending = false;

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function autopush() {
  if (pending) return;
  pending = true;

  try {
    const status = run("git status --porcelain");
    if (!status) {
      console.log("[auto-deploy] nothing to commit");
      pending = false;
      return;
    }

    run("git add -A");
    run(`git commit -m "Auto-deploy: ${new Date().toISOString()}"`);
    run("git push origin main");
    console.log("[auto-deploy] committed & pushed to main -> Vercel deploying");
  } catch (err) {
    console.error("[auto-deploy] error:", (err.stderr || err.message).trim());
  } finally {
    pending = false;
  }
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(autopush, DEBOUNCE_MS);
}

function onChange(eventType, filename) {
  if (!filename) return;
  const f = filename.toString();
  if (f.includes(".git") || f.includes("node_modules") || f.includes("auto-deploy.js")) return;
  schedule();
}

console.log("[auto-deploy] watching", WATCH_DIRS.join(", "));
for (const dir of WATCH_DIRS) {
  if (fs.existsSync(dir)) {
    fs.watch(dir, { persistent: true }, onChange);
  }
}

process.on("SIGINT", () => {
  clearTimeout(timer);
  autopush();
  process.exit(0);
});
