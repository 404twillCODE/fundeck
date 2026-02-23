/**
 * One-command dev setup: install server deps and build join-website
 * so "npm run dev" works. Run from desktop: npm run setup-dev
 */

const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..", "..");
const joinWebsiteDir = path.join(rootDir, "join-website");
const serverDir = path.join(rootDir, "server");

function run(cmd, args, opts, label) {
  console.log(`\n>>> ${label || cmd + " " + (args || []).join(" ")}`);
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

console.log("FunDeck desktop: dev setup (server + join-website)\n");

run("npm", ["install"], { cwd: serverDir }, "server: npm install");
run("npm", ["install"], { cwd: joinWebsiteDir }, "join-website: npm install");
run("npm", ["run", "build"], { cwd: joinWebsiteDir }, "join-website: npm run build");

console.log("\n>>> Dev setup done. Run: npm run dev\n");