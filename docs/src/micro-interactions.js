// Micro-interactions and animations for enhanced UX
export class MicroInteractions {
  constructor() {
    this.init();
  }
  
  init() {
    this.setupScrollAnimations();
    this.setupHoverEffects();
    this.setupClickFeedback();
    this.setupLoadingStates();
    this.setupTooltips();
  }
  
  setupScrollAnimations() {
    // Skip scroll animations on Android for immediate card display
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      // On Android, show cards immediately without animation
      const selectors = '.card, .card-audio, .tag-item, .glass-panel';
      const elements = Array.from(document.querySelectorAll(selectors));
      const reveal = (el) => {
        el.classList.remove('animate-on-scroll');
        el.classList.add('in-view');
      };
      elements.forEach(reveal);

      // Also reveal any elements added later (e.g., infinite scroll)
      const container = document.getElementById('results');
      if (container && 'MutationObserver' in window) {
        const mo = new MutationObserver((mutationList) => {
          mutationList.forEach(m => {
            if (!m.addedNodes) return;
            Array.from(m.addedNodes).forEach(node => {
              if (!(node instanceof HTMLElement)) return;
              const targets = (node.matches && node.matches(selectors))
                ? [node]
                : Array.from(node.querySelectorAll?.(selectors) || []);
              targets.forEach(reveal);
            });
          });
        });
        mo.observe(container, { childList: true, subtree: true });
      }
      return;
    }

    // Desktop/iOS: Use intersection observer for smooth animations
    const selectors = '.card, .card-audio, .tag-item, .glass-panel';
    const elements = Array.from(document.querySelectorAll(selectors));
    
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            // Add staggered animation delay for multiple elements
            const siblings = entry.target.parentNode ? Array.from(entry.target.parentNode.children) : [];
            const delay = Math.max(0, siblings.indexOf(entry.target)) * 100;
            entry.target.style.animationDelay = `${delay}ms`;
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });
      
      // Observe all cards and other animatable elements present initially
      elements.forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
        // Safety: if already in viewport on first paint, reveal immediately
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('in-view');
        }
      });

      // Also observe dynamically added cards (rendered after initial load)
      const container = document.getElementById('results');
      if (container && 'MutationObserver' in window) {
        const mo = new MutationObserver((mutationList) => {
          mutationList.forEach(m => {
            m.addedNodes && Array.from(m.addedNodes).forEach(node => {
              if (!(node instanceof HTMLElement)) return;
              // Register the node if it matches or contains matching elements
              const targets = node.matches && node.matches('.card, .card-audio, .tag-item, .glass-panel')
                ? [node]
                : Array.from(node.querySelectorAll?.('.card, .card-audio, .tag-item, .glass-panel') || []);
              targets.forEach(t => {
                if (isAndroid) {
                  t.classList.remove('animate-on-scroll');
                  t.classList.add('in-view');
                } else {
                  t.classList.add('animate-on-scroll');
                  observer.observe(t);
                  const r = t.getBoundingClientRect();
                  if (r.top < window.innerHeight && r.bottom > 0) {
                    t.classList.add('in-view');
                  }
                }
              });
            });
          });
        });
        mo.observe(container, { childList: true, subtree: true });
      }
    } else {
      // Fallback: reveal immediately if IO not supported
      elements.forEach(el => {
        el.classList.add('in-view');
        el.classList.remove('animate-on-scroll');
      });
    }
  }
  
  setupHoverEffects() {
    // Use pure CSS hover states to avoid flicker caused by mouseover/mouseout bubbling.
    // Card and button components already include Tailwind hover styles.
    // No JS hover handlers are needed.
  }
  
  setupClickFeedback() {
    document.addEventListener('click', (e) => {
      const clickable = e.target.closest('button, .tag-item, a');
      if (clickable) {
        this.addClickAnimation(clickable, e);
      }
    });
  }
  
  addRippleEffect(element, event) {
    const ripple = document.createElement('div');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(56, 189, 248, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
      z-index: 1;
    `;
    
    if (!element.style.position || element.style.position === 'static') {
      element.style.position = 'relative';
    }
    element.style.overflow = 'hidden';
    
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  }
  
  addClickAnimation(element, event) {
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
      element.style.transform = '';
    }, 150);
    
    // Add ripple effect for certain elements
    if (element.classList.contains('btn-primary') || element.classList.contains('tag-item')) {
      this.addRippleEffect(element, event);
    }
  }
  
  setupLoadingStates() {
    // Enhanced loading states for audio and search
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const loadingEl = this.showLoadingIndicator();
      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        setTimeout(() => this.hideLoadingIndicator(loadingEl), 200);
      }
    };
  }
  
  showLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'fixed top-4 right-4 z-50 flex items-center gap-2 bg-dark-400 border border-dark-200/40 rounded-lg px-4 py-2 shadow-lg animate-slide-down';
    indicator.innerHTML = `
      <div class="loading-spinner"></div>
      <span class="text-sm text-dark-100">Loading...</span>
    `;
    
    document.body.appendChild(indicator);
    return indicator;
  }
  
  hideLoadingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => indicator.remove(), 300);
    }
  }
  
  setupTooltips() {
    // Simple tooltip system
    document.addEventListener('mouseover', (e) => {
      const element = e.target.closest('[data-tooltip]');
      if (element) {
        this.showTooltip(element, element.dataset.tooltip);
      }
    });
    
    document.addEventListener('mouseout', (e) => {
      const element = e.target.closest('[data-tooltip]');
      if (element) {
        this.hideTooltip();
      }
    });
  }
  
  showTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'fixed z-50 px-2 py-1 text-xs bg-dark-300 text-dark-50 rounded shadow-lg animate-fade-in pointer-events-none';
    tooltip.textContent = text;
    tooltip.id = 'tooltip';
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = rect.left + (rect.width - tooltipRect.width) / 2;
    let top = rect.top - tooltipRect.height - 8;
    
    // Adjust if tooltip goes off screen
    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8;
    }
    if (top < 8) top = rect.bottom + 8;
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
  
  hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }
  
  // Utility methods for programmatic animations
  animateValue(element, property, from, to, duration = 300) {
    const start = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeOutCubic(progress);
      const value = from + (to - from) * eased;
      
      element.style[property] = `${value}px`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }
  
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  
  // Performance-optimized debounce
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Add CSS animations dynamically
  addCSSAnimation(name, keyframes) {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${name} {
        ${keyframes}
      }
    `;
    document.head.appendChild(style);
  }
}

// Mobile-specific enhancements
export class MobileEnhancements {
  constructor() {
    this.isMobile = window.innerWidth < 768;
    this.init();
  }
  
  init() {
    if (this.isMobile) {
      this.setupTouchInteractions();
      this.setupMobileNavigation();
      this.optimizeForMobile();
    }
    
    this.setupResponsiveHandling();
  }
  
  setupTouchInteractions() {
    // Enhanced touch feedback
    document.addEventListener('touchstart', (e) => {
      const touchable = e.target.closest('button, .tag-item, .card-audio');
      if (touchable) {
        touchable.classList.add('touch-active');
      }
    });
    
    document.addEventListener('touchend', (e) => {
      const touchable = e.target.closest('button, .tag-item, .card-audio');
      if (touchable) {
        touchable.classList.remove('touch-active');
      }
    });
    
    // Prevent double-tap zoom on buttons
    document.addEventListener('touchend', (e) => {
      const button = e.target.closest('button');
      if (button) {
        e.preventDefault();
        button.click();
      }
    }, { passive: false });
  }
  
  setupMobileNavigation() {
    // Add mobile-specific navigation if needed
    if (this.isMobile) {
      document.body.classList.add('mobile-layout');
    }
  }
  
  optimizeForMobile() {
    // Reduce motion for mobile if preferred
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.classList.add('reduce-motion');
    }
    
    // Optimize scroll performance
    document.body.style.overscrollBehavior = 'contain';
  }
  
  setupResponsiveHandling() {
    const handleResize = this.debounce(() => {
      this.isMobile = window.innerWidth < 768;
      document.body.classList.toggle('mobile-layout', this.isMobile);
    }, 150);
    
    window.addEventListener('resize', handleResize);
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize micro-interactions
export function initMicroInteractions() {
  new MicroInteractions();
  new MobileEnhancements();
  
  // Add required CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
    
    @keyframes fadeOut {
      to {
        opacity: 0;
        transform: translateY(-10px);
      }
    }
    
    .touch-active {
      transform: scale(0.95);
      transition: transform 0.1s ease-out;
    }
    
    .reduce-motion * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  `;
  document.head.appendChild(style);
}