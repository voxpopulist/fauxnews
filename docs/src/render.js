// Enhanced card rendering with modern design
export function createCard(doc, {siteUrl, observeCard, wireAudioPlayer, wireTranscript}) {
  const article = document.createElement('article');
  // Add legacy 'card' class for test compatibility
  article.className = 'group relative bg-gradient-to-br from-dark-400/90 to-dark-500/90 backdrop-blur-sm border border-dark-200/20 rounded-2xl p-6 hover:border-primary-400/30 transition-all duration-500 hover:transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary-500/10 animate-on-scroll card';
  article.dataset.transcriptSrc = doc.transcriptSrc || '';
  article.dataset.transcriptType = (doc.transcriptSrc && doc.transcriptSrc.endsWith('.txt')) ? 'txt' : 'vtt';

  // Gradient overlay
  const overlay = document.createElement('div');
  overlay.className = 'absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none';
  article.appendChild(overlay);

  // Header with speaker info
  const header = document.createElement('header');
  header.className = 'relative z-10 mb-6';
  
  const speakerBadge = document.createElement('div');
  speakerBadge.className = 'inline-flex items-center gap-2 mb-3';
  
  const avatar = document.createElement('div');
  avatar.className = 'w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg';
  avatar.textContent = doc.speaker.charAt(0).toUpperCase();
  
  const speakerInfo = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.className = 'text-xl font-bold text-dark-50 group-hover:text-primary-200 transition-colors duration-300';
  h2.textContent = doc.speaker;
  
  const timestamp = document.createElement('p');
  timestamp.className = 'text-xs text-dark-100 font-mono bg-dark-300/30 px-2 py-1 rounded-md inline-block';
  timestamp.textContent = doc.filename;
  
  speakerInfo.appendChild(h2);
  speakerInfo.appendChild(timestamp);
  speakerBadge.appendChild(avatar);
  speakerBadge.appendChild(speakerInfo);
  header.appendChild(speakerBadge);

  // Enhanced audio player container
  const audioSection = document.createElement('div');
  audioSection.className = 'relative mb-6 bg-dark-300/20 rounded-xl p-4 border border-dark-200/10';
  
  const audioContainer = document.createElement('div');
  audioContainer.className = 'relative';
  
  const audio = document.createElement('audio');
  // Add legacy 'card__player' class for test compatibility
  audio.className = 'w-full rounded-lg card__player';
  audio.controls = true;
  audio.setAttribute('preload', 'none');
  audio.dataset.src = siteUrl(doc.mp3Src);
  audio.dataset.downloadUrl = siteUrl(doc.flacSrc);
  audio.dataset.filename = doc.filename;
  
  // Audio quality indicator
  const qualityBadge = document.createElement('div');
  qualityBadge.className = 'absolute top-2 right-2 bg-accent-emerald/20 text-accent-emerald text-xs px-2 py-1 rounded-full font-medium';
  qualityBadge.textContent = 'HD Audio';
  
  audioContainer.appendChild(audio);
  audioContainer.appendChild(qualityBadge);
  audioSection.appendChild(audioContainer);

  // Action buttons with better styling
  const actions = document.createElement('div');
  actions.className = 'flex items-center justify-start mb-6';
  
  const downloadBtn = document.createElement('a');
  downloadBtn.className = 'inline-flex items-center gap-2 bg-gradient-to-r from-dark-300/80 to-dark-200/80 hover:from-primary-500/20 hover:to-primary-400/20 text-dark-50 hover:text-primary-200 font-medium py-2.5 px-4 rounded-lg transition-all duration-300 border border-dark-200/20 hover:border-primary-400/30';
  downloadBtn.href = siteUrl(doc.flacSrc);
  downloadBtn.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
    </svg>
    Download FLAC
  `;
  downloadBtn.setAttribute('data-tooltip', 'Download high-quality FLAC audio');
  
  actions.appendChild(downloadBtn);

  // Always-visible transcript section
  const transcriptSection = document.createElement('div');
  transcriptSection.className = 'mt-6';
  transcriptSection.dataset.transcriptSrc = doc.transcriptSrc || '';
  transcriptSection.dataset.transcriptType = (doc.transcriptSrc && doc.transcriptSrc.endsWith('.txt')) ? 'txt' : 'vtt';
  transcriptSection.dataset.loaded = '0';
  
  const transcriptHeader = document.createElement('div');
  transcriptHeader.className = 'flex items-center gap-2 mb-4';
  
  const transcriptIcon = document.createElement('svg');
  transcriptIcon.className = 'w-4 h-4 text-primary-400';
  transcriptIcon.setAttribute('fill', 'none');
  transcriptIcon.setAttribute('stroke', 'currentColor');
  transcriptIcon.setAttribute('viewBox', '0 0 24 24');
  transcriptIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>';
  
  const transcriptTitle = document.createElement('h3');
  transcriptTitle.className = 'text-lg font-semibold text-primary-400';
  transcriptTitle.textContent = 'Transcript';
  
  transcriptHeader.appendChild(transcriptIcon);
  transcriptHeader.appendChild(transcriptTitle);
  
  if (doc.transcriptAvailable) {
    const transcriptContainer = document.createElement('div');
    transcriptContainer.className = 'bg-dark-500/40 backdrop-blur-sm rounded-xl p-6 border border-dark-200/20 max-h-80 overflow-y-auto scrollbar-hide';
    
    const placeholder = document.createElement('div');
    placeholder.className = 'flex items-center justify-center gap-3 py-8 text-dark-100';
    placeholder.innerHTML = `
      <div class="animate-spin w-5 h-5 border-2 border-dark-300 border-t-primary-500 rounded-full"></div>
      <span class="font-medium">Loading transcript...</span>
    `;
    
    transcriptContainer.appendChild(placeholder);
    transcriptSection.appendChild(transcriptHeader);
    transcriptSection.appendChild(transcriptContainer);
  } else {
    const noTranscript = document.createElement('div');
    noTranscript.className = 'text-center py-8 text-dark-100 bg-dark-500/20 rounded-xl border border-dark-200/10';
    noTranscript.innerHTML = `
      <svg class="w-12 h-12 mx-auto mb-3 text-dark-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
      <p class="font-medium">No transcript available</p>
      <p class="text-sm text-dark-200 mt-1">Audio-only content</p>
    `;
    transcriptSection.appendChild(transcriptHeader);
    transcriptSection.appendChild(noTranscript);
  }

  // Assemble the card
  article.appendChild(header);
  article.appendChild(audioSection);
  article.appendChild(actions);
  article.appendChild(transcriptSection);

  // Wire enhanced behaviors
  observeCard(article);
  
  // Enhanced audio player integration
  import('./audio-player.js').then(module => {
    try {
      module.createAdvancedAudioPlayer(audio);
    } catch (err) {
      console.warn('Advanced audio player failed, using fallback:', err);
      wireAudioPlayer(audio);
    }
  }).catch(() => {
    wireAudioPlayer(audio);
  });
  
  wireTranscript(transcriptSection);

  return article;
}
