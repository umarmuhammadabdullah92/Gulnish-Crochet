const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEBOUNCE_MS = 1500;

/* api/ holds the Vercel serverless functions. It has to be watched too:
   without it a change to a function sits uncommitted in the working tree and
   the deployed endpoint keeps serving the old code with no warning. */
const WATCH_DIRS = [
  ROOT,
  path.join(ROOT, "api"),
  path.join(ROOT, "css"),
  path.join(ROOT, "js"),
  path.join(ROOT, "images")
];

let timer = null;
let pending = false;
let verifying = false;
let retries = 0;
const MAX_RETRIES = 4;

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

/* A git process that was interrupted (or a crash) can leave index.lock behind.
   While it is fresh another git may genuinely be running, so only clear it once
   it is old enough to be stale. */
function clearStaleLock() {
  const lock = path.join(ROOT, ".git", "index.lock");
  try {
    if (!fs.existsSync(lock)) return false;
    const ageMs = Date.now() - fs.statSync(lock).mtimeMs;
    if (ageMs < 10000) {
      console.log(`[auto-deploy] index.lock is ${Math.round(ageMs / 1000)}s old, leaving it`);
      return false;
    }
    fs.unlinkSync(lock);
    console.log("[auto-deploy] removed stale index.lock");
    return true;
  } catch (err) {
    console.error("[auto-deploy] could not clear index.lock:", err.message.trim());
    return false;
  }
}

function aheadCount() {
  try {
    return parseInt(run("git rev-list --count origin/main..HEAD"), 10) || 0;
  } catch (err) {
    return 0;
  }
}

/* A push can be rejected as non-fast-forward (e.g. a manual push raced this
   watcher). Rebase onto the remote and try once more so the change is not
   stranded on the local branch. */
function pushWithRecovery() {
  try {
    run("git push origin main");
    return true;
  } catch (err) {
    const text = (err.stderr || err.message || "").toString();
    if (!/non-fast-forward|rejected|cannot lock ref|fetch first/i.test(text)) {
      console.error("[auto-deploy] push failed:", text.trim());
      return false;
    }
    console.log("[auto-deploy] push rejected, rebasing onto origin/main and retrying");
    try {
      run("git pull --rebase origin main");
      run("git push origin main");
      console.log("[auto-deploy] rebase + push succeeded");
      return true;
    } catch (err2) {
      console.error("[auto-deploy] rebase/retry failed:", (err2.stderr || err2.message).trim());
      return false;
    }
  }
}

function autopush() {
  if (pending) return;
  pending = true;

  try {
    clearStaleLock();
    const status = run("git status --porcelain");
    let didCommit = false;

    if (status) {
      run("git add -A");
      run(`git commit -m "Auto-deploy: ${new Date().toISOString()}"`);
      didCommit = true;
    }

    /* A clean tree does not mean there is nothing to deploy: a previous push
       may have failed, leaving commits stranded locally. Always flush them. */
    const ahead = aheadCount();
    if (!didCommit && ahead === 0) {
      retries = 0;
      console.log("[auto-deploy] nothing to commit");
      return;
    }

    const pushed = pushWithRecovery();
    if (pushed) {
      retries = 0;
      console.log(
        didCommit
          ? "[auto-deploy] committed & pushed to main -> Vercel deploying"
          : `[auto-deploy] pushed ${ahead} stranded commit(s) -> Vercel deploying`
      );
      verifyDeploy();
    }
  } catch (err) {
    console.error("[auto-deploy] error:", (err.stderr || err.message).trim());
    /* A git failure (most often index.lock held by another git process) means
       this cycle changed nothing. Nothing would re-trigger the watcher, so the
       edit would sit uncommitted until the next unrelated save - retry. */
    if (retries < MAX_RETRIES) {
      retries += 1;
      console.log(`[auto-deploy] retrying in 3s (attempt ${retries}/${MAX_RETRIES})`);
      setTimeout(autopush, 3000);
    } else {
      console.error("[auto-deploy] giving up after repeated failures - run: git add -A && git commit && git push");
    }
  } finally {
    pending = false;
  }
}

/* A successful `git push` only means GitHub has the code. Vercel builds and
   serves it separately, and that side can fail or stall with no signal here.
   Confirm the site actually serves the version we just pushed, so a stale
   deploy is reported instead of silently assumed to be fine. */
function verifyDeploy() {
  const live = process.env.LIVE_URL || "https://gulnish-crochet.vercel.app";
  let expected = null;
  try {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const m = html.match(/js\/script\.js\?v=(\d+)/);
    if (m) expected = m[1];
  } catch (err) {
    return;
  }
  if (!expected) return;

  const deadline = Date.now() + Number(process.env.VERIFY_TIMEOUT_MS || 180000);
  const interval = Number(process.env.VERIFY_INTERVAL_MS || 15000);
  const poll = async () => {
    if (verifying) return;
    verifying = true;
    let served = null;
    try {
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, interval));
        served = null;
        try {
          const res = await fetch(live, { cache: "no-store" });
          const html = await res.text();
          const m = html.match(/js\/script\.js\?v=(\d+)/);
          served = m ? m[1] : null;
        } catch (err) {
          console.error("[auto-deploy] live check failed:", err.message.trim());
          continue;
        }
        if (served === expected) {
          console.log(`[auto-deploy] live is serving v=${expected} - deploy confirmed`);
          return;
        }
      }
      console.error(
        `[auto-deploy] WARNING: pushed v=${expected} but the live site is still serving ` +
          `v=${served}. The Vercel deploy is stale or failed - redeploy from the Vercel dashboard.`
      );
    } finally {
      verifying = false;
    }
  };
  poll().catch((err) => console.error("[auto-deploy] verifyDeploy:", err.message.trim()));
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
