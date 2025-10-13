// Android-specific fallbacks and progressive enhancement
export const AndroidFallbacks = {
  // Enhanced card renderer with Android compatibility
  createFallbackCard(doc, siteUrl) {
    const article = document.createElement('article');
    article.className = 'card android-safe-card';
    
    // Use simple, Android-safe styling
    article.style.cssText = `
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      display: block;
      box-sizing: border-box;
    `;

    const speaker = document.createElement('h3');
    speaker.textContent = doc.speaker;
    speaker.style.cssText = 'color: #f1f5f9; margin: 0 0 8px 0; font-size: 18px;';

    const filename = document.createElement('p');
    filename.textContent = doc.filename;
    filename.style.cssText = 'color: #94a3b8; margin: 0 0 12px 0; font-size: 12px;';

    const audio = document.createElement('audio');
    audio.className = 'card__player android-audio';
    audio.controls = true;
    audio.preload = 'none';
    audio.src = siteUrl(doc.mp3Src);
    audio.style.cssText = 'width: 100%; margin-bottom: 12px;';

    const downloadLink = document.createElement('a');
    downloadLink.href = siteUrl(doc.flacSrc);
    downloadLink.textContent = 'Download FLAC';
    downloadLink.style.cssText = 'color: #60a5fa; text-decoration: none;';

    article.appendChild(speaker);
    article.appendChild(filename);
    article.appendChild(audio);
    article.appendChild(downloadLink);

    return article;
  },

  // Simplified rendering for Android
  renderCardsSimple(docs, container, siteUrl) {
    if (!container || !docs) return;

    // Clear with simple method
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const fragment = document.createDocumentFragment();
    
    docs.forEach((doc, index) => {
      // Limit initial render on mobile to avoid performance issues
      if (index > 20) return;
      
      const card = this.createFallbackCard(doc, siteUrl);
      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  },

  // Safe search implementation
  implementSafeSearch(docs, searchInput, resultsContainer, siteUrl) {
    if (!searchInput || !resultsContainer) return;

    const performSearch = () => {
      const query = searchInput.value.toLowerCase().trim();
      let filtered = docs;

      if (query) {
        filtered = docs.filter(doc => {
          const text = `${doc.speaker} ${doc.filename}`.toLowerCase();
          return text.includes(query);
        });
      }

      this.renderCardsSimple(filtered, resultsContainer, siteUrl);
      
      // Update count
      const countEl = document.getElementById('resultsCount');
      if (countEl) {
        countEl.textContent = `${filtered.length} result${filtered.length === 1 ? '' : 's'}`;
      }
    };

    // Use simple event handler
    searchInput.addEventListener('input', performSearch);
    
    // Initial render
    performSearch();
  },

  // Detect if we need fallbacks
  shouldUseFallbacks() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isOldChrome = /Chrome\/([0-9]+)/.test(navigator.userAgent) && 
                       parseInt(RegExp.$1) < 80;
    const hasLimitedJS = !window.IntersectionObserver || 
                        !window.fetch || 
                        !Element.prototype.replaceChildren;

    return isAndroid && (isOldChrome || hasLimitedJS);
  },

  // Initialize fallback mode
  initFallbacks(docs, siteUrl) {
    console.log('Initializing Android fallback mode');
    
    const searchInput = document.getElementById('search');
    const resultsContainer = document.getElementById('results');
    
    if (searchInput && resultsContainer && docs) {
      this.implementSafeSearch(docs, searchInput, resultsContainer, siteUrl);
    }

    // Add fallback styles
    const style = document.createElement('style');
    style.textContent = `
      .android-safe-card {
        background: #1e293b !important;
        border: 1px solid #334155 !important;
        border-radius: 8px !important;
        padding: 16px !important;
        margin-bottom: 16px !important;
        display: block !important;
      }
      .android-audio {
        width: 100% !important;
        height: auto !important;
      }
      #results {
        display: block !important;
        column-count: unset !important;
        grid-template-columns: unset !important;
      }
    `;
    document.head.appendChild(style);
  }
};