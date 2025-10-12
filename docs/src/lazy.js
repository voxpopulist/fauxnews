// Audio and transcript lazy loading logic
export const MAX_ACTIVE_LOADS = 3;
let activeLoads = 0;
const pendingLoads = [];

export function siteUrl(path) {
  const base = window.PATH_PREFIX || '/';
  if (!path) return base;
  if (path.startsWith('http')) return path;
  const cleanBase = base.endsWith('/') ? base : base + '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return cleanBase + cleanPath;
}

export function activateAudio(el) {
  if (!el || el.dataset.loaded === '1') return;
  const src = el.dataset.src;
  if (!src) return;
  const doLoad = () => {
    activeLoads++;
    el.src = src;
    el.addEventListener('loadedmetadata', () => {
      el.dataset.loaded = '1';
      activeLoads = Math.max(0, activeLoads - 1);
      pumpQueue();
    }, { once: true });
    el.addEventListener('error', () => {
      activeLoads = Math.max(0, activeLoads - 1);
      pumpQueue();
    }, { once: true });
    try { el.load(); } catch {}
  };
  if (activeLoads < MAX_ACTIVE_LOADS) doLoad(); else pendingLoads.push(doLoad);
}
export function pumpQueue() {
  while (activeLoads < MAX_ACTIVE_LOADS && pendingLoads.length) {
    const fn = pendingLoads.shift();
    if (fn) fn();
  }
}

export function observeCard(card) {
  if (!window.cardObserver) return;
  window.cardObserver.observe(card);
}

export function wireAudioPlayer(player) {
  player.addEventListener('play', () => {
    if (player.dataset.loaded !== '1') activateAudio(player);
    document.querySelectorAll('.card__player').forEach((other) => {
      if (other !== player && !other.paused) other.pause();
    });
  });
}

export async function fetchText(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Failed to fetch transcript');
  return await res.text();
}

export function renderTranscriptFromTxt(container, text) {
  const content = document.createElement('div');
  content.className = 'prose prose-sm text-dark-50 leading-relaxed';
  content.innerHTML = `<p>${text.trim().replace(/\n/g, '</p><p>')}</p>`;
  container.replaceChildren(content);
}

export function renderTranscriptFromVtt(container, vttText) {
  const lines = vttText.split(/\r?\n/);
  const ul = document.createElement('ul');
  ul.className = 'space-y-3';
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line.toUpperCase() === 'WEBVTT') { i++; continue; }
    if (line.includes('-->')) {
      const m = line.match(/((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}\.\d{3})/);
      let textLines = [];
      i++;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t || t.includes('-->')) break;
        textLines.push(t);
        i++;
      }
      if (textLines.length) {
        const li = document.createElement('li');
        li.className = 'border-l-2 border-primary-400/30 pl-4 py-2';
        
        const ts = document.createElement('div');
        ts.className = 'text-xs text-primary-400 font-mono mb-1';
        ts.textContent = `${m?.[1] || ''} → ${m?.[2] || ''}`;
        
        const tx = document.createElement('div');
        tx.className = 'text-dark-100 leading-relaxed';
        tx.textContent = textLines.join(' ');
        
        li.appendChild(ts);
        li.appendChild(tx);
        ul.appendChild(li);
      }
      continue;
    }
    i++;
  }
  
  if (!ul.children.length) {
    container.innerHTML = `
      <div class="text-center py-8 text-dark-100">
        <p class="font-medium">No transcript content found</p>
        <p class="text-sm text-dark-200 mt-1">The transcript file appears to be empty</p>
      </div>
    `;
  } else {
    container.replaceChildren(ul);
  }
}

export function wireTranscript(transcriptSection) {
  // For always-visible transcripts, load immediately
  const loadTranscript = async () => {
    if (transcriptSection.dataset.loaded === '1') return;
    
    const src = transcriptSection.dataset.transcriptSrc;
    const type = transcriptSection.dataset.transcriptType;
    const container = transcriptSection.querySelector('div[class*="backdrop-blur"]') || transcriptSection.querySelector('div[class*="bg-dark"]');
    
    if (!src) {
      if (container) {
        container.innerHTML = `
          <div class="text-center py-8 text-dark-100">
            <svg class="w-12 h-12 mx-auto mb-3 text-dark-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            <p class="font-medium">No transcript available</p>
            <p class="text-sm text-dark-200 mt-1">Audio-only content</p>
          </div>
        `;
      }
      transcriptSection.dataset.loaded = '1';
      return;
    }
    
    if (container) {
      container.innerHTML = `
        <div class="flex items-center justify-center gap-3 py-8 text-dark-100">
          <div class="animate-spin w-5 h-5 border-2 border-dark-300 border-t-primary-500 rounded-full"></div>
          <span class="font-medium">Loading transcript...</span>
        </div>
      `;
    }
    
    try {
      const text = await fetchText(siteUrl(src));
      if (container) {
        if (type === 'txt') {
          renderTranscriptFromTxt(container, text);
        } else {
          renderTranscriptFromVtt(container, text);
        }
      }
    } catch (error) {
      console.error('Failed to load transcript:', error);
      if (container) {
        container.innerHTML = `
          <div class="text-center py-8 text-dark-100">
            <p class="font-medium text-red-400">Failed to load transcript</p>
            <p class="text-sm text-dark-200 mt-1">Please try again later</p>
          </div>
        `;
      }
    } finally {
      transcriptSection.dataset.loaded = '1';
    }
  };
  
  // Load transcript immediately for always-visible sections
  loadTranscript();
}
