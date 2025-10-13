import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const STOP_WORDS = new Set([
    "0o", "0s", "3a", "3b", "3d", "6b", "6o", "a", "a1", "a2", "a3", "a4", "ab", "able", "about", "above", "abst", "ac", "accordance", "according", "accordingly", "across", "act", "actually", "ad", "added", "adj", "ae", "af", "affected", "affecting", "affects", "after", "afterwards", "ag", "again", "against", "ah", "ain", "ain't", "aj", "al", "all", "allow", "allows", "almost", "alone", "along", "already", "also", "although", "always", "am", "among", "amongst", "amoungst", "amount", "an", "and", "announce", "another", "any", "anybody", "anyhow", "anymore", "anyone", "anything", "anyway", "anyways", "anywhere", "ao", "ap", "apart", "apparently", "appear", "appreciate", "appropriate", "approximately", "ar", "are", "aren", "arent", "aren't", "arise", "around", "as", "a's", "aside", "ask", "asking", "associated", "at", "au", "auth", "av", "available", "aw", "away", "awfully", "ax", "ay", "az", "b", "b1", "b2", "b3", "ba", "back", "bc", "bd", "be", "became", "because", "become", "becomes", "becoming", "been", "before", "beforehand", "begin", "beginning", "beginnings", "begins", "behind", "being", "believe", "below", "beside", "besides", "best", "better", "between", "beyond", "bi", "bill", "biol", "bj", "bk", "bl", "bn", "both", "bottom", "bp", "br", "brief", "briefly", "bs", "bt", "bu", "but", "bx", "by", "c", "c1", "c2", "c3", "ca", "call", "came", "can", "cannot", "cant", "can't", "cause", "causes", "cc", "cd", "ce", "certain", "certainly", "cf", "cg", "ch", "changes", "ci", "cit", "cj", "cl", "clearly", "cm", "c'mon", "cn", "co", "com", "come", "comes", "con", "concerning", "consequently", "consider", "considering", "contain", "containing", "contains", "corresponding", "could", "couldn", "couldnt", "couldn't", "course", "cp", "cq", "cr", "cry", "cs", "c's", "ct", "cu", "currently", "cv", "cx", "cy", "cz", "d", "d2", "da", "date", "dc", "dd", "de", "definitely", "describe", "described", "despite", "detail", "df", "di", "did", "didn", "didn't", "different", "dj", "dk", "dl", "do", "does", "doesn", "doesn't", "doing", "don", "done", "don't", "down", "downwards", "dp", "dr", "ds", "dt", "du", "due", "during", "dx", "dy", "e", "e2", "e3", "ea", "each", "ec", "ed", "edu", "ee", "ef", "effect", "eg", "ei", "eight", "eighty", "either", "ej", "el", "eleven", "else", "elsewhere", "em", "empty", "en", "end", "ending", "enough", "entirely", "eo", "ep", "eq", "er", "es", "especially", "est", "et", "et-al", "etc", "eu", "ev", "even", "ever", "every", "everybody", "everyone", "everything", "everywhere", "ex", "exactly", "example", "except", "ey", "f", "f2", "fa", "far", "fc", "few", "ff", "fi", "fifteen", "fifth", "fify", "fill", "find", "fire", "first", "five", "fix", "fj", "fl", "fn", "fo", "followed", "following", "follows", "for", "former", "formerly", "forth", "forty", "found", "four", "fr", "from", "front", "fs", "ft", "fu", "full", "further", "furthermore", "fy", "g", "ga", "gave", "ge", "get", "gets", "getting", "gi", "give", "given", "gives", "giving", "gj", "gl", "go", "goes", "going", "gone", "got", "gotten", "gr", "greetings", "gs", "gy", "h", "h2", "h3", "had", "hadn", "hadn't", "happens", "hardly", "has", "hasn", "hasnt", "hasn't", "have", "haven", "haven't", "having", "he", "hed", "he'd", "he'll", "hello", "help", "hence", "her", "here", "hereafter", "hereby", "herein", "heres", "here's", "hereupon", "hers", "herself", "hes", "he's", "hh", "hi", "hid", "him", "himself", "his", "hither", "hj", "ho", "home", "hopefully", "how", "howbeit", "however", "how's", "hr", "hs", "http", "hu", "hundred", "hy", "i", "i2", "i3", "i4", "i6", "i7", "i8", "ia", "ib", "ibid", "ic", "id", "i'd", "ie", "if", "ig", "ignored", "ih", "ii", "ij", "il", "i'll", "im", "i'm", "immediate", "immediately", "importance", "important", "in", "inasmuch", "inc", "indeed", "index", "indicate", "indicated", "indicates", "information", "inner", "insofar", "instead", "interest", "into", "invention", "inward", "io", "ip", "iq", "ir", "is", "isn", "isn't", "it", "itd", "it'd", "it'll", "its", "it's", "itself", "iv", "i've", "ix", "iy", "iz", "j", "jj", "jr", "js", "jt", "ju", "just", "k", "ke", "keep", "keeps", "kept", "kg", "kj", "km", "know", "known", "knows", "ko", "l", "l2", "la", "largely", "last", "lately", "later", "latter", "latterly", "lb", "lc", "le", "least", "les", "less", "lest", "let", "lets", "let's", "lf", "like", "liked", "likely", "line", "little", "lj", "ll", "ll", "ln", "lo", "look", "looking", "looks", "los", "lr", "ls", "lt", "ltd", "m", "m2", "ma", "made", "mainly", "make", "makes", "many", "may", "maybe", "me", "mean", "means", "meantime", "meanwhile", "merely", "mg", "might", "mightn", "mightn't", "mill", "million", "mine", "miss", "ml", "mn", "mo", "more", "moreover", "most", "mostly", "move", "mr", "mrs", "ms", "mt", "mu", "much", "mug", "must", "mustn", "mustn't", "my", "myself", "n", "n2", "na", "name", "namely", "nay", "nc", "nd", "ne", "near", "nearly", "necessarily", "necessary", "need", "needn", "needn't", "needs", "neither", "never", "nevertheless", "new", "next", "ng", "ni", "nine", "ninety", "nj", "nl", "nn", "no", "nobody", "non", "none", "nonetheless", "noone", "nor", "normally", "nos", "not", "noted", "nothing", "novel", "now", "nowhere", "nr", "ns", "nt", "ny", "o", "oa", "ob", "obtain", "obtained", "obviously", "oc", "od", "of", "off", "often", "og", "oh", "oi", "oj", "ok", "okay", "ol", "old", "om", "omitted", "on", "once", "one", "ones", "only", "onto", "oo", "op", "oq", "or", "ord", "os", "ot", "other", "others", "otherwise", "ou", "ought", "our", "ours", "ourselves", "out", "outside", "over", "overall", "ow", "owing", "own", "ox", "oz", "p", "p1", "p2", "p3", "page", "pagecount", "pages", "par", "part", "particular", "particularly", "pas", "past", "pc", "pd", "pe", "per", "perhaps", "pf", "ph", "pi", "pj", "pk", "pl", "placed", "please", "plus", "pm", "pn", "po", "poorly", "possible", "possibly", "potentially", "pp", "pq", "pr", "predominantly", "present", "presumably", "previously", "primarily", "probably", "promptly", "proud", "provides", "ps", "pt", "pu", "put", "py", "q", "qj", "qu", "que", "quickly", "quite", "qv", "r", "r2", "ra", "ran", "rather", "rc", "rd", "re", "readily", "really", "reasonably", "recent", "recently", "ref", "refs", "regarding", "regardless", "regards", "related", "relatively", "research", "research-articl", "respectively", "resulted", "resulting", "results", "rf", "rh", "ri", "right", "rj", "rl", "rm", "rn", "ro", "rq", "rr", "rs", "rt", "ru", "run", "rv", "ry", "s", "s2", "sa", "said", "same", "saw", "say", "saying", "says", "sc", "sd", "se", "sec", "second", "secondly", "section", "see", "seeing", "seem", "seemed", "seeming", "seems", "seen", "self", "selves", "sensible", "sent", "serious", "seriously", "seven", "several", "sf", "shall", "shan", "shan't", "she", "shed", "she'd", "she'll", "shes", "she's", "should", "shouldn", "shouldn't", "should've", "show", "showed", "shown", "showns", "shows", "si", "side", "significant", "significantly", "similar", "similarly", "since", "sincere", "six", "sixty", "sj", "sl", "slightly", "sm", "sn", "so", "some", "somebody", "somehow", "someone", "somethan", "something", "sometime", "sometimes", "somewhat", "somewhere", "soon", "sorry", "sp", "specifically", "specified", "specify", "specifying", "sq", "sr", "ss", "st", "still", "stop", "strongly", "sub", "substantially", "successfully", "such", "sufficiently", "suggest", "sup", "sure", "sy", "system", "sz", "t", "t1", "t2", "t3", "take", "taken", "taking", "tb", "tc", "td", "te", "tell", "ten", "tends", "tf", "th", "than", "thank", "thanks", "thanx", "that", "that'll", "thats", "that's", "that've", "the", "their", "theirs", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", "thered", "therefore", "therein", "there'll", "thereof", "therere", "theres", "there's", "thereto", "thereupon", "there've", "these", "they", "theyd", "they'd", "they'll", "theyre", "they're", "they've", "thickv", "thin", "think", "third", "this", "thorough", "thoroughly", "those", "thou", "though", "thoughh", "thousand", "three", "throug", "through", "throughout", "thru", "thus", "ti", "til", "tip", "tj", "tl", "tm", "tn", "to", "together", "too", "took", "top", "toward", "towards", "tp", "tq", "tr", "tried", "tries", "truly", "try", "trying", "ts", "t's", "tt", "tv", "twelve", "twenty", "twice", "two", "tx", "u", "u201d", "ue", "ui", "uj", "uk", "um", "un", "under", "unfortunately", "unless", "unlike", "unlikely", "until", "unto", "uo", "up", "upon", "ups", "ur", "us", "use", "used", "useful", "usefully", "usefulness", "uses", "using", "usually", "ut", "v", "va", "value", "various", "vd", "ve", "ve", "very", "via", "viz", "vj", "vo", "vol", "vols", "volumtype", "vq", "vs", "vt", "vu", "w", "wa", "want", "wants", "was", "wasn", "wasnt", "wasn't", "way", "we", "wed", "we'd", "welcome", "well", "we'll", "well-b", "went", "were", "we're", "weren", "werent", "weren't", "we've", "what", "whatever", "what'll", "whats", "what's", "when", "whence", "whenever", "when's", "where", "whereafter", "whereas", "whereby", "wherein", "wheres", "where's", "whereupon", "wherever", "whether", "which", "while", "whim", "whither", "who", "whod", "whoever", "whole", "who'll", "whom", "whomever", "whos", "who's", "whose", "why", "why's", "wi", "widely", "will", "willing", "wish", "with", "within", "without", "wo", "won", "wonder", "wont", "won't", "words", "world", "would", "wouldn", "wouldnt", "wouldn't", "www", "x", "x1", "x2", "x3", "xf", "xi", "xj", "xk", "xl", "xn", "xo", "xs", "xt", "xv", "xx", "y", "y2", "yes", "yet", "yj", "yl", "you", "youd", "you'd", "you'll", "your", "youre", "you're", "yours", "yourself", "yourselves", "you've", "yr", "ys", "yt", "z", "zero", "zi", "zz",
]);

function tokenize(text) {
  if (!text) return [];
  const matches = text.toLowerCase().match(/[a-z']+/g);
  if (!matches) return [];
  return matches.filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function parseTranscriptVtt(content) {
  const lines = content.split(/\r?\n/);
  const transcript = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.toUpperCase() === "WEBVTT") continue;

    if (line.includes("-->")) {
      // Support both MM:SS.mmm and HH:MM:SS.mmm
      const match = line.match(/((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}\.\d{3})/);
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

export function loadSampleData() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const samplesRoot = path.resolve(__dirname, "..", "..", "..", "samples");

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

      // If transcripts are not in the expected text/ sibling, try to find them anywhere under samplesRoot
      const findAny = (root, filename) => {
        let found = null;
        function walk(dir) {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const e of entries) {
            if (found) return;
            if (e.name.startsWith('.')) continue;
            const p = path.join(dir, e.name);
            if (e.isDirectory()) { walk(p); continue; }
            if (e.name === filename) { found = p; return; }
          }
        }
        try { walk(root); } catch (err) { /* ignore */ }
        return found;
      };

      let vttCandidate = vttFile;
      let txtCandidate = txtFile;
      if (!fs.existsSync(vttCandidate) && !fs.existsSync(txtCandidate)) {
        const altVtt = findAny(samplesRoot, `${baseName}.vtt`);
        const altTxt = findAny(samplesRoot, `${baseName}.txt`);
        if (altVtt) vttCandidate = altVtt;
        if (altTxt) txtCandidate = altTxt;
      }

      // Determine speaker path early so we can build audio URLs
      const speakerPathSegments = [...segments];
      if (speakerPathSegments[speakerPathSegments.length - 1] === "audio") {
        speakerPathSegments.pop();
      }
      const speakerPath = speakerPathSegments.join("/");
      const rawSpeaker = speakerPathSegments[speakerPathSegments.length - 1] || "Unknown";
      const speaker = rawSpeaker.charAt(0).toUpperCase() + rawSpeaker.slice(1);

      // For development: Allow samples even if MP3 doesn't exist yet, but prefer MP3 if available
      const hasMP3 = fs.existsSync(mp3File);
      const audioSrc = hasMP3
        ? `/samples/${speakerPath}/audio/${baseName}.mp3`
        : `/samples/${speakerPath}/audio/${entry.name}`;
      
      let transcript = [];
      let transcriptFlattened = "";
      let transcriptPath = null;
      let transcriptType = null;
      if (fs.existsSync(vttCandidate)) {
        try {
          const vttContent = fs.readFileSync(vttCandidate, "utf-8");
          transcript = parseTranscriptVtt(vttContent);
          transcriptFlattened = transcript.map((segment) => segment.text).join(" ");
          transcriptPath = path.join("/samples", path.relative(samplesRoot, vttCandidate)).replace(/\\/g, "/");
          transcriptType = "vtt";
        } catch {}
      } else if (fs.existsSync(txtCandidate)) {
        try {
          const txtContent = fs.readFileSync(txtCandidate, "utf-8");
          if (txtContent.trim()) {
            transcript = [{ timestamp: "00:00.000", text: txtContent.trim() }];
            transcriptFlattened = txtContent.trim();
            transcriptPath = path.join("/samples", path.relative(samplesRoot, txtCandidate)).replace(/\\/g, "/");
            transcriptType = "txt";
          }
        } catch {}
      }

      if (!transcriptFlattened && transcript.length) {
        transcriptFlattened = transcript.map((segment) => segment.text).join(" ");
      }

  // Use same-origin path for FLAC to avoid iOS Safari CORS/permission issues
  const flacDownload = `/samples/${speakerPath}/audio/${entry.name}`;

      // Build a short search excerpt to keep DOM light; full text not embedded in page
      const searchExcerpt = transcriptFlattened ? transcriptFlattened.slice(0, 600) : "";

      samples.push({
        filename: entry.name,
        speaker,
        key: `${speakerPath}/audio/${entry.name}`,
        flacSrc: flacDownload,
        mp3Src: audioSrc,
        transcriptAvailable: Boolean(transcriptPath),
        transcriptSrc: transcriptPath,
        transcriptType,
        // Keep transcriptText server-side for tag cloud computation, but avoid embedding in DOM
        transcriptText: transcriptFlattened,
        preview: transcriptFlattened
          ? transcriptFlattened.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ")
          : "Transcript not available.",
        searchExcerpt
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
    return { word, count, weight: Number(weight.toFixed(3)) };
  });

  return { samples, tagCloud };
}
