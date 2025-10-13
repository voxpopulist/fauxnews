import { searchDocs, deltaDecode } from './search.js';
import { createCard } from './render.js';
import { siteUrl, observeCard, wireAudioPlayer, wireTranscript, activateAudio } from './lazy.js';
import { createAdvancedAudioPlayer } from './audio-player.js';
import { initAdvancedSearch } from './advanced-search.js';
import { initMicroInteractions } from './micro-interactions.js';
import { AndroidFallbacks } from './android-fallbacks.js';

// Minimal polyfills for older Safari / iOS
if (!Element.prototype.replaceChildren) {
  Element.prototype.replaceChildren = function(...nodes) {
    while (this.firstChild) this.removeChild(this.firstChild);
    for (const n of nodes) {
      this.appendChild(typeof n === 'string' ? document.createTextNode(n) : n);
    }
  };
}

// Runtime initialization wrapped to avoid parse-time failures taking down the whole page
try {
  // Expose activateAudio globally for IntersectionObserver
  window.activateAudio = activateAudio;
} catch (err) {
  // If activation fails, log and allow page to render without advanced features
  // (keeps cards visible even if enhanced behaviors fail)
  // eslint-disable-next-line no-console
  console.error('Runtime initialization failed:', err);
}

window.PATH_PREFIX = window.PATH_PREFIX || document.body.getAttribute('data-path-prefix') || '/';
window.INDEX_URL = window.INDEX_URL || window.PATH_PREFIX + 'index/index.json';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const searchInput = $('#search');
const resultsEl = $('#results');
const countEl = $('#resultsCount');
// Tag buttons in the tag cloud (robust selector)
const tagButtons = $$('[data-word]');
let activeTagEl = null;

function setActiveTagEl(el) {
  // Clear previous active
  if (activeTagEl) {
    activeTagEl.classList.remove('ring-2','ring-primary-400','bg-primary-400/10');
    activeTagEl.setAttribute('aria-pressed', 'false');
    const prevOverlay = activeTagEl.querySelector('.absolute.inset-0');
    if (prevOverlay) {
      prevOverlay.classList.remove('opacity-100');
      prevOverlay.classList.add('opacity-0');
    }
  }
  activeTagEl = el || null;
  if (activeTagEl) {
    activeTagEl.classList.add('ring-2','ring-primary-400','bg-primary-400/10');
    activeTagEl.setAttribute('aria-pressed', 'true');
    const overlay = activeTagEl.querySelector('.absolute.inset-0');
    if (overlay) {
      overlay.classList.remove('opacity-0');
      overlay.classList.add('opacity-100');
    }
  }
}

// Create infinite scroll sentinel
const scrollSentinel = document.createElement('div');
scrollSentinel.id = 'scroll-sentinel';
scrollSentinel.className = 'flex items-center justify-center py-8 opacity-0 transition-opacity duration-300';
scrollSentinel.innerHTML = `
  <div class="flex items-center gap-3 text-dark-100">
    <div class="animate-spin w-5 h-5 border-2 border-dark-300 border-t-primary-500 rounded-full"></div>
    <span class="font-medium">Loading more clips...</span>
  </div>
`;

// Infinite scroll observer
const infiniteScrollObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && state.offset < state.filtered.length) {
      scrollSentinel.style.opacity = '1';
      setTimeout(() => {
        renderMore();
        if (state.offset >= state.filtered.length) {
          scrollSentinel.style.opacity = '0';
        }
      }, 300); // Small delay for smooth UX
    }
  });
}, { 
  root: null, 
  rootMargin: '100px', // Trigger when sentinel is 100px away from viewport
  threshold: 0.1 
});

const supportsIO = 'IntersectionObserver' in window;
window.cardObserver = supportsIO ? new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const audio = entry.target.querySelector('.card__player');
      if (audio) activateAudio(audio);
      window.cardObserver.unobserve(entry.target);
    }
  });
}, { root: null, rootMargin: '200px', threshold: 0.1 }) : null;

const state = {
  docs: [],
  terms: new Map(),
  filtered: [],
  offset: 0,
  pageSize: window.innerWidth < 768 ? 12 : 40, // Smaller initial batch on mobile
  loaded: false,
  searchTimeout: null, // For debouncing search input
};

async function loadIndex() {
  if (state.loaded) return;
  const url = window.INDEX_URL;
  const res = await fetch(url, { credentials: 'same-origin' });
  const idx = await res.json();
  state.docs = idx.docs;
  for (const [term, deltas] of Object.entries(idx.terms || {})) {
    state.terms.set(term, deltaDecode(deltas));
  }
  state.loaded = true;
}

function clearResults() { 
  resultsEl.replaceChildren(); 
  // Remove sentinel from observer and DOM if it exists
  if (scrollSentinel.parentNode) {
    infiniteScrollObserver.unobserve(scrollSentinel);
    scrollSentinel.remove();
  }
}

function renderMore() {
  const remaining = state.filtered.length - state.offset;
  if (remaining <= 0) return;
  
  const take = Math.min(state.pageSize, remaining);
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < take; i++) {
    const id = state.filtered[state.offset + i];
    const doc = state.docs[id];
    fragment.appendChild(createCard(doc, {siteUrl, observeCard, wireAudioPlayer, wireTranscript}));
  }
  resultsEl.appendChild(fragment);
  state.offset += take;
  
  // Manage infinite scroll sentinel
  if (state.offset < state.filtered.length) {
    // More content available - add/ensure sentinel is present
    if (!scrollSentinel.parentNode) {
      resultsEl.appendChild(scrollSentinel);
      infiniteScrollObserver.observe(scrollSentinel);
    }
    scrollSentinel.style.opacity = '0'; // Hide loading indicator after content loads
  } else {
    // No more content - remove sentinel
    if (scrollSentinel.parentNode) {
      infiniteScrollObserver.unobserve(scrollSentinel);
      scrollSentinel.remove();
    }
  }
}

function updateCount() {
  if (!countEl) return;
  const total = state.filtered.length;
  countEl.textContent = total ? `${total} result${total===1?'':'s'}` : 'No results';
}

function scrollToResults() {
  // Find the results section
  const resultsSection = document.querySelector('#results');
  if (!resultsSection) return;
  
  // Calculate offset to account for sticky search bar
  const searchSection = document.querySelector('section.sticky');
  const searchHeight = searchSection ? searchSection.offsetHeight : 0;
  const extraPadding = 20; // Add some extra space
  
  // Get the position of results relative to document
  const resultsTop = resultsSection.offsetTop - searchHeight - extraPadding;
  
  // Smooth scroll to show results
  window.scrollTo({
    top: resultsTop,
    behavior: 'smooth'
  });
}

async function runSearch() {
  if (!state.loaded) await loadIndex();
  const q = (searchInput && searchInput.value ? searchInput.value : '').trim();
  state.filtered = searchDocs(q, state);
  state.offset = 0;
  clearResults();
  if (state.filtered.length === 0) {
    resultsEl.innerHTML = '<p class="empty">No clips match your search.</p>';
  } else {
    renderMore();
  }
  updateCount();
  
  // Only scroll if there's a search query (not on initial load)
  if (q) {
    // Small delay to ensure content is rendered
    setTimeout(scrollToResults, 100);
  }
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    // Clear existing timeout
    if (state.searchTimeout) {
      clearTimeout(state.searchTimeout);
    }
  
  // Set new timeout for debounced search
  state.searchTimeout = setTimeout(() => {
    runSearch();
    // Clear highlight if query doesn't match active tag
  const q = (searchInput && searchInput.value ? searchInput.value : '').trim();
    if (activeTagEl) {
    const currentTag = (activeTagEl && activeTagEl.dataset && activeTagEl.dataset.word) || '';
      if (!q || q.toLowerCase() !== currentTag.toLowerCase()) {
        setActiveTagEl(null);
      }
    }
  }, 300); // 300ms delay
  });
} // end if (searchInput)
function activateTag(word, sourceEl) {
  if (!word || !searchInput) return;
  searchInput.value = word;
  runSearch();
  searchInput.focus({ preventScroll: true });
  // Scroll to results after tag search
  setTimeout(scrollToResults, 150);
  if (sourceEl) setActiveTagEl(sourceEl);
}

tagButtons.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget;
  activateTag((target && target.dataset && target.dataset.word) || '', target);
  });
  // Keyboard accessibility: Enter/Space
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
  activateTag((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.word) || '', e.currentTarget);
    }
  });
});

(async () => {
  try {
    // Check if we should use Android fallbacks
    if (AndroidFallbacks.shouldUseFallbacks()) {
      console.log('Using Android fallback mode');
      await loadIndex();
      AndroidFallbacks.initFallbacks(state.docs, siteUrl);
      return;
    }

    // Initialize micro-interactions first
    initMicroInteractions();
    
    // CRITICAL: Force reveal cards on Android immediately after micro-interactions
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      setTimeout(() => {
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
          el.classList.remove('animate-on-scroll');
          el.classList.add('in-view');
        });
      }, 100);
    }
    
    // Initialize advanced search
    if (searchInput) {
      initAdvancedSearch(searchInput);
    }
    
    await loadIndex();
    state.filtered = state.docs.map(d => d.id);
    state.offset = 0;
    clearResults();
    renderMore();
    updateCount();
    const loading = resultsEl.querySelector('.loading');
    if (loading) loading.remove();
  } catch (e) {
    console.error('Main initialization failed:', e);
    // Try fallback mode on any error
    try {
      if (state.docs.length > 0) {
        AndroidFallbacks.initFallbacks(state.docs, siteUrl);
      } else {
        resultsEl.innerHTML = '<p class="empty">Failed to load clips.</p>';
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      resultsEl.innerHTML = '<p class="empty">Failed to load clips.</p>';
    }
  }
})();
