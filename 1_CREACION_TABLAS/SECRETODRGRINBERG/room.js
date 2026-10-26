(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const panels = ['welcome-panel','note-panel','locked-panel','challenge-panel'];
  const records = [
    ['CANAL_04 / SIN SEÑAL','ORIGEN / TRANSMISIÓN 01','SENSOR / PUERTA CERRADA','CANAL_07 > ORIGEN','origen / señal de prueba','PAQUETE_ORIGEN_03','OR1GEN / DATO CORRUPTO'],
    ['ORIGEN','ORIGEN_2','FALSO_ORIGEN','ORIGEN_COPIA','origen',' ORIGEN','ORIGEN ']
  ];
  const hints = [
    ['Un patrón puede encontrar un texto dentro de otro. Busca la marca que el doctor escribió en su nota.', 'Para buscar una palabra tal cual, basta con escribir sus letras. Las mayúsculas cuentan.', 'Prueba ORIGEN. Seleccionará los registros que contienen esas seis letras, estén donde estén.'],
    ['Buscar una palabra dentro de un código no garantiza que sea el código completo. Necesitas marcar sus límites.', '^ marca el inicio y $ marca el final. Coloca la palabra entre las dos anclas.', 'Prueba ^ORIGEN$. Así no queda espacio para caracteres antes ni después de la palabra.']
  ];
  const storagePrefix = 'grinberg.room1.v1.';
  let player = '';
  let state = freshState();
  let stage = 0;
  let activeObject = '';
  let worker = null;
  let deadline = null;
  let resetPending = false;
  let resetTimeout = null;

  function freshState() { return {note:false, solved:[false,false], escaped:false, patterns:['',''], attempts:0, hints:[0,0]}; }
  function save() { try { localStorage.setItem(storagePrefix + player, JSON.stringify(state)); } catch { /* Optional persistence. */ } }
  function load() {
    state = freshState();
    try {
      const saved = JSON.parse(localStorage.getItem(storagePrefix + player));
      if (!saved || typeof saved !== 'object') return;
      state.note = saved.note === true;
      state.solved = [saved.solved?.[0] === true, saved.solved?.[0] === true && saved.solved?.[1] === true];
      state.escaped = state.solved[1] && saved.escaped === true;
      state.patterns = [0,1].map((i) => typeof saved.patterns?.[i] === 'string' ? saved.patterns[i].slice(0,120) : '');
      state.attempts = Number.isSafeInteger(saved.attempts) ? Math.max(0, saved.attempts) : 0;
      state.hints = [0,1].map((i) => Number.isInteger(saved.hints?.[i]) ? Math.max(0,Math.min(3,saved.hints[i])) : 0);
    } catch { /* Ignore damaged saved data. */ }
  }
  function stopTest() {
    if (worker) worker.terminate();
    worker = null;
    clearTimeout(deadline);
    $('test-pattern').disabled = false;
    $('test-pattern').firstElementChild.textContent = 'PROBAR PATRÓN';
    $('pattern-form').removeAttribute('aria-busy');
  }
  function cancelReset() { clearTimeout(resetTimeout); resetPending = false; $('room-reset').textContent = 'Reiniciar sala'; }
  function updateRoom() {
    const total = state.solved.filter(Boolean).length;
    $('room-progress').textContent = total + ' / 2 PRUEBAS';
    $('room-door-status').textContent = state.solved[1] ? 'ACCESO AUTORIZADO' : state.solved[0] ? 'LECTOR ACTIVADO' : 'ACCESO CERRADO';
    $('room-door-status').classList.toggle('unlocked-label', state.solved[1]);
    $('object-terminal').classList.toggle('solved-object', state.solved[0]);
    $('object-door').classList.toggle('solved-object', state.solved[1]);
    $('terminal-object-status').textContent = state.solved[0] ? 'TRANSMISIÓN RECUPERADA ✓' : 'BUSCAR TRANSMISIÓN ↗';
    $('door-object-status').textContent = state.solved[1] ? 'PUERTA DESBLOQUEADA ↗' : state.solved[0] ? 'ACTIVAR CERRADURA ↗' : 'CERRADURA BLOQUEADA';
    $('object-terminal').querySelector('pre').textContent = '  .--------------------.\n  | >_                 |\n  |   ' + (state.solved[0] ? 'SEÑAL RECUPERADA ' : 'SEÑAL PERDIDA    ') + ' |\n  |                    |\n  \'--------------------\'\n          |    |\n       ___|____|___\n  ____/____________\\____';
    const found = [];
    if (state.note) found.push('Nota de G.');
    if (state.solved[0]) found.push('Transmisión ORIGEN');
    if (state.solved[1]) found.push('Acceso al archivo');
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
    state.note = true; activeObject = 'note'; save(); updateRoom(); showPanel('note-panel','DOCUMENTO 01 / NOTA DE G.');
  }
  function showFeedback(text, kind = 'error') {
    $('pattern-feedback').hidden = false;
    $('pattern-feedback').className = 'pattern-feedback ' + kind;
    $('pattern-feedback').textContent = text;
  }
  function paintRecords(rows) {
    $('records').replaceChildren();
    const data = rows || records[stage].map((text) => ({text,matched:null}));
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
    $('hint-text').textContent = n ? hints[stage][n - 1] : '';
    $('next-hint').hidden = n === 3;
  }
  function revealHint() { if (state.hints[stage] < 3) state.hints[stage]++; save(); updateHints(); }
  function inspectChallenge(nextStage) {
    stage = nextStage;
    activeObject = stage === 0 ? 'terminal' : 'door';
    if (stage === 1 && !state.solved[0]) { showPanel('locked-panel','PUERTA 02 / LECTOR'); return; }
    showPanel('challenge-panel', stage === 0 ? 'TERMINAL / FILTRO DE TRANSMISIONES' : 'PUERTA 02 / CONTROL DE ACCESO', false);
    $('challenge-kicker').textContent = stage === 0 ? 'PRUEBA 01 / ENCONTRAR LA MARCA' : 'PRUEBA 02 / LOS LÍMITES DEL CÓDIGO';
    $('challenge-title').textContent = stage === 0 ? 'Una señal entre el ruido.' : 'Una palabra. Nada más.';
    $('challenge-description').textContent = stage === 0 ? 'Selecciona todos los registros que contienen la marca del doctor, esté donde esté. Si no sabes cuál es, lee la nota de la mesa.' : 'La transmisión dice: «Solo ORIGEN. Ni un carácter delante. Ni uno detrás». Acepta el código auténtico y rechaza todas las copias. Los puntos · representan espacios.';
    $('record-label').textContent = stage === 0 ? 'REGISTROS DE LA TERMINAL' : 'CÓDIGOS DEL LECTOR';
    $('pattern').value = state.patterns[stage];
    $('pattern').disabled = state.solved[stage];
    $('pattern').removeAttribute('aria-invalid');
    $('pattern-form').hidden = state.solved[stage];
    $('pattern-feedback').hidden = true;
    $('notebook').hidden = state.solved[stage];
    $('recovered-message').hidden = !(stage === 0 && state.solved[0]);
    $('door-ready').hidden = !(stage === 1 && state.solved[1]);
    if (state.solved[stage]) {
      $('inspection-state').textContent = '[ RESUELTO ]';
      paintRecords(records[stage].map((text) => {
        const matched = stage === 0 ? text.includes('ORIGEN') : text === 'ORIGEN';
        return {text,matched,start:matched ? text.indexOf('ORIGEN') : -1,length:matched ? 6 : 0};
      }));
      showFeedback(stage === 0 ? 'FILTRO RESTAURADO. Has recuperado la transmisión del doctor.' : 'CERRADURA RESTAURADA. Solo el código auténtico obtiene acceso.','success');
    } else paintRecords();
    updateHints();
    $('challenge-title').focus({preventScroll:true});
    if (matchMedia('(max-width: 850px)').matches) $('inspection').scrollIntoView({behavior:'instant',block:'start'});
  }
  function runTest(event) {
    event.preventDefault();
    if (state.solved[stage] || worker) return;
    const pattern = $('pattern').value;
    if (!pattern.trim()) { showFeedback('La terminal está esperando un patrón. Escribe uno antes de probar.'); $('pattern').focus(); return; }
    state.patterns[stage] = pattern;
    state.attempts++;
    save();
    $('pattern-feedback').hidden = true;
    $('test-pattern').disabled = true;
    $('test-pattern').firstElementChild.textContent = 'COMPROBANDO…';
    $('pattern-form').setAttribute('aria-busy','true');
    const evaluatingStage = stage;
    try {
      worker = new Worker('regex-worker.js?v=3');
      worker.onmessage = ({data}) => {
        stopTest();
        if (data.error) {
          $('pattern').setAttribute('aria-invalid','true');
          showFeedback('La expresión no se puede interpretar. Revisa si hay paréntesis o corchetes sin cerrar.');
          return;
        }
        $('pattern').removeAttribute('aria-invalid');
        paintRecords(data.rows);
        if (data.passed) {
          state.solved[evaluatingStage] = true; save(); updateRoom();
          $('pattern-form').hidden = true;
          $('notebook').hidden = true;
          $('inspection-state').textContent = '[ RESUELTO ]';
          showFeedback(stage === 0 ? 'TRANSMISIÓN RECUPERADA. El doctor ha dejado un mensaje para ti.' : 'ACCESO AUTORIZADO. La cerradura se ha desbloqueado.','success');
          $('recovered-message').hidden = stage !== 0;
          $('door-ready').hidden = stage !== 1;
          $(stage === 0 ? 'message-to-door' : 'open-door').focus({preventScroll:true});
        } else {
          const sample = data.failed.text === '' ? '(texto vacío)' : '«' + data.failed.text.replace(/ /g,'·') + '»';
          showFeedback(data.failed.matched ? 'Se está colando ' + sample + '. Tu patrón lo acepta, pero debería rechazarlo.' : 'Se ha quedado fuera ' + sample + '. Tu patrón lo rechaza, pero debería aceptarlo.');
        }
      };
      worker.onerror = () => { stopTest(); showFeedback('No se ha podido iniciar el lector. Vuelve a intentarlo o recarga la página; tu avance está guardado.'); };
      deadline = setTimeout(() => { stopTest(); showFeedback('El patrón tarda demasiado en responder. Prueba una expresión más sencilla.'); }, 1200);
      worker.postMessage({pattern,stage});
    } catch { stopTest(); showFeedback('No se ha podido iniciar el lector en este navegador. Prueba con una versión actual de Chrome, Edge o Firefox.'); }
  }
  function completeRoom() {
    if (!state.solved[1]) return;
    stopTest();
    state.escaped = true; save();
    $('room-play').hidden = true; $('room-success').hidden = false;
    $('success-personal').textContent = player + ', la puerta del archivo se ha abierto.';
    $('success-attempts').textContent = state.attempts;
    $('success-hints').textContent = state.hints.reduce((a,b) => a+b,0);
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
  $('pattern').addEventListener('input',() => {
    stopTest(); state.patterns[stage] = $('pattern').value; save();
    $('pattern').removeAttribute('aria-invalid'); $('pattern-feedback').hidden = true; paintRecords();
  });
  $('hint-button').addEventListener('click',() => { if (!state.hints[stage]) revealHint(); else $('hint-body').hidden = !$('hint-body').hidden; });
  $('next-hint').addEventListener('click',revealHint);
  $('open-door').addEventListener('click',completeRoom);
  $('room-replay').addEventListener('click',restart);
  $('room-reset').addEventListener('click',() => {
    if (resetPending) restart();
    else { resetPending = true; $('room-reset').textContent = 'Confirmar reinicio'; resetTimeout = setTimeout(cancelReset,6000); }
  });
  window.GrinbergRoom = {
    enter(alias) {
      player = alias; load(); cancelReset(); activeObject = '';
      $('room-alias').textContent = alias;
      $('room-play').hidden = false; $('room-success').hidden = true; updateRoom();
      if (state.escaped) { completeRoom(); return; }
      else if (state.solved[0]) inspectChallenge(1);
      else if (state.note) inspectChallenge(0);
      else showPanel('welcome-panel','EXPLORACIÓN',false);
      $('room-title').focus({preventScroll:true});
    },
    leave() { stopTest(); cancelReset(); }
  };
})();
