import fs from "fs";
import path from "path";

const STOP_WORDS = new Set([
  "a","about","after","again","against","all","am","an","and","any","are","aren't","as","at",
  "be","because","been","before","being","below","between","both","but","by","can't","cannot","could",
  "couldn't","did","didn't","do","does","doesn't","doing","don't","down","during","each","few","for",
  "from","further","had","hadn't","has","hasn't","have","haven't","having","he","he'd","he'll","he's",
  "her","here","here's","hers","herself","him","himself","his","how","how's","i","i'd","i'll","i'm",
  "i've","if","in","into","is","isn't","it","it's","its","itself","let's","me","more","most","mustn't",
  "my","myself","no","nor","not","of","off","on","once","only","or","other","ought","our","ours",
  "ourselves","out","over","own","same","she","she'd","she'll","she's","should","shouldn't","so","some",
  "such","than","that","that's","the","their","theirs","them","themselves","then","there","there's","these",
  "they","they'd","they'll","they're","they've","this","those","through","to","too","under","until","up",
  "very","was","wasn't","we","we'd","we'll","we're","we've","were","weren't","what","what's","when","when's",
  "where","where's","which","while","who","who's","whom","why","why's","with","won't","would","wouldn't",
  "you","you'd","you'll","you're","you've","your","yours","yourself","yourselves"
]);

function tokenize(text) {
  if (!text) return [];
  const matches = text.toLowerCase().match(/[a-z']+/g);
  if (!matches) return [];
  return matches.filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function parseVtt(content) {
  const lines = content.split(/\r?\n/);
  const transcript = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.toUpperCase() === "WEBVTT") continue;

    if (line.includes("-->")) {
      const match = line.match(/(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}\.\d{3})/);
      if (!match) continue;
      const start = match[1];
      const end = match[2];

      const textLines = [];
      let j = i + 1;
      while (j < lines.length) {
        const textLine = lines[j].trim();
        if (!textLine || textLine.includes("-->")) {
          break;
        }
        textLines.push(textLine);
        j++;
      }

      if (textLines.length) {
        transcript.push({
          timestamp: `${start} → ${end}`,
          text: textLines.join(" ")
        });
      }

      i = j - 1;
    }
  }

  return transcript;
}

function discoverSamples() {
  const samplesRoot = path.resolve(process.cwd(), "..", "samples");
  if (!fs.existsSync(samplesRoot)) {
    return { samples: [], tagCloud: [] };
  }

  const samples = [];

  function walk(dir, segments = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath, [...segments, entry.name]);
        continue;
      }

      if (!entry.name.endsWith(".flac")) continue;

      const baseName = entry.name.replace(/\.flac$/, "");
      const audioDir = path.dirname(entryPath);
      const speakerDir = path.dirname(audioDir);
      const textDir = path.join(speakerDir, "text");

      const txtFile = path.join(textDir, `${baseName}.txt`);
      const vttFile = path.join(textDir, `${baseName}.vtt`);
      const mp3File = path.join(audioDir, `${baseName}.mp3`);

      if (!fs.existsSync(mp3File)) {
        // Skip entries without MP3 previews so the UI does not break.
        continue;
      }

      let transcript = [];
      let transcriptFlattened = "";
      if (fs.existsSync(vttFile)) {
        try {
          const vttContent = fs.readFileSync(vttFile, "utf-8");
          transcript = parseVtt(vttContent);
          transcriptFlattened = transcript.map((segment) => segment.text).join(" ");
        } catch (err) {
          console.warn(`Failed to parse VTT for ${baseName}:`, err);
        }
      } else if (fs.existsSync(txtFile)) {
        try {
          const txtContent = fs.readFileSync(txtFile, "utf-8");
          if (txtContent.trim()) {
            transcript = [{ timestamp: "00:00.000", text: txtContent.trim() }];
            transcriptFlattened = txtContent.trim();
          }
        } catch (err) {
          console.warn(`Failed to load TXT for ${baseName}:`, err);
        }
      }

      if (!transcriptFlattened && transcript.length) {
        transcriptFlattened = transcript.map((segment) => segment.text).join(" ");
      }

      const preview = transcriptFlattened
        ? transcriptFlattened.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ")
        : "Transcript not available.";

      const speakerPathSegments = [...segments];
      if (speakerPathSegments[speakerPathSegments.length - 1] === "audio") {
        speakerPathSegments.pop();
      }
      const speakerPath = speakerPathSegments.join("/");
      const rawSpeaker = speakerPathSegments[speakerPathSegments.length - 1] || "Unknown";
      const speaker = rawSpeaker.charAt(0).toUpperCase() + rawSpeaker.slice(1);

      const rawBase = "https://raw.githubusercontent.com/voxpopulist/clipservatives/main";
      const flacDownload = `${rawBase}/samples/${speakerPath}/audio/${entry.name}`;

      samples.push({
        filename: entry.name,
        speaker,
        flacSrc: flacDownload,
        mp3Src: `/samples/${speakerPath}/audio/${baseName}.mp3`,
        transcript,
        transcriptText: transcriptFlattened,
        preview
      });
    }
  }

  walk(samplesRoot);
  samples.sort((a, b) => a.speaker.localeCompare(b.speaker) || a.filename.localeCompare(b.filename));

  const wordCounts = new Map();
  for (const sample of samples) {
    const tokens = tokenize(sample.transcriptText);
    for (const word of tokens) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }

  const sortedWords = Array.from(wordCounts.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60);

  const maxCount = sortedWords[0]?.[1] ?? 0;
  const minCount = sortedWords[sortedWords.length - 1]?.[1] ?? 0;

  const tagCloud = sortedWords.map(([word, count]) => {
    let weight = 1;
    if (maxCount !== minCount) {
      weight = (count - minCount) / (maxCount - minCount);
    }
    return {
      word,
      count,
      weight: Number(weight.toFixed(3))
    };
  });

  return { samples, tagCloud };
}

export default discoverSamples;
