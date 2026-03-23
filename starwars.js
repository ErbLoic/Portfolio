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
  //  DÉTECTION CLAVIER
  //  • keydown seulement  • 1 char imprimable à la fois
  //  • buffer vide après 2s d'inactivité ou après déclenchement
  // ═══════════════════════════════════════════════════════════════════
  let keyBuffer   = '';
  let bufferTimer = null;
  const flags = { jedi:false, sith:false, vader:false, luffy:false, zoro:false };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && flags.jedi) { flags.jedi = false; deactivateJedi(); return; }
    if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;
    const el = document.activeElement;
    if (['INPUT','TEXTAREA','SELECT'].includes(el.tagName) || el.contentEditable === 'true') return;
    clearTimeout(bufferTimer);
    bufferTimer = setTimeout(() => { keyBuffer = ''; }, 2000);
    keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-30);
    if      (!flags.jedi  && keyBuffer.endsWith('jedi'))  { flags.jedi  = true;  keyBuffer=''; activateJedi();  }
    else if ( flags.jedi  && keyBuffer.endsWith('jedi'))  { flags.jedi  = false; keyBuffer=''; deactivateJedi(); }
    else if (!flags.sith  && keyBuffer.endsWith('sith'))  { flags.sith  = true;  keyBuffer=''; activateSith();  }
    else if (!flags.vader && keyBuffer.endsWith('vader')) { flags.vader = true;  keyBuffer=''; activateVader(); }
    else if (!flags.luffy && keyBuffer.endsWith('luffy')) { flags.luffy = true;  keyBuffer=''; activateLuffy(); }
    else if (!flags.zoro  && keyBuffer.endsWith('zoro'))  { flags.zoro  = true;  keyBuffer=''; activateZoro();  }
  });

  // ═══════════════════════════════════════════════════════════════════
  //  AUDIO — Web Audio API
  // ═══════════════════════════════════════════════════════════════════
  let _ctx = null;
  function ac() {
    if (!_ctx) _ctx = new (window.AudioContext || window['webkitAudioContext'])();
    return _ctx;
  }

  function playIgnition(color) {
    try {
      const ctx = ac(), t = ctx.currentTime;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/d.length, 1.4);
      const noise = ctx.createBufferSource(); noise.buffer = buf;
      const nf = ctx.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value = color==='red'?450:720; nf.Q.value=0.8;
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0.55,t); ng.gain.exponentialRampToValueAtTime(0.001,t+1.5);
      noise.connect(nf); nf.connect(ng); ng.connect(ctx.destination); noise.start(t);
      const osc = ctx.createOscillator(); osc.type='sawtooth';
      osc.frequency.setValueAtTime(420,t); osc.frequency.exponentialRampToValueAtTime(color==='red'?90:145,t+0.7);
      const of2 = ctx.createBiquadFilter(); of2.type='lowpass'; of2.frequency.value=1300;
      const og = ctx.createGain(); og.gain.setValueAtTime(0.28,t); og.gain.linearRampToValueAtTime(0.09,t+1.5);
      osc.connect(of2); of2.connect(og); og.connect(ctx.destination); osc.start(t); osc.stop(t+1.5);
    } catch(_) {}
  }

  function playSwing() {
    try {
      const ctx = ac(), t = ctx.currentTime;
      const osc = ctx.createOscillator(); osc.type='sine';
      osc.frequency.setValueAtTime(320+Math.random()*140,t); osc.frequency.exponentialRampToValueAtTime(130,t+0.2);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.16,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.2);
      osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+0.2);
    } catch(_) {}
  }

  function playExtinguish() {
    try {
      const ctx = ac(), t = ctx.currentTime;
      const osc = ctx.createOscillator(); osc.type='sawtooth';
      osc.frequency.setValueAtTime(145,t); osc.frequency.exponentialRampToValueAtTime(35,t+0.6);
      const f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(900,t); f.frequency.exponentialRampToValueAtTime(80,t+0.6);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.22,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.6);
      osc.connect(f); f.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+0.6);
    } catch(_) {}
  }

  function playVaderBreath(beats) {
    try {
      const ctx = ac(), t = ctx.currentTime;
      for (let i = 0; i < beats; i++) {
        const bt = t + i * 1.35;
        const iO = ctx.createOscillator(); iO.type='sawtooth';
        iO.frequency.setValueAtTime(85,bt); iO.frequency.linearRampToValueAtTime(115,bt+0.55);
        const iF = ctx.createBiquadFilter(); iF.type='bandpass'; iF.frequency.value=650; iF.Q.value=1.8;
        const iG = ctx.createGain();
        iG.gain.setValueAtTime(0,bt); iG.gain.linearRampToValueAtTime(0.25,bt+0.1);
        iG.gain.linearRampToValueAtTime(0.25,bt+0.45); iG.gain.linearRampToValueAtTime(0,bt+0.62);
        iO.connect(iF); iF.connect(iG); iG.connect(ctx.destination); iO.start(bt); iO.stop(bt+0.65);
        const eO = ctx.createOscillator(); eO.type='sawtooth';
        eO.frequency.setValueAtTime(70,bt+0.68); eO.frequency.linearRampToValueAtTime(50,bt+1.22);
        const eF = ctx.createBiquadFilter(); eF.type='bandpass'; eF.frequency.value=500; eF.Q.value=1.4;
        const eG = ctx.createGain();
        eG.gain.setValueAtTime(0,bt+0.68); eG.gain.linearRampToValueAtTime(0.20,bt+0.78);
        eG.gain.linearRampToValueAtTime(0.20,bt+1.10); eG.gain.linearRampToValueAtTime(0,bt+1.32);
        eO.connect(eF); eF.connect(eG); eG.connect(ctx.destination); eO.start(bt+0.68); eO.stop(bt+1.35);
      }
    } catch(_) {}
  }

  function playBoing(offset) {
    try {
      const ctx = ac(), t = ctx.currentTime + (offset||0);
      const osc = ctx.createOscillator(); osc.type='sine';
      osc.frequency.setValueAtTime(70,t); osc.frequency.exponentialRampToValueAtTime(420,t+0.12);
      osc.frequency.exponentialRampToValueAtTime(190,t+0.32); osc.frequency.exponentialRampToValueAtTime(310,t+0.48);
      osc.frequency.exponentialRampToValueAtTime(240,t+0.65);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.28,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.65);
      osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+0.65);
    } catch(_) {}
  }

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
  //  ⭐ JEDI — Curseur Sabre Laser v3
  //
  //  Corrections :
  //  • suppression du filtre Gaussian (causait du flou au rendu curseur)
  //  • 4 couches de lumière + 1 noyau blanc = glow propre et net
  //  • proportions blade/manche équilibrées (60% / 40%)
  //  • garde simplifiée mais réaliste
  //  • bouton d'activation lisible à petite taille
  //  • pommeau propre sans superposition
  //  • hotspot exactement sur la pointe (12, 2)
  // ═══════════════════════════════════════════════════════════════════
  const SABER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="86" viewBox="0 0 24 86">
  <defs>
    <!-- Gradient horizontal = aspect cylindrique de la lame -->
    <linearGradient id="bl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#1565C0" stop-opacity="0"/>
      <stop offset="18%"  stop-color="#42A5F5" stop-opacity="0.65"/>
      <stop offset="42%"  stop-color="#90CAF9" stop-opacity="0.95"/>
      <stop offset="50%"  stop-color="white"/>
      <stop offset="58%"  stop-color="#90CAF9" stop-opacity="0.95"/>
      <stop offset="82%"  stop-color="#42A5F5" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#1565C0" stop-opacity="0"/>
    </linearGradient>
    <!-- Métal sombre pour le manche -->
    <linearGradient id="hm" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#0D1F28"/>
      <stop offset="28%"  stop-color="#2E4455"/>
      <stop offset="55%"  stop-color="#3E5868"/>
      <stop offset="100%" stop-color="#0D1F28"/>
    </linearGradient>
    <!-- Métal pour la garde (légèrement plus clair) -->
    <linearGradient id="gm" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#162030"/>
      <stop offset="45%"  stop-color="#445A68"/>
      <stop offset="100%" stop-color="#162030"/>
    </linearGradient>
  </defs>

  <!-- ── LAME (4 couches, sans filtre flou) ───────────────────────── -->
  <!-- Couche 1 : aura externe, large et très transparente -->
  <rect x="3"    y="2" width="18" height="54" rx="9"   fill="#0D47A1" opacity="0.22"/>
  <!-- Couche 2 : lueur intermédiaire -->
  <rect x="6"    y="2" width="12" height="54" rx="6"   fill="#1976D2" opacity="0.48"/>
  <!-- Couche 3 : lueur interne, bien visible -->
  <rect x="8"    y="2" width="8"  height="54" rx="4"   fill="#42A5F5" opacity="0.78"/>
  <!-- Couche 4 : corps de la lame avec gradient cylindrique -->
  <rect x="9.5"  y="2" width="5"  height="54" rx="2.5" fill="url(#bl)"/>
  <!-- Couche 5 : âme blanche (noyau) -->
  <rect x="10.5" y="2" width="3"  height="54" rx="1.5" fill="white" opacity="0.92"/>

  <!-- ── ÉMETTEUR (trois bagues décroissantes) ─────────────────────── -->
  <rect x="9.5" y="56" width="5"  height="2"   rx="1"    fill="#546E7A"/>
  <rect x="8"   y="58" width="8"  height="2.5" rx="1.25" fill="#607D8B"/>
  <rect x="6"   y="60" width="12" height="2"   rx="1"    fill="#78909C"/>

  <!-- ── GARDE ─────────────────────────────────────────────────────── -->
  <rect x="1"   y="62" width="22" height="6"   rx="3"    fill="url(#gm)"/>
  <!-- Biseau supérieur (reflet) -->
  <rect x="2"   y="62.5" width="20" height="2" rx="1"    fill="#607D8B" opacity="0.45"/>
  <!-- Biseau inférieur (ombre) -->
  <rect x="2"   y="66.5" width="20" height="1" rx="0.5"  fill="#050E18" opacity="0.5"/>

  <!-- ── HAUT DU MANCHE – section commandes ────────────────────────── -->
  <rect x="8" y="68" width="8" height="5.5" rx="1" fill="url(#hm)"/>
  <!-- Bouton d'activation (rouge, flush) -->
  <rect x="9"   y="69"   width="3"   height="3"   rx="1.5"  fill="#B71C1C"/>
  <rect x="9.3" y="69.3" width="2.4" height="2"   rx="0.8"  fill="#EF5350" opacity="0.75"/>

  <!-- ── MANCHE – section grip (3 bagues de préhension) ────────────── -->
  <rect x="8"   y="73.5" width="8"   height="9"   rx="1"    fill="url(#hm)"/>
  <rect x="7.5" y="74.5" width="9"   height="1.5" rx="0.75" fill="#1A2E3A"/>
  <rect x="7.5" y="77.5" width="9"   height="1.5" rx="0.75" fill="#1A2E3A"/>
  <rect x="7.5" y="80.5" width="9"   height="1.5" rx="0.75" fill="#1A2E3A"/>

  <!-- ── POMMEAU ─────────────────────────────────────────────────────── -->
  <rect    x="8.5"  y="82.5" width="7"  height="2"   rx="1"   fill="#162028"/>
  <ellipse cx="12"  cy="85"  rx="4"    ry="1.5"              fill="#253545"/>
  <ellipse cx="12"  cy="85"  rx="2"    ry="0.8"              fill="#374F60"/>
</svg>`;

  let _cursorUrl = null;

  function activateJedi() {
    playIgnition('blue');
    const blob = new Blob([SABER_SVG], { type: 'image/svg+xml' });
    _cursorUrl = URL.createObjectURL(blob);
    const s = document.createElement('style');
    s.id = 'sw-cursor';
    s.textContent = `*, *::before, *::after { cursor: url('${_cursorUrl}') 12 2, crosshair !important; }`;
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
  //  ⭐ SITH — Écran explosé en 9 morceaux irréguliers
  // ═══════════════════════════════════════════════════════════════════
  function activateSith() {
    playIgnition('red');
    showToast('🔴 Côté Obscur détecté', 'La Force est forte en toi...', 'sith');
    setTimeout(() => {
      spawnVignette();
      setTimeout(() => {
        sweepBeam('red', () => {
          killVignette();
          flashScreen('rgba(220,0,0,0.35)', 200);
          setTimeout(() => shatterCut(), 100);
        });
      }, 500);
    }, 1700);
  }

  // ─── 9 polygones qui carrelent EXACTEMENT le viewport ─────────────
  //
  //  Points internes (% viewport) :
  //    E=(28,28)  F=(62,24)  G=(88,30)
  //    I=(32,58)  J=(58,55)  K=(85,60)
  //
  //  ┌───────────────────────────────────────┐ 0%
  //  │  P1      │    P2      │      P3       │
  //  │ (0,0)    E    (38,0)  F   (72,0) G   │ ~28%
  //  ├─────────────────────────────────────  │
  //  │  P4    E    P5      F    P6      G   │ ~58%
  //  │ (0,32) I    (28,28) J   (62,24)  K   │
  //  ├─────────────────────────────────────  │
  //  │  P7      │    P8      │      P9       │
  //  │ (0,62)   I  (32,58)   J  (58,55)  K  │
  //  └───────────────────────────────────────┘ 100%
  //
  const SHARDS = [
    // P1 – coin haut-gauche
    { clip: 'polygon(0% 0%,38% 0%,28% 28%,0% 32%)',                              tx: -170, ty: -145, rot: -20 },
    // P2 – haut-centre
    { clip: 'polygon(38% 0%,72% 0%,62% 24%,28% 28%)',                            tx:    5, ty: -175, rot:   9 },
    // P3 – coin haut-droit
    { clip: 'polygon(72% 0%,100% 0%,100% 35%,88% 30%,62% 24%)',                  tx:  175, ty: -145, rot:  19 },
    // P4 – milieu-gauche
    { clip: 'polygon(0% 32%,28% 28%,32% 58%,0% 62%)',                            tx: -190, ty:    5, rot: -11 },
    // P5 – centre (s'écrase vers le haut)
    { clip: 'polygon(28% 28%,62% 24%,58% 55%,32% 58%)',                          tx:  -55, ty: -105, rot:   6, sc: 0.65 },
    // P6 – milieu-droit
    { clip: 'polygon(62% 24%,88% 30%,100% 35%,100% 65%,85% 60%,58% 55%)',        tx:  190, ty:    5, rot:  13 },
    // P7 – coin bas-gauche
    { clip: 'polygon(0% 62%,32% 58%,40% 100%,0% 100%)',                          tx: -170, ty:  155, rot: -16 },
    // P8 – bas-centre
    { clip: 'polygon(32% 58%,58% 55%,70% 100%,40% 100%)',                        tx:    5, ty:  182, rot:  -8 },
    // P9 – coin bas-droit
    { clip: 'polygon(58% 55%,85% 60%,100% 65%,100% 100%,70% 100%)',              tx:  170, ty:  155, rot:  19 },
  ];

  function shatterCut() {
    const scrollY = window.scrollY;
    const vw = window.innerWidth, vh = window.innerHeight;
    const bg = window.getComputedStyle(document.body).backgroundColor || '#000';

    // ── 1. Lignes de fissures (apparaissent avant l'explosion) ──────
    const crackDefs = [
      [28,28, 0,32], [38,0, 28,28], [72,0, 62,24], [28,28, 62,24],
      [62,24, 88,30],[88,30,100,35],[28,28, 32,58], [32,58, 0,62],
      [62,24, 58,55],[32,58, 58,55],[58,55, 85,60], [85,60,100,65],
      [32,58, 40,100],[58,55, 70,100],
    ];
    const crackLines = crackDefs.map(([x1p,y1p,x2p,y2p]) => {
      const x1=x1p/100*vw, y1=y1p/100*vh, x2=x2p/100*vw, y2=y2p/100*vh;
      const len = Math.sqrt((x2-x1)**2+(y2-y1)**2);
      const ang = Math.atan2(y2-y1, x2-x1)*180/Math.PI;
      const cx=(x1+x2)/2, cy=(y1+y2)/2;
      const l = document.createElement('div');
      l.style.cssText = `
        position:fixed;left:${cx}px;top:${cy}px;
        width:${len}px;height:2px;
        background:linear-gradient(to right,transparent 0%,#FF3333 18%,white 50%,#FF3333 82%,transparent 100%);
        box-shadow:0 0 8px #FF0000,0 0 18px rgba(255,0,0,0.4);
        transform:translate(-50%,-50%) rotate(${ang}deg) scaleX(0);
        transform-origin:center;
        z-index:2147483646;pointer-events:none;
        transition:transform 0.12s ease-out;
      `;
      document.body.appendChild(l);
      // Délai aléatoire pour que les fissures apparaissent en cascade
      const delay = Math.random() * 80;
      setTimeout(() => {
        l.style.transform = `translate(-50%,-50%) rotate(${ang}deg) scaleX(1)`;
      }, delay);
      return l;
    });

    // ── 2. Étincelles aux nœuds de fissures ─────────────────────────
    const nodes = [[28,28],[62,24],[88,30],[32,58],[58,55],[85,60]];
    nodes.forEach(([xp,yp]) => {
      const cx=xp/100*vw, cy=yp/100*vh;
      for (let i=0; i<12; i++) {
        const ang = (Math.PI*2*i/12) + Math.random()*0.4;
        const dist = 55 + Math.random()*75;
        const sp = document.createElement('div');
        const sz = 2 + Math.random()*3;
        sp.style.cssText = `
          position:fixed;left:${cx}px;top:${cy}px;
          width:${sz}px;height:${sz}px;border-radius:50%;
          background:${Math.random()>0.45?'#FF5555':'#FFAA33'};
          box-shadow:0 0 ${sz+2}px currentColor;
          z-index:2147483645;pointer-events:none;
        `;
        document.body.appendChild(sp);
        const dx = Math.cos(ang)*dist, dy = Math.sin(ang)*dist;
        const a = sp.animate(
          [{transform:'translate(-50%,-50%) scale(1)',opacity:1},
           {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(0)`,opacity:0}],
          {duration:230+Math.random()*320, easing:'ease-out', fill:'forwards'}
        );
        a.onfinish = () => sp.remove();
      }
    });

    // ── 3. Attendre que les fissures soient visibles, puis exploser ──
    setTimeout(() => {
      crackLines.forEach(l => l.remove());
      flashScreen('rgba(255,0,0,0.45)', 180);

      // Emballer le contenu original (ignorer les éléments easter egg)
      const wrapper = document.createElement('div');
      wrapper.id = 'sw-wrap';
      [...document.body.childNodes].forEach(c => {
        if (c.nodeType !== Node.ELEMENT_NODE || !(c.id||'').startsWith('sw-'))
          wrapper.appendChild(c);
      });
      document.body.appendChild(wrapper);
      wrapper.style.visibility = 'hidden';

      // Créer les 9 morceaux
      const pieces = SHARDS.map(({ clip }) => {
        const h = document.createElement('div');
        h.style.cssText = `
          position:fixed;top:0;left:0;
          width:${vw}px;height:${vh}px;
          overflow:hidden;clip-path:${clip};
          z-index:2147483640;pointer-events:none;
          background:${bg};
          transition:transform 1.05s cubic-bezier(0.25,0.46,0.45,0.94),opacity 0.9s ease;
        `;
        const clone = wrapper.cloneNode(true);
        clone.id = '';
        clone.style.cssText = `position:absolute;top:${-scrollY}px;left:0;width:${vw}px;pointer-events:none;`;
        h.appendChild(clone);
        document.body.appendChild(h);
        return h;
      });

      // Animer vers l'extérieur
      requestAnimationFrame(() => requestAnimationFrame(() => {
        SHARDS.forEach(({ tx, ty, rot, sc }, i) => {
          const scale = sc ? ` scale(${sc})` : '';
          pieces[i].style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg)${scale}`;
          pieces[i].style.opacity = '0.1';
        });
      }));

      // ── 4. Réassemblage ─────────────────────────────────────────────
      setTimeout(() => {
        pieces.forEach(p => {
          p.style.transition = 'transform 0.65s cubic-bezier(0.34,1.3,0.64,1), opacity 0.4s ease';
          p.style.transform  = 'translate(0,0) rotate(0) scale(1)';
          p.style.opacity    = '1';
        });
        setTimeout(() => {
          wrapper.style.visibility = 'visible';
          [...wrapper.childNodes].forEach(c => document.body.insertBefore(c, wrapper));
          wrapper.remove();
          pieces.forEach(p => p.remove());
          flags.sith = false;
        }, 700);
      }, 2400);

    }, 220);
  }

  // ─── Helpers communs SITH ──────────────────────────────────────────
  function spawnVignette() {
    killVignette();
    kf('sw-vig-in','from{opacity:0}to{opacity:1}');
    const v = document.createElement('div');
    v.id = 'sw-vig';
    v.style.cssText = `
      position:fixed;inset:0;pointer-events:none;z-index:2147483620;
      background:radial-gradient(ellipse at center,transparent 35%,rgba(180,0,0,0.55) 100%);
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
    setTimeout(() => f.remove(), ms+60);
  }

  function sweepBeam(color, done) {
    const c1 = color==='red' ? '#FF2222' : '#4FC3F7';
    const beam = document.createElement('div');
    beam.style.cssText = `
      position:fixed;top:0;left:0;width:16px;height:100vh;
      background:linear-gradient(to right,transparent 0%,${c1}60 15%,${c1} 38%,white 50%,${c1} 62%,${c1}60 85%,transparent 100%);
      box-shadow:0 0 35px ${c1},0 0 80px ${c1}60;
      z-index:2147483647;pointer-events:none;
      transform:translateX(-25px);transition:transform 0.33s linear;
    `;
    document.body.appendChild(beam);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      beam.style.transform = `translateX(${window.innerWidth+30}px)`;
    }));
    setTimeout(() => { beam.remove(); done(); }, 370);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ⭐ VADER
  // ═══════════════════════════════════════════════════════════════════
  function activateVader() {
    playVaderBreath(7);
    kf('vader-pulse',`
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
    ov.innerHTML = `<div style="
      text-align:center;color:white;font-family:'Courier New',monospace;
      padding:48px 40px;max-width:640px;
      animation:vader-in 0.9s ease forwards;">
      <div style="font-size:10px;letter-spacing:5px;color:#CC0000;margin-bottom:28px;text-transform:uppercase">
        ✦ &nbsp;D A R K &nbsp; V A D O R&nbsp; ✦
      </div>
      <div style="font-size:clamp(26px,4.5vw,52px);font-weight:900;letter-spacing:1.5px;line-height:1.4;animation:vader-pulse 2.2s ease-in-out infinite">
        « Luke… Je suis ton père. »
      </div>
      <div style="margin-top:8px;font-size:clamp(15px,2vw,20px);color:#880000;font-style:italic;letter-spacing:1px">
        « Non, moi je suis ton père. »
      </div>
      <div style="margin-top:36px;font-size:12px;color:#555;letter-spacing:2.5px">— L'Empire contre-attaque, 1980</div>
      <div style="margin-top:44px;display:flex;justify-content:center;gap:7px;align-items:center">
        ${Array(10).fill('<span style="flex:1;max-width:30px;height:2px;background:#880000;border-radius:1px;display:block"></span>').join('')}
      </div>
      <div style="margin-top:28px;font-size:10px;color:#444;letter-spacing:2px">[clic ou Echap pour quitter le côté obscur]</div>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.opacity='1'; }));
    const close = () => { ov.style.opacity='0'; setTimeout(() => { ov.remove(); flags.vader=false; }, 900); };
    ov.addEventListener('click', close);
    const kh = (e) => { if (e.key==='Escape') { close(); document.removeEventListener('keydown',kh); } };
    document.addEventListener('keydown', kh);
    setTimeout(close, 9000);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  🏴‍☠️ LUFFY
  // ═══════════════════════════════════════════════════════════════════
  function activateLuffy() {
    playBoing(0); playBoing(0.21); playBoing(0.40);
    kf('gomu-gomu',`
      0%  {transform:scale(1,1) skewX(0)}
      7%  {transform:scale(1.14,0.89) skewX(-4deg)}
      16% {transform:scale(0.90,1.11) skewX(3deg)}
      27% {transform:scale(1.09,0.94) skewX(-2deg)}
      40% {transform:scale(0.96,1.05) skewX(1.5deg)}
      54% {transform:scale(1.04,0.97) skewX(-1deg)}
      66% {transform:scale(0.99,1.02)}
      78% {transform:scale(1.02,0.99)}
      100%{transform:scale(1,1) skewX(0)}
    `);
    const s = document.createElement('style');
    s.id = 'sw-luffy-s';
    s.textContent = `html{animation:gomu-gomu 0.95s cubic-bezier(0.36,0.07,0.19,0.97) forwards;transform-origin:center center;}`;
    document.head.appendChild(s);
    kf('luffy-pop',`
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
    setTimeout(() => { txt.remove(); document.getElementById('sw-luffy-s')?.remove(); flags.luffy=false; }, 3200);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  🏴‍☠️ ZORO — Santoryu
  // ═══════════════════════════════════════════════════════════════════
  function activateZoro() {
    kf('zoro-shake',`
      0%,100%{transform:translate(0,0)}20%{transform:translate(-3px,2px)}
      40%{transform:translate(3px,-2px)}60%{transform:translate(-2px,3px)}80%{transform:translate(2px,-1px)}
    `);
    document.body.style.animation = 'zoro-shake 0.4s ease';
    setTimeout(() => { document.body.style.animation=''; }, 420);
    [{ angle:-38,color:'#22FF55',delay:0 },{ angle:8,color:'#44FF22',delay:160 },{ angle:42,color:'#00DD44',delay:310 }]
      .forEach(({ angle, color, delay }) => setTimeout(() => { playSlash(0); spawnSlash(angle,color); }, delay));
    setTimeout(() => {
      kf('zoro-pop',`
        0%  {transform:translate(-50%,-50%) scale(0) rotate(6deg);opacity:1}
        18% {transform:translate(-50%,-50%) scale(1.22) rotate(-2deg);opacity:1}
        68% {transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1}
        90% {opacity:1}100%{transform:translate(-50%,-50%) scale(1.1);opacity:0}
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
      setTimeout(() => { txt.remove(); flags.zoro=false; }, 2800);
    }, 440);
    showToast('⚔️ Santoryu activé', 'Style des Trois Sabres — Oni Giri !', 'zoro');
  }

  function spawnSlash(angleDeg, color) {
    const vw=window.innerWidth, vh=window.innerHeight;
    const len = Math.sqrt(vw*vw+vh*vh)+250;
    const sl = document.createElement('div');
    sl.style.cssText = `
      position:fixed;top:50%;left:50%;
      width:${len}px;height:5px;
      background:linear-gradient(to right,transparent 0%,${color} 18%,white 50%,${color} 82%,transparent 100%);
      box-shadow:0 0 18px ${color},0 0 40px ${color}80;
      transform:translate(-50%,-50%) rotate(${angleDeg}deg) scaleX(0);
      transform-origin:left center;z-index:2147483646;pointer-events:none;
    `;
    document.body.appendChild(sl);
    const a = sl.animate([
      {transform:`translate(-50%,-50%) rotate(${angleDeg}deg) scaleX(0)`,opacity:1},
      {transform:`translate(-50%,-50%) rotate(${angleDeg}deg) scaleX(1)`,opacity:1,offset:0.28},
      {transform:`translate(-50%,-50%) rotate(${angleDeg}deg) scaleX(1)`,opacity:0.85,offset:0.55},
      {transform:`translate(-50%,-50%) rotate(${angleDeg}deg) scaleX(1)`,opacity:0}
    ], {duration:700,easing:'ease-out',fill:'forwards'});
    a.onfinish = () => sl.remove();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TOAST
  // ═══════════════════════════════════════════════════════════════════
  const THEMES = {
    jedi:  { accent:'#4FC3F7', bg:'rgba(0,8,32,0.96)',  label:'STAR WARS' },
    sith:  { accent:'#FF5252', bg:'rgba(28,0,0,0.96)',  label:'STAR WARS' },
    vader: { accent:'#CC0000', bg:'rgba(10,0,0,0.97)',  label:'STAR WARS' },
    luffy: { accent:'#FFD700', bg:'rgba(18,6,0,0.96)',  label:'ONE PIECE' },
    zoro:  { accent:'#44FF88', bg:'rgba(0,14,6,0.96)',  label:'ONE PIECE' },
  };

  function showToast(title, subtitle, type) {
    document.getElementById('sw-toast')?.remove();
    const { accent, bg, label } = THEMES[type] || THEMES.jedi;
    const bars = Array(6).fill(`<span style="flex:1;height:2px;background:${accent};border-radius:1px;opacity:0.65;display:block"></span>`).join('');
    const t = document.createElement('div');
    t.id = 'sw-toast';
    t.innerHTML = `
      <div style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:4px;color:${accent};margin-bottom:9px;text-transform:uppercase">✦ &nbsp;${label}&nbsp; ✦</div>
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
    requestAnimationFrame(() => requestAnimationFrame(() => { t.style.transform='translateX(0)'; }));
    setTimeout(() => { t.style.transform='translateX(130%)'; setTimeout(() => t.remove(),500); }, 4800);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Inject @keyframes une seule fois
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
  //  Indice console
  // ═══════════════════════════════════════════════════════════════════
  console.log(
    '%c ⚔️  EASTER EGGS %c\n⭐ Star Wars → jedi · sith · vader\n🏴‍☠️ One Piece  → luffy · zoro',
    'font-size:13px;color:#4FC3F7;font-weight:bold;background:#000c1a;padding:5px 10px;border-radius:4px;',
    'font-size:11px;color:#888;'
  );

})();
