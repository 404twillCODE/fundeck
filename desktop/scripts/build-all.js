/**
 * One-command build: installs and builds join-website, then packages the desktop app.
 * Run from repo root: node desktop/scripts/build-all.js
 * Or from desktop: node scripts/build-all.js
 */

const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..", "..");
const joinWebsiteDir = path.join(rootDir, "join-website");
const desktopDir = path.resolve(__dirname, "..");

function run(cmd, args, opts, label) {
  console.log(`\n>>> ${label || cmd} ${(args || []).join(" ")}`);
  const result = spawnSync(cmd, args || [], {
    cwd: opts?.cwd || rootDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

console.log("FunDeck desktop: full build (join-website + bundle + installer)\n");

run("npm", ["install"], { cwd: joinWebsiteDir }, "join-website: npm install");
run("npm", ["run", "build"], { cwd: joinWebsiteDir }, "join-website: npm run build");
run("node", ["scripts/prepare-bundle.js"], { cwd: desktopDir }, "desktop: prepare-bundle");
run("npx", ["electron-builder", "--win", "nsis", "portable"], { cwd: desktopDir }, "desktop: electron-builder");

console.log("\n>>> Done. Installer is in desktop/dist/\n");
