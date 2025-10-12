// Advanced search functionality with autocomplete and intelligent suggestions
export class AdvancedSearch {
  constructor(inputElement, options = {}) {
    this.input = inputElement;
    this.options = {
      minLength: 2,
      debounceMs: 300,
      maxSuggestions: 8,
      enableFilters: false,
      ...options
    };
    
    this.suggestions = [];
    this.filters = new Set();
    this.isOpen = false;
    this.debounceTimeout = null;
    this.indexTerms = [];
    
    this.init();
  }
  
  init() {
    this.setupContainer();
    this.bindEvents();
    this.loadSearchIndex();
  }
  
  setupContainer() {
    // Wrap input in container if not already wrapped
    let container = this.input.parentElement;
    if (!container.classList.contains('search-container')) {
      container = document.createElement('div');
      container.className = 'search-container';
      this.input.parentElement.insertBefore(container, this.input);
      container.appendChild(this.input);
    }
    
    // Add search icon
    const searchIcon = document.createElement('div');
    searchIcon.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-100 pointer-events-none';
    searchIcon.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
    `;
    container.appendChild(searchIcon);
    
    // Add suggestions dropdown
    this.suggestionsEl = document.createElement('div');
    this.suggestionsEl.className = 'search-suggestions hidden';
    container.appendChild(this.suggestionsEl);
    
    // Add filter chips container
    if (this.options.enableFilters) {
      this.filtersEl = document.createElement('div');
      this.filtersEl.className = 'flex flex-wrap gap-2 mt-2 empty:hidden';
      container.appendChild(this.filtersEl);
    }
    
    this.container = container;
  }
  
  bindEvents() {
    // Input events
    this.input.addEventListener('input', (e) => {
      this.handleInput(e.target.value);
    });
    
    this.input.addEventListener('focus', () => {
      if (this.suggestions.length > 0) {
        this.showSuggestions();
      }
    });
    
    this.input.addEventListener('blur', (e) => {
      // Delay hiding to allow clicking on suggestions
      setTimeout(() => {
        if (!this.container.contains(document.activeElement)) {
          this.hideSuggestions();
        }
      }, 150);
    });
    
    // Keyboard navigation
    this.input.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.hideSuggestions();
      }
    });
  }
  
  async loadSearchIndex() {
    // Load common terms for suggestions
    try {
      const response = await fetch(window.INDEX_URL);
      const index = await response.json();
      
      // Extract popular terms
      this.indexTerms = Object.keys(index.terms || {})
        .sort((a, b) => (index.terms[b]?.length || 0) - (index.terms[a]?.length || 0))
        .slice(0, 100); // Top 100 terms
    } catch (error) {
      console.warn('Could not load search index for suggestions:', error);
      this.indexTerms = [];
    }
  }
  
  handleInput(value) {
    clearTimeout(this.debounceTimeout);
    
    if (value.length < this.options.minLength) {
      this.hideSuggestions();
      return;
    }
    
    this.debounceTimeout = setTimeout(() => {
      this.generateSuggestions(value);
    }, this.options.debounceMs);
  }
  
  generateSuggestions(query) {
    if (!this.indexTerms) return;
    
    const normalizedQuery = query.toLowerCase().trim();
    const suggestions = [];
    
    // Exact matches first
    const exactMatches = this.indexTerms.filter(term => 
      term.toLowerCase().startsWith(normalizedQuery)
    ).slice(0, 4);
    
    // Partial matches
    const partialMatches = this.indexTerms.filter(term => 
      term.toLowerCase().includes(normalizedQuery) && 
      !term.toLowerCase().startsWith(normalizedQuery)
    ).slice(0, 4);
    
    this.suggestions = [...exactMatches, ...partialMatches]
      .slice(0, this.options.maxSuggestions);
    
    if (this.suggestions.length > 0) {
      this.renderSuggestions();
      this.showSuggestions();
    } else {
      this.hideSuggestions();
    }
  }
  
  renderSuggestions() {
    this.suggestionsEl.innerHTML = this.suggestions
      .map((suggestion, index) => `
        <div class="search-suggestion" data-index="${index}" data-value="${suggestion}">
          <span class="font-medium">${this.highlightMatch(suggestion, this.input.value)}</span>
        </div>
      `).join('');
    
    // Bind click events
    this.suggestionsEl.querySelectorAll('.search-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        this.selectSuggestion(el.dataset.value);
      });
    });
  }
  
  highlightMatch(text, query) {
    const normalizedQuery = query.toLowerCase();
    const index = text.toLowerCase().indexOf(normalizedQuery);
    
    if (index === -1) return text;
    
    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);
    
    return `${before}<mark class="bg-primary-500/30 text-primary-200">${match}</mark>${after}`;
  }
  
  selectSuggestion(value) {
    this.input.value = value;
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.hideSuggestions();
    this.input.focus();
  }
  
  showSuggestions() {
    this.suggestionsEl.classList.remove('hidden');
    this.suggestionsEl.classList.add('animate-slide-down');
    this.isOpen = true;
  }
  
  hideSuggestions() {
    this.suggestionsEl.classList.add('hidden');
    this.suggestionsEl.classList.remove('animate-slide-down');
    this.isOpen = false;
  }
  
  handleKeyDown(e) {
    if (!this.isOpen) return;
    
    const suggestions = this.suggestionsEl.querySelectorAll('.search-suggestion');
    let selectedIndex = Array.from(suggestions).findIndex(el => el.classList.contains('selected'));
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        this.updateSelection(suggestions, selectedIndex);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        this.updateSelection(suggestions, selectedIndex);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          this.selectSuggestion(suggestions[selectedIndex].dataset.value);
        }
        break;
        
      case 'Escape':
        this.hideSuggestions();
        break;
    }
  }
  
  updateSelection(suggestions, selectedIndex) {
    suggestions.forEach((el, index) => {
      el.classList.toggle('selected', index === selectedIndex);
      el.classList.toggle('bg-dark-300/50', index === selectedIndex);
    });
  }
  
  addFilter(filterValue, filterLabel) {
    if (this.filters.has(filterValue)) return;
    
    this.filters.add(filterValue);
    
    const filterChip = document.createElement('div');
    filterChip.className = 'inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-200 rounded-full text-xs';
    filterChip.innerHTML = `
      <span>${filterLabel || filterValue}</span>
      <button class="hover:text-primary-100" data-filter="${filterValue}">
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
        </svg>
      </button>
    `;
    
    filterChip.querySelector('button').addEventListener('click', (e) => {
      this.removeFilter(e.target.dataset.filter);
      filterChip.remove();
    });
    
    this.filtersEl.appendChild(filterChip);
  }
  
  removeFilter(filterValue) {
    this.filters.delete(filterValue);
  }
  
  getActiveFilters() {
    return Array.from(this.filters);
  }
}

// Initialize advanced search
export function initAdvancedSearch(inputElement) {
  return new AdvancedSearch(inputElement, {
    minLength: 2,
    debounceMs: 200,
    maxSuggestions: 6,
    enableFilters: true
  });
}