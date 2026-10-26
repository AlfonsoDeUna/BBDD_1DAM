(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const panels = ['welcome-panel','note-panel','locked-panel','challenge-panel'];
  const configs = window.GrinbergRooms;
  const memoryStates = new Map();
  let roomIndex = 0;
  let config = configs[0];
  let player = '';
  let state = freshState();
  let stage = 0;
  let activeObject = '';
  let worker = null;
  let deadline = null;
  let resetPending = false;
  let resetTimeout = null;

  function freshState() { return {note:false, solved:[false,false], escaped:false, patterns:['',''], attempts:0, hints:[0,0]}; }
  function isSql() { return config.challenges[stage]?.kind === 'sql'; }
  function entry() { return $(isSql() ? 'sql-check' : 'pattern'); }
  function storageKey() { return 'grinberg.room' + (roomIndex + 1) + '.v1.' + player; }
  function stored(key) { try { return localStorage.getItem(key) || memoryStates.get(key); } catch { return memoryStates.get(key); } }
  function save() { const value = JSON.stringify(state); memoryStates.set(storageKey(),value); try { localStorage.setItem(storageKey(), value); } catch { /* Optional persistence. */ } }
  function load() {
    state = freshState();
    try {
      const saved = JSON.parse(stored(storageKey()));
      if (!saved || typeof saved !== 'object') return;
      state.note = saved.note === true;
      state.solved = [saved.solved?.[0] === true, saved.solved?.[0] === true && saved.solved?.[1] === true];
      state.escaped = state.solved[1] && saved.escaped === true;
      state.patterns = [0,1].map((i) => typeof saved.patterns?.[i] === 'string' ? saved.patterns[i].slice(0,configs[roomIndex].challenges[i].kind === 'sql' ? 1200 : 120) : '');
      state.attempts = Number.isSafeInteger(saved.attempts) ? Math.max(0, saved.attempts) : 0;
      state.hints = [0,1].map((i) => Number.isInteger(saved.hints?.[i]) ? Math.max(0,Math.min(3,saved.hints[i])) : 0);
    } catch { /* Ignore damaged saved data. */ }
  }
  function stopTest() {
    if (worker) worker.terminate();
    worker = null;
    clearTimeout(deadline);
    $('test-pattern').disabled = false;
    $('test-pattern').firstElementChild.textContent = isSql() ? 'COMPROBAR CHECK' : 'PROBAR PATRÓN';
    $('pattern-form').removeAttribute('aria-busy');
  }
  function cancelReset() { clearTimeout(resetTimeout); resetPending = false; $('room-reset').textContent = 'Reiniciar sala'; }
  function applyRoom() {
    const number = String(roomIndex + 1).padStart(2,'0');
    $('room').dataset.scene = config.scene;
    $('room-chapter').textContent = 'CAPÍTULO ' + number + ' / ' + config.chapter;
    $('room-title-label').textContent = config.title;
    $('room-location').textContent = config.location;
    $('wall-number').textContent = number;
    document.querySelector('.room-scene').setAttribute('aria-label','Escena: ' + config.title + '. Pulsa un objeto para investigarlo.');
    document.querySelectorAll('.room-route li').forEach((item,i) => {
      item.classList.toggle('route-current',i === roomIndex);
      item.classList.toggle('route-done',i < roomIndex);
      if (i === roomIndex) item.setAttribute('aria-current','step'); else item.removeAttribute('aria-current');
    });
    $('object-terminal').querySelector('.object-index').textContent = '02 / ' + config.terminalName;
    $('object-door').querySelector('.object-index').textContent = '03 / ' + config.doorName;
    $('object-door').querySelector('pre').textContent = config.doorArt.join('\n');
    $('welcome-panel').querySelector('.eyebrow').textContent = config.welcomeKicker;
    $('welcome-panel').querySelector('h3').textContent = config.welcomeTitle;
    $('welcome-first').textContent = config.welcome[0];
    $('welcome-second').textContent = config.welcome[1];
    $('note-panel').querySelector('h3').textContent = config.noteTitle;
    $('note-content').replaceChildren();
    config.note.forEach((text,i) => {
      if (i) $('note-content').append(document.createElement('br'),document.createElement('br'));
      $('note-content').append(document.createTextNode(text));
    });
    $('note-to-terminal').firstElementChild.textContent = 'INVESTIGAR: ' + config.terminalName;
    $('locked-panel').querySelector('h3').textContent = config.lockedTitle;
    $('locked-first').textContent = config.locked[0];
    $('locked-second').textContent = config.locked[1];
    $('locked-to-terminal').firstElementChild.textContent = 'EXAMINAR: ' + config.terminalName;
    $('recovered-message').querySelector('.eyebrow').textContent = config.recoveredTitle;
    $('recovered-text').textContent = config.recovered;
    $('message-to-door').firstElementChild.textContent = 'EXAMINAR: ' + config.doorName;
    $('ready-text').textContent = config.ready;
    $('open-door').firstElementChild.textContent = config.openAction;
  }
  function updateRoom() {
    const total = state.solved.filter(Boolean).length;
    $('room-progress').textContent = total + ' / 2 PRUEBAS';
    $('room-door-status').textContent = state.solved[1] ? 'ACCESO AUTORIZADO' : state.solved[0] ? 'SISTEMA ACTIVADO' : 'ACCESO CERRADO';
    $('room-door-status').classList.toggle('unlocked-label', state.solved[1]);
    $('object-terminal').classList.toggle('solved-object', state.solved[0]);
    $('object-door').classList.toggle('solved-object', state.solved[1]);
    $('terminal-object-status').textContent = (state.solved[0] ? config.terminalSolved + ' ✓' : config.terminalAction + ' ↗');
    $('door-object-status').textContent = state.solved[1] ? config.doorSolved + ' ↗' : state.solved[0] ? config.doorReady + ' ↗' : config.doorLocked;
    $('object-terminal').querySelector('pre').textContent = (state.solved[0] ? config.solvedArt : config.art).join('\n');
    const found = [];
    if (state.note) found.push(roomIndex === 2 ? 'Nota de Mara' : 'Nota de G.');
    if (state.solved[0]) found.push(config.evidence);
    if (state.solved[1]) found.push(config.access);
    $('inventory-content').textContent = found.length ? found.join('  /  ') : '— Todavía no has recogido ninguna pista.';
  }
  function showPanel(id, source, focus = true) {
    stopTest();
    panels.forEach((panel) => { $(panel).hidden = panel !== id; });
    $('inspection-source').textContent = source;
    $('inspection-state').textContent = '[ ' + (id === 'note-panel' ? 'PISTA' : 'EN CURSO') + ' ]';
    ['note','terminal','door'].forEach((object) => $('object-' + object).setAttribute('aria-pressed', String(activeObject === object)));
    if (focus) $(id).querySelector('h3').focus({preventScroll:true});
    if (focus && matchMedia('(max-width: 850px)').matches) $('inspection').scrollIntoView({behavior:'instant',block:'start'});
  }
  function readNote() {
    state.note = true; activeObject = 'note'; save(); updateRoom(); showPanel('note-panel',roomIndex === 2 ? 'MANTENIMIENTO / NOTA DE MARA' : 'DOCUMENTO 01 / NOTA DE G.');
  }
  function showFeedback(text, kind = 'error') {
    $('pattern-feedback').hidden = false;
    $('pattern-feedback').className = 'pattern-feedback ' + kind;
    $('pattern-feedback').textContent = text;
  }
  function paintRecords(rows) {
    $('records').replaceChildren();
    const data = rows || config.challenges[stage].records.map((text) => ({text,matched:null}));
    data.forEach((row) => {
      const item = document.createElement('li');
      const code = document.createElement('code');
      const indicator = document.createElement('span');
      item.className = row.matched === null ? '' : row.matched ? 'matched' : 'unmatched';
      if (row.matched && row.length > 0) {
        const mark = document.createElement('mark');
        mark.textContent = row.text.slice(row.start, row.start + row.length).replace(/ /g,'·');
        code.append(document.createTextNode(row.text.slice(0,row.start).replace(/ /g,'·')),mark,document.createTextNode(row.text.slice(row.start + row.length).replace(/ /g,'·')));
      } else code.textContent = row.text.replace(/ /g,'·');
      indicator.textContent = row.matched === null ? '·' : row.matched ? '✓' : '—';
      indicator.setAttribute('aria-label', row.matched === null ? 'Sin evaluar' : row.matched ? 'Seleccionado' : 'Descartado');
      item.append(code,indicator);
      $('records').append(item);
    });
    $('match-count').textContent = rows ? rows.filter((r) => r.matched).length + ' / ' + rows.length + ' SELECCIONADOS' : 'SIN FILTRAR';
  }
  function updateHints() {
    const n = state.hints[stage];
    $('hint-body').hidden = n === 0;
    $('hint-button').textContent = n ? 'CUADERNO DEL DOCTOR / PISTA ' + n + ' DE 3' : '+ Consultar el cuaderno del doctor';
    $('hint-text').textContent = n ? config.challenges[stage].hints[n - 1] : '';
    $('next-hint').hidden = n === 3;
  }
  function revealHint() { if (state.hints[stage] < 3) state.hints[stage]++; save(); updateHints(); }
  function inspectChallenge(nextStage) {
    stage = nextStage;
    activeObject = stage === 0 ? 'terminal' : 'door';
    if (stage === 1 && !state.solved[0]) { showPanel('locked-panel',config.doorName + ' / SIN SINCRONIZAR'); return; }
    const challenge = config.challenges[stage];
    showPanel('challenge-panel',challenge.source,false);
    $('challenge-kicker').textContent = 'PRUEBA 0' + (stage + 1) + ' / ' + challenge.kicker;
    $('challenge-title').textContent = challenge.title;
    $('challenge-description').textContent = challenge.description;
    $('record-label').textContent = challenge.label;
    $('lesson').hidden = !challenge.lesson;
    if (challenge.lesson) {
      $('lesson-title').textContent = challenge.lesson.title;
      $('lesson-code').textContent = challenge.lesson.code;
      $('lesson-text').textContent = challenge.lesson.text;
      $('lesson-reference').hidden = !challenge.lesson.url;
      if (challenge.lesson.url) { $('lesson-reference').href = challenge.lesson.url; $('lesson-reference').textContent = challenge.lesson.link; }
    }
    $('regex-entry').hidden = isSql();
    $('sql-entry').hidden = !isSql();
    $('pattern-help').textContent = isSql() ? 'Escribe solo el CHECK. Puedes añadir CONSTRAINT nombre delante. No hace falta CREATE TABLE.' : 'Escribe solo el patrón, sin comillas ni barras / /.';
    $('previous-pattern').textContent = state.patterns[0];
    entry().value = state.patterns[stage];
    entry().disabled = state.solved[stage];
    entry().removeAttribute('aria-invalid');
    $('pattern-form').hidden = state.solved[stage];
    $('pattern-feedback').hidden = true;
    $('notebook').hidden = state.solved[stage];
    $('recovered-message').hidden = !(stage === 0 && state.solved[0]);
    $('door-ready').hidden = !(stage === 1 && state.solved[1]);
    if (state.solved[stage]) {
      $('inspection-state').textContent = '[ RESUELTO ]';
      paintRecords(challenge.records.map((text) => {
        const match = new RegExp(challenge.expected).exec(text);
        return {text,matched:!!match,start:match ? match.index : -1,length:match ? match[0].length : 0};
      }));
      showFeedback(challenge.success,'success');
    } else paintRecords();
    updateHints();
    $('challenge-title').focus({preventScroll:true});
    if (matchMedia('(max-width: 850px)').matches) $('inspection').scrollIntoView({behavior:'instant',block:'start'});
  }
  function runTest(event) {
    event.preventDefault();
    if (state.solved[stage] || worker) return;
    const pattern = entry().value;
    if (!pattern.trim()) { showFeedback(isSql() ? 'Escribe tu CHECK completo siguiendo la plantilla.' : 'La terminal está esperando un patrón. Escribe uno antes de probar.'); entry().focus(); return; }
    state.patterns[stage] = pattern;
    state.attempts++;
    save();
    $('pattern-feedback').hidden = true;
    $('test-pattern').disabled = true;
    $('test-pattern').firstElementChild.textContent = 'COMPROBANDO…';
    $('pattern-form').setAttribute('aria-busy','true');
    const evaluatingStage = stage;
    try {
      worker = new Worker('regex-worker.js?v=6');
      worker.onmessage = ({data}) => {
        if (data.ready) {
          clearTimeout(deadline);
          deadline = setTimeout(() => { stopTest(); showFeedback('El patrón tarda demasiado en responder. Prueba una expresión más sencilla.'); },800);
          worker.postMessage({pattern,stage,room:roomIndex});
          return;
        }
        stopTest();
        if (data.error) {
          entry().setAttribute('aria-invalid','true');
          showFeedback(data.message || 'La expresión no se puede interpretar. Revisa si hay paréntesis o corchetes sin cerrar.');
          return;
        }
        entry().removeAttribute('aria-invalid');
        paintRecords(data.rows);
        if (data.passed) {
          state.solved[evaluatingStage] = true; save(); updateRoom();
          $('pattern-form').hidden = true;
          $('notebook').hidden = true;
          $('inspection-state').textContent = '[ RESUELTO ]';
          showFeedback(config.challenges[stage].success,'success');
          $('recovered-message').hidden = stage !== 0;
          $('door-ready').hidden = stage !== 1;
          $(stage === 0 ? 'message-to-door' : 'open-door').focus({preventScroll:true});
        } else {
          const sample = data.failed.text === '' ? '(texto vacío)' : '«' + data.failed.text.replace(/ /g,'·') + '»';
          showFeedback(data.failed.matched ? 'Se está colando ' + sample + '. Tu patrón lo acepta, pero debería rechazarlo.' : 'Se ha quedado fuera ' + sample + '. Tu patrón lo rechaza, pero debería aceptarlo.');
        }
      };
      worker.onerror = () => { stopTest(); showFeedback('No se ha podido iniciar el lector. Vuelve a intentarlo o recarga la página; tu avance está guardado.'); };
      deadline = setTimeout(() => { stopTest(); showFeedback('El lector no ha terminado de cargar. Comprueba la conexión y vuelve a intentarlo.'); },10000);
    } catch { stopTest(); showFeedback('No se ha podido iniciar el lector en este navegador. Prueba con una versión actual de Chrome, Edge o Firefox.'); }
  }
  function completeRoom() {
    if (!state.solved[1]) return;
    stopTest();
    state.escaped = true; save();
    $('room-play').hidden = true; $('room-success').hidden = false;
    const final = roomIndex === configs.length - 1;
    $('room-success').classList.toggle('game-finished',final);
    $('success-chapter').textContent = final ? 'INVESTIGACIÓN COMPLETADA / ARCHIVO RESTAURADO' : 'SALA 0' + (roomIndex + 1) + ' / SUPERADA';
    $('room-success-title').textContent = config.successTitle;
    $('success-personal').textContent = player + ', ' + config.successPersonal;
    $('fragment-title').textContent = config.fragmentTitle;
    $('fragment-text').textContent = config.fragment;
    $('success-next').textContent = config.nextText;
    $('next-room').hidden = !config.nextAction;
    $('next-room').firstElementChild.textContent = config.nextAction || 'CONTINUAR';
    let attempts = state.attempts;
    let hints = state.hints.reduce((a,b) => a+b,0);
    if (final) {
      for (let index=0;index<roomIndex;index++) {
        try {
          const saved = JSON.parse(stored('grinberg.room' + (index + 1) + '.v1.' + player));
          if (Number.isSafeInteger(saved?.attempts)) attempts += Math.max(0,saved.attempts);
          for (const value of saved?.hints || []) if (Number.isInteger(value)) hints += Math.max(0,Math.min(3,value));
        } catch { /* The game can finish without persistent browser storage. */ }
      }
    }
    $('success-tests').textContent = final ? (configs.length * 2) + ' / ' + (configs.length * 2) : '2 / 2';
    $('success-attempts').textContent = attempts;
    $('success-hints').textContent = hints;
    $('room-success-title').focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'instant'});
  }
  function restart() {
    stopTest(); cancelReset(); state = freshState(); save(); activeObject = '';
    $('room-play').hidden = false; $('room-success').hidden = true;
    updateRoom(); showPanel('welcome-panel','EXPLORACIÓN');
    window.scrollTo({top:0,behavior:'instant'});
  }
  $('object-note').addEventListener('click',readNote);
  $('begin-note').addEventListener('click',readNote);
  ['object-terminal','note-to-terminal','locked-to-terminal'].forEach((id) => $(id).addEventListener('click',() => inspectChallenge(0)));
  ['object-door','message-to-door'].forEach((id) => $(id).addEventListener('click',() => inspectChallenge(1)));
  $('pattern-form').addEventListener('submit',runTest);
  ['pattern','sql-check'].forEach((id) => $(id).addEventListener('input',() => {
    stopTest(); state.patterns[stage] = entry().value; save();
    entry().removeAttribute('aria-invalid'); $('pattern-feedback').hidden = true; paintRecords();
  }));
  $('hint-button').addEventListener('click',() => { if (!state.hints[stage]) revealHint(); else $('hint-body').hidden = !$('hint-body').hidden; });
  $('next-hint').addEventListener('click',revealHint);
  $('open-door').addEventListener('click',completeRoom);
  $('next-room').addEventListener('click',() => { if (state.escaped && roomIndex < configs.length - 1) selectRoom(roomIndex + 1); });
  $('room-replay').addEventListener('click',restart);
  $('room-reset').addEventListener('click',() => {
    if (resetPending) restart();
    else { resetPending = true; $('room-reset').textContent = 'Confirmar reinicio'; resetTimeout = setTimeout(cancelReset,6000); }
  });
  function selectRoom(index) {
      stopTest(); roomIndex = index; config = configs[index]; load(); cancelReset(); activeObject = '';
      $('room-alias').textContent = player;
      applyRoom();
      $('room-play').hidden = false; $('room-success').hidden = true; updateRoom();
      if (state.escaped) { completeRoom(); return; }
      else if (state.solved[0]) inspectChallenge(1);
      else if (state.note) inspectChallenge(0);
      else showPanel('welcome-panel','EXPLORACIÓN',false);
      $('room-title').focus({preventScroll:true});
      window.scrollTo({top:0,behavior:'instant'});
  }
  window.GrinbergRoom = {
    enter(alias) {
      player = alias;
      let next = 0;
      for (let i = 0; i < configs.length; i++) {
        roomIndex = i; load(); next = i;
        if (!state.escaped) break;
      }
      selectRoom(next);
    },
    leave() { stopTest(); cancelReset(); }
  };
})();
