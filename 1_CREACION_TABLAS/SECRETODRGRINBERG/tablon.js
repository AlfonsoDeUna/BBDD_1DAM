(() => {
  'use strict';
  const $=id=>document.getElementById(id), api=window.GrinbergOnline;
  const rooms=['Recepción','Archivo de identidades','Comunicaciones','Laboratorio','Servidor central'];
  const params=new URLSearchParams(location.search),demo=params.get('demo')==='1';
  let code='',owner='',poll=null,inFlight='',lastData=null,createToken=null;
  const err=text=>{ $('board-error').textContent=text||'';$('board-error').hidden=!text; };
  function connection(text,ok){$('connection-status').textContent=text;document.querySelector('.signal').classList.toggle('live',ok);}
  function time(seconds){const m=Math.floor(seconds/60),s=Math.floor(seconds%60);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
  function paint(data){
    lastData=data;$('setup').hidden=true;$('board').hidden=false;
    $('session-title').textContent=data.title;$('session-code').textContent=data.code;
    $('session-state').textContent=data.active?'PARTIDA ABIERTA':'PARTIDA CERRADA';
    $('close-session').hidden=demo || !owner || !data.active;
    $('play-link').href='./?partida='+encodeURIComponent(data.code);
    $('total-count').textContent=data.players.length;
    const finished=data.players.filter(p=>p.finished_at).length;
    $('finished-count').textContent=finished;$('playing-count').textContent=data.players.length-finished;
    $('empty').hidden=!!data.players.length;
    const body=$('participants');body.replaceChildren();
    const now=Date.parse(data.now);
    for(const player of data.players){
      const row=document.createElement('tr');
      const values=[String(player.position).padStart(2,'0'),player.alias,player.finished_at?'Investigación completada':String(player.room).padStart(2,'0')+' / '+rooms[player.room-1]];
      values.forEach(value=>{const td=document.createElement('td');td.textContent=value;row.append(td);});
      const progress=document.createElement('td'),wrapper=document.createElement('div'),track=document.createElement('div'),count=document.createElement('span');
      wrapper.className='progress';track.className='track';track.setAttribute('aria-hidden','true');
      for(let n=0;n<10;n++){const segment=document.createElement('i');if(n<player.solved)segment.className='on';track.append(segment);}
      count.textContent=player.solved+' / 10';wrapper.append(track,count);progress.append(wrapper);row.append(progress);
      const elapsed=document.createElement('td');elapsed.className='elapsed';elapsed.textContent=time(Math.max(0,((player.finished_at?Date.parse(player.finished_at):now)-Date.parse(player.joined_at))/1000));row.append(elapsed);
      const state=document.createElement('td'),tag=document.createElement('span');
      const offline=now-Date.parse(player.updated_at)>90000;
      tag.className='tag'+(player.finished_at?' winner':offline?' offline':'');
      tag.textContent=player.finished_at?'SECRETO DESCUBIERTO':!data.active?'PARTIDA CERRADA':offline?'SIN SEÑAL':'EN CAMINO';
      state.append(tag);row.append(state);body.append(row);
    }
    $('updated').textContent=demo?'VISTA DE DEMOSTRACIÓN':'ACTUALIZADO '+new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }
  async function refresh(){
    if(inFlight===code || !code || demo)return;const requested=code;inFlight=requested;
    try{const data=await api.rpc('grinberg_board',{p_code:requested});if(code!==requested)return;paint(data);err('');history.replaceState(null,'','?partida='+code);api.put('grinberg.board.last',code);connection(data.active?'ACTUALIZA CADA 5 S':'PARTIDA CERRADA',true);}
    catch(error){if(code!==requested)return;err(error.message);connection(lastData?'SIN CONEXIÓN · DATOS ANTERIORES':'NO SE HA PODIDO CONECTAR',false);}
    finally{if(inFlight===requested)inFlight='';}
  }
  async function open(raw){
    const next=api.normalize(raw);if(!/^[A-F0-9]{8}$/.test(next)){err('Escribe el código de 8 caracteres que aparece en el tablón.');return;}
    clearInterval(poll);code=next;owner=api.get('grinberg.host.'+code)||'';lastData=null;
    connection('CONECTANDO…',false);await refresh();
    if(lastData){history.replaceState(null,'','?partida='+code);api.put('grinberg.board.last',code);}
    poll=setInterval(refresh,5000);
  }
  $('view-form').addEventListener('submit',e=>{e.preventDefault();open($('view-code').value);});
  $('create-form').addEventListener('submit',async e=>{
    e.preventDefault();err('');const title=$('class-name').value.trim();if(!title)return;
    $('create-button').disabled=true;
    try{createToken=createToken||crypto.randomUUID();const data=await api.rpc('grinberg_create_session',{p_owner:createToken,p_title:title});api.put('grinberg.host.'+data.code,createToken);createToken=null;await open(data.code);}
    catch(error){err(error.message);}finally{$('create-button').disabled=false;}
  });
  $('change-session').addEventListener('click',()=>{clearInterval(poll);code='';lastData=null;$('setup').hidden=false;$('board').hidden=true;err('');connection('ELIGE UNA PARTIDA',false);history.replaceState(null,'','tablon.html');});
  $('copy-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(new URL('./?partida='+code,location.href).href);$('copy-invite').textContent='Enlace copiado ✓';}catch{$('copy-invite').textContent='Comparte el código '+code;}});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{err('Puedes ampliar la pantalla con F11.');}});
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'Salir de pantalla completa':'Pantalla completa';});
  let closePending=false;
  $('close-session').addEventListener('click',async()=>{
    if(!closePending){closePending=true;$('close-session').textContent='Confirmar cierre';setTimeout(()=>{closePending=false;$('close-session').textContent='Cerrar partida';},6000);return;}
    try{await api.rpc('grinberg_close_session',{p_code:code,p_owner:owner});await refresh();}catch(error){err(error.message);}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  if(demo){
    $('demo-banner').hidden=false;connection('DEMOSTRACIÓN',true);code='DEMO2026';
    const now=Date.now(),stamp=minutes=>new Date(now-minutes*60000).toISOString();
    const examples=[['Vega',10,5,5],['Leo',8,5,null],['Nora',6,4,null],['Hugo',5,3,null],['Luna',3,2,null]];
    paint({code,title:'1º DAM · La investigación',active:true,now:new Date(now).toISOString(),players:examples.map(([alias,solved,room,finish],i)=>({position:i+1,alias,solved,room,joined_at:stamp(22),updated_at:stamp(0),finished_at:finish?stamp(finish):null}))});
    $('copy-invite').hidden=true;$('change-session').hidden=true;$('play-link').href='./';
  }else if(params.has('partida'))open(params.get('partida'));
  else{$('view-code').value=api.get('grinberg.board.last')||'';}
})();
