#!/usr/bin/env node
/**
 * Generate Open Graph image for social media previews
 * Creates a 1200×630 PNG with branding and tagline
 */

import { writeFileSync } from 'fs';
import { createCanvas } from 'canvas';

const WIDTH = 1200;
const HEIGHT = 630;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Dark gradient background matching site theme
const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
gradient.addColorStop(0, '#1e293b'); // dark-600
gradient.addColorStop(0.5, '#0f172a'); // dark-700
gradient.addColorStop(1, '#334155'); // dark-500
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Add subtle pattern/texture
ctx.fillStyle = 'rgba(51, 65, 85, 0.3)';
for (let i = 0; i < 100; i++) {
  const x = Math.random() * WIDTH;
  const y = Math.random() * HEIGHT;
  const size = Math.random() * 3;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}

// Add accent gradient overlay
const accentGradient = ctx.createRadialGradient(300, 315, 0, 300, 315, 600);
accentGradient.addColorStop(0, 'rgba(56, 189, 248, 0.15)'); // primary-400
accentGradient.addColorStop(1, 'transparent');
ctx.fillStyle = accentGradient;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Draw icon/logo circle
const iconX = 150;
const iconY = 200;
const iconRadius = 70;

// Gradient for icon
const iconGradient = ctx.createLinearGradient(
  iconX - iconRadius, iconY - iconRadius,
  iconX + iconRadius, iconY + iconRadius
);
iconGradient.addColorStop(0, '#38bdf8'); // primary-400
iconGradient.addColorStop(1, '#0284c7'); // primary-600
ctx.fillStyle = iconGradient;
ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
ctx.shadowBlur = 30;
ctx.beginPath();
ctx.arc(iconX, iconY, iconRadius, 0, Math.PI * 2);
ctx.fill();
ctx.shadowBlur = 0;

// Draw microphone/audio icon (simplified)
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 6;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Microphone body
ctx.beginPath();
ctx.moveTo(iconX - 15, iconY - 30);
ctx.lineTo(iconX - 15, iconY);
ctx.lineTo(iconX + 15, iconY);
ctx.lineTo(iconX + 15, iconY - 30);
ctx.closePath();
ctx.stroke();

// Microphone base
ctx.beginPath();
ctx.moveTo(iconX - 25, iconY + 15);
ctx.lineTo(iconX + 25, iconY + 15);
ctx.stroke();

ctx.beginPath();
ctx.moveTo(iconX, iconY);
ctx.lineTo(iconX, iconY + 15);
ctx.stroke();

// Main title
ctx.fillStyle = '#f1f5f9'; // dark-50
ctx.font = 'bold 72px Inter, -apple-system, sans-serif';
ctx.textBaseline = 'top';
ctx.fillText('Faux News', 300, 120);

// "from Vox Populist" subtitle
ctx.fillStyle = '#94a3b8'; // dark-100
ctx.font = '500 40px Inter, -apple-system, sans-serif';
ctx.fillText('from Vox Populist', 300, 210);

// Tagline with gradient
const taglineGradient = ctx.createLinearGradient(300, 310, 900, 310);
taglineGradient.addColorStop(0, '#38bdf8');
taglineGradient.addColorStop(1, '#10b981');
ctx.fillStyle = taglineGradient;
ctx.font = 'bold 48px Inter, -apple-system, sans-serif';
ctx.fillText('Make Audio Great Again', 300, 310);

// Description
ctx.fillStyle = '#cbd5e1'; // dark-200
ctx.font = '32px Inter, -apple-system, sans-serif';
const desc1 = 'Searchable audio clips & AI transcripts';
const desc2 = 'from right-wing media';
ctx.fillText(desc1, 300, 410);
ctx.fillText(desc2, 300, 455);

// Warning badge
const badgeX = 300;
const badgeY = 540;
const badgeWidth = 550;
const badgeHeight = 60;

// Badge background with gradient
const badgeGradient = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeWidth, badgeY);
badgeGradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)'); // red
badgeGradient.addColorStop(1, 'rgba(251, 146, 60, 0.2)'); // orange
ctx.fillStyle = badgeGradient;
ctx.beginPath();
ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 12);
ctx.fill();

// Badge border
ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
ctx.lineWidth = 2;
ctx.stroke();

// Badge text
ctx.fillStyle = '#fca5a5'; // red-300
ctx.font = 'bold 28px Inter, -apple-system, sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('⚠️  May cause extreme facepalming', badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

// Reset text alignment
ctx.textAlign = 'left';

// URL at bottom
ctx.fillStyle = '#64748b'; // dark-400
ctx.font = '24px Inter, monospace, sans-serif';
ctx.fillText('voxpopulist.github.io/clipservatives', 50, HEIGHT - 50);

// Output the image
const buffer = canvas.toBuffer('image/png');
writeFileSync('og-image.png', buffer);
console.log('✅ Generated og-image.png (1200×630)');
