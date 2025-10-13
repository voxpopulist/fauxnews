var c={createFallbackCard(n,t){let e=document.createElement("article");e.className="card android-safe-card",e.style.cssText=`
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      display: block;
      box-sizing: border-box;
    `;let r=document.createElement("h3");r.textContent=n.speaker,r.style.cssText="color: #f1f5f9; margin: 0 0 8px 0; font-size: 18px;";let o=document.createElement("p");o.textContent=n.filename,o.style.cssText="color: #94a3b8; margin: 0 0 12px 0; font-size: 12px;";let a=document.createElement("audio");a.className="card__player android-audio",a.controls=!0,a.preload="none",a.src=t(n.mp3Src),a.style.cssText="width: 100%; margin-bottom: 12px;";let i=document.createElement("a");return i.href=t(n.flacSrc),i.textContent="Download FLAC",i.style.cssText="color: #60a5fa; text-decoration: none;",e.appendChild(r),e.appendChild(o),e.appendChild(a),e.appendChild(i),e},renderCardsSimple(n,t,e){if(!t||!n)return;for(;t.firstChild;)t.removeChild(t.firstChild);let r=document.createDocumentFragment();n.forEach((o,a)=>{if(a>20)return;let i=this.createFallbackCard(o,e);r.appendChild(i)}),t.appendChild(r)},implementSafeSearch(n,t,e,r){if(!t||!e)return;let o=()=>{let a=t.value.toLowerCase().trim(),i=n;a&&(i=n.filter(s=>`${s.speaker} ${s.filename}`.toLowerCase().includes(a))),this.renderCardsSimple(i,e,r);let d=document.getElementById("resultsCount");d&&(d.textContent=`${i.length} result${i.length===1?"":"s"}`)};t.addEventListener("input",o),o()},shouldUseFallbacks(){let n=/Android/i.test(navigator.userAgent),t=/Chrome\/([0-9]+)/.test(navigator.userAgent)&&parseInt(RegExp.$1)<80,e=!window.IntersectionObserver||!window.fetch||!Element.prototype.replaceChildren;return n&&(t||e)},initFallbacks(n,t){console.log("Initializing Android fallback mode");let e=document.getElementById("search"),r=document.getElementById("results");e&&r&&n&&this.implementSafeSearch(n,e,r,t);let o=document.createElement("style");o.textContent=`
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
    `,document.head.appendChild(o)}};export{c as AndroidFallbacks};
