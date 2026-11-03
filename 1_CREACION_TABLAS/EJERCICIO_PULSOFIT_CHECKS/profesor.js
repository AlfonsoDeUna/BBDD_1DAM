'use strict';
(() => {
 const $=id=>document.getElementById(id),cfg=window.PF_CONFIG||{};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url||'') && typeof cfg.publishableKey==='string' && cfg.publishableKey.length>30 && !cfg.publishableKey.includes('PON_AQUI');
 const notice=(msg,type='')=>{$('notice').textContent=msg;$('notice').className='notice '+type;};
 let sb,user=null,authorized=false,loading=false,selectedActivity=cfg.activityId;
 let activities=[],blocks=[],questions=[],students=[],responses=[],scores=[],keys=[];
 if(!configured){notice('Pendiente de configuración: ejecuta supabase_setup.sql y sustituye la clave publicable en config.js. No se muestran datos de alumnos.','error');return;}
 if(!window.supabase?.createClient){notice('No se pudo cargar Supabase. Comprueba la conexión a Internet.','error');return;}
 sb=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const errText=e=>e?.message||'Error desconocido';
 async function init(){
   try{
     const r=await sb.auth.getUser();
     user=r.data?.user||null;
     if(user){await authorize();}else{showLogin();}
   }catch(e){showLogin();notice('No se pudo recuperar la sesión: '+errText(e),'error');}
 }
 function showLogin(){authorized=false;$('authPanel').classList.remove('hidden');$('dashboardPanel').classList.add('hidden');notice('Introduce tu correo y contraseña del usuario profesor de Supabase Auth.');}
 async function authorize(){
   const r=await sb.rpc('pf_am_teacher');
   if(r.error)throw r.error;
   if(r.data!==true){showLogin();notice('El usuario está autenticado, pero no tiene permiso como profesor. Añade su User UID a pf_private.teachers.','error');return;}
   authorized=true;$('authPanel').classList.add('hidden');$('dashboardPanel').classList.remove('hidden');
   $('teacherLabel').textContent=user.email||'Profesor autorizado';
   await refresh();
 }
 $('authForm').addEventListener('submit',async event=>{
   event.preventDefault();$('loginBtn').disabled=true;
   try{
     const r=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
     if(r.error)throw r.error;
     user=r.data.user;
     await authorize();
     $('password').value='';
   }catch(e){notice('No se pudo acceder: '+errText(e),'error');}
   finally{$('loginBtn').disabled=false;}
 });
 $('logoutBtn').addEventListener('click',async()=>{await sb.auth.signOut();user=null;showLogin();});
 $('refreshBtn').addEventListener('click',()=>refresh());
 $('activity').addEventListener('change',()=>{selectedActivity=$('activity').value;$('group').value='';refresh();});
 $('group').addEventListener('change',()=>render());
 $('csvBtn').addEventListener('click',exportCsv);

 let resetBusy=false;
 const resetModal=$('resetModal');
 const resetInput=$('resetConfirmText');
 const resetConfirm=$('confirmResetBtn');
 function closeResetModal(){
   if(resetBusy)return;
   resetModal.classList.add('hidden');
   resetInput.value='';
   resetConfirm.disabled=true;
 }
 $('resetBtn').addEventListener('click',()=>{
   if(!authorized || !selectedActivity){
     notice('Debes iniciar sesión como profesor y seleccionar una actividad.','error');
     return;
   }
   const activity=activities.find(item=>item.id===selectedActivity);
   if(!activity){notice('No se encontró la actividad seleccionada.','error');return;}
   $('resetActivityName').textContent=activity.title;
   resetInput.value='';
   resetConfirm.disabled=true;
   resetModal.classList.remove('hidden');
   resetInput.focus();
 });
 $('cancelResetBtn').addEventListener('click',closeResetModal);
 resetModal.addEventListener('click',event=>{
   if(event.target===resetModal)closeResetModal();
 });
 document.addEventListener('keydown',event=>{
   if(event.key==='Escape' && !resetModal.classList.contains('hidden'))closeResetModal();
 });
 resetInput.addEventListener('input',()=>{
   resetConfirm.disabled=resetBusy || resetInput.value.trim()!=='REINICIAR';
 });
 resetConfirm.addEventListener('click',async()=>{
   if(resetBusy || !authorized || resetInput.value.trim()!=='REINICIAR')return;
   resetBusy=true;
   resetConfirm.disabled=true;
   resetConfirm.textContent='Reiniciando…';
   const id=selectedActivity;
   try{
     const result=await sb.rpc('pf_reset_activity',{p_activity:id});
     if(result.error)throw result.error;
     if(result.data?.success!==true || result.data.activity_id!==id)throw new Error('No se pudo verificar el reinicio.');
     resetBusy=false;
     closeResetModal();
     await refresh();
     notice('Resultados reiniciados: '+result.data.responses_removed+' respuestas eliminadas. Abre el control 1 para comenzar.','ok');
   }catch(error){
     notice('No se ha podido reiniciar: '+errText(error),'error');
   }finally{
     resetBusy=false;
     resetConfirm.textContent='Sí, reiniciar resultados';
     resetConfirm.disabled=resetInput.value.trim()!=='REINICIAR';
   }
 });

 async function refresh(){
   if(!authorized||loading)return;
   loading=true;
   try{
     const a=await sb.from('pf_activities').select('id,title,enabled').order('title');
     if(a.error)throw a.error;
     activities=a.data||[];
     if(!activities.some(x=>x.id===selectedActivity))selectedActivity=activities[0]?.id||cfg.activityId;
     $('activity').innerHTML=activities.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('');
     $('activity').value=selectedActivity;
     const [b,q,s,r,g,k]=await Promise.all([
       sb.from('pf_blocks').select('id,title,activity_id,sort_order,is_open,reveal_answers').eq('activity_id',selectedActivity).order('sort_order'),
       sb.from('pf_questions').select('id,block_id,exercise_number,sort_order,prompt,options').order('exercise_number'),
       sb.from('pf_students').select('user_id,activity_id,display_name,group_name,joined_at').eq('activity_id',selectedActivity),
       sb.from('pf_responses').select('question_id,user_id,choice,submitted_at'),
       sb.from('pf_scores').select('question_id,user_id,is_correct'),
       sb.rpc('pf_teacher_keys',{p_activity:selectedActivity})
     ]);
     for(const x of [b,q,s,r,g,k])if(x.error)throw x.error;
     blocks=b.data||[];questions=(q.data||[]).filter(x=>blocks.some(z=>z.id===x.block_id));
     students=s.data||[];const studentSet=new Set(students.map(v=>v.user_id)), questionSet=new Set(questions.map(v=>v.id));
     responses=(r.data||[]).filter(v=>studentSet.has(v.user_id)&&questionSet.has(v.question_id));
     scores=(g.data||[]).filter(v=>studentSet.has(v.user_id)&&questionSet.has(v.question_id));
     keys=k.data||[];
     fillGroups();render();notice('Panel conectado · Última actualización: '+new Date().toLocaleTimeString('es-ES'),'ok');
   }catch(e){notice('Error al cargar el panel: '+errText(e),'error');}
   finally{loading=false;}
 }
 function fillGroups(){
   const prior=$('group').value;
   const groups=[...new Set(students.map(s=>s.group_name))].sort((a,b)=>a.localeCompare(b,'es'));
   $('group').innerHTML='<option value="">Todos los grupos</option>'+groups.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
   $('group').value=groups.includes(prior)?prior:'';
 }
 function filtered(){
   const group=$('group').value;
   const ss=students.filter(s=>!group||s.group_name===group).sort((a,b)=>a.group_name.localeCompare(b.group_name,'es')||a.display_name.localeCompare(b.display_name,'es'));
   const ids=new Set(ss.map(s=>s.user_id));
   return {ss, rr:responses.filter(r=>ids.has(r.user_id)),gg:scores.filter(g=>ids.has(g.user_id))};
 }
 const chip=(ok)=>`<span class="pill-status ${ok===null?'none':ok?'good':'bad'}">${ok===null?'—':ok?'✓':'✕'}</span>`;
 function render(){
   const {ss,rr,gg}=filtered();
   const scoreMap=new Map(gg.map(g=>[g.user_id+'|'+g.question_id,g.is_correct]));
   const respMap=new Map(rr.map(r=>[r.user_id+'|'+r.question_id,r.choice]));
   const got=new Set(rr.map(r=>r.user_id));
   const correct=gg.filter(g=>g.is_correct).length;
   $('metrics').innerHTML=[
     [ss.length,'Alumnos'],[got.size,'Han respondido al menos una'],[rr.length+' / '+(ss.length*questions.length),'Respuestas registradas'],[rr.length?Math.round(100*correct/rr.length)+' %':'—','Acierto sobre contestadas']
   ].map(([v,lab])=>`<div class="metric"><div class="val">${esc(v)}</div><div class="lab">${esc(lab)}</div></div>`).join('');
   $('controls').innerHTML=blocks.map(b=>{
      const qq=questions.filter(q=>q.block_id===b.id), count=rr.filter(r=>qq.some(q=>q.id===r.question_id)).length;
      const enrolled=ss.length*qq.length;
      return `<div class="toolbar" style="border-bottom:1px solid var(--line);padding:12px 0"><div><b>${esc(b.title)}</b><div class="small light">${count} de ${enrolled} respuestas posibles · ${b.is_open?'Abierto':'Cerrado'} · ${b.reveal_answers?'Soluciones visibles':'Soluciones ocultas'}</div></div><div class="actions"><button class="${b.is_open?'danger':'success'}" data-toggle-open="${esc(b.id)}">${b.is_open?'Cerrar control':'Abrir control'}</button><button class="outline" data-toggle-reveal="${esc(b.id)}">${b.reveal_answers?'Ocultar soluciones':'Mostrar soluciones'}</button></div></div>`;
   }).join('');
   document.querySelectorAll('[data-toggle-open]').forEach(el=>el.addEventListener('click',()=>toggle(el.dataset.toggleOpen,'is_open')));
   document.querySelectorAll('[data-toggle-reveal]').forEach(el=>el.addEventListener('click',()=>toggle(el.dataset.toggleReveal,'reveal_answers')));
   let matrix='<table><thead><tr><th>Grupo</th><th>Alumno</th>';
   for(const q of questions)matrix+=`<th class="center">${q.exercise_number}</th>`;
   matrix+='<th class="center">Aciertos</th></tr></thead><tbody>';
   for(const s of ss){let score=0;matrix+=`<tr><td>${esc(s.group_name)}</td><td><b>${esc(s.display_name)}</b></td>`;
     for(const q of questions){const k=s.user_id+'|'+q.id,has=scoreMap.has(k),v=has?scoreMap.get(k):null; if(v)score++;
       matrix+=`<td class="center" title="${esc(respMap.has(k)?'Eligió '+respMap.get(k):'Sin responder')}">${chip(v)}</td>`;
     }
     matrix+=`<td class="center"><b>${score} / ${questions.length}</b></td></tr>`;
   }
   matrix+='</tbody></table>';
   $('matrix').innerHTML=ss.length?matrix:'<div class="empty">Todavía no hay alumnos en este grupo.</div>';
   const correctMap=new Map(keys.map(k=>[k.question_id,k]));
   $('questionStats').innerHTML=questions.map(q=>{
     const r=rr.filter(x=>x.question_id===q.id),grade=gg.filter(x=>x.question_id===q.id),right=grade.filter(x=>x.is_correct).length;
     const k=correctMap.get(q.id),pct=r.length?Math.round(100*right/r.length):0;
     const bars='ABCD'.split('').map((letter,i)=>{
       const count=r.filter(x=>x.choice===letter).length;
       const width=r.length?100*count/r.length:0;
       const isRight=k?.correct_choice===letter;
       return `<div class="barrow"><b>${letter}</b><div class="bartrack" title="${esc(q.options[i])}"><div class="barfill ${isRight?'correct':''}" style="width:${width}%"></div></div><span class="small">${count}</span></div>`;
     }).join('');
     return `<div class="stat-question"><h3>Ej. ${q.exercise_number} · ${esc(q.prompt)}</h3><div class="small light">${r.length} de ${ss.length} han respondido · <b>${pct}% de acierto</b> · Correcta: <b>${esc(k?.correct_choice??'—')}</b></div><div class="bars">${bars}</div><div class="small light">${esc(k?.explanation||'')}</div></div>`;
   }).join('');
 }
 async function toggle(id,field){
   if(!authorized)return;
   const b=blocks.find(x=>x.id===id);if(!b)return;
   const state=!b[field];
   if(field==='reveal_answers'&&state&&!window.confirm('¿Mostrar las soluciones al alumnado de este bloque?'))return;
   const patch={[field]:state};
   const result=await sb.from('pf_blocks').update(patch).eq('id',id).select('id').single();
   if(result.error){notice('No se pudo cambiar el bloque: '+errText(result.error),'error');return;}
   await refresh();
 }
 function exportCsv(){
   const {ss,rr,gg}=filtered();
   if(!ss.length){notice('No hay alumnos para exportar.','error');return;}
   const rm=new Map(rr.map(r=>[r.user_id+'|'+r.question_id,r.choice]));
   const gm=new Map(gg.map(g=>[g.user_id+'|'+g.question_id,g.is_correct]));
   const lines=[['Grupo','Alumno',...questions.map(q=>'Ejercicio '+q.exercise_number),'Aciertos']];
   for(const s of ss){const row=[s.group_name,s.display_name];let points=0;
     for(const q of questions){const id=s.user_id+'|'+q.id,choice=rm.get(id),ok=gm.get(id);if(ok)points++;
       row.push(choice?choice+' ('+(ok?'correcta':'incorrecta')+')':'Sin responder');
     }row.push(String(points));lines.push(row);
   }
   const safe=v=>{let s=String(v); if(/^[=+@\-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
   const csv='\ufeff'+lines.map(row=>row.map(safe).join(';')).join('\r\n');
   const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=u;a.download='pulsofit_resultados_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
   URL.revokeObjectURL(u);
 }
 init();setInterval(()=>{if(authorized)refresh();},6000);
})();
