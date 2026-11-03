'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cfg = window.PF_CONFIG || {};
  const activity = cfg.activityId;
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url || '')
    && typeof cfg.publishableKey === 'string' && cfg.publishableKey.length > 30
    && !cfg.publishableKey.includes('PON_AQUI');
  const notify = (msg, type='') => { $('notice').textContent=msg; $('notice').className='notice '+type; };
  let sb=null, user=null, profile=null, blocks=[], questions=[], responses=new Map(), reveals=new Map();
  let loading=false, saving=false;
  const choices = new Map();
  const choicesABC = 'ABCD';
  if (!configured) {
    notify('La página está publicada, pero aún falta conectar la clave publicable y ejecutar la configuración SQL en Supabase. Informa al profesor.', 'error');
    return;
  }
  if (!window.supabase?.createClient) {
    notify('No se pudo cargar la biblioteca de Supabase. Comprueba tu conexión a Internet.', 'error');
    return;
  }
  sb=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const errorMsg=e=>e?.message || 'No se pudo completar la operación.';
  async function init() {
    notify('Conectando con la actividad…');
    try {
      const {data, error}=await sb.auth.getUser();
      if(error && !(/session missing/i).test(error.message||'')) throw error;
      user=data?.user||null;
      if(user) {
        const r=await sb.from('pf_students').select('activity_id,display_name,group_name').eq('activity_id',activity).eq('user_id',user.id).maybeSingle();
        if(r.error) throw r.error;
        profile=r.data;
      }
      if(profile) { enterDashboard(); await load(); }
      else { $('loginPanel').classList.remove('hidden'); notify('Escribe tu nombre y grupo para entrar. No necesitas correo electrónico.'); }
    } catch(e) {
      $('loginPanel').classList.remove('hidden');
      notify('No se ha podido iniciar la actividad: '+errorMsg(e),'error');
    }
  }
  function enterDashboard(){
    $('loginPanel').classList.add('hidden');
    $('studentPanel').classList.remove('hidden');
    $('welcome').textContent=profile.display_name+' · '+profile.group_name;
  }
  $('joinForm').addEventListener('submit',async event=>{
    event.preventDefault(); if(saving)return;
    const name=$('studentName').value.trim().replace(/\s+/g,' ');
    const group=$('groupName').value.trim().replace(/\s+/g,' ');
    if(name.length<2 || name.length>60 || group.length<1 || group.length>30){notify('Revisa el nombre y el grupo.','error');return;}
    saving=true;$('joinBtn').disabled=true;
    try {
      if(!user){
        const a=await sb.auth.signInAnonymously();
        if(a.error) throw a.error;
        user=a.data.user;
      }
      if(!user) throw new Error('No se pudo obtener una sesión de alumno.');
      const ins=await sb.from('pf_students').upsert({activity_id:activity,user_id:user.id,display_name:name,group_name:group},{onConflict:'activity_id,user_id'}).select('display_name,group_name').single();
      if(ins.error) throw ins.error;
      profile=ins.data;
      enterDashboard(); await load();
    } catch(e){notify('No se ha podido registrar el nombre: '+errorMsg(e)+' Comprueba que el profesor ha habilitado las sesiones anónimas.','error');}
    finally{saving=false;$('joinBtn').disabled=false;}
  });
  async function load(){
    if(!profile || loading)return;
    loading=true;
    try {
      const [b,q,r,results]=await Promise.all([
        sb.from('pf_blocks').select('id,title,sort_order,is_open,reveal_answers').eq('activity_id',activity).order('sort_order'),
        sb.from('pf_questions').select('id,block_id,exercise_number,sort_order,prompt,options').order('exercise_number'),
        sb.from('pf_responses').select('question_id,choice').eq('user_id',user.id),
        sb.rpc('pf_my_results',{p_activity:activity})
      ]);
      for(const res of [b,q,r,results]) if(res.error) throw res.error;
      blocks=b.data||[];
      questions=(q.data||[]).filter(item=>blocks.some(block=>block.id===item.block_id));
      responses=new Map((r.data||[]).map(v=>[v.question_id,v.choice]));
      reveals=new Map((results.data||[]).map(v=>[v.question_id,v]));
      render(); notify('Conectado. Los controles se actualizan automáticamente.', 'ok');
    }catch(e){notify('Error al consultar la actividad: '+errorMsg(e),'error');}
    finally{loading=false;}
  }
  function render(){
    const answered=questions.filter(q=>responses.has(q.id)).length;
    $('progress').textContent=`${answered} de ${questions.length} respuestas registradas`;
    $('blocks').innerHTML=blocks.length?blocks.map(b=>{
      const list=questions.filter(q=>q.block_id===b.id).sort((a,b)=>a.sort_order-b.sort_order);
      const count=list.filter(q=>responses.has(q.id)).length;
      const chip=b.is_open?'open':'closed';
      let html=`<section class="card ${b.is_open?'':'muted-block'}"><div class="panel-head"><div><h2>${esc(b.title)}</h2><p class="light small">${count} de ${list.length} respuestas registradas</p></div><div class="chips"><span class="chip ${chip}">${b.is_open?'Abierto':'Cerrado'}</span>${b.reveal_answers?'<span class="chip revealed">Corrección disponible</span>':''}</div></div>`;
      if(!b.is_open&&count===0){html+='<div class="empty">Este control todavía no está abierto. Espera a que lo indique el profesor.</div>';} else {
        for(const q of list){
          const chosen=responses.get(q.id),result=reveals.get(q.id);
          html+=`<div class="question"><h3>Ejercicio ${q.exercise_number} · ${esc(q.prompt)}</h3>`;
          if(chosen){
            html+=`<div class="selected-answer">Tu elección: ${esc(chosen)} · Respuesta registrada</div>`;
            if(result){html+=`<div class="reveal ${result.is_correct?'':'bad'}"><b>${result.is_correct?'Correcta':'Incorrecta'} · Respuesta ${esc(result.correct_choice)}</b><div>${esc(result.explanation)}</div></div>`;}
            else if(b.reveal_answers){html+='<p class="small light">La corrección se está actualizando.</p>';}
          } else if(!b.is_open){html+='<p class="small light">No respondiste antes de que se cerrase el control.</p>';}
          else {
            html+='<div class="options" role="radiogroup" aria-label="Elige tu respuesta">';
            for(let i=0;i<4;i++){
              const letter=choicesABC[i];
              html+=`<label class="option"><input type="radio" name="choice-${esc(q.id)}" value="${letter}" data-q="${esc(q.id)}" ${choices.get(q.id)===letter?'checked':''}><b>${letter}.</b> <span>${esc(q.options[i]||'')}</span></label>`;
            }
            html+=`</div><div class="q-actions"><span class="small light">Solo puedes enviar una vez.</span><button class="send" data-question="${esc(q.id)}" type="button">Enviar respuesta</button></div>`;
          }
          html+='</div>';
        }
      }
      return html+'</section>';
    }).join(''):'<div class="empty">No se han encontrado bloques para esta actividad.</div>';
    document.querySelectorAll('input[type="radio"][data-q]').forEach(el=>el.addEventListener('change',()=>choices.set(el.dataset.q,el.value)));
    document.querySelectorAll('button.send').forEach(btn=>btn.addEventListener('click',()=>send(btn.dataset.question,btn)));
  }
  async function send(questionId,btn){
    if(saving||responses.has(questionId))return;
    const choice=choices.get(questionId);
    if(!choice){notify('Elige una de las cuatro opciones antes de enviar.','error');return;}
    saving=true;btn.disabled=true;
    try{
      const res=await sb.rpc('pf_submit_answer',{p_question_id:questionId,p_choice:choice});
      if(res.error) throw res.error;
      if(!res.data?.saved && !res.data?.already_sent) throw new Error('El servidor no confirmó la respuesta.');
      choices.delete(questionId);
      await loadAfterSend();
      notify(res.data.already_sent?'Esta pregunta ya estaba contestada.':'Respuesta registrada correctamente.','ok');
    }catch(e){notify('No se ha podido guardar: '+errorMsg(e),'error');btn.disabled=false;}
    finally{saving=false;}
  }
  async function loadAfterSend(){loading=false;await load();}
  $('refreshBtn').addEventListener('click',load);
  init();setInterval(()=>{if(profile)load();},10000);
})();

