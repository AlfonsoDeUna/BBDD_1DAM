(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const aliasInput = $('alias');
  const screens = ['cover', 'intro', 'arrival', 'room'];
  const storageKey = 'grinberg.alias.v1';
  let alias = '';
  let screen = 'cover';
  let sceneIndex = 0;
  let timer = null;
  let deadline = 0;
  let remaining = 0;
  let paused = false;
  let automaticPause = false;
  let audioContext = null;
  let audioGain = null;
  let soundOn = false;
  const scenes = [
    {kicker:'REGISTRO 001 · LA AUSENCIA', before:'Hace tres días, el doctor Grinberg\n', accent:'dejó de responder.', note:'Ninguna llamada. Ningún testigo. Ninguna explicación.', duration:5100},
    {kicker:'REGISTRO 002 · EL LABORATORIO', before:'Su laboratorio\n', accent:'sigue encendido.', note:'Al otro lado de la puerta, una terminal espera.', duration:4600},
    {kicker:'REGISTRO 003 · EL ARCHIVO', before:'Su última investigación\n', accent:'ha sido bloqueada.', note:'Cada sala protege una parte del secreto.', duration:4800},
    {kicker:'REGISTRO 004 · LA CLAVE', before:'No dejó contraseñas.\n', accent:'Dejó patrones.', note:'Solo quien sepa reconocerlos podrá continuar.', duration:5100},
    {kicker:'REGISTRO 005 · EL MENSAJE', before:'«Si puedes leer esto,\n', accent:'todavía estás a tiempo».', note:'— Última transmisión del doctor Grinberg', duration:5100},
    {kicker:'REGISTRO 006 · TU TURNO', before:() => alias + ',\n', accent:'encuentra el patrón.', note:'Descubre qué hay al otro lado.', duration:4600}
  ];

  try { aliasInput.value = localStorage.getItem(storageKey) || ''; } catch { /* The prologue also works without storage. */ }

  function showScreen(nextScreen) {
    clearTimeout(timer);
    if (screen === 'room' && nextScreen !== 'room') window.GrinbergRoom.leave();
    screen = nextScreen;
    screens.forEach((id) => { $(id).hidden = id !== nextScreen; });
    document.body.classList.toggle('is-intro', nextScreen === 'intro');
    window.scrollTo({top:0, behavior:'instant'});
  }

  function scheduleScene() {
    clearTimeout(timer);
    if (paused || screen !== 'intro') return;
    deadline = performance.now() + remaining;
    timer = setTimeout(advanceScene, remaining);
  }

  function renderScene() {
    clearTimeout(timer);
    const data = scenes[sceneIndex];
    $('scene-kicker').textContent = data.kicker;
    $('scene-count').textContent = String(sceneIndex + 1).padStart(2, '0') + ' / 06';
    const line = typeof data.before === 'function' ? data.before() : data.before;
    const emphasis = document.createElement('strong');
    emphasis.textContent = data.accent;
    $('scene-text').replaceChildren(document.createTextNode(line), emphasis);
    $('scene-note').textContent = data.note;
    $('scene').classList.remove('animate');
    void $('scene').offsetWidth;
    $('scene').classList.add('animate');
    remaining = data.duration;
    const steps = document.querySelectorAll('.story-progress span');
    steps.forEach((step) => { step.className = ''; });
    void document.querySelector('.story-progress').offsetWidth;
    steps.forEach((step, i) => {
      step.className = i < sceneIndex ? 'complete' : i === sceneIndex ? 'active' : '';
      step.style.setProperty('--duration', data.duration + 'ms');
    });
    $('next').textContent = sceneIndex === scenes.length - 1 ? 'Abrir el archivo →' : 'Siguiente →';
    scheduleScene();
  }

  function setPaused(value) {
    if (paused === value) return;
    if (value) { remaining = Math.max(0, deadline - performance.now()); clearTimeout(timer); }
    paused = value;
    $('pause').textContent = paused ? 'Reanudar' : 'Pausar';
    $('pause').setAttribute('aria-pressed', String(paused));
    document.querySelector('.story-progress').classList.toggle('paused', paused);
    if (!paused) scheduleScene();
  }

  function startIntro() {
    showScreen('intro');
    sceneIndex = 0;
    paused = reducedMotion.matches;
    automaticPause = false;
    $('pause').textContent = paused ? 'Reanudar' : 'Pausar';
    $('pause').setAttribute('aria-pressed', String(paused));
    document.querySelector('.story-progress').classList.toggle('paused', paused);
    renderScene();
    $('scene-text').focus({preventScroll:true});
  }

  function finishIntro() {
    showScreen('arrival');
    $('player-name').textContent = alias;
    $('arrival-title').focus({preventScroll:true});
  }

  function advanceScene() {
    if (sceneIndex >= scenes.length - 1) finishIntro();
    else { sceneIndex += 1; renderScene(); }
  }

  $('entry-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = aliasInput.value.normalize('NFC').trim().replace(/\s+/g, ' ');
    const valid = /^[\p{L}\p{M}\p{N} ._-]{2,24}$/u.test(value);
    if (!valid) {
      $('alias-error').textContent = 'Escribe entre 2 y 24 caracteres: letras, números, espacios, puntos o guiones.';
      $('alias-error').hidden = false;
      aliasInput.setAttribute('aria-invalid', 'true');
      aliasInput.focus();
      return;
    }
    alias = value;
    aliasInput.value = alias;
    try { localStorage.setItem(storageKey, alias); } catch { /* Storage is optional. */ }
    $('alias-error').hidden = true;
    aliasInput.removeAttribute('aria-invalid');
    startIntro();
  });
  aliasInput.addEventListener('input', () => { $('alias-error').hidden = true; aliasInput.removeAttribute('aria-invalid'); });
  $('next').addEventListener('click', advanceScene);
  $('skip').addEventListener('click', finishIntro);
  $('pause').addEventListener('click', () => { automaticPause = false; setPaused(!paused); });
  $('replay').addEventListener('click', startIntro);
  $('back').addEventListener('click', () => { showScreen('cover'); aliasInput.focus({preventScroll:true}); });
  $('enter-room').addEventListener('click', () => { showScreen('room'); window.GrinbergRoom.enter(alias); });
  ['room-cover', 'success-cover'].forEach((id) => $(id).addEventListener('click', () => { showScreen('cover'); aliasInput.focus({preventScroll:true}); }));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (screen === 'intro' && !paused) { setPaused(true); automaticPause = true; }
      if (audioContext && audioContext.state === 'running') audioContext.suspend().catch(() => {});
    } else {
      if (screen === 'intro' && automaticPause) { automaticPause = false; setPaused(false); }
      if (soundOn && audioContext) audioContext.resume().catch(() => {});
    }
  });

  // Quiet, locally synthesized ambience. No external audio, network calls or autoplay.
  $('sound').addEventListener('click', async () => {
    const button = $('sound');
    button.disabled = true;
    try {
      if (!audioContext) {
        const AudioAPI = window.AudioContext || window.webkitAudioContext;
        if (!AudioAPI) throw new Error('Audio unavailable');
        audioContext = new AudioAPI();
        audioGain = audioContext.createGain();
        audioGain.gain.value = 0;
        audioGain.connect(audioContext.destination);
        [55, 82.41, 110.35].forEach((frequency, index) => {
          const oscillator = audioContext.createOscillator();
          const voice = audioContext.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          voice.gain.value = index === 0 ? .4 : .12;
          oscillator.connect(voice).connect(audioGain);
          oscillator.start();
        });
      }
      await audioContext.resume();
      soundOn = !soundOn;
      audioGain.gain.setTargetAtTime(soundOn ? .14 : 0, audioContext.currentTime, .3);
      button.setAttribute('aria-pressed', String(soundOn));
      $('sound-label').textContent = soundOn ? 'SONIDO: ON' : 'SONIDO: OFF';
    } catch {
      soundOn = false;
      button.setAttribute('aria-pressed', 'false');
      $('sound-label').textContent = 'SIN AUDIO';
    } finally { button.disabled = false; }
  });

  // Convert our vector drawing into real ASCII text. Keep the small hand-drawn fallback if unavailable.
  const art = $('portrait');
  const stage = document.querySelector('.portrait-stage');
  let artColumns = 110;
  let artRows = 77;
  function sizeArt() {
    const width = stage.clientWidth * .97;
    const height = stage.clientHeight * .96;
    art.style.fontSize = Math.min(width / (artColumns * .63), height / artRows) + 'px';
  }
  const portraitImage = new Image();
  portraitImage.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = artColumns;
      canvas.height = artRows;
      const context = canvas.getContext('2d', {willReadFrequently:true});
      if (!context) return;
      context.drawImage(portraitImage, 0, 0, artColumns, artRows);
      const pixels = context.getImageData(0, 0, artColumns, artRows).data;
      const ramp = ' .,:;i1tfLCG08@';
      let result = '';
      for (let y = 0; y < artRows; y++) {
        for (let x = 0; x < artColumns; x++) {
          const pixel = (y * artColumns + x) * 4;
          const gray = pixels[pixel] * (pixels[pixel + 3] / 255);
          const texture = ((x * 19 + y * 31) % 13 - 6) * 2.4;
          const level = gray < 9 ? 0 : Math.max(1, Math.min(ramp.length - 1, Math.round((gray + texture) / 255 * (ramp.length - 1))));
          result += ramp[level];
        }
        result += '\n';
      }
      art.textContent = result.trimEnd();
      sizeArt();
    } catch { /* The fallback is already visible. */ }
  };
  portraitImage.src = 'portrait.svg?v=2';
  if (window.ResizeObserver) new ResizeObserver(sizeArt).observe(stage);
  else window.addEventListener('resize', sizeArt);
  sizeArt();
})();
