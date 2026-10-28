(() => {
  const pages = [
    ['01', 'Debate inicial', 'inicio-laboratorio.html'],
    ['02', 'Qué es la clave primaria', 'laboratorio-claves-primarias.html'],
    ['03', 'Cómo elegir la clave primaria', 'elegir-clave-primaria.html'],
    ['04', 'Sintaxis PRIMARY KEY y práctica', 'sintaxis-clave-primaria.html'],
    ['05', 'Relaciones uno a muchos', 'relaciones-uno-a-muchos.html'],
    ['06', 'Claves foráneas', 'claves-foraneas.html'],
    ['07', 'Sintaxis FOREIGN KEY', 'sintaxis-clave-foranea.html'],
    ['07B', 'Ejercicios de FOREIGN KEY', 'ejercicios-foreign-key.html'],
    ['08', 'Integridad referencial interactiva', 'integridad-referencial.html'],
    ['09', 'Todo en SQL', 'sql-claves-integridad.html'],
    ['09B', 'Ejercicios de SQL', 'ejercicios-sql-completo.html'],
    ['09C', 'Ejercicios de integridad referencial', 'ejercicios-integridad-referencial.html'],
    ['10', 'Relaciones 1:N, N:M y 1:1', 'relaciones-entre-tablas.html'],
    ['11', 'Actividad evaluable', 'actividad-evaluable.html']
  ];
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'lab-menu-trigger';
  trigger.setAttribute('aria-label', 'Abrir el menú del laboratorio');
  trigger.setAttribute('title', 'Índice del laboratorio');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'lab-menu-dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1.6"/><circle cx="9" cy="3" r="1.6"/><circle cx="15" cy="3" r="1.6"/><circle cx="3" cy="9" r="1.6"/><circle cx="9" cy="9" r="1.6"/><circle cx="15" cy="9" r="1.6"/><circle cx="3" cy="15" r="1.6"/><circle cx="9" cy="15" r="1.6"/><circle cx="15" cy="15" r="1.6"/></svg>';
  const dialog = document.createElement('dialog');
  dialog.id = 'lab-menu-dialog';
  dialog.className = 'lab-menu-dialog';
  dialog.setAttribute('aria-labelledby', 'lab-menu-title');
  dialog.innerHTML = '<div class="lab-menu-heading"><h2 id="lab-menu-title">Índice del laboratorio</h2><button type="button" class="lab-menu-close" aria-label="Cerrar el menú">×</button></div><nav aria-label="Páginas del laboratorio"><ol></ol></nav><p class="lab-menu-footer">Elige una pantalla para continuar la clase.</p>';
  let current = decodeURIComponent(location.pathname.split('/').pop() || 'inicio-laboratorio.html');
  if (current === 'index.html') current = 'inicio-laboratorio.html';
  const list = dialog.querySelector('ol');
  for (const [number, label, file] of pages) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = file;
    const numberSpan = document.createElement('span');
    numberSpan.className = 'lab-menu-number';
    numberSpan.textContent = number;
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    link.append(numberSpan, labelSpan);
    if (file === current) link.setAttribute('aria-current', 'page');
    item.append(link);
    list.append(item);
  }
  document.body.append(trigger, dialog);
  trigger.addEventListener('click', () => {
    dialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    const active = dialog.querySelector('[aria-current="page"]');
    if (active) active.focus({preventScroll: true});
  });
  dialog.querySelector('.lab-menu-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus({preventScroll: true});
  });
})();
