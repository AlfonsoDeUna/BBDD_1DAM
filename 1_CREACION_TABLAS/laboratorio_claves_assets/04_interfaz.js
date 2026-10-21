const STORE='bbdd_laboratorio_claves_v1';
const freshState=()=>({version:1,student:'',group:'',drafts:{},notes:{},ex:{},quizzes:{},visited:[],reveals:{},sim:{},activity:{},log:[],settings:{present:false,all:false},lastPage:'n0'});
let state=freshState(),storageOK=true;
try{const raw=localStorage.getItem(STORE);if(raw){const parsed=JSON.parse(raw);if(parsed.version===1)state=normalizeState(parsed);}}catch(e){storageOK=false;}
function normalizeState(s){
 // Only accept known fields and bounded values from local storage / imported copies.
 const n=freshState(),obj=x=>x&&typeof x==='object'&&!Array.isArray(x),str=(x,max=24000)=>typeof x==='string'?x.slice(0,max):'',num=(x,max=99999)=>Number.isInteger(x)?Math.max(0,Math.min(max,x)):0;
 for(const k of ['student','group'])n[k]=str(s[k],120);
 if(PAGES.some(p=>p.id===s.lastPage))n.lastPage=s.lastPage;
 for(const [id,e] of Object.entries(EXERCISES)){
   if(obj(s.drafts)&&typeof s.drafts[id]==='string')n.drafts[id]=str(s.drafts[id]);
   const x=obj(s.ex)&&obj(s.ex[id])?s.ex[id]:null;
   if(x)n.ex[id]={passed:x.passed===true,checkedDraft:str(x.checkedDraft),result:str(x.result,2000),hints:num(x.hints,e.hints.length),solutionSeen:x.solutionSeen===true,solutionOpen:x.solutionOpen===true,attempts:Array.isArray(x.attempts)?x.attempts.slice(-12).filter(obj).map(a=>({time:str(a.time,50),code:str(a.code),ok:a.ok===true,feedback:str(a.feedback,2000)})):[]};
 }
 const allowedNotes=new Set(PAGES.flatMap(p=>[...p.body.matchAll(/data-note="([a-z0-9-]+)"/g)].map(m=>m[1])));
 for(const id of allowedNotes)if(obj(s.notes)&&typeof s.notes[id]==='string')n.notes[id]=str(s.notes[id],40000);
 for(const [id,q]of Object.entries(QUIZZES)){const x=obj(s.quizzes)&&s.quizzes[id];if(obj(x)&&Number.isInteger(x.selected)&&q.options[x.selected])n.quizzes[id]={selected:x.selected,checked:x.checked===true,attempts:num(x.attempts)};}
 if(obj(s.reveals))n.reveals={pk:num(s.reveals.pk,2),fk:num(s.reveals.fk,3)};
 if(Array.isArray(s.visited))n.visited=[...new Set(s.visited.filter(v=>PAGES.some(p=>p.id===v)))];
 if(Array.isArray(s.log))n.log=s.log.slice(-80).filter(obj).map(x=>({time:str(x.time,50),type:str(x.type,100),message:str(x.message,3000),details:obj(x.details)?x.details:{}}));
 if(obj(s.settings))n.settings={present:s.settings.present===true,all:s.settings.all===true};
 if(obj(s.activity)){const x=s.activity;
  n.activity.provider=[1,2].includes(x.provider)?x.provider:1;
  n.activity.composite=Array.isArray(x.composite)?[...new Set(x.composite.filter(v=>v===0||v===1))]:[];
  n.activity.compositeChecked=x.compositeChecked===true;
  if(Array.isArray(x.memberships))n.activity.memberships=[...new Set(x.memberships.filter(v=>['1-10','1-20','2-10','2-20','3-10','3-20'].includes(v)))];
  n.activity.oneone=['fk','unique','pk'].includes(x.oneone)?x.oneone:'fk';n.activity.oneoneTested=x.oneoneTested===true;
  if(Array.isArray(x.creationOrder)&&x.creationOrder.length===3&&new Set(x.creationOrder).size===3&&x.creationOrder.every(v=>['proveedores','facturas','lineas_factura'].includes(v)))n.activity.creationOrder=x.creationOrder;
  n.activity.orderChecked=x.orderChecked===true;
 }
 if(obj(s.sim)&&obj(s.sim.integrity)){const x=s.sim.integrity;const rows=Array.isArray(x.rows)?x.rows.filter(r=>obj(r)&&Number.isInteger(r.id)&&r.id>=-2147483648&&r.id<=2147483647&&[null,1,2].includes(r.provider)).slice(0,40).map(r=>({id:r.id,provider:r.provider})):[];n.sim.integrity={rows:rows.length?rows:[{id:101,provider:1},{id:102,provider:1},{id:103,provider:2}],id:str(x.id,12)||'104',provider:['1','2','99','NULL'].includes(x.provider)?x.provider:'99',required:x.required!==false,result:null};}
 if(obj(s.sim)&&obj(s.sim.cascade)){const x=s.sim.cascade,act=['RESTRICT','CASCADE','SET NULL','NO ACTION'];n.sim.cascade={del:act.includes(x.del)?x.del:'RESTRICT',upd:act.includes(x.upd)?x.upd:'CASCADE',nullable:x.nullable===true,op:['deleteParent','updateKey','updateName','deleteChild','moveChild','badChild'].includes(x.op)?x.op:'deleteParent',prediction:['blocked','deleted','updated','null','nocascade','schema'].includes(x.prediction)?x.prediction:'',result:null};}
 return n;
}
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
let saveTimer=null,toastTimer=null,current=0;
function save(){clearTimeout(saveTimer);try{localStorage.setItem(STORE,JSON.stringify(state));storageOK=true;}catch(e){storageOK=false;}updateSaveStatus();}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,220);}
function updateSaveStatus(){const e=$('#save-status');if(e)e.textContent=storageOK?'Guardado local activo':'Guardado local no disponible · exporta tu cuaderno';}
function toast(message){const e=$('#toast');e.textContent=message;e.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.hidden=true,3200);}
function log(type,message,details={}){state.log.push({time:new Date().toISOString(),type,message,details});state.log=state.log.slice(-80);scheduleSave();}
function plain(s){const e=document.createElement('div');e.innerHTML=s;return e.textContent||'';}
function highlightSQL(node){const raw=node.textContent;const re=/(--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|\b(?:CREATE|TABLE|ALTER|ADD|DROP|CONSTRAINT|PRIMARY|FOREIGN|KEY|REFERENCES|UNIQUE|NOT|NULL|ON|DELETE|UPDATE|CASCADE|RESTRICT|NO|ACTION|SET|DEFAULT|INT|INTEGER|VARCHAR|DECIMAL|DATE|ENGINE|INNODB|AUTO_INCREMENT|SHOW|INDEX|FROM|INSERT|INTO|VALUES|WHERE|SELECT|DATABASE|USE|START|TRANSACTION|ROLLBACK)\b)/gi;let out='',pos=0;for(const m of raw.matchAll(re)){out+=esc(raw.slice(pos,m.index));const tok=m[0];const cls=tok.startsWith('--')||tok.startsWith('/*')?'sqlcom':tok.startsWith("'")?'sqlstr':'sqlkw';out+=`<span class="${cls}">${esc(tok)}</span>`;pos=m.index+tok.length;}node.innerHTML=out+esc(raw.slice(pos));}
function markSQL(root=document){$$('.sql-highlight',root).forEach(highlightSQL);}
function statusFor(id){const e=state.ex[id]||{};if(e.passed&&e.checkedDraft===(state.drafts[id]??EXERCISES[id].initial))return {cls:'pass',text:e.solutionSeen?'Cumple · con solución consultada':'Cumple el objetivo'};if(e.solutionSeen)return {cls:'seen',text:'Solución consultada'};if(e.attempts?.length)return {cls:'',text:'En revisión'};return {cls:'',text:'Sin comprobar'};}
function exerciseHTML(id){
 const e=EXERCISES[id],s=state.ex[id]||{},st=statusFor(id);
 return `<section class="activity" id="exercise-${id}"><div class="activity-title"><div><span class="tag">Escribe SQL · comprobación didáctica</span><h3>${e.title}</h3></div><span class="status ${st.cls}" id="status-${id}">${st.text}</span></div><p>${e.prompt}</p><label class="field-label" for="sql-${id}">Tu sentencia SQL</label><textarea class="sql-editor" id="sql-${id}" data-sql="${id}" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="scope-${id}">${esc(state.drafts[id]??e.initial)}</textarea><p class="small muted" id="scope-${id}" style="margin-top:7px">Comprueba con el botón o Ctrl + Intro. Revisa este ejercicio, no ejecuta SQL real.</p><div class="actions"><button class="btn primary" data-action="check-sql" data-id="${id}">Comprobar mi SQL</button><button class="btn" data-action="hint" data-id="${id}">Pista <span id="hint-count-${id}">${s.hints||0}/${e.hints.length}</span></button><button class="btn" data-action="solution" data-id="${id}">${s.solutionOpen?'Ocultar':'Ver'} una solución</button><button class="btn small" data-action="reset-exercise" data-id="${id}">Restaurar inicio</button><button class="btn small" data-action="copy-own" data-id="${id}">Copiar mi SQL</button></div><div id="feedback-${id}" class="feedback" role="status" aria-live="polite" hidden></div><div id="hint-${id}" class="hint" hidden></div><div id="solution-${id}" class="solution" ${s.solutionOpen?'':'hidden'}><strong>Una posible solución, no la única</strong><p class="small">Compárala con la tuya y explica la diferencia antes de volver a intentarlo. Consultarla queda indicado en tu cuaderno.</p>${code(e.solution)}</div></section>`;
}
function renderExerciseState(id){
 const e=EXERCISES[id],s=state.ex[id]||{},st=statusFor(id);const status=$('#status-'+id);status.className='status '+st.cls;status.textContent=st.text;
 const f=$('#feedback-'+id);if(s.result&&s.checkedDraft===(state.drafts[id]??e.initial)){f.hidden=false;f.className='feedback '+(s.passed?'good':'bad');f.textContent=s.result;}else f.hidden=true;
 const h=$('#hint-'+id);h.hidden=!s.hints;if(s.hints)h.innerHTML=e.hints.slice(0,s.hints).map((t,i)=>`<p><strong>Pista ${i+1}.</strong> ${esc(t)}</p>`).join('');$('#hint-count-'+id).textContent=`${s.hints||0}/${e.hints.length}`;
 $('#solution-'+id).hidden=!s.solutionOpen;const b=$(`[data-action="solution"][data-id="${id}"]`);b.textContent=(s.solutionOpen?'Ocultar':'Ver')+' una solución';
}
function quizHTML(id){const q=QUIZZES[id],s=state.quizzes[id]||{};return `<section class="activity" id="quiz-${id}"><span class="tag teal">Piensa · elige · explica</span><h3>${q.title}</h3><fieldset style="border:0;margin:0;padding:0"><legend>${q.q}</legend><div class="option-list">${q.options.map(([text],i)=>`<label class="option"><input type="radio" name="quiz-${id}" data-quiz-input="${id}" value="${i}" ${s.selected===i?'checked':''}> <span>${esc(text)}</span></label>`).join('')}</div></fieldset><button class="btn" data-action="check-quiz" data-id="${id}">Contrastar mi respuesta</button><div id="qfeedback-${id}" class="feedback" role="status" aria-live="polite" hidden></div></section>`;}
function renderQuizState(id){const s=state.quizzes[id]||{},q=QUIZZES[id],f=$('#qfeedback-'+id);if(s.checked&&Number.isInteger(s.selected)&&q.options[s.selected]){f.hidden=false;f.className='feedback '+(s.selected===q.answer?'good':'bad');f.textContent=q.options[s.selected][1];}else f.hidden=true;}
function checkSql(id){const e=EXERCISES[id],text=$('#sql-'+id).value;state.drafts[id]=text;const result=SQLLab.check(text,e.spec,CATALOG);const s=state.ex[id]||{};s.passed=result.ok;s.checkedDraft=text;s.result=result.message;s.attempts=[...(s.attempts||[]),{time:new Date().toISOString(),code:text,ok:result.ok,feedback:result.message}].slice(-12);state.ex[id]=s;renderExerciseState(id);save();updateProgress();}
function checkQuiz(id){const q=QUIZZES[id],s=state.quizzes[id]||{};if(!Number.isInteger(s.selected)||!q.options[s.selected]){toast('Elige primero una respuesta.');return;}s.checked=true;s.attempts=(s.attempts||0)+1;state.quizzes[id]=s;renderQuizState(id);save();updateProgress();}
function renderAll(){
 $('#toc').innerHTML=MODULES.map(m=>`${m.group?`<div class="nav-head">${m.group}</div>`:''}<a href="#${m.id}" class="nav-link" data-module="${m.id}"><b>${m.num}</b><span>${m.title}</span><i class="dot" aria-hidden="true"></i></a>`).join('');
 $('#panels').innerHTML=PAGES.map((p,i)=>`<article class="panel" id="panel-${p.id}" data-page="${p.id}" hidden><div class="all-label">${MODULES.find(m=>m.id===p.module).num} · ${esc(MODULES.find(m=>m.id===p.module).title)} / ${esc(p.short)}</div><p class="eyebrow">${esc(p.short)} · ${String(i+1).padStart(2,'0')} / ${PAGES.length}</p><h2 tabindex="-1">${esc(p.title).replace('\n','<br>')}</h2><p class="lead">${p.lead}</p>${p.body}</article>`).join('');
 $$('[data-exercise]').forEach(el=>el.innerHTML=exerciseHTML(el.dataset.exercise));
 $$('[data-quiz]').forEach(el=>el.innerHTML=quizHTML(el.dataset.quiz));
 $$('[data-note]').forEach(el=>el.value=typeof state.notes[el.dataset.note]==='string'?state.notes[el.dataset.note]:'');
 Object.keys(EXERCISES).forEach(renderExerciseState);Object.keys(QUIZZES).forEach(renderQuizState);
 Object.keys(REVEALS).forEach(renderReveal);renderProviderExplorer();renderIntegrity();renderCascade();renderComposite();renderNM();renderOneOne();renderOrder();markSQL();updateSaveStatus();
}
function pageIndexFromHash(){let hash;try{hash=decodeURIComponent(location.hash.slice(1));}catch(e){return -1;}return PAGES.findIndex(p=>p.id===hash);}
function showPage(index,{focus=false}={}){current=Math.max(0,Math.min(PAGES.length-1,index));const p=PAGES[current],m=MODULES.find(m=>m.id===p.module);state.lastPage=p.id;if(!state.visited.includes(p.id))state.visited.push(p.id);
 $$('[data-page]').forEach(el=>el.hidden=!state.settings.all&&el.dataset.page!==p.id);
 document.body.classList.toggle('view-all',state.settings.all);document.body.classList.toggle('present',state.settings.present);
 $('#btn-present').setAttribute('aria-pressed',String(state.settings.present));$('#btn-present').textContent=state.settings.present?'Salir de proyección':'Proyectar';
 $('#btn-complete').setAttribute('aria-pressed',String(state.settings.all));$('#btn-complete').textContent=state.settings.all?'Volver a pantallas':'Vista completa';
 $('#crumb-block').textContent=m.num+' · '+m.title;$('#crumb-count').textContent=`${current+1} de ${PAGES.length} pantallas`;
 const siblings=PAGES.filter(q=>q.module===p.module);$('#step-tabs').innerHTML=siblings.map((q,i)=>`<button class="step-tab ${q.id===p.id?'active':''}" data-action="go-page" data-id="${q.id}" ${q.id===p.id?'aria-current="step"':''}>${i+1}. ${esc(q.short)}</button>`).join('');
 $$('.nav-link').forEach(a=>{const active=a.dataset.module===p.module;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');a.classList.toggle('visited',PAGES.filter(q=>q.module===a.dataset.module).every(q=>state.visited.includes(q.id)));});
 $('#prev').disabled=current===0;$('#next').disabled=current===PAGES.length-1;$('#page-label').textContent=`${String(current+1).padStart(2,'0')} / ${PAGES.length}`;$('#next-label').textContent=current<PAGES.length-1?'Después: '+PAGES[current+1].short:'Fin del recorrido';
 $('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');updateProgress();scheduleSave();
 if(state.settings.all){if(focus)$('#panel-'+p.id).scrollIntoView({block:'start'});}else{window.scrollTo({top:0,behavior:'instant'});if(focus)$('#panel-'+p.id+' h2').focus({preventScroll:true});}
 document.title=`${m.title} · Laboratorio de claves`;
}
function navigate(index){const p=PAGES[Math.max(0,Math.min(PAGES.length-1,index))];if(location.hash==='#'+p.id)showPage(index,{focus:true});else location.hash=p.id;}
function updateProgress(){const passed=Object.keys(EXERCISES).filter(id=>statusFor(id).cls==='pass').length;const count=Object.keys(EXERCISES).length;$('#progress-visited').textContent=`${state.visited.length}/${PAGES.length} pantallas visitadas`;$('#progress-sql').textContent=`${passed}/${count} retos SQL cumplen el objetivo`;$('#progress-bar').style.width=(100*state.visited.length/PAGES.length)+'%';}
const REVEALS={
 pk:[
 {code:'CREATE TABLE proveedores (\n    id_proveedor INT,\n    nombre VARCHAR(100) NOT NULL\n) ENGINE = InnoDB;',text:'1. Tenemos columnas, pero todavía no hemos declarado qué identifica una fila.'},
 {code:'CREATE TABLE proveedores (\n    id_proveedor INT,\n    nombre VARCHAR(100) NOT NULL,\n    PRIMARY KEY (id_proveedor)\n) ENGINE = InnoDB;',text:'2. Añadimos una coma y una definición independiente. Entre paréntesis va la columna que identifica.'},
 {code:'CREATE TABLE proveedores (\n    id_proveedor INT,\n    nombre VARCHAR(100) NOT NULL,\n    PRIMARY KEY (id_proveedor)\n) ENGINE = InnoDB;',text:'3. Esa única restricción impide identificadores repetidos y NULL. No necesitamos añadir UNIQUE ni NOT NULL al identificador.'}
 ],
 fk:[
 {code:'CREATE TABLE facturas (\n    id_factura INT PRIMARY KEY,\n    numero VARCHAR(30) NOT NULL,\n    id_proveedor INT NOT NULL\n) ENGINE = InnoDB;',text:'1. La columna existe, pero guardar un número aquí todavía no establece una FK.'},
 {code:'CREATE TABLE facturas (\n    id_factura INT PRIMARY KEY,\n    numero VARCHAR(30) NOT NULL,\n    id_proveedor INT NOT NULL,\n    CONSTRAINT fk_facturas_proveedores\n    -- La restricción aún está incompleta.\n) ENGINE = InnoDB;',text:'2. Ponemos una coma y damos nombre a la restricción. Fragmento en construcción: aún no es ejecutable.'},
 {code:'CREATE TABLE facturas (\n    id_factura INT PRIMARY KEY,\n    numero VARCHAR(30) NOT NULL,\n    id_proveedor INT NOT NULL,\n    CONSTRAINT fk_facturas_proveedores\n        FOREIGN KEY (id_proveedor)\n        -- Falta indicar el destino.\n) ENGINE = InnoDB;',text:'3. Señalamos el campo de la tabla hija. Aún falta REFERENCES: todavía es un fragmento incompleto.'},
 {code:'CREATE TABLE facturas (\n    id_factura INT PRIMARY KEY,\n    numero VARCHAR(30) NOT NULL,\n    id_proveedor INT NOT NULL,\n    CONSTRAINT fk_facturas_proveedores\n        FOREIGN KEY (id_proveedor)\n        REFERENCES proveedores (id_proveedor)\n) ENGINE = InnoDB;',text:'4. Indicamos la tabla padre y su clave. Ahora la sentencia está completa, siempre que proveedores ya exista.'}
 ]
};
function renderReveal(id){const max=REVEALS[id].length;let i=Number(state.reveals[id])||0;i=Math.min(max-1,Math.max(0,i));state.reveals[id]=i;const r=REVEALS[id][i];const el=$('#reveal-'+id);el.innerHTML=`${code(r.code)}<div class="reveal-note" aria-live="polite">${esc(r.text)}</div><div class="actions"><button class="btn small" data-action="reveal-prev" data-id="${id}" ${i===0?'disabled':''}>← Paso anterior</button><button class="btn soft" data-action="reveal-next" data-id="${id}" ${i===max-1?'disabled':''}>Revelar siguiente paso →</button><span class="small muted">${i+1}/${max}</span></div>`;markSQL(el);}
