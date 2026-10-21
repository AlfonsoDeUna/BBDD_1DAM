function download(text,name,type='text/plain;charset=utf-8'){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
function safeName(){return (state.student||'alumno').replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,45);}
function notebookText(){let lines=['LABORATORIO DE CLAVES PRIMARIAS Y FORÁNEAS','MySQL 8.0/8.4 · InnoDB',`Alumno / alias: ${state.student||'(sin indicar)'}`,`Grupo: ${state.group||'(sin indicar)'}`,`Exportado: ${new Date().toLocaleString('es-ES')}`,'','Este cuaderno recoge trabajo local. No es una nota ni verifica autoría. El corrector es didáctico; no ejecuta MySQL.','','=== RETOS SQL ==='];
 for(const [id,e]of Object.entries(EXERCISES)){const s=state.ex[id]||{};lines.push('',e.title,plain(e.prompt),`Estado: ${statusFor(id).text}`,`Pistas consultadas: ${s.hints||0}/${e.hints.length}. Solución consultada: ${s.solutionSeen?'sí':'no'}. Intentos guardados: ${s.attempts?.length||0}.`,'--- SQL actual ---',state.drafts[id]??e.initial,`Última devolución: ${s.result||'(sin comprobar)'}`);if(s.checkedDraft&&(state.drafts[id]??e.initial)!==s.checkedDraft)lines.push('Atención: el SQL actual se ha editado después de la última comprobación.');for(const [i,a]of (s.attempts||[]).entries())lines.push(`--- Intento ${i+1} · ${a.time} · ${a.ok?'Cumple':'Revisar'} ---`,a.code,a.feedback);}
 lines.push('','=== PREGUNTAS DE CONTRASTE ===');for(const[id,q]of Object.entries(QUIZZES)){const s=state.quizzes[id]||{};lines.push('',q.title,q.q,`Respuesta: ${q.options[s.selected]?.[0]||'(sin responder)'}`,`Contrastada: ${s.checked?'sí':'no'}. Intentos: ${s.attempts||0}.`,s.checked?q.options[s.selected]?.[1]||'':'');}
 lines.push('','=== REFLEXIONES Y TICKET DE SALIDA ===');$$('[data-note]').forEach(el=>lines.push('',el.dataset.question,state.notes[el.dataset.note]||'(sin responder)'));
 lines.push('','=== EXPERIMENTOS (hasta 80 entradas) ===');for(const row of state.log)lines.push('',`${row.time} · ${row.type}`,row.message,JSON.stringify(row.details,null,2));
 lines.push('','=== ACTIVIDADES MANIPULATIVAS ===',JSON.stringify(state.activity,null,2),'','Pantallas visitadas: '+state.visited.join(', '));return lines.join('\n');}
function ownSQL(){const parts=['-- Mi trabajo: Laboratorio de claves primarias y foráneas','-- Este archivo reúne RESPUESTAS a ejercicios independientes.','-- NO ejecutes todo el archivo seguido: varios retos reutilizan nombres de tabla.','-- Copia cada ejercicio a su contexto correspondiente en el esquema de laboratorio.','-- No es un script de instalación ni contiene automáticamente las soluciones.',''];for(const[id,e]of Object.entries(EXERCISES)){if(Object.prototype.hasOwnProperty.call(state.drafts,id))parts.push(`\n-- ==================================================\n-- ${e.title}\n-- ${statusFor(id).text}\n-- ==================================================`,state.drafts[id]);}if(!Object.keys(state.drafts).some(id=>EXERCISES[id]))parts.push('-- Todavía no hay SQL editado.');return parts.join('\n');}
function mysqlScript(){return `-- LABORATORIO DE CLAVES · MySQL 8.0/8.4 · InnoDB
-- Guion de ejemplos. Ejecuta la preparación una sola vez en un servidor de prácticas.
-- No contiene DROP ni desactiva FOREIGN_KEY_CHECKS.
-- Si la base ya existe, DETENTE: elige otro nombre o revisa tu práctica anterior.
-- No ejecutes este guion en una base con datos de producción.

CREATE DATABASE laboratorio_claves_aula;
USE laboratorio_claves_aula;

${EXERCISES['pk-simple'].solution}

${EXERCISES['actions'].solution}

${EXERCISES['pk-composite'].solution}

${EXERCISES['fk-composite'].solution}

CREATE TABLE empleados (
    id_empleado INT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
) ENGINE = InnoDB;

CREATE TABLE comites (
    id_comite INT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
) ENGINE = InnoDB;

${EXERCISES.nm.solution}

${EXERCISES.oneone.solution}

INSERT INTO proveedores (id_proveedor, nombre)
VALUES (1, 'Norte'), (2, 'Sur');
INSERT INTO facturas (id_factura, numero, id_proveedor)
VALUES (101, 'F-001', 1), (102, 'F-002', 1), (103, 'F-001', 2);
INSERT INTO lineas_factura (id_factura, numero_linea, descripcion)
VALUES (101, 1, 'Monitor'), (101, 2, 'Cable'), (102, 1, 'Teclado');
INSERT INTO empleados (id_empleado, nombre)
VALUES (1, 'Ana'), (2, 'Luis'), (3, 'Sara');
INSERT INTO comites (id_comite, nombre)
VALUES (10, 'Seguridad'), (20, 'Actividades');
INSERT INTO pertenencias (id_empleado, id_comite)
VALUES (1, 10), (1, 20), (2, 10);
INSERT INTO fotos_empleados (id_foto, id_empleado, ruta_foto)
VALUES (1, 1, 'ana.jpg');

-- 1. COMPROBAR EL ESQUEMA
SHOW CREATE TABLE proveedores;
SHOW CREATE TABLE facturas;
SHOW CREATE TABLE lineas_factura;
SHOW CREATE TABLE pertenencias;
SHOW CREATE TABLE fotos_empleados;
SHOW INDEX FROM facturas;

-- 2. PREDECIR Y OBSERVAR ON UPDATE CASCADE. ROLLBACK restaura los datos.
START TRANSACTION;
UPDATE proveedores SET id_proveedor = 10 WHERE id_proveedor = 1;
SELECT * FROM proveedores;
SELECT * FROM facturas;
ROLLBACK;

-- 3. BORRAR UNA FACTURA. Sus líneas se borran, pero no su proveedor.
START TRANSACTION;
DELETE FROM facturas WHERE id_factura = 101;
SELECT * FROM facturas;
SELECT * FROM lineas_factura;
SELECT * FROM proveedores;
ROLLBACK;

-- 4. PRUEBAS QUE DEBEN FALLAR. Están comentadas para no interrumpir el guion.
-- Descomenta y ejecuta UNA a la vez; identifica la restricción que lo impide.
-- PK repetida:
-- INSERT INTO proveedores VALUES (1, 'Otro proveedor');
-- FK inexistente:
-- INSERT INTO facturas VALUES (104, 'F-003', 99);
-- NOT NULL:
-- INSERT INTO facturas VALUES (104, 'F-003', NULL);
-- RESTRICT:
-- DELETE FROM proveedores WHERE id_proveedor = 1;
-- PK compuesta repetida:
-- INSERT INTO pertenencias VALUES (1, 10);
-- FK compuesta inexistente: no existe la línea (102, 2).
-- INSERT INTO incidencias VALUES (1, 102, 2, 'Revisión');
-- 1:1: otra foto del empleado 1.
-- INSERT INTO fotos_empleados VALUES (2, 1, 'otra.jpg');

-- 5. PADRES DEL RETO FINAL. Las demás tablas debes escribirlas tú.
CREATE TABLE docentes (
    id_docente INT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
) ENGINE = InnoDB;
CREATE TABLE alumnos (
    id_alumno INT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
) ENGINE = InnoDB;
INSERT INTO docentes VALUES (1, 'Marta'), (2, 'Jorge');
INSERT INTO alumnos VALUES (1, 'Leo'), (2, 'Ines');
-- Crea talleres; después, matriculas y carnets.
-- Comprueba cada definición con SHOW CREATE TABLE y diseña tus pruebas.
`;}
function openNotebook(){const attempted=Object.values(state.ex).filter(e=>e.attempts?.length).length,passed=Object.keys(EXERCISES).filter(id=>statusFor(id).cls==='pass').length,notes=Object.values(state.notes).filter(n=>typeof n==='string'&&n.trim()).length;$('#nb-stats').innerHTML=`<div><strong>${attempted}/${Object.keys(EXERCISES).length}</strong><span>Retos SQL intentados</span></div><div><strong>${passed}</strong><span>Cumplen el objetivo</span></div><div><strong>${notes}</strong><span>Reflexiones escritas</span></div>`;$('#student-name').value=state.student;$('#student-group').value=state.group;$('#notebook').showModal();}
function exportJSON(){save();download(JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),`claves_${safeName()}_copia.json`,'application/json');}
async function importJSON(file){if(!file)return;if(file.size>4000000){toast('La copia supera el límite de 4 MB.');return;}try{const s=JSON.parse(await file.text());if(s.version!==1||!s.ex||!s.drafts||!s.notes)throw Error();if(!confirm('La copia reemplazará el trabajo guardado de este laboratorio en este navegador. ¿Continuar?'))return;state=normalizeState(s);save();renderAll();showPage(Math.max(0,PAGES.findIndex(p=>p.id===state.lastPage)));$('#notebook').close();toast('Copia importada.');}catch(e){toast('No se ha podido importar: el archivo no es una copia compatible del laboratorio.');}}
// Delegación de acciones: todas las actividades funcionan también con teclado.
