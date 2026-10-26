(() => {
  'use strict';
  const url='https://cseevoxxnskxqwzomglx.supabase.co';
  const key='sb_publishable_i93CR0Do-EBvnAdfubF6Xg_58QWIxrx';
  const memory=new Map();
  function get(k) { try { return localStorage.getItem(k) || memory.get(k); } catch { return memory.get(k); } }
  function put(k,v) { memory.set(k,v); try { localStorage.setItem(k,v); } catch {} }
  async function rpc(name,args) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(args),signal:controller.signal});
      const data=await response.json();
      if(!response.ok) throw new Error(data.code==='P0001' ? data.message : 'No se ha podido conectar con el tablón. Inténtalo de nuevo.');
      return data;
    } catch(error) {
      if(error.name==='AbortError' || error instanceof TypeError) throw new Error('No hay conexión con el tablón. Revisa la conexión e inténtalo de nuevo.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  const normalize=value=>String(value||'').trim().toUpperCase();
  window.GrinbergOnline={rpc,get,put,normalize};
  let active=null, pending=null, latest=null, lastSent='',timer=null,busy=false,closed=false;
  const status=text=>{ const el=document.getElementById('sync-status'); if(el)el.textContent=text; };
  function links() {
    document.querySelectorAll('[data-board-link]').forEach(el=>{el.href='tablon.html'+(active?'?partida='+active.code:'');});
  }
  async function flush() {
    clearTimeout(timer);
    timer=null;
    if(!active || !pending || busy || closed)return;
    const session=active, snapshot=pending; pending=null;busy=true;
    status('Partida '+session.code+' · Enviando progreso…');
    try {
      const result=await rpc('grinberg_progress',{p_code:session.code,p_player:session.token,...snapshot});
      if(active!==session)return;
      if(result.closed){closed=true;status('Partida cerrada · Puedes seguir practicando.');}
      else{lastSent=JSON.stringify(snapshot);status('Partida '+session.code+' · Progreso enviado al tablón');}
    } catch(error) {
      if(active===session){pending=pending||snapshot;status('Sin conexión con el tablón · El avance sigue guardado en este navegador.');timer=setTimeout(flush,10000);}
    } finally {busy=false;if(pending && active===session && !closed && !timer)timer=setTimeout(flush,800);}
  }
  window.GrinbergSync={
    async join(alias,rawCode) {
      const code=normalize(rawCode);
      clearTimeout(timer);timer=null;active=null;pending=null;latest=null;lastSent='';closed=false;
      if(!code){active=null;status('Práctica individual · Sin partida compartida');links();return;}
      if(!/^[A-F0-9]{8}$/.test(code))throw new Error('El código de partida tiene 8 letras y números. Cópialo del tablón.');
      const identity='grinberg.player.'+code+'.'+alias.toLocaleLowerCase();
      let token=get(identity); if(!token){token=crypto.randomUUID();put(identity,token);}
      await rpc('grinberg_join',{p_code:code,p_player:token,p_alias:alias});
      active={code,token};put('grinberg.last-code',code);links();status('Partida '+code+' · Conectado al tablón');
    },
    suffix(alias){return active ? active.code+'.'+active.token : alias;},
    update(snapshot){
      if(!active || closed)return;
      latest=snapshot;
      if(JSON.stringify(snapshot)===lastSent)return;
      pending=snapshot;clearTimeout(timer);timer=setTimeout(()=>{timer=null;flush();},600);
    }
  };
  window.addEventListener('online',()=>{if(latest){pending=latest;flush();}});
  setInterval(()=>{if(active && latest && !document.hidden && !closed){pending=latest;flush();}},30000);
})();
