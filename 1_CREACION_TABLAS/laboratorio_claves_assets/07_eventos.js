document.addEventListener('click',async event=>{const b=event.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;
 if(a==='check-sql')checkSql(id);
 else if(a==='check-quiz')checkQuiz(id);
 else if(a==='hint'){const s=state.ex[id]||{};s.hints=Math.min((s.hints||0)+1,EXERCISES[id].hints.length);state.ex[id]=s;renderExerciseState(id);save();}
 else if(a==='solution'){const s=state.ex[id]||{};s.solutionOpen=!s.solutionOpen;if(s.solutionOpen)s.solutionSeen=true;state.ex[id]=s;renderExerciseState(id);save();}
 else if(a==='reset-exercise'){if(confirm('¿Restaurar el código inicial de este ejercicio? Los intentos anteriores seguirán en el cuaderno.')){state.drafts[id]=EXERCISES[id].initial;$('#sql-'+id).value=EXERCISES[id].initial;renderExerciseState(id);save();updateProgress();}}
 else if(a==='copy-code')copyText(b.parentElement.querySelector('pre').textContent);
 else if(a==='copy-own')copyText($('#sql-'+id).value);
 else if(a==='go-page')navigate(PAGES.findIndex(p=>p.id===id));
 else if(a==='reveal-prev'||a==='reveal-next'){state.reveals[id]=Math.max(0,Math.min(REVEALS[id].length-1,(state.reveals[id]||0)+(a==='reveal-next'?1:-1)));renderReveal(id);save();}
 else if(a==='select-provider'){state.activity.provider=Number(id);renderProviderExplorer();save();}
 else if(a==='insert-invoice')insertInvoice();
 else if(a==='reset-integrity'){delete state.sim.integrity;renderIntegrity();save();}
 else if(a==='run-cascade')runCascade();
 else if(a==='reset-cascade'){delete state.sim.cascade;renderCascade();save();}
 else if(a==='check-composite'){state.activity.compositeChecked=true;renderComposite();log('clave compuesta','Comprobación de columnas elegidas',{columnas:(state.activity.composite||[]).map(i=>['id_factura','numero_linea'][i])});}
 else if(a==='toggle-membership'){let selected=state.activity.memberships??['1-10','1-20','2-10'];selected=selected.includes(id)?selected.filter(k=>k!==id):[...selected,id].sort();state.activity.memberships=selected;renderNM();save();}
 else if(a==='test-oneone'){state.activity.oneoneTested=true;renderOneOne();log('1:1','Prueba de segunda fotografía',{diseño:state.activity.oneone||'fk'});}
 else if(a==='order-up'||a==='order-down'){const order=state.activity.creationOrder||['lineas_factura','proveedores','facturas'];const i=Number(id),j=i+(a==='order-up'?-1:1);if(j>=0&&j<order.length)[order[i],order[j]]=[order[j],order[i]];state.activity.creationOrder=order;state.activity.orderChecked=false;renderOrder();save();}
 else if(a==='check-order'){state.activity.orderChecked=true;renderOrder();save();}
 else if(a==='open-notebook')openNotebook();
 else if(a==='close-notebook')$('#notebook').close();
 else if(a==='download-text'){save();download(notebookText(),`cuaderno_claves_${safeName()}.txt`);}
 else if(a==='download-json')exportJSON();
 else if(a==='download-ownsql')download(ownSQL(),`mi_sql_claves_${safeName()}.sql`);
 else if(a==='download-mysql')download(mysqlScript(),'guion_mysql_claves.sql');
 else if(a==='reset-all'){if(confirm('Se borrará todo el trabajo local de este laboratorio. Descarga antes una copia JSON si necesitas conservarlo. ¿Borrar?')){state=freshState();save();$('#notebook').close();renderAll();location.hash='n0';showPage(0);toast('Trabajo local borrado.');}}
});
document.addEventListener('input',event=>{const el=event.target;
 if(el.matches('[data-sql]')){const id=el.dataset.sql;state.drafts[id]=el.value;renderExerciseState(id);updateProgress();scheduleSave();}
 else if(el.matches('[data-note]')){state.notes[el.dataset.note]=el.value;scheduleSave();}
 else if(el.id==='student-name'){state.student=el.value;scheduleSave();}
 else if(el.id==='student-group'){state.group=el.value;scheduleSave();}
 else if(el.matches('[data-integrity-field]')&&el.tagName==='INPUT'&&el.type!=='checkbox'){const s=getIntegrity();s[el.dataset.integrityField]=el.value;s.result=null;$('#integrity-feedback').hidden=true;scheduleSave();}
});
document.addEventListener('change',event=>{const el=event.target;
 if(el.matches('[data-quiz-input]')){const id=el.dataset.quizInput;const s=state.quizzes[id]||{};s.selected=Number(el.value);s.checked=false;state.quizzes[id]=s;renderQuizState(id);scheduleSave();}
 else if(el.matches('[data-integrity-field]')){const s=getIntegrity(),key=el.dataset.integrityField;s[key]=el.type==='checkbox'?el.checked:el.value;s.result=null;if(key==='required')s.rows=structuredClone(BASE_INVOICES);if(key==='id')$('#integrity-feedback').hidden=true;else renderIntegrity();save();}
 else if(el.matches('[data-cascade-field]')){const s=getCascade(),key=el.dataset.cascadeField;s[key]=el.type==='checkbox'?el.checked:el.value;if(key!=='prediction'){s.prediction='';s.result=null;renderCascade();$('#'+el.id)?.focus({preventScroll:true});}else if(s.result){s.result=null;renderCascade();}save();}
 else if(el.matches('[data-composite]')){const val=Number(el.dataset.composite),chosen=state.activity.composite||[];state.activity.composite=el.checked?[...new Set([...chosen,val])].sort():chosen.filter(x=>x!==val);state.activity.compositeChecked=false;renderComposite();save();}
 else if(el.id==='oneone-mode'){state.activity.oneone=el.value;state.activity.oneoneTested=false;renderOneOne();save();}
 else if(el.id==='import-file'){awaitImport(el.files[0]);}
});
function awaitImport(file){importJSON(file);$('#import-file').value='';}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&e.target.matches('[data-sql]')){e.preventDefault();checkSql(e.target.dataset.sql);}if(e.altKey&&!e.ctrlKey&&(e.key==='ArrowRight'||e.key==='ArrowLeft')&&!$('#notebook').open){e.preventDefault();navigate(current+(e.key==='ArrowRight'?1:-1));}});
window.addEventListener('hashchange',()=>{const i=pageIndexFromHash();showPage(i<0?0:i,{focus:true});});
window.addEventListener('beforeunload',save);
$('#prev').addEventListener('click',()=>navigate(current-1));$('#next').addEventListener('click',()=>navigate(current+1));
$('#btn-present').addEventListener('click',()=>{state.settings.present=!state.settings.present;showPage(current);save();});
$('#btn-complete').addEventListener('click',()=>{state.settings.all=!state.settings.all;showPage(current);save();});
$('#menu-toggle').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open));});
$('#toc').addEventListener('click',e=>{const a=e.target.closest('a');if(a){$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');}});
$('#notebook').addEventListener('click',e=>{if(e.target===$('#notebook')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
renderAll();
let starting=pageIndexFromHash();if(starting<0)starting=Math.max(0,PAGES.findIndex(p=>p.id===state.lastPage));showPage(starting);
// API de pruebas local, sin conexión ni ejecución de consultas.
window.LAB_TEST={SQLLab,EXERCISES,CATALOG,calculateCascade,PAGES,notebookText,mysqlScript,getState:()=>state};
