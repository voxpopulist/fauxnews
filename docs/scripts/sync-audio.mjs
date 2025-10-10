import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const samplesRoot = path.resolve(projectRoot, "..", "samples");
const publicRoot = path.join(projectRoot, "public", "samples");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else {
      yield fullPath;
    }
  }
}

async function copyMp3s() {
  try {
    await fs.access(samplesRoot);
  } catch {
    console.warn("samples directory not found; skipping audio sync");
    return;
  }

  await ensureDir(publicRoot);

  const allowedExtensions = new Set([".mp3", ".flac"]);

  for await (const file of walk(samplesRoot)) {
    const ext = path.extname(file).toLowerCase();
    if (!allowedExtensions.has(ext)) continue;
    const relative = path.relative(samplesRoot, file);
    const target = path.join(publicRoot, relative);
    await ensureDir(path.dirname(target));
    await fs.copyFile(file, target);
  }
}

copyMp3s().catch((err) => {
  console.error("Failed to sync audio previews:", err);
  process.exitCode = 1;
});
