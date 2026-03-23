/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                   EASTER EGGS — Portfolio                        ║
 * ║  ⭐ Star Wars  :  jedi · sith · vader                           ║
 * ║  🏴‍☠️ One Piece  :  luffy · zoro                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  //  DÉTECTION CLAVIER — corrigée
  //  • utilise keydown (plus fiable que keypress)
  //  • n'accepte que 1 caractère imprimable à la fois
  //  • réinitialise le buffer après 2s d'inactivité
  //  • vide le buffer après chaque déclenchement
  // ═══════════════════════════════════════════════════════════════════
  let keyBuffer   = '';
  let bufferTimer = null;

  const flags = { jedi: false, sith: false, vader: false, luffy: false, zoro: false };

  document.addEventListener('keydown', (e) => {
    // Echap désactive le curseur jedi
    if (e.key === 'Escape' && flags.jedi) { flags.jedi = false; deactivateJedi(); return; }

    // Seulement un caractère imprimable seul (pas Ctrl+A etc.)
    if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

    // Ignorer si focus dans un champ de saisie
    const el = document.activeElement;
    if (['INPUT','TEXTAREA','SELECT'].includes(el.tagName) || el.contentEditable === 'true') return;

    // Timer de réinitialisation : si 2s sans touche → buffer vide
    clearTimeout(bufferTimer);
    bufferTimer = setTimeout(() => { keyBuffer = ''; }, 2000);

    keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-30);

    // Vérification dans l'ordre de priorité
    if      (!flags.jedi  && keyBuffer.endsWith('jedi'))  { flags.jedi  = true;  keyBuffer = ''; activateJedi();  }
    else if ( flags.jedi  && keyBuffer.endsWith('jedi'))  { flags.jedi  = false; keyBuffer = ''; deactivateJedi(); }
    else if (!flags.sith  && keyBuffer.endsWith('sith'))  { flags.sith  = true;  keyBuffer = ''; activateSith();  }
    else if (!flags.vader && keyBuffer.endsWith('vader')) { flags.vader = true;  keyBuffer = ''; activateVader(); }
    else if (!flags.luffy && keyBuffer.endsWith('luffy')) { flags.luffy = true;  keyBuffer = ''; activateLuffy(); }
    else if (!flags.zoro  && keyBuffer.endsWith('zoro'))  { flags.zoro  = true;  keyBuffer = ''; activateZoro();  }
  });

  // ═══════════════════════════════════════════════════════════════════
  //  AUDIO — Web Audio API (aucun fichier externe)
  // ═══════════════════════════════════════════════════════════════════
  let _ctx = null;
  function ac() {
    // eslint-disable-next-line
    if (!_ctx) _ctx = new (window.AudioContext || /** @type {any} */(window).webkitAudioContext)();
    return _ctx;
  }

  /** Son d'allumage du sabre laser */
  function playIgnition(color) {
    try {
      const ctx = ac(), t = ctx.currentTime;
      // Bruit blanc → whoosh
      const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 1.4);
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = color==='red' ? 450 : 720; nf.Q.value = 0.8;
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0.55,t); ng.gain.exponentialRampToValueAtTime(0.001,t+1.5);
      noise.connect(nf); nf.connect(ng); ng.connect(ctx.destination); noise.start(t);
      // Composante tonale
      const osc = ctx.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420,t); osc.frequency.exponentialRampToValueAtTime(color==='red' ? 90 : 145, t+0.7);
      const of2 = ctx.createBiquadFilter(); of2.type = 'lowpass'; of2.frequency.value = 1300;
      const og = ctx.createGain(); og.gain.setValueAtTime(0.28,t); og.gain.linearRampToValueAtTime(0.09,t+1.5);
      osc.connect(of2); of2.connect(og); og.connect(ctx.destination); osc.start(t); osc.stop(t+1.5);
    } catch(_) {}
  }

  /** Son de swing (clic pendant mode jedi) */
  function playSwing() {
    try {
      const ctx = ac(), t = ctx.currentTime;
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(320 + Math.random()*140, t);
      osc.frequency.exponentialRampToValueAtTime(130, t+0.2);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.16,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.2);
      osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+0.2);
    } catch(_) {}
  }

  /** Son d'extinction */
  function playExtinguish() {
    try {
      const ctx = ac(), t = ctx.currentTime;
      const osc = ctx.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(145,t); osc.frequency.exponentialRampToValueAtTime(35,t+0.6);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900,t); f.frequency.exponentialRampToValueAtTime(80,t+0.6);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.22,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.6);
      osc.connect(f); f.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+0.6);
    } catch(_) {}
  }

  /** Respiration de Dark Vador */
  function playVaderBreath(beats) {
    try {
      const ctx = ac(), t = ctx.currentTime;
      for (let i = 0; i < beats; i++) {
        const bt = t + i * 1.35;
        // Inspiration
        const iOsc = ctx.createOscillator(); iOsc.type = 'sawtooth';
        iOsc.frequency.setValueAtTime(85,bt); iOsc.frequency.linearRampToValueAtTime(115,bt+0.55);
        const iF = ctx.createBiquadFilter(); iF.type = 'bandpass'; iF.frequency.value = 650; iF.Q.value = 1.8;
        const iG = ctx.createGain();
        iG.gain.setValueAtTime(0,bt); iG.gain.linearRampToValueAtTime(0.25,bt+0.1);
        iG.gain.linearRampToValueAtTime(0.25,bt+0.45); iG.gain.linearRampToValueAtTime(0,bt+0.62);
        iOsc.connect(iF); iF.connect(iG); iG.connect(ctx.destination); iOsc.start(bt); iOsc.stop(bt+0.65);
        // Expiration
        const eOsc = ctx.createOscillator(); eOsc.type = 'sawtooth';
        eOsc.frequency.setValueAtTime(70,bt+0.68); eOsc.frequency.linearRampToValueAtTime(50,bt+1.22);
        const eF = ctx.createBiquadFilter(); eF.type = 'bandpass'; eF.frequency.value = 500; eF.Q.value = 1.4;
        const eG = ctx.createGain();
        eG.gain.setValueAtTime(0,bt+0.68); eG.gain.linearRampToValueAtTime(0.20,bt+0.78);
        eG.gain.linearRampToValueAtTime(0.20,bt+1.10); eG.gain.linearRampToValueAtTime(0,bt+1.32);
        eOsc.connect(eF); eF.connect(eG); eG.connect(ctx.destination); eOsc.start(bt+0.68); eOsc.stop(bt+1.35);
      }
    } catch(_) {}
  }

  /** Boing élastique (Luffy) */
  function playBoing(offset) {
    try {
      const ctx = ac(), t = ctx.currentTime + (offset||0);
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(70,t);
      osc.frequency.exponentialRampToValueAtTime(420,t+0.12);
      osc.frequency.exponentialRampToValueAtTime(190,t+0.32);
      osc.frequency.exponentialRampToValueAtTime(310,t+0.48);
      osc.frequency.exponentialRampToValueAtTime(240,t+0.65);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.28,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.65);
      osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+0.65);
    } catch(_) {}
  }

  /** Coup d'épée (Zoro) */
  function playSlash(offset) {
    try {
      const ctx = ac(), t = ctx.currentTime + (offset||0);
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate*0.28), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i=0; i<d.length; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/d.length,0.7);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=2200; f.Q.value=0.6;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.45,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.28);
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t);
    } catch(_) {}
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ⭐ JEDI — Curseur Sabre Laser (amélioré)
  // ═══════════════════════════════════════════════════════════════════
  const SABER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="88" viewBox="0 0 28 88">
  <defs>
    <linearGradient id="bH" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#4FC3F7" stop-opacity="0.2"/>
      <stop offset="22%"  stop-color="#81D4FA" stop-opacity="0.75"/>
      <stop offset="50%"  stop-color="white"   stop-opacity="1"/>
      <stop offset="78%"  stop-color="#81D4FA" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#4FC3F7" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="hV" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#1C2B30"/>
      <stop offset="35%"  stop-color="#455A64"/>
      <stop offset="65%"  stop-color="#546E7A"/>
      <stop offset="100%" stop-color="#1C2B30"/>
    </linearGradient>
    <filter id="gw" x="-90%" y="-4%" width="280%" height="108%">
      <feGaussianBlur stdDeviation="2.8" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Aura externe -->
  <rect x="2"  y="2" width="24" height="58" rx="12" fill="#0277BD" opacity="0.15" filter="url(#gw)"/>
  <!-- Aura intermédiaire -->
  <rect x="5"  y="2" width="18" height="58" rx="9"  fill="#29B6F6" opacity="0.38"/>
  <!-- Lueur interne -->
  <rect x="8"  y="2" width="12" height="58" rx="6"  fill="#4FC3F7" opacity="0.66"/>
  <!-- Corps de la lame -->
  <rect x="10" y="2" width="8"  height="58" rx="4"  fill="url(#bH)"/>
  <!-- Âme blanche -->
  <rect x="12" y="2" width="4"  height="58" rx="2"  fill="white" opacity="0.9"/>
  <!-- Pointe -->
  <ellipse cx="14" cy="2" rx="2" ry="2.5" fill="white"/>

  <!-- Collier d'émetteur -->
  <rect x="9"  y="60" width="10" height="2.5" rx="1.25" fill="#607D8B"/>
  <rect x="7"  y="62" width="14" height="2.2" rx="1.1"  fill="#78909C"/>

  <!-- Garde -->
  <rect x="2"  y="64" width="24" height="6.5" rx="3.2"  fill="#455A64"/>
  <rect x="3"  y="64.5" width="22" height="3" rx="1.5"  fill="#607D8B"/>
  <rect x="3"  y="68"   width="22" height="1.5" rx="0.75" fill="#263238" opacity="0.55"/>

  <!-- Haut du manche -->
  <rect x="10" y="70.5" width="8" height="5.5" rx="1.2" fill="url(#hV)"/>
  <!-- Bouton d'activation (rouge, comme dans Star Wars) -->
  <rect x="11.2" y="71.5" width="5.6" height="3" rx="1.5" fill="#B71C1C"/>
  <ellipse cx="14" cy="73" rx="1.5" ry="1.1" fill="#EF5350"/>
  <ellipse cx="14" cy="73" rx="0.7" ry="0.5" fill="#FFCDD2" opacity="0.6"/>

  <!-- Corps du manche avec rainures de préhension -->
  <rect x="10" y="76" width="8" height="10" rx="1.2" fill="url(#hV)"/>
  <rect x="10" y="77.2" width="8" height="1"   rx="0.5" fill="#546E7A"/>
  <rect x="10" y="79.6" width="8" height="1"   rx="0.5" fill="#546E7A"/>
  <rect x="10" y="82"   width="8" height="1"   rx="0.5" fill="#546E7A"/>

  <!-- Pommeau -->
  <rect x="10.5" y="86" width="7" height="2" rx="1"  fill="#37474F"/>
  <ellipse cx="14" cy="88" rx="3" ry="1.2" fill="#455A64"/>
  <circle  cx="14" cy="88" r="1.2" fill="#607D8B"/>
</svg>`;

  let _cursorUrl = null;

  function activateJedi() {
    playIgnition('blue');
    const blob = new Blob([SABER_SVG], { type: 'image/svg+xml' });
    _cursorUrl = URL.createObjectURL(blob);
    const s = document.createElement('style');
    s.id = 'sw-cursor';
    s.textContent = `*, *::before, *::after { cursor: url('${_cursorUrl}') 14 2, crosshair !important; }`;
    document.head.appendChild(s);
    document.addEventListener('mousedown', playSwing);
    showToast('⚡ Mode JEDI activé', 'May the Force be with you<br><small style="color:#555">[Echap] pour désactiver</small>', 'jedi');
  }

  function deactivateJedi() {
    playExtinguish();
    document.getElementById('sw-cursor')?.remove();
    if (_cursorUrl) { URL.revokeObjectURL(_cursorUrl); _cursorUrl = null; }
    document.removeEventListener('mousedown', playSwing);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ⭐ SITH — Découpe diagonale ultra-stylée
  // ═══════════════════════════════════════════════════════════════════
  function activateSith() {
    playIgnition('red');
    showToast('🔴 Côté Obscur détecté', 'La Force est forte en toi...', 'sith');

    setTimeout(() => {
      // 1 – Vignette rouge pulsante
      spawnVignette();
      // 2 – Sabre rouge balaie l'écran
      setTimeout(() => {
        sweepBeam('red', () => {
          killVignette();
          flashScreen('rgba(220,0,0,0.3)', 250);
          setTimeout(() => diagonalCut(), 120);
        });
      }, 500);
    }, 1700);
  }

  function spawnVignette() {
    killVignette();
    kf('sw-vig-in', 'from{opacity:0}to{opacity:1}');
    const v = document.createElement('div');
    v.id = 'sw-vig';
    v.style.cssText = `
      position:fixed;inset:0;pointer-events:none;z-index:2147483620;
      background:radial-gradient(ellipse at center, transparent 35%, rgba(180,0,0,0.55) 100%);
      animation:sw-vig-in 0.55s ease forwards;
    `;
    document.body.appendChild(v);
  }
  function killVignette() { document.getElementById('sw-vig')?.remove(); }

  function flashScreen(color, ms) {
    const f = document.createElement('div');
    f.style.cssText = `position:fixed;inset:0;background:${color};z-index:2147483635;pointer-events:none;transition:opacity ${ms}ms ease;`;
    document.body.appendChild(f);
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity='0'; }));
    setTimeout(() => f.remove(), ms + 60);
  }

  function sweepBeam(color, done) {
    const beam = document.createElement('div');
    const isRed = color === 'red';
    const c1 = isRed ? '#FF2222' : '#4FC3F7';
    beam.style.cssText = `
      position:fixed;top:0;left:0;
      width:16px;height:100vh;
      background:linear-gradient(to right,transparent 0%,${c1}60 15%,${c1} 38%,white 50%,${c1} 62%,${c1}60 85%,transparent 100%);
      box-shadow:0 0 35px ${c1},0 0 80px ${c1}60;
      z-index:2147483647;pointer-events:none;
      transform:translateX(-25px);
      transition:transform 0.33s linear;
    `;
    document.body.appendChild(beam);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      beam.style.transform = `translateX(${window.innerWidth + 30}px)`;
    }));
    setTimeout(() => { beam.remove(); done(); }, 370);
  }

  function spawnSparks() {
    const vw = window.innerWidth, vh = window.innerHeight;
    for (let i = 0; i < 45; i++) {
      const pct = Math.random();
      const x = pct * vw;
      const y = (0.35 + 0.30 * pct) * vh;   // suit la diagonale
      const sz = 2 + Math.random() * 4;
      const dx = (Math.random() - 0.5) * 140;
      const dy = -50 - Math.random() * 110;
      const sp = document.createElement('div');
      sp.style.cssText = `
        position:fixed;left:${x}px;top:${y}px;
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:${Math.random()>0.4?'#FF5555':'#FFAA33'};
        box-shadow:0 0 ${sz+3}px currentColor;
        z-index:2147483644;pointer-events:none;
      `;
      document.body.appendChild(sp);
      const anim = sp.animate(
        [{transform:'translate(0,0) scale(1)',opacity:1},
         {transform:`translate(${dx}px,${dy}px) scale(0)`,opacity:0}],
        {duration: 260 + Math.random()*380, easing:'ease-out', fill:'forwards'}
      );
      anim.onfinish = () => sp.remove();
    }
  }

  function diagonalCut() {
    const scrollY = window.scrollY;
    const vw = window.innerWidth, vh = window.innerHeight;
    // Ligne de coupe : de (0, 35%) à (100%, 65%)
    const topClip = 'polygon(0 0,100% 0,100% 65%,0 35%)';
    const botClip = 'polygon(0 35%,100% 65%,100% 100%,0 100%)';
    const bg = window.getComputedStyle(document.body).backgroundColor || '#0a0a0a';

    // Emballer le contenu original (ignorer les éléments easter egg)
    const wrapper = document.createElement('div');
    wrapper.id = 'sw-wrap';
    [...document.body.childNodes].forEach(c => {
      if (c.nodeType !== Node.ELEMENT_NODE || !(c.id||'').startsWith('sw-')) {
        wrapper.appendChild(c);
      }
    });
    document.body.appendChild(wrapper);

    const mkHalf = (clip) => {
      const h = document.createElement('div');
      h.style.cssText = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;
        overflow:hidden;clip-path:${clip};
        z-index:2147483640;pointer-events:none;background:${bg};
        transition:transform 1.15s cubic-bezier(0.25,0.46,0.45,0.94),opacity 0.6s ease;
      `;
      const cl = wrapper.cloneNode(true);
      cl.id = '';
      cl.style.cssText = `position:absolute;top:${-scrollY}px;left:0;width:100%;pointer-events:none;`;
      h.appendChild(cl);
      return h;
    };

    const topH = mkHalf(topClip);
    const botH = mkHalf(botClip);

    // Ligne de découpe incandescente
    const angle = Math.atan2(0.30 * vh, vw) * 180 / Math.PI;
    const len   = Math.sqrt(vw*vw + (0.30*vh)*(0.30*vh)) + 400;
    const line  = document.createElement('div');
    line.style.cssText = `
      position:fixed;top:50%;left:50%;
      width:${len}px;height:6px;
      background:linear-gradient(to right,transparent 0%,#FF2020 12%,#FF8888 35%,white 50%,#FF8888 65%,#FF2020 88%,transparent 100%);
      box-shadow:0 0 22px #FF0000,0 0 55px rgba(255,0,0,0.55);
      transform:translate(-50%,-50%) rotate(${angle}deg);
      z-index:2147483645;pointer-events:none;
      transition:opacity 0.5s ease;
    `;

    wrapper.style.visibility = 'hidden';
    document.body.appendChild(topH);
    document.body.appendChild(botH);
    document.body.appendChild(line);
    spawnSparks();

    // Animer l'écartement
    requestAnimationFrame(() => requestAnimationFrame(() => {
      topH.style.transform = 'translate(28px,-95px) rotate(-0.6deg)';
      botH.style.transform = 'translate(-28px,95px) rotate(0.6deg)';
    }));
    setTimeout(() => { line.style.opacity = '0'; }, 420);

    // Réassembler
    setTimeout(() => {
      topH.style.transform = 'translate(0,0) rotate(0)';
      botH.style.transform = 'translate(0,0) rotate(0)';
      setTimeout(() => {
        wrapper.style.visibility = 'visible';
        [...wrapper.childNodes].forEach(c => document.body.insertBefore(c, wrapper));
        wrapper.remove(); topH.remove(); botH.remove(); line.remove();
        flags.sith = false;
      }, 1300);
    }, 2600);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ⭐ VADER — Dark Side takeover
  // ═══════════════════════════════════════════════════════════════════
  function activateVader() {
    playVaderBreath(7);

    kf('vader-pulse', `
      0%,100%{text-shadow:0 0 40px rgba(200,0,0,0.4)}
      50%{text-shadow:0 0 90px rgba(255,0,0,0.95),0 0 140px rgba(255,0,0,0.4)}
    `);
    kf('vader-in','from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}');

    const ov = document.createElement('div');
    ov.id = 'sw-vader';
    ov.style.cssText = `
      position:fixed;inset:0;
      background:radial-gradient(ellipse at center,rgba(12,0,0,0.94) 0%,rgba(0,0,0,0.98) 100%);
      z-index:2147483641;display:flex;align-items:center;justify-content:center;
      cursor:pointer;opacity:0;transition:opacity 0.9s ease;
    `;
    ov.innerHTML = `
      <div style="
        text-align:center;color:white;
        font-family:'Courier New',monospace;
        padding:48px 40px;max-width:640px;
        animation:vader-in 0.9s ease forwards;
      ">
        <div style="font-size:10px;letter-spacing:5px;color:#CC0000;margin-bottom:28px;text-transform:uppercase">
          ✦ &nbsp; D A R K &nbsp; V A D O R &nbsp; ✦
        </div>
        <div style="
          font-size:clamp(26px,4.5vw,52px);font-weight:900;
          letter-spacing:1.5px;line-height:1.4;
          animation:vader-pulse 2.2s ease-in-out infinite;
        ">
          « Luke… Je suis ton père. »
        </div>
        <div style="margin-top:8px;font-size:clamp(15px,2vw,20px);color:#880000;font-style:italic;letter-spacing:1px">
          « Non, moi je suis ton père. »
        </div>
        <div style="margin-top:36px;font-size:12px;color:#555;letter-spacing:2.5px">
          — L'Empire contre-attaque, 1980
        </div>
        <div style="margin-top:44px;display:flex;justify-content:center;gap:7px;align-items:center">
          ${Array(10).fill('<span style="flex:1;max-width:30px;height:2px;background:#880000;border-radius:1px;display:block"></span>').join('')}
        </div>
        <div style="margin-top:28px;font-size:10px;color:#444;letter-spacing:2px">
          [clic ou Echap pour quitter le côté obscur]
        </div>
      </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.opacity = '1'; }));

    const close = () => {
      ov.style.opacity = '0';
      setTimeout(() => { ov.remove(); flags.vader = false; }, 900);
    };
    ov.addEventListener('click', close);
    const kh = (e) => { if (e.key==='Escape') { close(); document.removeEventListener('keydown', kh); } };
    document.addEventListener('keydown', kh);
    setTimeout(close, 9000);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  🏴‍☠️ LUFFY — Gomu Gomu no Rocket !!
  // ═══════════════════════════════════════════════════════════════════
  function activateLuffy() {
    playBoing(0); playBoing(0.21); playBoing(0.40);

    kf('gomu-gomu', `
      0%   {transform:scale(1,1) skewX(0)}
      7%   {transform:scale(1.14,0.89) skewX(-4deg)}
      16%  {transform:scale(0.90,1.11) skewX(3deg)}
      27%  {transform:scale(1.09,0.94) skewX(-2deg)}
      40%  {transform:scale(0.96,1.05) skewX(1.5deg)}
      54%  {transform:scale(1.04,0.97) skewX(-1deg)}
      66%  {transform:scale(0.99,1.02)}
      78%  {transform:scale(1.02,0.99)}
      88%  {transform:scale(1.00,1.00)}
      100% {transform:scale(1,1) skewX(0)}
    `);

    const s = document.createElement('style');
    s.id = 'sw-luffy-s';
    s.textContent = `html{animation:gomu-gomu 0.95s cubic-bezier(0.36,0.07,0.19,0.97) forwards;transform-origin:center center;}`;
    document.head.appendChild(s);

    kf('luffy-pop', `
      0%  {transform:translate(-50%,-55%) scale(0) rotate(-6deg);opacity:1}
      22% {transform:translate(-50%,-55%) scale(1.18) rotate(2deg);opacity:1}
      65% {transform:translate(-50%,-55%) scale(1) rotate(0);opacity:1}
      88% {opacity:1}
      100%{transform:translate(-50%,-55%) scale(1.25) rotate(-3deg);opacity:0}
    `);

    const txt = document.createElement('div');
    txt.style.cssText = `
      position:fixed;top:50%;left:50%;
      font-family:'Impact','Arial Black',sans-serif;
      font-size:clamp(30px,5.5vw,60px);font-weight:900;
      color:#FFD700;letter-spacing:3px;white-space:nowrap;
      text-shadow:-4px -4px 0 #000,4px -4px 0 #000,-4px 4px 0 #000,4px 4px 0 #000,0 0 40px rgba(255,140,0,0.9);
      z-index:2147483647;pointer-events:none;
      animation:luffy-pop 2.8s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
    `;
    txt.textContent = '🍖  GOMU GOMU NO ROCKET !!';
    document.body.appendChild(txt);
    showToast('🍖 Gomu Gomu no…', 'Les pouvoirs du Fruit du Démon !', 'luffy');

    setTimeout(() => {
      txt.remove();
      document.getElementById('sw-luffy-s')?.remove();
      flags.luffy = false;
    }, 3200);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  🏴‍☠️ ZORO — Santoryu · Oni Giri !!
  // ═══════════════════════════════════════════════════════════════════
  function activateZoro() {
    // Tremblements légers
    kf('zoro-shake',`
      0%,100%{transform:translate(0,0)}
      20%{transform:translate(-3px,2px)}
      40%{transform:translate(3px,-2px)}
      60%{transform:translate(-2px,3px)}
      80%{transform:translate(2px,-1px)}
    `);
    document.body.style.animation = 'zoro-shake 0.4s ease';
    setTimeout(() => { document.body.style.animation = ''; }, 420);

    // 3 coups de lame
    const configs = [
      { angle: -38, color: '#22FF55', delay:   0 },
      { angle:   8, color: '#44FF22', delay: 160 },
      { angle:  42, color: '#00DD44', delay: 310 },
    ];
    configs.forEach(({ angle, color, delay }) => {
      setTimeout(() => { playSlash(0); spawnSlash(angle, color); }, delay);
    });

    // Texte "ONI GIRI !!"
    setTimeout(() => {
      kf('zoro-pop',`
        0%  {transform:translate(-50%,-50%) scale(0) rotate(6deg);opacity:1}
        18% {transform:translate(-50%,-50%) scale(1.22) rotate(-2deg);opacity:1}
        68% {transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1}
        90% {opacity:1}
        100%{transform:translate(-50%,-50%) scale(1.1);opacity:0}
      `);
      const txt = document.createElement('div');
      txt.style.cssText = `
        position:fixed;top:50%;left:50%;
        font-family:'Impact','Arial Black',sans-serif;
        font-size:clamp(34px,6vw,68px);font-weight:900;
        color:#00FF55;letter-spacing:4px;white-space:nowrap;
        text-shadow:-4px -4px 0 #000,4px -4px 0 #000,-4px 4px 0 #000,4px 4px 0 #000,0 0 55px rgba(0,255,60,0.95);
        z-index:2147483647;pointer-events:none;
        animation:zoro-pop 2.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
      `;
      txt.textContent = '⚔️  ONI GIRI !!';
      document.body.appendChild(txt);
      setTimeout(() => { txt.remove(); flags.zoro = false; }, 2800);
    }, 440);

    showToast('⚔️ Santoryu activé', 'Style des Trois Sabres — Oni Giri !', 'zoro');
  }

  function spawnSlash(angleDeg, color) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const len = Math.sqrt(vw*vw + vh*vh) + 250;
    const sl = document.createElement('div');
    sl.style.cssText = `
      position:fixed;top:50%;left:50%;
      width:${len}px;height:5px;
      background:linear-gradient(to right,transparent 0%,${color} 18%,white 50%,${color} 82%,transparent 100%);
      box-shadow:0 0 18px ${color},0 0 40px ${color}80;
      transform:translate(-50%,-50%) rotate(${angleDeg}deg) scaleX(0);
      transform-origin:left center;
      z-index:2147483646;pointer-events:none;
    `;
    document.body.appendChild(sl);
    const a = sl.animate([
      {transform:`translate(-50%,-50%) rotate(${angleDeg}deg) scaleX(0)`, opacity:1},
      {transform:`translate(-50%,-50%) rotate(${angleDeg}deg) scaleX(1)`, opacity:1, offset:0.28},
      {transform:`translate(-50%,-50%) rotate(${angleDeg}deg) scaleX(1)`, opacity:0.85, offset:0.55},
      {transform:`translate(-50%,-50%) rotate(${angleDeg}deg) scaleX(1)`, opacity:0}
    ], {duration:700, easing:'ease-out', fill:'forwards'});
    a.onfinish = () => sl.remove();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TOAST — notification stylée (multi-univers)
  // ═══════════════════════════════════════════════════════════════════
  const THEMES = {
    jedi:  { accent:'#4FC3F7', bg:'rgba(0,8,32,0.96)',   label:'STAR WARS'  },
    sith:  { accent:'#FF5252', bg:'rgba(28,0,0,0.96)',   label:'STAR WARS'  },
    vader: { accent:'#CC0000', bg:'rgba(10,0,0,0.97)',   label:'STAR WARS'  },
    luffy: { accent:'#FFD700', bg:'rgba(18,6,0,0.96)',   label:'ONE PIECE'  },
    zoro:  { accent:'#44FF88', bg:'rgba(0,14,6,0.96)',   label:'ONE PIECE'  },
  };

  function showToast(title, subtitle, type) {
    document.getElementById('sw-toast')?.remove();
    const { accent, bg, label } = THEMES[type] || THEMES.jedi;
    const bars = Array(6).fill(`<span style="flex:1;height:2px;background:${accent};border-radius:1px;opacity:0.65;display:block"></span>`).join('');
    const t = document.createElement('div');
    t.id = 'sw-toast';
    t.innerHTML = `
      <div style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:4px;color:${accent};margin-bottom:9px;text-transform:uppercase">
        ✦ &nbsp;${label}&nbsp; ✦
      </div>
      <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:5px">${title}</div>
      <div style="font-size:12px;color:#bbb;font-style:italic;line-height:1.5">${subtitle}</div>
      <div style="margin-top:13px;display:flex;gap:3px">${bars}</div>
    `;
    t.style.cssText = `
      position:fixed;bottom:28px;right:28px;
      background:${bg};border:1px solid ${accent};border-radius:10px;
      padding:18px 24px;z-index:2147483647;
      box-shadow:0 0 30px ${accent}45,0 14px 50px rgba(0,0,0,0.75);
      min-width:245px;max-width:320px;
      transform:translateX(130%);
      transition:transform 0.45s cubic-bezier(0.175,0.885,0.32,1.275);
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    `;
    document.body.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => { t.style.transform = 'translateX(0)'; }));
    setTimeout(() => {
      t.style.transform = 'translateX(130%)';
      setTimeout(() => t.remove(), 500);
    }, 4800);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UTILITAIRE — inject @keyframes une seule fois
  // ═══════════════════════════════════════════════════════════════════
  const _kfSet = new Set();
  function kf(name, body) {
    if (_kfSet.has(name)) return;
    _kfSet.add(name);
    const s = document.createElement('style');
    s.textContent = `@keyframes ${name}{${body}}`;
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Indice dans la console
  // ═══════════════════════════════════════════════════════════════════
  console.log(
    '%c ⚔️  EASTER EGGS CACHÉS %c\n' +
    '⭐ Star Wars  →  jedi · sith · vader\n' +
    '🏴‍☠️ One Piece  →  luffy · zoro',
    'font-size:13px;color:#4FC3F7;font-weight:bold;background:#000c1a;padding:5px 10px;border-radius:4px;',
    'font-size:11px;color:#888;'
  );

})();
