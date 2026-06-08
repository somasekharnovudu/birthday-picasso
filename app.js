// Target Birthday: June 13, 2026 00:00:00
const TARGET_DATE = new Date('June 13, 2026 00:00:00').getTime();

// State management
let isBirthdayMode = false;
let audioContext = null;
let isMusicPlaying = false;
let musicIntervalId = null;
let currentNoteIndex = 0;
let totalCandles = 25;
let blownOutCount = 0;

// Happy Birthday Melody in Scientific Pitch Notation (Hz)
// Note frequencies
const NOTES = {
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'Bb4': 466.16,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00
};

// Happy Birthday Sheet Music: [NoteName, DurationInBeats]
const MELODY = [
  ['C4', 0.75], ['C4', 0.25], ['D4', 1.0], ['C4', 1.0], ['F4', 1.0], ['E4', 2.0],
  ['C4', 0.75], ['C4', 0.25], ['D4', 1.0], ['C4', 1.0], ['G4', 1.0], ['F4', 2.0],
  ['C4', 0.75], ['C4', 0.25], ['C5', 1.0], ['A4', 1.0], ['F4', 1.0], ['E4', 1.0], ['D4', 2.0],
  ['Bb4', 0.75], ['Bb4', 0.25], ['A4', 1.0], ['F4', 1.0], ['G4', 1.0], ['F4', 2.0],
  // Rest
  [null, 1.0]
];

const TEMPO_BPM = 110;
const BEAT_DURATION = 60 / TEMPO_BPM; // Duration of 1 beat in seconds

// Initialize UI elements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initCandles();
  initLetter();
  initMusicControls();
  initScrollAnimations();
  
  // Set initial scroll hint visibility
  window.addEventListener('scroll', () => {
    const scrollHint = document.getElementById('scroll-hint');
    if (scrollHint) {
      if (window.scrollY > 100) {
        scrollHint.style.opacity = '0';
        scrollHint.style.pointerEvents = 'none';
      } else {
        scrollHint.style.opacity = '1';
        scrollHint.style.pointerEvents = 'auto';
      }
    }
  });
});

// COUNTDOWN TIMER LOGIC
function initCountdown() {
  const countdownContainer = document.getElementById('countdown-container');
  const celebrationContainer = document.getElementById('celebration-container');
  const dVal = document.getElementById('days');
  const hVal = document.getElementById('hours');
  const mVal = document.getElementById('minutes');
  const sVal = document.getElementById('seconds');
  
  function updateTimer() {
    const now = new Date().getTime();
    const difference = TARGET_DATE - now;
    
    if (difference <= 0) {
      // It's June 13, 2026!
      isBirthdayMode = true;
      if (countdownContainer) countdownContainer.classList.add('hidden');
      if (celebrationContainer) celebrationContainer.classList.remove('hidden');
      
      // Auto explode confetti when landing on the page if it's already her birthday
      if (!window.hasAutoConfettiRun) {
        triggerConfettiBurst(0.5);
        window.hasAutoConfettiRun = true;
      }
    } else {
      isBirthdayMode = false;
      if (countdownContainer) countdownContainer.classList.remove('hidden');
      if (celebrationContainer) celebrationContainer.classList.add('hidden');
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      if (dVal) dVal.textContent = String(days).padStart(2, '0');
      if (hVal) hVal.textContent = String(hours).padStart(2, '0');
      if (mVal) mVal.textContent = String(minutes).padStart(2, '0');
      if (sVal) sVal.textContent = String(seconds).padStart(2, '0');
    }
  }
  
  updateTimer();
  setInterval(updateTimer, 1000);
}

// MUSIC SYNTHESIZER (Web Audio API)
function initMusicControls() {
  const musicToggle = document.getElementById('music-toggle');
  const musicStatusText = document.getElementById('music-status-text');
  const audioBars = document.querySelectorAll('.bar');
  
  if (!musicToggle) return;
  
  musicToggle.addEventListener('click', () => {
    // Lazy initialize AudioContext
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    if (isMusicPlaying) {
      pauseMusic();
      musicToggle.innerHTML = `
        <svg class="w-6 h-6 text-gold" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
      `;
      musicStatusText.textContent = "Music Paused";
      audioBars.forEach(b => b.style.animationPlayState = 'paused');
    } else {
      playMusic();
      musicToggle.innerHTML = `
        <svg class="w-6 h-6 text-gold" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
        </svg>
      `;
      musicStatusText.textContent = "Playing Happy Birthday...";
      audioBars.forEach(b => b.style.animationPlayState = 'running');
    }
  });
}

function playMusic() {
  isMusicPlaying = true;
  currentNoteIndex = 0;
  
  function playNextNote() {
    if (!isMusicPlaying) return;
    
    const [noteName, durationBeats] = MELODY[currentNoteIndex];
    const durationSeconds = durationBeats * BEAT_DURATION;
    
    if (noteName) {
      synthesizeTone(NOTES[noteName], durationSeconds);
    }
    
    currentNoteIndex = (currentNoteIndex + 1) % MELODY.length;
    
    // Schedule the next note
    musicIntervalId = setTimeout(playNextNote, durationSeconds * 1000);
  }
  
  playNextNote();
}

function pauseMusic() {
  isMusicPlaying = false;
  if (musicIntervalId) {
    clearTimeout(musicIntervalId);
    musicIntervalId = null;
  }
}

// Synthesize a retro music box/chiptune sound using oscillator nodes
function synthesizeTone(frequency, duration) {
  if (!audioContext) return;
  
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filterNode = audioContext.createBiquadFilter();
  
  // Triangle wave gives a soft, flute-like or music-box-like retro tone
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
  // Lowpass filter to make it sound warm and cozy
  filterNode.type = 'lowpass';
  filterNode.frequency.setValueAtTime(1200, audioContext.currentTime);
  
  // Custom envelope (Attack-Decay-Sustain-Release) for a plucky music box sound
  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.03); // Attack
  gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.25); // Decay
  gainNode.gain.setValueAtTime(0.12, now + duration - 0.08); // Sustain
  gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release
  
  // Connect graph
  osc.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  osc.start(now);
  osc.stop(now + duration);
}

// Plays a small synthesized "puff/blow" noise when a candle is extinguished
function synthesizeBlowSound() {
  if (!audioContext) return;
  
  const bufferSize = audioContext.sampleRate * 0.15; // 0.15 seconds
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Fill the buffer with white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseNode = audioContext.createBufferSource();
  noiseNode.buffer = buffer;
  
  const filterNode = audioContext.createBiquadFilter();
  filterNode.type = 'bandpass';
  filterNode.frequency.setValueAtTime(300, audioContext.currentTime);
  filterNode.Q.setValueAtTime(3.0, audioContext.currentTime);
  
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
  
  noiseNode.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  noiseNode.start();
}

// Plays a synthesized cute "bell/chime" sound when the card/envelope is opened
function synthesizeChimeSound() {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
  notes.forEach((freq, idx) => {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
    
    gainNode.gain.setValueAtTime(0, now + idx * 0.08);
    gainNode.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
    
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.4);
  });
}

// CANDLE BLOW OUT GAME LOGIC
function initCandles() {
  const candlesGrid = document.getElementById('candles-grid');
  const makeWishBtn = document.getElementById('make-wish-btn');
  const wishesSection = document.getElementById('wishes-section');
  
  if (!candlesGrid) return;
  
  // Programmatically spawn 25 candles inside the grid
  for (let i = 1; i <= totalCandles; i++) {
    const candleContainer = document.createElement('div');
    candleContainer.className = 'candle relative flex flex-col items-center justify-end h-28 cursor-pointer select-none';
    candleContainer.dataset.id = i;
    
    candleContainer.innerHTML = `
      <!-- Flame -->
      <div class="flame relative z-10"></div>
      <div class="candle-glow"></div>
      <!-- Candle Body -->
      <div class="w-4 h-16 rounded-t-sm shadow-md transition-all duration-300 relative border border-white/10" 
           style="background: linear-gradient(to right, ${i % 2 === 0 ? '#ff758f, #ff7b97' : '#8e5bf5, #9c6df7'});">
           <!-- Decorative stripes -->
           <div class="absolute inset-0 bg-repeat bg-gradient-to-tr from-white/10 to-transparent opacity-40"></div>
      </div>
      <!-- Candle Stand / base -->
      <div class="w-6 h-2 bg-yellow-600/30 rounded-full blur-[1px]"></div>
      <!-- Smoke effect placeholder -->
      <div class="smoke"></div>
      <!-- Candle Number inside subtle tag -->
      <span class="text-[9px] text-white/40 mt-1 font-mono">${i}</span>
    `;
    
    // Add Click Interaction to Blow Out Candle
    candleContainer.addEventListener('click', () => {
      if (!candleContainer.classList.contains('blown-out')) {
        blowOutCandle(candleContainer);
      }
    });
    
    candlesGrid.appendChild(candleContainer);
  }
  
  // Make Wish Button (Blows out all candles sequentially)
  if (makeWishBtn) {
    makeWishBtn.addEventListener('click', () => {
      const activeCandles = Array.from(document.querySelectorAll('.candle:not(.blown-out)'));
      if (activeCandles.length === 0) {
        // All already blown out, trigger big confetti
        triggerConfettiBurst(1.0);
        return;
      }
      
      // Auto initialize AudioContext if not done yet
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      makeWishBtn.disabled = true;
      makeWishBtn.textContent = "Blowing...";
      
      // Sequence blowouts
      activeCandles.forEach((candle, idx) => {
        setTimeout(() => {
          blowOutCandle(candle);
          if (idx === activeCandles.length - 1) {
            makeWishBtn.textContent = "Wish Made! ✨";
            makeWishBtn.classList.remove('bg-gold-glow', 'text-gold');
            makeWishBtn.classList.add('bg-green-600', 'text-white');
          }
        }, idx * 120);
      });
    });
  }
}

function blowOutCandle(candleElement) {
  candleElement.classList.add('blown-out');
  blownOutCount++;
  
  // Lazy initialize AudioContext for noise effect
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  synthesizeBlowSound();
  
  // Small spark confetti at the candle's position
  const rect = candleElement.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = rect.top / window.innerHeight;
  
  if (window.confetti) {
    window.confetti({
      particleCount: 8,
      spread: 30,
      origin: { x, y },
      colors: ['#e5c07b', '#f07297', '#8e5bf5', '#ffffff'],
      scale: 0.8
    });
  }
  
  // Update status text
  const statusElement = document.getElementById('candles-status');
  if (statusElement) {
    const remaining = totalCandles - blownOutCount;
    if (remaining > 0) {
      statusElement.innerHTML = `<span class="text-rose font-semibold">${remaining}</span> candles left to blow out!`;
    } else {
      statusElement.innerHTML = `✨ <span class="text-gold font-semibold font-serif">All 25 candles blown out!</span> Make a wish! ✨`;
      triggerGrandCelebration();
    }
  }
}

// TRIGGER THE GRAND FINALE
function triggerGrandCelebration() {
  triggerConfettiBurst(1.0);
  
  // Reveal the hidden wishes and envelope sections smoothly
  const lockedSections = document.querySelectorAll('.locked-until-wish');
  lockedSections.forEach(section => {
    section.classList.remove('hidden');
    section.classList.add('animate-fade-in');
    
    // Smooth scroll to the unlocked letter
    setTimeout(() => {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
  });
}

// ENVELOPE / CARD LOGIC
function initLetter() {
  const envelopeWrapper = document.querySelector('.envelope-wrapper');
  
  if (!envelopeWrapper) return;
  
  envelopeWrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Auto initialize AudioContext if not done yet
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const isOpen = envelopeWrapper.classList.contains('open');
    if (!isOpen) {
      envelopeWrapper.classList.add('open');
      synthesizeChimeSound();
      
      // Spray confetti from bottom corners
      if (window.confetti) {
        window.confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 }
        });
        window.confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 }
        });
      }
    } else {
      envelopeWrapper.classList.remove('open');
    }
  });
}

// CONFETTI EFFECTS (using canvas-confetti)
function triggerConfettiBurst(intensity = 0.5) {
  if (!window.confetti) return;
  
  const duration = 3 * 1000 * intensity;
  const end = Date.now() + duration;
  
  (function frame() {
    window.confetti({
      particleCount: Math.ceil(3 * intensity),
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    window.confetti({
      particleCount: Math.ceil(3 * intensity),
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });
    
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}

// SCROLL ANIMATIONS (Intersection Observer)
function initScrollAnimations() {
  const elements = document.querySelectorAll('.scroll-reveal');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // If it's a flip card, we can auto-flip it temporarily to grab attention
        if (entry.target.classList.contains('flip-card')) {
          setTimeout(() => {
            entry.target.classList.add('active');
            setTimeout(() => {
              entry.target.classList.remove('active');
            }, 1200);
          }, 400);
        }
        observer.unobserve(entry.target); // Trigger once
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });
  
  elements.forEach(el => observer.observe(el));
}
