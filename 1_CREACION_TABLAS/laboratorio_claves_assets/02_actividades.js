const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SOURCES=[
 ['CREATE TABLE: PRIMARY KEY y UNIQUE','https://dev.mysql.com/doc/refman/8.4/en/create-table.html'],
 ['Restricciones FOREIGN KEY y acciones referenciales','https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html'],
 ['Ejemplos de integridad referencial','https://dev.mysql.com/doc/refman/8.4/en/example-foreign-keys.html'],
 ['Diferencias de las FK en MySQL 8.4','https://dev.mysql.com/doc/refman/8.4/en/ansi-diff-foreign-keys.html'],
 ['ALTER TABLE','https://dev.mysql.com/doc/refman/8.4/en/alter-table.html'],
 ['AUTO_INCREMENT','https://dev.mysql.com/doc/refman/8.4/en/example-auto-increment.html'],
 ['Relaciones en MySQL Workbench','https://dev.mysql.com/doc/workbench/en/wb-relationship-tools.html'],
 ['Índices únicos y valores NULL','https://dev.mysql.com/doc/refman/8.4/en/create-index.html']
];
const src=(...ns)=>`<p class="source">Referencia MySQL: ${ns.map(n=>`<a href="${SOURCES[n-1][1]}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[n-1][0])} ↗</a>`).join(' · ')}.</p>`;
const code=s=>`<div class="sql-wrap"><button class="btn small copy" data-action="copy-code" aria-label="Copiar este código SQL">Copiar</button><pre><code class="sql-highlight">${esc(s)}</code></pre></div>`;
const tab=(headers,rows)=>`<div class="table-wrap"><table class="data"><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const discuss=s=>`<div class="discussion"><span class="tag teal">Puesta en común</span><p>${s}</p></div>`;
const note=(id,q,placeholder='Escribe tu razonamiento. No se corrige automáticamente.')=>`<div class="note-box"><label class="field-label" for="note-${id}">${q}</label><textarea id="note-${id}" class="reflect-input" data-note="${id}" data-question="${esc(q.replace(/<[^>]*>/g,''))}" placeholder="${esc(placeholder)}"></textarea><div class="small muted">Se guarda en este navegador y se incluye en tu cuaderno descargable.</div></div>`;
const teacher=s=>`<details class="teacher-note"><summary>Orientación para la puesta en común</summary><p>${s}</p></details>`;
const ex=id=>`<div data-exercise="${id}"></div>`;
const quiz=id=>`<div data-quiz="${id}"></div>`;
const entity=(name,fields)=>`<div class="entity"><div class="entity-name">${name}</div>${fields.map(([n,k])=>`<div class="entity-row">${n}${k?k.split('+').map(x=>` <span class="${x==='PK'?'pk':'fk'}-pill">${x}</span>`).join(''):''}</div>`).join('')}</div>`;
const conn=(text,sub='')=>`<div class="connector">${text}<span class="line"></span><small>${sub}</small></div>`;
const fk=(cols,table,ref,del='restrict',upd='restrict')=>({cols,table,ref,del,upd});
const int=(nullable)=>({type:'int',...(nullable===undefined?{}:{nullable})});
const CATALOG={};
function parentSchema(name,col){return {table:name,cols:{[col]:{type:'int',unsigned:false,nullable:false}},pk:[col],pks:[[col]],uniques:[],fks:[],names:[]};}
for(const [t,c] of [['proveedores','id_proveedor'],['facturas','id_factura'],['empleados','id_empleado'],['comites','id_comite'],['alumnos','id_alumno'],['docentes','id_docente'],['talleres','id_taller']])CATALOG[t]=parentSchema(t,c);
CATALOG.lineas_factura={table:'lineas_factura',cols:{id_factura:{type:'int',unsigned:false,nullable:false},numero_linea:{type:'int',unsigned:false,nullable:false}},pk:['id_factura','numero_linea'],uniques:[],fks:[]};
const EXERCISES={
 'pk-simple':{
 title:'01 · Una fila, un identificador',prompt:'Completa la tabla para que <code>id_proveedor</code> sea su clave primaria. Puedes declararla a nivel de columna o a nivel de tabla. No añadas otras columnas.',
 initial:'CREATE TABLE proveedores (\n    id_proveedor INT,\n    nombre VARCHAR(100) NOT NULL\n    -- Añade o modifica lo necesario.\n) ENGINE = InnoDB;',
 hints:['La PK ya implica valores únicos y no nulos; no necesitas añadir UNIQUE y NOT NULL al identificador.','Puedes escribir INT PRIMARY KEY o, tras una coma, PRIMARY KEY (id_proveedor).'],
 solution:'CREATE TABLE proveedores (\n    id_proveedor INT,\n    nombre VARCHAR(100) NOT NULL,\n    PRIMARY KEY (id_proveedor)\n) ENGINE = InnoDB;',
 spec:{table:'proveedores',cols:{id_proveedor:int(false),nombre:{type:'varchar',nullable:false}},pk:['id_proveedor'],fks:[]}
 },
 'fk-basic':{
 title:'02 · Relaciona facturas y proveedores',prompt:'La tabla <code>proveedores</code> ya existe con <code>id_proveedor INT PRIMARY KEY</code>. Cada factura pertenece a un proveedor existente y obligatorio. Un proveedor puede tener varias facturas. Añade la FK a nivel de tabla; conserva el comportamiento restrictivo predeterminado.',
 initial:'CREATE TABLE facturas (\n    id_factura INT PRIMARY KEY,\n    numero VARCHAR(30) NOT NULL,\n    id_proveedor INT NOT NULL\n    -- Aquí falta una restricción de tabla.\n) ENGINE = InnoDB;',
 hints:['La FK va en facturas: es la tabla del lado muchos. Separa la nueva definición con una coma.','FOREIGN KEY (id_proveedor) REFERENCES proveedores (id_proveedor). CONSTRAINT seguido de un nombre es opcional.'],
 solution:'CREATE TABLE facturas (\n    id_factura INT PRIMARY KEY,\n    numero VARCHAR(30) NOT NULL,\n    id_proveedor INT NOT NULL,\n    CONSTRAINT fk_facturas_proveedores\n        FOREIGN KEY (id_proveedor)\n        REFERENCES proveedores (id_proveedor)\n) ENGINE = InnoDB;',
 spec:{table:'facturas',cols:{id_factura:int(false),numero:{type:'varchar',nullable:false},id_proveedor:int(false)},pk:['id_factura'],nonUnique:['id_proveedor'],fks:[fk(['id_proveedor'],'proveedores',['id_proveedor'])]}
 },
 'actions':{
 title:'03 · Escribe dos decisiones distintas',prompt:'Modifica la FK: queremos <strong>impedir borrar un proveedor con facturas</strong>, pero <strong>propagar los cambios de su identificador</strong> a esas facturas. No confundas modificar el identificador con modificar su nombre.',
 initial:'CREATE TABLE facturas (\n    id_factura INT PRIMARY KEY,\n    numero VARCHAR(30) NOT NULL,\n    id_proveedor INT NOT NULL,\n    CONSTRAINT fk_facturas_proveedores\n        FOREIGN KEY (id_proveedor)\n        REFERENCES proveedores (id_proveedor)\n        -- Añade las dos políticas.\n) ENGINE = InnoDB;',
 hints:['ON DELETE y ON UPDATE se escriben después de REFERENCES. Una política no configura automáticamente la otra.','Para impedir la eliminación: RESTRICT. Para mantener la relación cuando cambia la clave padre: ON UPDATE CASCADE.'],
 solution:'CREATE TABLE facturas (\n    id_factura INT PRIMARY KEY,\n    numero VARCHAR(30) NOT NULL,\n    id_proveedor INT NOT NULL,\n    CONSTRAINT fk_facturas_proveedores\n        FOREIGN KEY (id_proveedor)\n        REFERENCES proveedores (id_proveedor)\n        ON DELETE RESTRICT\n        ON UPDATE CASCADE\n) ENGINE = InnoDB;',
 spec:{table:'facturas',cols:{id_factura:int(false),numero:{type:'varchar',nullable:false},id_proveedor:int(false)},pk:['id_factura'],nonUnique:['id_proveedor'],fks:[fk(['id_proveedor'],'proveedores',['id_proveedor'],'restrict','cascade')]}
 },
 'pk-composite':{
 title:'04 · Identifica una línea de factura',prompt:'Una factura tiene varias líneas y la numeración empieza de nuevo en cada factura. Crea una <strong>PK compuesta</strong>. Relaciona cada línea con <code>facturas(id_factura)</code>; al borrar una factura, sus líneas se borran y, al cambiar su ID, se actualizan las referencias.',
 initial:'CREATE TABLE lineas_factura (\n    id_factura INT,\n    numero_linea INT,\n    descripcion VARCHAR(100) NOT NULL\n    -- Añade una PK compuesta y una FK.\n) ENGINE = InnoDB;',
 hints:['La PK es la pareja (id_factura, numero_linea). No pongas PRIMARY KEY en las dos columnas por separado.','La FK contiene solo id_factura y referencia facturas(id_factura), con ON DELETE CASCADE y ON UPDATE CASCADE.'],
 solution:'CREATE TABLE lineas_factura (\n    id_factura INT,\n    numero_linea INT,\n    descripcion VARCHAR(100) NOT NULL,\n    PRIMARY KEY (id_factura, numero_linea),\n    CONSTRAINT fk_lineas_factura_facturas\n        FOREIGN KEY (id_factura)\n        REFERENCES facturas (id_factura)\n        ON DELETE CASCADE\n        ON UPDATE CASCADE\n) ENGINE = InnoDB;',
 spec:{table:'lineas_factura',cols:{id_factura:int(false),numero_linea:int(false),descripcion:{type:'varchar',nullable:false}},pk:['id_factura','numero_linea'],nonUnique:['id_factura','numero_linea'],fks:[fk(['id_factura'],'facturas',['id_factura'],'cascade','cascade')]}
 },
 'fk-composite':{
 title:'05 · Una incidencia sobre una línea concreta',prompt:'La tabla <code>lineas_factura</code> tiene PK <code>(id_factura, numero_linea)</code>. Cada incidencia apunta a una línea concreta. Añade <strong>una sola FK compuesta</strong>; no dos FK independientes. Mantén acciones restrictivas.',
 initial:'CREATE TABLE incidencias (\n    id_incidencia INT PRIMARY KEY,\n    id_factura INT NOT NULL,\n    numero_linea INT NOT NULL,\n    descripcion VARCHAR(100) NOT NULL\n    -- Añade la referencia a la pareja completa.\n) ENGINE = InnoDB;',
 hints:['Es posible que existan la factura 102 y una línea número 2 en otra factura, pero que no exista la pareja (102, 2).','FOREIGN KEY (id_factura, numero_linea) REFERENCES lineas_factura (id_factura, numero_linea).'],
 solution:'CREATE TABLE incidencias (\n    id_incidencia INT PRIMARY KEY,\n    id_factura INT NOT NULL,\n    numero_linea INT NOT NULL,\n    descripcion VARCHAR(100) NOT NULL,\n    CONSTRAINT fk_incidencias_lineas\n        FOREIGN KEY (id_factura, numero_linea)\n        REFERENCES lineas_factura (id_factura, numero_linea)\n) ENGINE = InnoDB;',
 spec:{table:'incidencias',cols:{id_incidencia:int(false),id_factura:int(false),numero_linea:int(false),descripcion:{type:'varchar',nullable:false}},pk:['id_incidencia'],fks:[fk(['id_factura','numero_linea'],'lineas_factura',['id_factura','numero_linea'])]}
 },
 'nm':{
 title:'06 · Construye una tabla intermedia',prompt:'Ya existen <code>empleados(id_empleado INT PRIMARY KEY)</code> y <code>comites(id_comite INT PRIMARY KEY)</code>. Una persona puede estar en varios comités y cada comité tener varias personas. Impide repetir la misma pertenencia; conserva acciones restrictivas.',
 initial:'CREATE TABLE pertenencias (\n    id_empleado INT,\n    id_comite INT\n    -- Una PK compuesta y dos FK independientes.\n) ENGINE = InnoDB;',
 hints:['No hagas único cada identificador por separado: impedirías que una persona pertenezca a varios comités o que un comité tenga varias personas.','La PK es (id_empleado, id_comite). Cada columna referencia a una tabla distinta mediante su propia FOREIGN KEY.'],
 solution:'CREATE TABLE pertenencias (\n    id_empleado INT,\n    id_comite INT,\n    PRIMARY KEY (id_empleado, id_comite),\n    CONSTRAINT fk_pertenencias_empleados\n        FOREIGN KEY (id_empleado)\n        REFERENCES empleados (id_empleado),\n    CONSTRAINT fk_pertenencias_comites\n        FOREIGN KEY (id_comite)\n        REFERENCES comites (id_comite)\n) ENGINE = InnoDB;',
 spec:{table:'pertenencias',cols:{id_empleado:int(false),id_comite:int(false)},pk:['id_empleado','id_comite'],nonUnique:['id_empleado','id_comite'],fks:[fk(['id_empleado'],'empleados',['id_empleado']),fk(['id_comite'],'comites',['id_comite'])]}
 },
 'oneone':{
 title:'07 · Una fotografía como máximo',prompt:'Ahora <code>fotos_empleados</code> tiene su propio <code>id_foto</code>. Cada foto pertenece a un empleado existente y cada empleado puede tener como máximo una foto. Añade una FK y la restricción que impide repetir al empleado. Mantén acciones restrictivas.',
 initial:'CREATE TABLE fotos_empleados (\n    id_foto INT PRIMARY KEY,\n    id_empleado INT NOT NULL,\n    ruta_foto VARCHAR(255) NOT NULL\n    -- ¿Basta con añadir la FK?\n) ENGINE = InnoDB;',
 hints:['La FK comprueba que el empleado exista, pero por sí sola no impide otra foto del mismo empleado.','Además de la FK a empleados(id_empleado), añade UNIQUE (id_empleado), o UNIQUE en esa columna.'],
 solution:'CREATE TABLE fotos_empleados (\n    id_foto INT PRIMARY KEY,\n    id_empleado INT NOT NULL,\n    ruta_foto VARCHAR(255) NOT NULL,\n    UNIQUE (id_empleado),\n    CONSTRAINT fk_fotos_empleados\n        FOREIGN KEY (id_empleado)\n        REFERENCES empleados (id_empleado)\n) ENGINE = InnoDB;',
 spec:{table:'fotos_empleados',cols:{id_foto:int(false),id_empleado:int(false),ruta_foto:{type:'varchar',nullable:false}},pk:['id_foto'],unique:[['id_empleado']],fks:[fk(['id_empleado'],'empleados',['id_empleado'])]}
 },
 'alter':{
 title:'08 · Añade la relación sin recrear la tabla',prompt:'<code>facturas</code> ya existe con su PK y las columnas <code>id_factura INT</code>, <code>numero VARCHAR(30) NOT NULL</code> e <code>id_proveedor INT NOT NULL</code>, pero <strong>sin FK</strong>. Añade la referencia a proveedores. Impide borrar un proveedor usado y propaga los cambios de su ID.',
 initial:'ALTER TABLE facturas\n    -- Añade la restricción aquí.\n;',
 hints:['Después del nombre de la tabla se utiliza ADD, seguido de la definición de la FK.','ADD CONSTRAINT nombre FOREIGN KEY (id_proveedor) REFERENCES proveedores (id_proveedor) ON DELETE RESTRICT ON UPDATE CASCADE.'],
 solution:'ALTER TABLE facturas\n    ADD CONSTRAINT fk_facturas_proveedores\n        FOREIGN KEY (id_proveedor)\n        REFERENCES proveedores (id_proveedor)\n        ON DELETE RESTRICT\n        ON UPDATE CASCADE;',
 spec:{mode:'alter',base:{table:'facturas',cols:{id_factura:{type:'int',unsigned:false,nullable:false},numero:{type:'varchar',unsigned:false,nullable:false},id_proveedor:{type:'int',unsigned:false,nullable:false}},pk:['id_factura'],pks:[['id_factura']],uniques:[],fks:[],names:[]},table:'facturas',cols:{id_factura:int(false),numero:{type:'varchar',nullable:false},id_proveedor:int(false)},pk:['id_factura'],nonUnique:['id_proveedor'],fks:[fk(['id_proveedor'],'proveedores',['id_proveedor'],'restrict','cascade')]}
 },
 'final-talleres':{
 title:'09 · Talleres y docentes: 1:N opcional',prompt:'La PK es <code>id_taller</code>. Un docente puede impartir varios talleres. Un taller puede quedar sin docente: al borrar al docente, se conserva el taller y la FK pasa a NULL. Los cambios del ID del docente se propagan. La tabla <code>docentes</code> ya existe.',
 initial:'CREATE TABLE talleres (\n    id_taller INT,\n    titulo VARCHAR(100) NOT NULL,\n    id_docente INT\n    -- Añade la PK y la FK con sus acciones.\n) ENGINE = InnoDB;',
 hints:['id_docente no debe ser UNIQUE ni NOT NULL en este caso.','PK: id_taller. FK a docentes(id_docente) con ON DELETE SET NULL y ON UPDATE CASCADE.'],
 solution:'CREATE TABLE talleres (\n    id_taller INT,\n    titulo VARCHAR(100) NOT NULL,\n    id_docente INT,\n    PRIMARY KEY (id_taller),\n    CONSTRAINT fk_talleres_docentes\n        FOREIGN KEY (id_docente)\n        REFERENCES docentes (id_docente)\n        ON DELETE SET NULL\n        ON UPDATE CASCADE\n) ENGINE = InnoDB;',
 spec:{table:'talleres',cols:{id_taller:int(false),titulo:{type:'varchar',nullable:false},id_docente:int(true)},pk:['id_taller'],nonUnique:['id_docente'],fks:[fk(['id_docente'],'docentes',['id_docente'],'set null','cascade')]}
 },
 'final-matriculas':{
 title:'10 · Alumnos y talleres: N:M',prompt:'No puede repetirse la matrícula de un alumno en el mismo taller. No se puede borrar un alumno que tenga matrículas. Si desaparece un taller, se borran sus matrículas. Los cambios de cualquiera de los dos ID se propagan. Las tablas <code>alumnos</code> y <code>talleres</code> ya existen.',
 initial:'CREATE TABLE matriculas (\n    id_alumno INT,\n    id_taller INT\n    -- Decide la PK y escribe las dos FK.\n) ENGINE = InnoDB;',
 hints:['La pareja identifica una matrícula. Cada columna puede repetirse por separado.','La FK a alumnos usa ON DELETE RESTRICT; la FK a talleres usa ON DELETE CASCADE. Ambas usan ON UPDATE CASCADE.'],
 solution:'CREATE TABLE matriculas (\n    id_alumno INT,\n    id_taller INT,\n    PRIMARY KEY (id_alumno, id_taller),\n    CONSTRAINT fk_matriculas_alumnos\n        FOREIGN KEY (id_alumno)\n        REFERENCES alumnos (id_alumno)\n        ON DELETE RESTRICT\n        ON UPDATE CASCADE,\n    CONSTRAINT fk_matriculas_talleres\n        FOREIGN KEY (id_taller)\n        REFERENCES talleres (id_taller)\n        ON DELETE CASCADE\n        ON UPDATE CASCADE\n) ENGINE = InnoDB;',
 spec:{table:'matriculas',cols:{id_alumno:int(false),id_taller:int(false)},pk:['id_alumno','id_taller'],nonUnique:['id_alumno','id_taller'],fks:[fk(['id_alumno'],'alumnos',['id_alumno'],'restrict','cascade'),fk(['id_taller'],'talleres',['id_taller'],'cascade','cascade')]}
 },
 'final-carnets':{
 title:'11 · Un carnet como máximo: PK compartida',prompt:'Cada alumno puede tener como máximo un carnet. Utiliza <code>id_alumno</code> como PK y también como FK. El código del carnet es obligatorio y único. Si se elimina al alumno, se elimina su carnet; si cambia su ID, se propaga al carnet.',
 initial:'CREATE TABLE carnets (\n    id_alumno INT,\n    codigo VARCHAR(20) NOT NULL\n    -- Añade las restricciones.\n) ENGINE = InnoDB;',
 hints:['Una misma columna puede ser a la vez PK de su tabla y FK hacia otra tabla.','PRIMARY KEY (id_alumno), UNIQUE (codigo), y una FK a alumnos(id_alumno) con ambas acciones CASCADE.'],
 solution:'CREATE TABLE carnets (\n    id_alumno INT,\n    codigo VARCHAR(20) NOT NULL,\n    PRIMARY KEY (id_alumno),\n    UNIQUE (codigo),\n    CONSTRAINT fk_carnets_alumnos\n        FOREIGN KEY (id_alumno)\n        REFERENCES alumnos (id_alumno)\n        ON DELETE CASCADE\n        ON UPDATE CASCADE\n) ENGINE = InnoDB;',
 spec:{table:'carnets',cols:{id_alumno:int(false),codigo:{type:'varchar',nullable:false}},pk:['id_alumno'],unique:[['codigo']],fks:[fk(['id_alumno'],'alumnos',['id_alumno'],'cascade','cascade')]}
 }
};
const QUIZZES={
 'identificador':{title:'Piensa antes de poner nombre a la regla',q:'Necesitamos un identificador que no se repita ni cambie cuando cambia el nombre comercial. Para este caso, ¿qué decisión defenderías?',options:[['Usar siempre el nombre: ahora parece distinto en cada fila.','Una muestra sin nombres repetidos no garantiza que nunca se repitan ni que no cambien.'],['Añadir id_proveedor y establecer una regla de unicidad y obligatoriedad.','Sí. El identificador permite separar la identidad del proveedor de sus datos descriptivos.'],['Guardar también la dirección en todas las facturas.','Copiar la dirección no resuelve la identificación y añade datos que se tendrían que mantener en varios sitios.']],answer:1},
 'pk-auto':{title:'Comprueba la idea',q:'¿Qué diferencia hay entre PRIMARY KEY y AUTO_INCREMENT?',options:[['Son dos maneras de escribir la misma restricción.','No. Identificar y generar valores son funciones distintas.'],['PRIMARY KEY impide duplicados y NULL; AUTO_INCREMENT genera valores para una columna.','Exacto. Puede existir una PK sin AUTO_INCREMENT y puede ser compuesta o de texto.'],['AUTO_INCREMENT permite repetir los identificadores si se insertan a mano.','Generar valores no elimina las restricciones de unicidad que tenga la columna.']],answer:1},
 'fk-side':{title:'Decide dónde guardar la referencia',q:'Un proveedor emite varias facturas y cada factura tiene un proveedor. ¿Dónde debe estar la FK de esta relación?',options:[['En proveedores, guardando todos sus id_factura en una celda.','Una lista dentro de una celda no es la solución relacional que estamos diseñando.'],['En facturas, mediante id_proveedor.','Correcto. Cada factura guarda una referencia y varios registros pueden apuntar al mismo proveedor.'],['En ambas tablas, para que la relación sea bidireccional.','No necesitas duplicar esta referencia. Una FK en el lado muchos representa la relación.']],answer:1},
 'fk-null':{title:'Separa las restricciones',q:'Si id_proveedor es una FK, ¿significa por sí sola que siempre es obligatoria y única?',options:[['Sí: es una clave y todas las claves prohíben repetidos y NULL.','La PK y la FK tienen responsabilidades distintas.'],['No: NOT NULL decide la obligatoriedad y UNIQUE la unicidad.','Correcto. La FK comprueba la referencia; no incorpora por sí sola NOT NULL ni UNIQUE.'],['No: se pueden guardar identificadores inexistentes si no se repiten.','Un valor no nulo de esta FK simple debe corresponder a un proveedor existente.']],answer:1},
 'update-name':{title:'¿Cuándo actúa ON UPDATE?',q:'La FK referencia id_proveedor y tiene ON UPDATE CASCADE. Cambiamos únicamente proveedores.nombre. ¿Qué pasa con facturas.id_proveedor?',options:[['Se convierte automáticamente en el nuevo nombre.','La FK almacena identificadores, no el nombre.'],['Se vuelve a numerar.','No se ha cambiado la clave referenciada.'],['No cambia: la clave referenciada sigue siendo la misma.','Exacto. ON UPDATE se aplica a cambios de la clave referenciada; no copia todos los atributos del padre.']],answer:2},
 'nm-duplicate':{title:'Una pareja no es dos identificadores únicos',q:'Con PRIMARY KEY (id_empleado, id_comite) ya están guardadas (1, 10) y (2, 10). ¿Qué nueva fila se rechaza por esa PK?',options:[['(1, 20)','El empleado 1 puede pertenecer a otro comité. Suponemos que el comité 20 existe.'],['(1, 10)','Correcto: se repetiría exactamente la misma pertenencia.'],['(3, 10)','El comité 10 puede tener más empleados. Suponemos que el empleado 3 existe.']],answer:1},
 'oneone-min':{title:'No confundas «como máximo» con «obligatorio»',q:'fotos_empleados.id_empleado es a la vez PK y FK a empleados. ¿Qué garantiza este diseño?',options:[['Todos los empleados tienen obligatoriamente una foto.','La FK obliga a que cada foto tenga empleado, no a que cada empleado tenga foto.'],['Cada empleado puede tener como máximo una foto, y no puede haber fotos de empleados inexistentes.','Correcto. La participación del empleado puede ser 0..1.'],['Puede haber muchas fotos de un mismo empleado.','La PK de fotos_empleados impide repetir id_empleado.']],answer:1},
 'mysql-inline':{title:'Diagnóstico A · El SQL no basta con que «se ejecute»',q:'En MySQL 8.0/8.4 escribes id_proveedor INT REFERENCES proveedores(id_proveedor). ¿Qué harías para garantizar la FK en estos ejemplos?',options:[['Nada: cualquier REFERENCES en una columna crea la restricción.','En estas versiones, la referencia en línea se analiza pero se ignora.'],['Declarar FOREIGN KEY (...) REFERENCES ... (...) como restricción de tabla.','Correcto. Después comprueba el resultado con SHOW CREATE TABLE.'],['Añadir UNIQUE al id_proveedor de facturas.','Eso limitaría a una factura por proveedor y no sustituye la FK.']],answer:1},
 'mysql-type':{title:'Diagnóstico B · Mismo número, distinto tipo',q:'El padre usa id INT UNSIGNED y la columna hija usa id_padre INT. ¿Qué debes revisar?',options:[['Solo el nombre: los campos deben llamarse exactamente igual.','Los nombres pueden ser diferentes. Lo decisivo aquí es la compatibilidad de los tipos.'],['Nada: ambos son enteros.','En este caso también debe coincidir el signo.'],['Hacer compatibles tamaño y signo de ambos enteros.','Correcto. Por ejemplo, usar INT UNSIGNED en ambos, o INT en ambos.']],answer:2},
 'mysql-null':{title:'Diagnóstico C · Una política imposible',q:'La FK está declarada NOT NULL y añadimos ON DELETE SET NULL. ¿Cuál es el problema?',options:[['La definición es incompatible: pide poner a NULL una columna que lo prohíbe.','Correcto. Cambia la nulabilidad o elige otra política según el caso; no lo soluciones desactivando las comprobaciones.'],['MySQL borra las filas hijas de todos modos.','Eso correspondería a CASCADE, no a SET NULL.'],['SET NULL solo funciona con ON UPDATE.','SET NULL existe tanto para ON DELETE como para ON UPDATE.']],answer:0},
 'ticket':{title:'Última comprobación',q:'Una tabla matriculas tiene PK (id_alumno, id_taller) y dos FK. ¿Cuál es la explicación completa?',options:[['La PK identifica la pareja; cada FK comprueba que exista el alumno o el taller correspondiente.','Exacto. La pareja evita duplicar una matrícula y las FK evitan referencias inexistentes.'],['La PK obliga a que cada alumno solo tenga un taller.','Solo se prohíbe repetir la pareja, no cada componente por separado.'],['Las dos FK ya impiden por sí solas repetir una matrícula.','Las FK comprueban la existencia de las referencias, no la unicidad de esa pareja.']],answer:0}
};
const MODULES=[
 {id:'n0',num:'00',title:'El problema y la ruta',group:'A · Identificar y relacionar'},
 {id:'n1',num:'01',title:'PRIMARY KEY',group:null},
 {id:'n2',num:'02',title:'FOREIGN KEY y 1:N',group:null},
 {id:'n3',num:'03',title:'Integridad referencial',group:null},
 {id:'n4',num:'04',title:'ON DELETE / ON UPDATE',group:'B · Probar y explicar'},
 {id:'n5',num:'05',title:'Claves compuestas',group:null},
 {id:'n6',num:'06',title:'Relaciones N:M',group:null},
 {id:'n7',num:'07',title:'Relaciones 1:1',group:null},
 {id:'n8',num:'08',title:'Orden, ALTER y verificación',group:'C · Aplicar y transferir'},
 {id:'n9',num:'09',title:'Clínica de errores MySQL',group:null},
 {id:'n10',num:'10',title:'Reto: escuela de talleres',group:null},
 {id:'n11',num:'11',title:'Cierre y cuaderno',group:null}
];
