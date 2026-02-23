const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..", "..");
const desktopDir = path.resolve(__dirname, "..");
const bundleDir = path.join(desktopDir, ".bundle");
const joinWebsiteDir = path.join(rootDir, "join-website");
const serverDir = path.join(rootDir, "server");

const requiredPaths = {
  nextBuild: path.join(joinWebsiteDir, ".next"),
  nextPublic: path.join(joinWebsiteDir, "public"),
  serverSrc: path.join(serverDir, "src"),
  serverPackage: path.join(serverDir, "package.json"),
};

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing ${label}: ${targetPath}`);
  }
}

function copyRecursive(source, destination, options = {}) {
  const { filter } = options;
  if (filter && !filter(source)) {
    return;
  }

  const stats = fs.lstatSync(source);
  if (stats.isSymbolicLink()) {
    return;
  }

  if (stats.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(
        path.join(source, entry),
        path.join(destination, entry),
        options,
      );
    }
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function main() {
  ensureExists(requiredPaths.nextBuild, ".next build output");
  ensureExists(requiredPaths.nextPublic, "public directory");
  ensureExists(requiredPaths.serverSrc, "server/src");
  ensureExists(requiredPaths.serverPackage, "server/package.json");

  fs.rmSync(bundleDir, { recursive: true, force: true });
  fs.mkdirSync(bundleDir, { recursive: true });

  const bundleServerDir = path.join(bundleDir, "server");
  const bundleServerSrc = path.join(bundleServerDir, "src");
  const bundleWebDir = path.join(bundleDir, "web");

  copyRecursive(requiredPaths.serverSrc, bundleServerSrc);
  fs.copyFileSync(requiredPaths.serverPackage, path.join(bundleServerDir, "package.json"));
  const nextSource = requiredPaths.nextBuild;
  copyRecursive(nextSource, path.join(bundleWebDir, ".next"), {
    filter: (entryPath) => {
      const relative = path.relative(nextSource, entryPath);
      if (!relative) return true;
      const normalized = relative.replace(/\\/g, "/");
      if (normalized.startsWith("dev/") || normalized === "dev") return false;
      if (normalized.startsWith("cache/") || normalized === "cache") return false;
      return true;
    },
  });
  copyRecursive(requiredPaths.nextPublic, path.join(bundleWebDir, "public"));

  const filesToCopy = [
    "package.json",
    "next.config.ts",
    "next-env.d.ts",
  ];

  filesToCopy.forEach((fileName) => {
    const sourcePath = path.join(joinWebsiteDir, fileName);
    if (!fs.existsSync(sourcePath)) return;
    copyRecursive(sourcePath, path.join(bundleWebDir, fileName));
  });

  console.log("[desktop] Installing server dependencies in bundle...");
  const npmInstall = spawnSync("npm", ["install", "--production", "--no-audit", "--no-fund"], {
    cwd: bundleServerDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (npmInstall.status !== 0) {
    throw new Error("npm install failed in bundle/server. Check that server/package.json is valid.");
  }

  console.log(`[desktop] bundle prepared at ${bundleDir}`);
}

main();
