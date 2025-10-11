import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadSampleData } from "../_data/_lib/sampleData.mjs";
import zlib from "zlib";

// Build a single-file inverted index for client-side search.
// Output: docs/public/index/index.json with shape { docs: [...], terms: { term: [docIDs...] } }

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(projectRoot, "public", "index");
const outFile = path.join(outDir, "index.json");

function tokenize(text) {
  if (!text) return [];
  const matches = text.toLowerCase().match(/[a-z']+/g);
  if (!matches) return [];
  // Use same stop-wording rules as data loader (kept simple here to avoid import size)
  // Note: The loader already filtered for tag cloud; we rebuild tokens here for correctness.
  return matches.filter((w) => w.length > 2);
}

function deltaEncode(sortedIds) {
  let prev = 0;
  return sortedIds.map((id) => {
    const d = id - prev;
    prev = id;
    return d;
  });
}

async function main() {
  let { samples } = loadSampleData();

  // Fallback: if no samples (e.g., local MP3s missing), build a minimal set directly from transcripts
  if (!samples || samples.length === 0) {
    const samplesRoot = path.resolve(projectRoot, "..", "samples");
    if (fs.existsSync(samplesRoot)) {
      const acc = [];
      function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith(".")) continue;
          const p = path.join(dir, entry.name);
          if (entry.isDirectory()) { walk(p); continue; }
          if (!entry.name.endsWith(".flac")) continue;
          const base = entry.name.replace(/\.flac$/, "");
          const audioDir = path.dirname(p);
          const speakerDir = path.dirname(audioDir);
          const textDir = path.join(speakerDir, "text");
          const vtt = path.join(textDir, `${base}.vtt`);
          const txt = path.join(textDir, `${base}.txt`);

          let transcriptText = "";
          let transcriptSrc = null;
          if (fs.existsSync(vtt)) {
            try {
              const v = fs.readFileSync(vtt, "utf-8");
              transcriptText = v
                .split(/\r?\n/)
                .filter((ln) => ln && !ln.includes("-->") && ln.toUpperCase() !== "WEBVTT")
                .join(" ");
              transcriptSrc = path.join("/samples", path.relative(samplesRoot, vtt)).replace(/\\/g, "/");
            } catch {}
          } else if (fs.existsSync(txt)) {
            try {
              const t = fs.readFileSync(txt, "utf-8");
              transcriptText = t.trim();
              transcriptSrc = path.join("/samples", path.relative(samplesRoot, txt)).replace(/\\/g, "/");
            } catch {}
          }
          if (!transcriptText) continue; // skip if no transcript available

          const parts = path.relative(samplesRoot, audioDir).split(path.sep);
          const speaker = (parts[parts.length - 2] || "Unknown");
          const speakerCap = speaker.charAt(0).toUpperCase() + speaker.slice(1);
          const speakerPath = parts.slice(0, parts.length - 1).join("/");

          acc.push({
            filename: entry.name,
            speaker: speakerCap,
            flacSrc: `/samples/${speakerPath}/audio/${entry.name}`,
            mp3Src: `/samples/${speakerPath}/audio/${base}.mp3`,
            preview: transcriptText.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ") || "Transcript not available.",
            transcriptText,
            transcriptSrc,
            transcriptAvailable: Boolean(transcriptSrc),
          });
        }
      }
      walk(samplesRoot);
      acc.sort((a, b) => a.speaker.localeCompare(b.speaker) || a.filename.localeCompare(b.filename));
      samples = acc;
    }
  }
  // Assign small integer docIDs in current order
  const docs = samples.map((s, i) => ({
    id: i,
    speaker: s.speaker,
    filename: s.filename,
    preview: s.preview,
    mp3Src: s.mp3Src,
    flacSrc: s.flacSrc,
    transcriptAvailable: s.transcriptAvailable,
    transcriptSrc: s.transcriptSrc,
  }));

  // Build inverted index
  const termMap = new Map(); // term -> Set(docID)
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const text = s.transcriptText || "";
    if (!text) continue;
    const terms = new Set(tokenize(text)); // unique per doc to keep postings small
    for (const t of terms) {
      if (!termMap.has(t)) termMap.set(t, new Set());
      termMap.get(t).add(i);
    }
  }

  // Convert to plain object with delta-encoded postings
  const terms = {};
  for (const [t, set] of termMap.entries()) {
    const ids = Array.from(set).sort((a, b) => a - b);
    terms[t] = deltaEncode(ids);
  }

  await fs.promises.mkdir(outDir, { recursive: true });
  const payload = { docs, terms };
  const json = JSON.stringify(payload);
  await fs.promises.writeFile(outFile, json);

  // Print rough sizes for review
  const rawBytes = Buffer.byteLength(json);
  const gz = zlib.gzipSync(json);
  const br = zlib.brotliCompressSync(Buffer.from(json), {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
  });
  console.log(`wrote index.json: raw=${rawBytes} bytes, gzip=${gz.length} bytes, brotli=${br.length} bytes`);

  const stats = {
    docs: docs.length,
    terms: Object.keys(terms).length,
    sizes: { raw: rawBytes, gzip: gz.length, brotli: br.length }
  };
  await fs.promises.writeFile(path.join(outDir, "index.stats.json"), JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error("Failed to build index:", err);
  process.exit(1);
});
