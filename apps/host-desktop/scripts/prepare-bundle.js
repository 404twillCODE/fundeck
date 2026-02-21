const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..", "..");
const desktopDir = path.resolve(__dirname, "..");
const bundleDir = path.join(desktopDir, ".bundle");

const requiredPaths = {
  nextBuild: path.join(rootDir, ".next"),
  nextPublic: path.join(rootDir, "public"),
  serverSrc: path.join(rootDir, "game-server", "src"),
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
  ensureExists(requiredPaths.serverSrc, "game-server/src");

  fs.rmSync(bundleDir, { recursive: true, force: true });
  fs.mkdirSync(bundleDir, { recursive: true });

  const bundleServerDir = path.join(bundleDir, "server", "src");
  const bundleWebDir = path.join(bundleDir, "web");

  copyRecursive(requiredPaths.serverSrc, bundleServerDir);
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
    const sourcePath = path.join(rootDir, fileName);
    if (!fs.existsSync(sourcePath)) return;
    copyRecursive(sourcePath, path.join(bundleWebDir, fileName));
  });

  console.log(`[desktop] bundle prepared at ${bundleDir}`);
}

main();
