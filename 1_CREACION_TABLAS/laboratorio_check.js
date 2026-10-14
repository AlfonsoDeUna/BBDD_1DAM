/* Laboratorio CHECK — simulador de restricciones CHECK de MySQL 8 (8.0.16 o posterior)
   Todo se ejecuta en el navegador. El progreso de cada alumno se guarda en su propio navegador. */
(function(){
"use strict";

/* =====================================================================
   1. MOTOR: valores, léxico, expresiones y tablas al estilo MySQL 8
   ===================================================================== */

/* ---------- Valores ---------- */
class CS{constructor(s){this.s=s;}}                       // cadena con comparación binaria (distingue mayúsculas)
class D{                                                   // fecha
  constructor(y,m,d){this.y=y;this.m=m;this.d=d;this.n=Math.round(Date.UTC(y,m-1,d)/864e5);}
  toString(){return String(this.y).padStart(4,'0')+'-'+String(this.m).padStart(2,'0')+'-'+String(this.d).padStart(2,'0');}
}
function mkD(y,m,d){
  if(!(m>=1&&m<=12&&d>=1))return null;
  const dim=new Date(Date.UTC(y,m,0)).getUTCDate();
  return d>dim?null:new D(y,m,d);
}
function toD(v){
  if(v instanceof D)return v;
  if(v instanceof CS)v=v.s;
  if(typeof v==='string'){
    const m=/^\s*(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})\s*$/.exec(v)||/^\s*(\d{4})(\d{2})(\d{2})\s*$/.exec(v);
    if(m)return mkD(+m[1],+m[2],+m[3]);
  }
  if(typeof v==='number'&&v>=10000101&&v<=99991231&&Number.isInteger(v))return mkD(Math.floor(v/1e4),Math.floor(v/100)%100,v%100);
  return null;
}
const isS=v=>typeof v==='string'||v instanceof CS;
const S=v=>v instanceof CS?v.s:v instanceof D?v.toString():String(v);
function num(v){
  if(typeof v==='number')return v;
  if(v instanceof D)return v.y*10000+v.m*100+v.d;
  const m=/^\s*[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(S(v));
  return m?parseFloat(m[0]):0;
}
function truth(v){if(v===null||v===undefined)return null;if(v instanceof D)return true;return num(v)!==0;}
const key=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();   // utf8mb4_0900_ai_ci
function cmpVals(a,b){
  if(a===null||b===null||a===undefined||b===undefined)return null;
  if(a instanceof D||b instanceof D){
    const x=toD(a),y=toD(b);
    if(x&&y)return Math.sign(x.n-y.n);
    if(typeof a==='number'||typeof b==='number')return Math.sign(num(a)-num(b));
    const p=S(a),q=S(b);return p<q?-1:p>q?1:0;
  }
  if(isS(a)&&isS(b)){
    let p=S(a),q=S(b);
    if(!(a instanceof CS||b instanceof CS)){p=key(p);q=key(q);}
    return p<q?-1:p>q?1:0;
  }
  return Math.sign(num(a)-num(b));
}
function sqlLit(v){
  if(v===null||v===undefined)return 'NULL';
  if(typeof v==='number')return String(v);
  return "'"+S(v).replace(/'/g,"''")+"'";
}
function truthTxt(v){const t=truth(v);return t===null?'NULL':t?'TRUE':'FALSE';}

function E(msg){const e=new Error(msg);e.sql=true;return e;}
const SUBQ='Un CHECK no puede contener subconsultas (SELECT). Solo puede usar las columnas de la fila que se está guardando.';
const disallowed=n=>'La expresión usa '+n.toUpperCase()+'(), una función no determinista: su resultado cambia según el momento o el usuario. MySQL no la admite en un CHECK.';

/* ---------- Léxico ---------- */
function lex(src){
  const t=[];t.src=src;let i=0;
  const push=(o,s)=>{o.s=s;o.e=i;t.push(o);};
  while(i<src.length){
    const c=src[i],s0=i;
    if(/\s/.test(c)){i++;continue;}
    if(c==='-'&&src[i+1]==='-'&&(i+2>=src.length||/\s/.test(src[i+2]))){while(i<src.length&&src[i]!=='\n')i++;continue;}
    if(c==='#'){while(i<src.length&&src[i]!=='\n')i++;continue;}
    if(c==='/'&&src[i+1]==='*'){const e=src.indexOf('*/',i+2);i=e<0?src.length:e+2;continue;}
    if(c==="'"||c==='"'){
      const q=c;let val='',closed=false;i++;
      while(i<src.length){
        const d=src[i];
        if(d===q){if(src[i+1]===q){val+=q;i+=2;continue;}closed=true;i++;break;}
        if(d==='\\'){
          const e=src[i+1];if(e===undefined){val+=d;i++;continue;}
          const M={'0':'\0',"'":"'",'"':'"',b:'\b',n:'\n',r:'\r',t:'\t',Z:'\x1A','\\':'\\','%':'\\%','_':'\\_'};
          val+=(e in M)?M[e]:e;i+=2;continue;
        }
        val+=d;i++;
      }
      if(!closed)throw E('Falta cerrar una comilla '+q+'.');
      push({t:'str',val},s0);continue;
    }
    if(c==='`'){const e=src.indexOf('`',i+1);if(e<0)throw E('Falta cerrar un acento grave `.');const n=src.slice(i+1,e);i=e+1;push({t:'id',v:n.toUpperCase(),raw:n,q:true},s0);continue;}
    if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(src[i+1]||''))){
      const m=/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));i+=m[0].length;push({t:'num',v:parseFloat(m[0])},s0);continue;
    }
    if(/[A-Za-z_\u00C0-\u024F]/.test(c)){
      let j=i;while(j<src.length&&/[A-Za-z0-9_$\u00C0-\u024F]/.test(src[j]))j++;
      const raw=src.slice(i,j);i=j;push({t:'id',v:raw.toUpperCase(),raw},s0);continue;
    }
    const three=src.slice(i,i+3),two=src.slice(i,i+2);
    if(three==='<=>'){i+=3;push({t:'op',v:three},s0);continue;}
    if(['<>','!=','<=','>=','||','&&'].includes(two)){i+=2;push({t:'op',v:two},s0);continue;}
    if('(),;.+-*/%=<>!@'.includes(c)){i++;push({t:'op',v:c},s0);continue;}
    throw E('Carácter inesperado «'+c+'».');
  }
  return t;
}
const show=t=>!t?'el final del texto':t.t==='str'?"'"+t.val+"'":t.t==='id'?t.raw:String(t.v);
const srcOf=(toks,a,b)=>toks.src.slice(toks[a].s,toks[b].e);

/* ---------- Funciones admitidas ---------- */
const DISALLOWED=new Set(['NOW','SYSDATE','CURDATE','CURTIME','CURRENT_DATE','CURRENT_TIME','CURRENT_TIMESTAMP','LOCALTIME','LOCALTIMESTAMP','UTC_DATE','UTC_TIME','UTC_TIMESTAMP','RAND','UUID','UUID_SHORT','CONNECTION_ID','CURRENT_USER','USER','SESSION_USER','SYSTEM_USER','DATABASE','SCHEMA','LAST_INSERT_ID','FOUND_ROWS','ROW_COUNT','VERSION','SLEEP','UNIX_TIMESTAMP']);
const NILADIC=new Set(['CURRENT_DATE','CURRENT_TIME','CURRENT_TIMESTAMP','LOCALTIME','LOCALTIMESTAMP','CURRENT_USER','UTC_DATE','UTC_TIME','UTC_TIMESTAMP']);
const u8=s=>new TextEncoder().encode(s).length;
const keepCS=(v,s)=>v instanceof CS?new CS(s):s;
const chars=s=>Array.from(S(s));
function roundHalf(x,d){const f=Math.pow(10,d);return Math.sign(x)*Math.round(Math.abs(x)*f+1e-9)/f;}
function dayOfWeek(d){return new Date(d.n*864e5).getUTCDay();}
const POSIX={alpha:'A-Za-zÀ-ÖØ-öø-ÿ',digit:'0-9',alnum:'A-Za-z0-9À-ÖØ-öø-ÿ',upper:'A-ZÀ-ÖØ-Þ',lower:'a-zß-öø-ÿ',space:'\\s',blank:' \\t',punct:'!-\\/:-@\\[-`{-~',xdigit:'0-9A-Fa-f'};
function makeRx(p,flags,ci){
  let c=ci,src=p.replace(/\[:([a-z]+):\]/g,(m,n)=>POSIX[n]||m);
  let fl='';
  for(const ch of (flags||'')){if(ch==='c')c=false;else if(ch==='i')c=true;else if(ch==='m')fl+='m';else if(ch==='n')fl+='s';else if(ch!=='u')throw E("Parámetro de REGEXP_LIKE no válido: '"+ch+"'.");}
  try{return new RegExp(src,(c?'i':'')+fl);}catch(e){throw E("El patrón '"+p+"' no es una expresión regular válida.");}
}
const FN={
  UPPER:[1,1,a=>keepCS(a[0],S(a[0]).toUpperCase())],UCASE:[1,1,a=>keepCS(a[0],S(a[0]).toUpperCase())],
  LOWER:[1,1,a=>keepCS(a[0],S(a[0]).toLowerCase())],LCASE:[1,1,a=>keepCS(a[0],S(a[0]).toLowerCase())],
  LTRIM:[1,1,a=>keepCS(a[0],S(a[0]).replace(/^ +/,''))],RTRIM:[1,1,a=>keepCS(a[0],S(a[0]).replace(/ +$/,''))],
  LENGTH:[1,1,a=>u8(S(a[0]))],OCTET_LENGTH:[1,1,a=>u8(S(a[0]))],
  CHAR_LENGTH:[1,1,a=>chars(a[0]).length],CHARACTER_LENGTH:[1,1,a=>chars(a[0]).length],
  SUBSTRING:[2,3,a=>{const c=chars(a[0]);const p=Math.round(num(a[1]));let st;if(p>0)st=p-1;else if(p<0)st=c.length+p;else return '';if(st<0)return '';const len=a.length>2?Math.round(num(a[2])):c.length;if(len<=0)return '';return c.slice(st,st+len).join('');}],
  LEFT:[2,2,a=>chars(a[0]).slice(0,Math.max(0,Math.round(num(a[1])))).join('')],
  RIGHT:[2,2,a=>{const c=chars(a[0]);const n=Math.max(0,Math.round(num(a[1])));return n?c.slice(-n).join(''):'';}],
  CONCAT:[1,99,a=>a.map(S).join('')],
  INSTR:[2,2,a=>key(S(a[0])).indexOf(key(S(a[1])))+1],
  LOCATE:[2,2,a=>key(S(a[1])).indexOf(key(S(a[0])))+1],
  REPLACE:[3,3,a=>S(a[0]).split(S(a[1])).join(S(a[2]))],
  REVERSE:[1,1,a=>chars(a[0]).reverse().join('')],
  ABS:[1,1,a=>Math.abs(num(a[0]))],
  MOD:[2,2,a=>{const b=num(a[1]);return b===0?null:num(a[0])%b;}],
  ROUND:[1,2,a=>roundHalf(num(a[0]),a.length>1?Math.round(num(a[1])):0)],
  TRUNCATE:[2,2,a=>{const f=Math.pow(10,Math.round(num(a[1])));return Math.trunc(num(a[0])*f)/f;}],
  FLOOR:[1,1,a=>Math.floor(num(a[0]))],CEIL:[1,1,a=>Math.ceil(num(a[0]))],CEILING:[1,1,a=>Math.ceil(num(a[0]))],
  SIGN:[1,1,a=>Math.sign(num(a[0]))],POWER:[2,2,a=>Math.pow(num(a[0]),num(a[1]))],POW:[2,2,a=>Math.pow(num(a[0]),num(a[1]))],
  SQRT:[1,1,a=>{const x=num(a[0]);return x<0?null:Math.sqrt(x);}],
  YEAR:[1,1,a=>{const d=toD(a[0]);return d?d.y:null;}],MONTH:[1,1,a=>{const d=toD(a[0]);return d?d.m:null;}],
  DAY:[1,1,a=>{const d=toD(a[0]);return d?d.d:null;}],DAYOFMONTH:[1,1,a=>{const d=toD(a[0]);return d?d.d:null;}],
  DAYOFWEEK:[1,1,a=>{const d=toD(a[0]);return d?dayOfWeek(d)+1:null;}],
  WEEKDAY:[1,1,a=>{const d=toD(a[0]);return d?(dayOfWeek(d)+6)%7:null;}],
  DAYOFYEAR:[1,1,a=>{const d=toD(a[0]);return d?d.n-mkD(d.y,1,1).n+1:null;}],
  DATEDIFF:[2,2,a=>{const x=toD(a[0]),y=toD(a[1]);return x&&y?x.n-y.n:null;}],
  DATE:[1,1,a=>toD(a[0])],
  GREATEST:[2,99,a=>a.reduce((m,v)=>cmpVals(v,m)>0?v:m)],LEAST:[2,99,a=>a.reduce((m,v)=>cmpVals(v,m)<0?v:m)],
  REGEXP_LIKE:[2,3,a=>{const ci=!(a[0] instanceof CS||a[1] instanceof CS);return makeRx(S(a[1]),a.length>2?S(a[2]):'',ci).test(S(a[0]))?1:0;}],
  IFNULL:[2,2,a=>a[0]!==null?a[0]:a[1],'raw'],
  COALESCE:[1,99,a=>{for(const v of a)if(v!==null)return v;return null;},'raw'],
  NULLIF:[2,2,a=>cmpVals(a[0],a[1])===0?null:a[0],'raw'],
  IF:[3,3,a=>truth(a[0])===true?a[1]:a[2],'raw']
};
const UNITS=['YEAR','MONTH','DAY','WEEK'];

/* ---------- Analizador de expresiones ---------- */
class P{
  constructor(t,ctx){this.t=t;this.i=0;this.ctx=ctx;}
  peek(o){return this.t[this.i+(o||0)];}
  next(){return this.t[this.i++];}
  kw(k,o){const x=this.t[this.i+(o||0)];return !!x&&x.t==='id'&&!x.q&&x.v===k;}
  op(v,o){const x=this.t[this.i+(o||0)];return !!x&&x.t==='op'&&x.v===v;}
  eatKw(k){if(this.kw(k)){this.i++;return true;}return false;}
  eatOp(v){if(this.op(v)){this.i++;return true;}return false;}
  needOp(v){if(!this.eatOp(v))throw E('Esperaba «'+v+'» y he encontrado '+show(this.peek())+'.');}
  needKw(k){if(!this.eatKw(k))throw E('Esperaba '+k+' y he encontrado '+show(this.peek())+'.');}
  ident(what){const x=this.next();if(!x||x.t!=='id')throw E('Esperaba '+what+' y he encontrado '+show(x)+'.');return x;}
  expr(){return this.or();}
  or(){let l=this.xor();while(this.kw('OR')||this.op('||')){this.i++;l={k:'or',l,r:this.xor()};}return l;}
  xor(){let l=this.and();while(this.kw('XOR')){this.i++;l={k:'xor',l,r:this.and()};}return l;}
  and(){let l=this.not();while(this.kw('AND')||this.op('&&')){this.i++;l={k:'and',l,r:this.not()};}return l;}
  not(){if(this.kw('NOT')){this.i++;return {k:'not',e:this.not()};}return this.pred();}
  pred(){
    let a=this.add();
    for(;;){
      if(this.eatKw('IS')){
        const neg=this.eatKw('NOT');let w;
        if(this.eatKw('NULL')||this.eatKw('UNKNOWN'))w='null';else if(this.eatKw('TRUE'))w='true';else if(this.eatKw('FALSE'))w='false';
        else throw E('Después de IS va NULL, NOT NULL, TRUE o FALSE.');
        a={k:'is',e:a,w,neg};continue;
      }
      let neg=false;
      if(this.kw('NOT')&&['BETWEEN','IN','LIKE','REGEXP','RLIKE'].some(k=>this.kw(k,1))){this.i++;neg=true;}
      if(this.eatKw('BETWEEN')){const lo=this.add();this.needKw('AND');const hi=this.add();a={k:'between',e:a,lo,hi};if(neg)a={k:'not',e:a};continue;}
      if(this.eatKw('IN')){
        this.needOp('(');if(this.kw('SELECT'))throw E(SUBQ);
        const list=[this.expr()];while(this.eatOp(','))list.push(this.expr());this.needOp(')');
        a={k:'in',e:a,list};if(neg)a={k:'not',e:a};continue;
      }
      if(this.eatKw('LIKE')){const p=this.add();let es=null;if(this.eatKw('ESCAPE'))es=this.add();a={k:'like',e:a,p,es};if(neg)a={k:'not',e:a};continue;}
      if(this.eatKw('REGEXP')||this.eatKw('RLIKE')){const p=this.add();this.rxCheck(p);a={k:'rx',e:a,p};if(neg)a={k:'not',e:a};continue;}
      if(neg)throw E('NOT en una posición que no entiendo.');
      const x=this.peek();
      if(x&&x.t==='op'&&['=','<=>','<>','!=','<','>','<=','>='].includes(x.v)){
        this.i++;
        if(this.kw('ANY')||this.kw('ALL')||this.kw('SOME'))throw E(SUBQ);
        a={k:'cmp',op:x.v,l:a,r:this.add()};continue;
      }
      return a;
    }
  }
  rxCheck(p){if(p.k==='lit'&&p.v!==null)makeRx(S(p.v),'',true);}
  add(){let l=this.mul();for(;;){if(this.op('+')||this.op('-')){const o=this.next().v;l={k:'ar',o,l,r:this.mul()};}else return l;}}
  mul(){
    let l=this.un();
    for(;;){
      if(this.op('*')||this.op('/')||this.op('%')){const o=this.next().v;l={k:'ar',o,l,r:this.un()};}
      else if(this.kw('DIV')||(this.kw('MOD')&&!this.op('(',1))){const o=this.next().v==='DIV'?'div':'%';l={k:'ar',o,l,r:this.un()};}
      else return l;
    }
  }
  un(){
    if(this.eatOp('-'))return {k:'neg',e:this.un()};
    if(this.eatOp('+'))return this.un();
    if(this.eatOp('!'))return {k:'not',e:this.un()};
    if(this.kw('BINARY')&&!this.op('(',1)){this.i++;return {k:'cs',e:this.un()};}
    let e=this.prim();
    while(this.kw('COLLATE')){
      this.i++;const n=this.ident('el nombre de una colación');const v=n.raw.toLowerCase();
      if(!/^(utf8mb4|utf8mb3|utf8|latin1|binary)/.test(v))throw E('Colación desconocida: '+n.raw+'.');
      e={k:/_ci$/.test(v)?'ci':'cs',e};
    }
    return e;
  }
  prim(){
    const x=this.next();
    if(!x)throw E('La expresión está incompleta.');
    if(x.t==='num')return {k:'lit',v:x.v};
    if(x.t==='str')return {k:'lit',v:x.val};
    if(x.t==='op'){
      if(x.v==='('){if(this.kw('SELECT'))throw E(SUBQ);const e=this.expr();this.needOp(')');return e;}
      if(x.v==='@')throw E('Un CHECK no puede usar variables (@variable ni @@variable del sistema).');
      throw E('No esperaba «'+x.v+'» aquí.');
    }
    const V=x.q?'':x.v;
    if(V==='NULL')return {k:'lit',v:null};
    if(V==='TRUE')return {k:'lit',v:1};
    if(V==='FALSE')return {k:'lit',v:0};
    if(V==='DATE'&&this.peek()&&this.peek().t==='str'){const s=this.next();const d=toD(s.val);if(!d)throw E("Fecha no válida: '"+s.val+"'. El formato es 'AAAA-MM-DD'.");return {k:'lit',v:d};}
    if(V==='CASE')return this.caseExpr();
    if(V==='SELECT'||V==='EXISTS')throw E(SUBQ);
    if(V==='INTERVAL')throw E('INTERVAL se usa dentro de DATE_ADD(fecha, INTERVAL n YEAR) o DATE_SUB.');
    if(V&&NILADIC.has(V)&&!this.op('('))throw E(disallowed(x.raw));
    if(V&&this.op('('))return this.call(x);
    if(this.op('.')){
      this.i++;const c=this.ident('un nombre de columna');
      if(!this.ctx||key(x.raw)!==key(this.ctx.table))throw E('Un CHECK no puede usar columnas de otras tablas ('+x.raw+'.'+c.raw+'). Para exigir que un valor exista en otra tabla se usa una FOREIGN KEY.');
      return this.colRef(c);
    }
    return this.colRef(x);
  }
  colRef(x){
    const cols=this.ctx?this.ctx.cols:null;
    const c=cols?cols.get(x.raw.toLowerCase()):null;
    if(!c){
      if(['AND','OR','NOT','THEN','ELSE','END','WHEN','CHECK','CONSTRAINT'].includes(x.v))throw E('No esperaba '+x.raw+' aquí: revisa la expresión.');
      if(!cols||!cols.size)throw E("Aquí no se pueden usar columnas ('"+x.raw+"'): solo valores.");
      throw E("Columna desconocida '"+x.raw+"'. Las columnas son: "+[...cols.values()].map(c=>c.n).join(', ')+". Si querías un texto, ponlo entre comillas: '"+x.raw+"'.");
    }
    this.ctx.refs.add(c.n);
    return {k:'col',c};
  }
  unit(){const u=this.ident('una unidad (YEAR, MONTH, DAY)');if(!UNITS.includes(u.v))throw E('Unidad no admitida en este laboratorio: '+u.raw+'. Usa YEAR, MONTH, WEEK o DAY.');return u.v;}
  call(x){
    const N=x.v;this.needOp('(');
    if(DISALLOWED.has(N))throw E(disallowed(x.raw));
    if(N==='CAST'||N==='CONVERT'){
      const e=this.expr();
      if(N==='CAST')this.needKw('AS');else this.needOp(',');
      const ty=this.ident('un tipo');
      if(this.eatOp('(')){while(this.peek()&&!this.op(')'))this.i++;this.needOp(')');}
      if(ty.v==='UNSIGNED'||ty.v==='SIGNED')this.eatKw('INTEGER');
      this.needOp(')');return {k:'cast',e,ty:ty.v};
    }
    if(N==='EXTRACT'){const u=this.unit();this.needKw('FROM');const e=this.expr();this.needOp(')');if(u==='WEEK')throw E('EXTRACT(WEEK …) no está simulado.');return {k:'fn',f:u,args:[e]};}
    if(N==='TIMESTAMPDIFF'){const u=this.unit();this.needOp(',');const a=this.expr();this.needOp(',');const b=this.expr();this.needOp(')');return {k:'tsd',u,a,b};}
    if(N==='DATE_ADD'||N==='DATE_SUB'||N==='ADDDATE'||N==='SUBDATE'){
      const d=this.expr();this.needOp(',');let n,u='DAY';
      if(this.eatKw('INTERVAL')){n=this.expr();u=this.unit();}else n=this.expr();
      this.needOp(')');return {k:'dadd',d,n,u,sub:N==='DATE_SUB'||N==='SUBDATE'};
    }
    if(N==='TRIM'){
      let mode='BOTH';if(this.kw('BOTH')||this.kw('LEADING')||this.kw('TRAILING'))mode=this.next().v;
      let rem=null,e;
      if(this.eatKw('FROM'))e=this.expr();
      else{e=this.expr();if(this.eatKw('FROM')){rem=e;e=this.expr();}}
      this.needOp(')');return {k:'trim',mode,rem,e};
    }
    const f=FN[N];
    if(!f)throw E('No conozco la función '+x.raw+'(). Si es una función almacenada (CREATE FUNCTION), MySQL no la admite en un CHECK.');
    const args=[];
    if(!this.op(')')){args.push(this.expr());while(this.eatOp(','))args.push(this.expr());}
    this.needOp(')');
    if(args.length<f[0]||args.length>f[1])throw E(x.raw+'() necesita '+(f[0]===f[1]?f[0]:'entre '+f[0]+' y '+f[1])+' argumentos.');
    if(N==='REGEXP_LIKE'&&args[1].k==='lit'&&args[1].v!==null)makeRx(S(args[1].v),args[2]&&args[2].k==='lit'?S(args[2].v):'',true);
    return {k:'fn',f:N,args};
  }
  caseExpr(){
    let base=null;if(!this.kw('WHEN'))base=this.expr();
    const wh=[];while(this.eatKw('WHEN')){const w=this.expr();this.needKw('THEN');wh.push([w,this.expr()]);}
    if(!wh.length)throw E('CASE necesita al menos un WHEN … THEN.');
    let el=null;if(this.eatKw('ELSE'))el=this.expr();
    this.needKw('END');return {k:'case',base,wh,el};
  }
}

/* ---------- Evaluación (lógica de tres valores) ---------- */
function likeRx(p,esc){
  let out='';const c=Array.from(p);
  for(let i=0;i<c.length;i++){
    const ch=c[i];
    if(ch===esc&&i+1<c.length){out+=c[++i].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');continue;}
    if(ch==='%')out+='[\\s\\S]*';else if(ch==='_')out+='[\\s\\S]';else out+=ch.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }
  return new RegExp('^'+out+'$');
}
function addMonths(d,n){let m=d.m-1+n,y=d.y+Math.floor(m/12);m=((m%12)+12)%12+1;const dim=new Date(Date.UTC(y,m,0)).getUTCDate();return new D(y,m,Math.min(d.d,dim));}
function ev(n,row){
  switch(n.k){
    case 'lit':return n.v;
    case 'col':{const v=row[n.c.n];if(v===undefined||v===null)return null;return (n.c.cs&&typeof v==='string')?new CS(v):v;}
    case 'cs':{const v=ev(n.e,row);return v===null?null:new CS(S(v));}
    case 'ci':{const v=ev(n.e,row);return v instanceof CS?v.s:v;}
    case 'neg':{const v=ev(n.e,row);return v===null?null:-num(v);}
    case 'not':{const t=truth(ev(n.e,row));return t===null?null:(t?0:1);}
    case 'and':{const a=truth(ev(n.l,row));if(a===false)return 0;const b=truth(ev(n.r,row));if(b===false)return 0;return (a===null||b===null)?null:1;}
    case 'or':{const a=truth(ev(n.l,row));if(a===true)return 1;const b=truth(ev(n.r,row));if(b===true)return 1;return (a===null||b===null)?null:0;}
    case 'xor':{const a=truth(ev(n.l,row)),b=truth(ev(n.r,row));if(a===null||b===null)return null;return a!==b?1:0;}
    case 'cmp':{
      const a=ev(n.l,row),b=ev(n.r,row);
      if(n.op==='<=>'){if(a===null&&b===null)return 1;if(a===null||b===null)return 0;return cmpVals(a,b)===0?1:0;}
      const c=cmpVals(a,b);if(c===null)return null;
      switch(n.op){case '=':return +(c===0);case '<>':case '!=':return +(c!==0);case '<':return +(c<0);case '>':return +(c>0);case '<=':return +(c<=0);default:return +(c>=0);}
    }
    case 'is':{const v=ev(n.e,row);let r;if(n.w==='null')r=v===null;else{const t=truth(v);r=n.w==='true'?t===true:t===false;}return +(n.neg?!r:r);}
    case 'between':{
      const a=ev(n.e,row),lo=ev(n.lo,row),hi=ev(n.hi,row);
      const c1=cmpVals(a,lo),c2=cmpVals(a,hi);const t1=c1===null?null:c1>=0,t2=c2===null?null:c2<=0;
      if(t1===false||t2===false)return 0;if(t1===null||t2===null)return null;return 1;
    }
    case 'in':{
      const a=ev(n.e,row);if(a===null)return null;let hasNull=false;
      for(const x of n.list){const c=cmpVals(a,ev(x,row));if(c===null){hasNull=true;continue;}if(c===0)return 1;}
      return hasNull?null:0;
    }
    case 'like':{
      const a=ev(n.e,row),p=ev(n.p,row);if(a===null||p===null)return null;
      const esc=n.es?S(ev(n.es,row)):'\\';const ci=!(a instanceof CS||p instanceof CS);
      const s=ci?key(S(a)):S(a),pt=ci?key(S(p)):S(p);
      return likeRx(pt,esc).test(s)?1:0;
    }
    case 'rx':{const a=ev(n.e,row),p=ev(n.p,row);if(a===null||p===null)return null;return makeRx(S(p),'',!(a instanceof CS||p instanceof CS)).test(S(a))?1:0;}
    case 'ar':{
      const a=ev(n.l,row),b=ev(n.r,row);if(a===null||b===null)return null;
      const x=num(a),y=num(b);
      switch(n.o){case '+':return x+y;case '-':return x-y;case '*':return x*y;case '/':return y===0?null:x/y;case '%':return y===0?null:x%y;default:return y===0?null:Math.trunc(x/y);}
    }
    case 'fn':{
      const f=FN[n.f];const a=n.args.map(x=>ev(x,row));
      if(f[3]!=='raw'&&a.some(v=>v===null))return null;
      return f[2](a);
    }
    case 'case':{
      if(n.base){const b=ev(n.base,row);for(const [w,t] of n.wh){if(b!==null&&cmpVals(b,ev(w,row))===0)return ev(t,row);}}
      else for(const [w,t] of n.wh){if(truth(ev(w,row))===true)return ev(t,row);}
      return n.el?ev(n.el,row):null;
    }
    case 'trim':{
      const v=ev(n.e,row);if(v===null)return null;const r=n.rem?ev(n.rem,row):' ';if(r===null)return null;
      let s=S(v);const rs=S(r);if(!rs)return keepCS(v,s);
      if(n.mode!=='TRAILING')while(s.startsWith(rs))s=s.slice(rs.length);
      if(n.mode!=='LEADING')while(s.endsWith(rs))s=s.slice(0,-rs.length);
      return keepCS(v,s);
    }
    case 'tsd':{
      const a=toD(ev(n.a,row)),b=toD(ev(n.b,row));if(!a||!b)return null;
      if(n.u==='DAY')return b.n-a.n;if(n.u==='WEEK')return Math.trunc((b.n-a.n)/7);
      let m=(b.y-a.y)*12+(b.m-a.m);if(m>0&&b.d<a.d)m--;if(m<0&&b.d>a.d)m++;
      return n.u==='MONTH'?m:Math.trunc(m/12);
    }
    case 'dadd':{
      const d=toD(ev(n.d,row)),k=ev(n.n,row);if(!d||k===null)return null;let x=Math.round(num(k));if(n.sub)x=-x;
      if(n.u==='DAY'||n.u==='WEEK'){const t=d.n+(n.u==='WEEK'?7*x:x);const j=new Date(t*864e5);return new D(j.getUTCFullYear(),j.getUTCMonth()+1,j.getUTCDate());}
      return addMonths(d,n.u==='YEAR'?12*x:x);
    }
    case 'cast':{
      const v=ev(n.e,row);if(v===null)return null;
      if(n.ty==='BINARY')return new CS(S(v));
      if(n.ty==='CHAR')return S(v);
      if(n.ty==='DATE')return toD(v);
      if(n.ty==='SIGNED'||n.ty==='UNSIGNED'||n.ty==='INTEGER')return Math.round(num(v));
      return num(v);
    }
  }
  throw E('Expresión no simulada.');
}

/* ---------- Tablas ---------- */
const INTR={TINYINT:[-128,127,255],SMALLINT:[-32768,32767,65535],MEDIUMINT:[-8388608,8388607,16777215],INT:[-2147483648,2147483647,4294967295],BIGINT:[-9.22e18,9.22e18,1.84e19]};
function parseType(p){
  const t=p.ident('un tipo de dato');const N=t.v;let ty;
  const nums=()=>{const a=[];if(p.eatOp('(')){do{const x=p.next();if(!x||x.t!=='num')throw E('Esperaba un número entre paréntesis después de '+t.raw+'.');a.push(x.v);}while(p.eatOp(','));p.needOp(')');}return a;};
  if(['INT','INTEGER','TINYINT','SMALLINT','MEDIUMINT','BIGINT'].includes(N)){nums();ty={k:'int',sub:N==='INTEGER'?'INT':N};}
  else if(N==='BOOLEAN'||N==='BOOL')ty={k:'int',sub:'TINYINT'};
  else if(['DECIMAL','NUMERIC','DEC','FIXED'].includes(N)){const a=nums();ty={k:'dec',p:a[0]===undefined?10:a[0],s:a[1]===undefined?0:a[1]};if(ty.s>ty.p)throw E('En DECIMAL(p,s) la escala s no puede ser mayor que p.');}
  else if(['FLOAT','DOUBLE','REAL'].includes(N)){nums();ty={k:'float'};}
  else if(N==='VARCHAR'){const a=nums();if(!a.length)throw E('VARCHAR necesita una longitud, por ejemplo VARCHAR(50).');ty={k:'str',len:a[0]};}
  else if(N==='CHAR'){const a=nums();ty={k:'str',len:a[0]===undefined?1:a[0],fixed:true};}
  else if(['TEXT','TINYTEXT','MEDIUMTEXT','LONGTEXT'].includes(N))ty={k:'str',len:null};
  else if(N==='DATE')ty={k:'date'};
  else if(N==='DATETIME'||N==='TIMESTAMP'){nums();ty={k:'date'};}
  else if(N==='ENUM'){p.needOp('(');const vals=[];do{const x=p.next();if(!x||x.t!=='str')throw E('Los valores de ENUM van entre comillas.');vals.push(x.val);}while(p.eatOp(','));p.needOp(')');ty={k:'enum',vals};}
  else throw E("Tipo de dato no reconocido: '"+t.raw+"'.");
  if(ty.k==='int'||ty.k==='dec'||ty.k==='float'){if(p.eatKw('UNSIGNED'))ty.unsigned=true;p.eatKw('SIGNED');p.eatKw('ZEROFILL');}
  return ty;
}
function readColList(p){p.needOp('(');const a=[];do{a.push(p.ident('un nombre de columna').raw);if(p.eatOp('(')){p.next();p.needOp(')');}p.eatKw('ASC');p.eatKw('DESC');}while(p.eatOp(','));p.needOp(')');return a;}
function readCheck(p,name,colLevel){
  p.needOp('(');const a=p.i;let depth=1;
  while(p.i<p.t.length){const x=p.t[p.i];if(x.t==='op'&&x.v==='(')depth++;else if(x.t==='op'&&x.v===')'){depth--;if(!depth)break;}p.i++;}
  if(depth)throw E('Falta cerrar un paréntesis en el CHECK.');
  const toks=p.t.slice(a,p.i);toks.src=p.t.src;const src=p.i>a?srcOf(p.t,a,p.i-1):'';
  p.i++;
  let enforced=true;
  if(p.kw('NOT')&&p.kw('ENFORCED',1)){p.i+=2;enforced=false;}else p.eatKw('ENFORCED');
  if(!toks.length)throw E('El CHECK está vacío.');
  return {name,toks,src,colLevel,enforced};
}
function colMap(T){const m=new Map();for(const c of T.cols)m.set(c.n.toLowerCase(),c);return m;}
function addCheck(T,pc){
  const ctx={table:T.name,cols:colMap(T),refs:new Set()};
  const p=new P(pc.toks,ctx);const ast=p.expr();
  if(p.i<pc.toks.length)throw E('Sobra algo en el CHECK a partir de '+show(pc.toks[p.i])+'. ¿Falta un AND u OR?');
  if(pc.colLevel){const other=[...ctx.refs].filter(r=>r!==pc.colLevel);if(other.length)throw E('La restricción de la columna '+pc.colLevel+' usa otra columna ('+other.join(', ')+'). Una restricción de columna solo puede usar su propia columna: escríbela como restricción de tabla, después de las columnas.');}
  for(const r of ctx.refs){const c=T.cols.find(c=>c.n===r);if(c&&c.ai)throw E('Un CHECK no puede usar una columna AUTO_INCREMENT ('+r+').');}
  let name=pc.name;
  if(!name){let mx=0;const re=new RegExp('^'+T.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'_chk_(\\d+)$','i');for(const c of T.checks){const m=re.exec(c.name);if(m)mx=Math.max(mx,+m[1]);}name=T.name+'_chk_'+(mx+1);}
  if(T.checks.some(c=>key(c.name)===key(name)))throw E("Ya existe una restricción CHECK llamada '"+name+"'. Los nombres de CHECK no se pueden repetir dentro de la misma base de datos.");
  const ch={name,ast,src:pc.src,enforced:pc.enforced,colLevel:pc.colLevel||null,auto:!pc.name,refs:[...ctx.refs]};
  T.checks.push(ch);return ch;
}
function parseCreate(toks){
  const p=new P(toks,null);
  p.needKw('CREATE');p.eatKw('TEMPORARY');p.needKw('TABLE');
  if(p.eatKw('IF')){p.needKw('NOT');p.needKw('EXISTS');}
  const tn=p.ident('el nombre de la tabla');
  const T={name:tn.raw,cols:[],checks:[],pk:null,uniques:[],rows:[],notes:[]};
  p.needOp('(');const pending=[];
  do{
    if(p.op(')'))break;
    let cname=null,hadC=false;
    if(p.eatKw('CONSTRAINT')){hadC=true;if(!(p.kw('CHECK')||p.kw('PRIMARY')||p.kw('UNIQUE')||p.kw('FOREIGN')))cname=p.ident('el nombre de la restricción').raw;}
    if(p.eatKw('CHECK')){pending.push(readCheck(p,cname,null));continue;}
    if(p.eatKw('PRIMARY')){p.needKw('KEY');if(T.pk)throw E('La tabla ya tiene una clave primaria.');T.pk=readColList(p);continue;}
    if(p.eatKw('UNIQUE')){if(!p.eatKw('KEY'))p.eatKw('INDEX');let iname=null;if(!p.op('('))iname=p.ident('el nombre del índice').raw;const cols=readColList(p);T.uniques.push({name:iname||cname||cols[0],cols});continue;}
    if(p.eatKw('FOREIGN')){p.needKw('KEY');if(!p.op('('))p.next();readColList(p);p.needKw('REFERENCES');p.ident('una tabla');readColList(p);
      while(p.eatKw('ON')){p.next();if(p.eatKw('SET'))p.next();else if(p.eatKw('NO'))p.next();else p.next();}
      if(!T.notes.includes('fk'))T.notes.push('fk');continue;}
    if(hadC)throw E('Después de CONSTRAINT va CHECK, PRIMARY KEY, UNIQUE o FOREIGN KEY.');
    if(p.kw('KEY')||p.kw('INDEX')){p.i++;if(!p.op('('))p.next();readColList(p);continue;}
    const cn=p.ident('el nombre de una columna');
    if(cn.t==='id'&&!cn.q&&['CHECK','CONSTRAINT','PRIMARY'].includes(cn.v))throw E('Esperaba el nombre de una columna.');
    if(T.cols.some(c=>key(c.n)===key(cn.raw)))throw E("Columna duplicada: '"+cn.raw+"'.");
    const s0=p.i;const ty=parseType(p);const tyTxt=srcOf(toks,s0,p.i-1).toUpperCase();
    const col={n:cn.raw,ty,tyTxt,notnull:false,ai:false,def:undefined,cs:false};
    T.cols.push(col);
    for(;;){
      if(p.kw('NOT')&&p.kw('NULL',1)){p.i+=2;col.notnull=true;continue;}
      if(p.eatKw('NULL'))continue;
      if(p.eatKw('DEFAULT')){const pp=new P(toks,{table:T.name,cols:new Map(),refs:new Set()});pp.i=p.i;const e=pp.un();p.i=pp.i;col.def=ev(e,{});continue;}
      if(p.eatKw('AUTO_INCREMENT')){col.ai=true;continue;}
      if(p.kw('PRIMARY')){p.i++;p.needKw('KEY');if(T.pk)throw E('La tabla ya tiene una clave primaria.');T.pk=[col.n];continue;}
      if(p.eatKw('UNIQUE')){p.eatKw('KEY');T.uniques.push({name:col.n,cols:[col.n]});continue;}
      if(p.eatKw('KEY')){if(T.pk)throw E('La tabla ya tiene una clave primaria.');T.pk=[col.n];continue;}
      if(p.eatKw('COMMENT')){p.next();continue;}
      if(p.eatKw('COLLATE')){const c=p.ident('una colación').raw.toLowerCase();col.cs=!/_ci$/.test(c);continue;}
      if(p.kw('CHARACTER')&&p.kw('SET',1)){p.i+=2;p.next();continue;}
      if(p.eatKw('CHARSET')){p.next();continue;}
      if(p.kw('CONSTRAINT')||p.kw('CHECK')){let n=null;if(p.eatKw('CONSTRAINT')){if(!p.kw('CHECK'))n=p.ident('el nombre de la restricción').raw;}p.needKw('CHECK');pending.push(readCheck(p,n,col.n));continue;}
      if(p.eatKw('REFERENCES')){p.ident('una tabla');readColList(p);continue;}
      break;
    }
  }while(p.eatOp(','));
  p.needOp(')');
  while(p.peek()&&!p.op(';'))p.i++;
  if(!T.cols.length)throw E('La tabla necesita al menos una columna.');
  if(T.pk){for(const n of T.pk){const c=T.cols.find(c=>key(c.n)===key(n));if(!c)throw E("La clave primaria usa una columna que no existe: '"+n+"'.");c.notnull=true;}T.pk=T.pk.map(n=>T.cols.find(c=>key(c.n)===key(n)).n);}
  for(const u of T.uniques){u.cols=u.cols.map(n=>{const c=T.cols.find(c=>key(c.n)===key(n));if(!c)throw E("El índice UNIQUE usa una columna que no existe: '"+n+"'.");return c.n;});}
  for(const c of T.cols)if(c.ai&&!(T.pk&&T.pk.includes(c.n))&&!T.uniques.some(u=>u.cols[0]===c.n))throw E('Una columna AUTO_INCREMENT tiene que ser clave (PRIMARY KEY o UNIQUE).');
  for(const pc of pending)addCheck(T,pc);
  return T;
}
function cloneT(T){return {name:T.name,cols:T.cols,pk:T.pk,uniques:T.uniques,notes:T.notes,aiNext:T.aiNext,checks:T.checks.map(c=>Object.assign({},c)),rows:T.rows.map(r=>Object.assign({},r))};}

function convert(c,v){
  const t=c.ty,cn=c.n;
  if(v instanceof CS)v=v.s;
  const shown=v instanceof D?v.toString():String(v);
  const range={err:"ERROR 1264 (22003): Out of range value for column '"+cn+"' at row 1"};
  if(t.k==='int'||t.k==='dec'||t.k==='float'){
    let x;
    if(typeof v==='number')x=v;
    else if(v instanceof D)x=num(v);
    else{const s=String(v).trim();if(!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s))return {err:"ERROR 1366 (HY000): Incorrect "+(t.k==='int'?'integer':'decimal')+" value: '"+shown+"' for column '"+cn+"' at row 1"};x=parseFloat(s);}
    if(t.k==='int'){x=Math.sign(x)*Math.round(Math.abs(x));const r=INTR[t.sub];if(x<(t.unsigned?0:r[0])||x>(t.unsigned?r[2]:r[1]))return range;}
    if(t.k==='dec'){x=roundHalf(x,t.s);if(Math.abs(x)>=Math.pow(10,t.p-t.s)||(t.unsigned&&x<0))return range;}
    if(t.k==='float'&&t.unsigned&&x<0)return range;
    return {v:x};
  }
  if(t.k==='str'){const s=shown;if(t.len!=null&&Array.from(s).length>t.len)return {err:"ERROR 1406 (22001): Data too long for column '"+cn+"' at row 1"};return {v:t.fixed?s.replace(/ +$/,''):s};}
  if(t.k==='date'){const d=toD(v);if(!d)return {err:"ERROR 1292 (22007): Incorrect date value: '"+shown+"' for column '"+cn+"' at row 1"};return {v:d};}
  if(t.k==='enum'){const m=t.vals.find(x=>key(x)===key(shown));if(m===undefined)return {err:"ERROR 1265 (01000): Data truncated for column '"+cn+"' at row 1"};return {v:m};}
  return {v};
}
function prepRow(T,given,base){
  const rec={};const gk=new Map(Object.keys(given).map(k=>[key(k),k]));
  for(const [k,orig] of gk)if(!T.cols.some(c=>key(c.n)===k))return {err:"ERROR 1054 (42S22): Unknown column '"+orig+"' in 'field list'"};
  for(const c of T.cols){
    const g=gk.get(key(c.n));let v;
    if(g!==undefined)v=given[g];else if(base)v=base[c.n];else v=c.def!==undefined?c.def:null;
    if(v===undefined)v=null;
    if(c.ai&&!base&&T.aiNext===undefined){let mx=0;for(const r of T.rows)if(r[c.n]!=null)mx=Math.max(mx,num(r[c.n]));T.aiNext=mx+1;}
    if(v===null&&c.ai&&!base)v=T.aiNext;
    if(v!==null){const r=convert(c,v);if(r.err)return r;v=r.v;}
    if(c.ai&&!base&&v!==null&&num(v)>=T.aiNext)T.aiNext=num(v)+1;   // InnoDB: el número se gasta aunque el INSERT falle
    if(v===null&&c.notnull)return {err:"ERROR 1048 (23000): Column '"+c.n+"' cannot be null"};
    rec[c.n]=v;
  }
  return {rec};
}
function checkRow(T,rec){
  for(const ch of T.checks){if(!ch.enforced)continue;const v=ev(ch.ast,rec);if(truth(v)===false)return {err:"ERROR 3819 (HY000): Check constraint '"+ch.name+"' is violated.",ch};}
  return {};
}
function uniqRow(T,rec,skip){
  const keys=[];if(T.pk)keys.push({name:'PRIMARY',cols:T.pk});for(const u of T.uniques)keys.push(u);
  for(const k of keys){
    const vals=k.cols.map(c=>rec[c]);if(vals.some(v=>v===null))continue;
    for(let i=0;i<T.rows.length;i++){if(i===skip)continue;const r=T.rows[i];if(k.cols.every((c,j)=>cmpVals(r[c],vals[j])===0))return {err:"ERROR 1062 (23000): Duplicate entry '"+vals.map(S).join('-')+"' for key '"+T.name+"."+k.name+"'"};}
  }
  return {};
}
function insertRow(T,given){
  const p=prepRow(T,given);if(p.err)return p;
  const c=checkRow(T,p.rec);if(c.err)return Object.assign(c,{rec:p.rec});
  const u=uniqRow(T,p.rec,-1);if(u.err)return Object.assign(u,{rec:p.rec});
  T.rows.push(p.rec);return {ok:true,rec:p.rec};
}
function checkDetails(T,rec){return T.checks.map(ch=>({name:ch.name,v:truthTxt(ev(ch.ast,rec)),enforced:ch.enforced}));}

/* ---------- Restricciones escritas por el alumno (modo condición) ---------- */
function parseConstraintInput(T,text){
  const toks=lex(text);
  while(toks.length&&toks[toks.length-1].t==='op'&&toks[toks.length-1].v===';')toks.pop();
  if(!toks.length)throw E('Escribe la condición o el CHECK completo.');
  const p=new P(toks,null);
  if(p.kw('ALTER')||p.kw('CREATE'))throw E('Aquí basta con la restricción: CHECK (…) o CONSTRAINT nombre CHECK (…). No hace falta ALTER ni CREATE TABLE.');
  if(p.kw('CONSTRAINT')||p.kw('CHECK')){
    const out=[];
    do{
      let n=null;
      if(p.eatKw('CONSTRAINT')){if(!p.kw('CHECK'))n=p.ident('el nombre de la restricción').raw;}
      p.needKw('CHECK');out.push(addCheck(T,readCheck(p,n,null)));
    }while(p.eatOp(',')||(p.peek()&&(p.kw('CONSTRAINT')||p.kw('CHECK'))));
    if(p.i<toks.length)throw E('Sobra algo a partir de '+show(toks[p.i])+'.');
    return out;
  }
  toks.src=text;
  return [addCheck(T,{name:null,toks,src:text.trim().replace(/;\s*$/,''),colLevel:null,enforced:true})];
}

/* ---------- Guiones: ALTER / INSERT / UPDATE / DELETE / SELECT / SHOW ---------- */
function splitStmts(toks){
  const out=[];let cur=[];
  for(const t of toks){if(t.t==='op'&&t.v===';'){if(cur.length)out.push(cur);cur=[];}else cur.push(t);}
  if(cur.length)out.push(cur);
  return out.map(a=>{a.src=toks.src;return a;});
}
function needTable(T,x){if(key(x.raw)!==key(T.name))throw E("ERROR 1146 (42S02): Table 'instituto."+x.raw+"' doesn't exist");}
function exprCtx(T){return {table:T.name,cols:colMap(T),refs:new Set()};}
function validateAll(T,ch){for(const r of T.rows){if(truth(ev(ch.ast,r))===false)throw E("ERROR 3819 (HY000): Check constraint '"+ch.name+"' is violated.");}}
function execStmt(T0,st){
  const p=new P(st,null);
  if(p.eatKw('ALTER')){
    p.needKw('TABLE');needTable(T0,p.ident('el nombre de la tabla'));
    const T=cloneT(T0);
    do{
      if(p.eatKw('ADD')){
        let n=null;
        if(p.eatKw('CONSTRAINT')){if(!p.kw('CHECK'))n=p.ident('el nombre de la restricción').raw;}
        if(!p.eatKw('CHECK'))throw E('Este laboratorio solo simula ADD … CHECK (añadir restricciones CHECK).');
        const ch=addCheck(T,readCheck(p,n,null));
        if(ch.enforced)validateAll(T,ch);
      }else if(p.eatKw('DROP')){
        if(!(p.eatKw('CHECK')||p.eatKw('CONSTRAINT')))throw E('Para borrar una restricción: DROP CHECK nombre o DROP CONSTRAINT nombre.');
        const n=p.ident('el nombre de la restricción').raw;const i=T.checks.findIndex(c=>key(c.name)===key(n));
        if(i<0)throw E("ERROR: no existe ninguna restricción CHECK llamada '"+n+"' en la tabla "+T.name+".");
        T.checks.splice(i,1);
      }else if(p.eatKw('ALTER')){
        if(!(p.eatKw('CHECK')||p.eatKw('CONSTRAINT')))throw E('Para activarla o desactivarla: ALTER CHECK nombre [NOT] ENFORCED.');
        const n=p.ident('el nombre de la restricción').raw;const ch=T.checks.find(c=>key(c.name)===key(n));
        if(!ch)throw E("ERROR: no existe ninguna restricción CHECK llamada '"+n+"' en la tabla "+T.name+".");
        let enf=true;if(p.eatKw('NOT'))enf=false;p.needKw('ENFORCED');
        ch.enforced=enf;if(enf)validateAll(T,ch);
      }else if(p.kw('MODIFY')||p.kw('CHANGE')||p.kw('RENAME')){
        throw E('Este laboratorio solo simula cambios en restricciones CHECK (ADD, DROP y ALTER CHECK). Una CHECK no se modifica: se borra y se vuelve a crear.');
      }else throw E('No entiendo la parte de ALTER TABLE que empieza en '+show(p.peek())+'.');
    }while(p.eatOp(','));
    if(p.i<st.length)throw E('Sobra algo a partir de '+show(st[p.i])+'.');
    return {T,msg:'Query OK, '+T.rows.length+' rows affected'};
  }
  if(p.eatKw('INSERT')){
    const ign=p.eatKw('IGNORE');p.needKw('INTO');needTable(T0,p.ident('el nombre de la tabla'));
    let cols=null;if(p.op('('))cols=readColList(p);
    if(!(p.eatKw('VALUES')||p.eatKw('VALUE')))throw E('Esperaba VALUES.');
    const T=cloneT(T0);let n=0;const warn=[];
    do{
      p.needOp('(');const vals=[];const vp=new P(st,{table:T.name,cols:new Map(),refs:new Set()});vp.i=p.i;
      vals.push(ev(vp.expr(),{}));while(vp.eatOp(','))vals.push(ev(vp.expr(),{}));p.i=vp.i;p.needOp(')');
      const names=cols||T.cols.map(c=>c.n);
      if(names.length!==vals.length)throw E("ERROR 1136 (21S01): Column count doesn't match value count at row 1");
      const given={};names.forEach((c,i)=>given[c]=vals[i]);
      const r=insertRow(T,given);
      if(r.err){if(ign&&/^ERROR 3819/.test(r.err)){warn.push(r.err.replace(/^ERROR 3819 \(HY000\): /,'Warning 3819: '));continue;}throw E(r.err);}
      n++;
    }while(p.eatOp(','));
    if(p.i<st.length)throw E('Sobra algo a partir de '+show(st[p.i])+'.');
    return {T,msg:'Query OK, '+n+' row'+(n===1?'':'s')+' affected'+(warn.length?', '+warn.length+' warning'+(warn.length>1?'s':'')+' — '+warn.join(' '):'')};
  }
  if(p.eatKw('UPDATE')){
    needTable(T0,p.ident('el nombre de la tabla'));p.needKw('SET');
    const T=cloneT(T0);p.ctx=exprCtx(T);const sets=[];
    do{const c=p.ident('una columna');const col=T.cols.find(x=>key(x.n)===key(c.raw));if(!col)throw E("ERROR 1054 (42S22): Unknown column '"+c.raw+"' in 'field list'");p.needOp('=');sets.push([col,p.expr()]);}while(p.eatOp(','));
    let where=null;if(p.eatKw('WHERE'))where=p.expr();
    if(p.i<st.length)throw E('Sobra algo a partir de '+show(st[p.i])+'.');
    let n=0;
    for(let i=0;i<T.rows.length;i++){
      const r=T.rows[i];if(where&&truth(ev(where,r))!==true)continue;
      const given={};for(const [c,e] of sets)given[c.n]=ev(e,r);
      const pr=prepRow(T,given,r);if(pr.err)throw E(pr.err);
      const ck=checkRow(T,pr.rec);if(ck.err)throw E(ck.err);
      const u=uniqRow(T,pr.rec,i);if(u.err)throw E(u.err);
      if(T.cols.some(c=>cmpVals(r[c.n],pr.rec[c.n])!==0||(r[c.n]===null)!==(pr.rec[c.n]===null)))n++;
      T.rows[i]=pr.rec;
    }
    return {T,msg:'Query OK, '+n+' row'+(n===1?'':'s')+' affected'};
  }
  if(p.eatKw('DELETE')){
    p.needKw('FROM');needTable(T0,p.ident('el nombre de la tabla'));
    const T=cloneT(T0);p.ctx=exprCtx(T);let where=null;if(p.eatKw('WHERE'))where=p.expr();
    if(p.i<st.length)throw E('Sobra algo a partir de '+show(st[p.i])+'.');
    const before=T.rows.length;T.rows=T.rows.filter(r=>where&&truth(ev(where,r))!==true);
    const n=before-T.rows.length;return {T,msg:'Query OK, '+n+' row'+(n===1?'':'s')+' affected'};
  }
  if(p.eatKw('SELECT')){
    if(!p.eatOp('*'))throw E('Este laboratorio solo simula SELECT * FROM tabla [WHERE …].');
    p.needKw('FROM');const tn=p.ident('una tabla');
    if(key(tn.raw).startsWith('information_schema'))throw E('INFORMATION_SCHEMA no está simulado aquí: prueba la consulta en tu MySQL.');
    needTable(T0,tn);p.ctx=exprCtx(T0);let where=null;if(p.eatKw('WHERE'))where=p.expr();
    if(p.i<st.length)throw E('Sobra algo a partir de '+show(st[p.i])+'.');
    const rows=T0.rows.filter(r=>!where||truth(ev(where,r))===true);
    return {T:T0,msg:rows.length+' row'+(rows.length===1?'':'s')+' in set',table:rows};
  }
  if(p.eatKw('SHOW')){
    p.needKw('CREATE');p.needKw('TABLE');needTable(T0,p.ident('el nombre de la tabla'));
    return {T:T0,msg:'1 row in set',ddl:showCreate(T0)};
  }
  throw E('Este laboratorio simula ALTER TABLE, INSERT, UPDATE, DELETE, SELECT * y SHOW CREATE TABLE. No entiendo la sentencia que empieza por '+show(st[0])+'.');
}
function runScript(T0,text){
  const toks=lex(text);const stmts=splitStmts(toks);let T=T0;const log=[];
  if(!stmts.length)return {T,log,empty:true};
  for(const st of stmts){
    const src=srcOf(st,0,st.length-1);
    try{const r=execStmt(T,st);T=r.T;log.push({src,ok:true,msg:r.msg,table:r.table,ddl:r.ddl});}
    catch(e){if(!e.sql)throw e;log.push({src,ok:false,msg:e.message});return {T,log,failed:true};}
  }
  return {T,log};
}
function showCreate(T){
  const L=T.cols.map(c=>'  `'+c.n+'` '+c.tyTxt+(c.notnull?' NOT NULL':'')+(c.def!==undefined&&c.def!==null?' DEFAULT '+sqlLit(c.def):'')+(c.ai?' AUTO_INCREMENT':''));
  if(T.pk)L.push('  PRIMARY KEY ('+T.pk.map(c=>'`'+c+'`').join(',')+')');
  for(const u of T.uniques)L.push('  UNIQUE KEY `'+u.name+'` ('+u.cols.map(c=>'`'+c+'`').join(',')+')');
  for(const ch of T.checks)L.push('  CONSTRAINT `'+ch.name+'` CHECK ('+ch.src+')'+(ch.enforced?'':' /*!80016 NOT ENFORCED */'));
  return 'CREATE TABLE `'+T.name+'` (\n'+L.join(',\n')+'\n) ENGINE=InnoDB';
}

/* Exportar el motor para pruebas fuera del navegador */
const ENGINE={lex,parseCreate,parseConstraintInput,insertRow,cloneT,runScript,checkDetails,ev,truth,truthTxt,toD,sqlLit,S,key,D};
if(typeof window==='undefined'||!window.document){if(typeof module!=='undefined')module.exports=ENGINE;return;}
window.__CHECKLAB_ENGINE=ENGINE;

/* =====================================================================
   2. EJERCICIOS
   ===================================================================== */
const PRODUCTO="CREATE TABLE producto (\n  id      INT AUTO_INCREMENT PRIMARY KEY,\n  nombre  VARCHAR(50) NOT NULL,\n  precio  DECIMAL(8,2),\n  stock   INT\n  /*SLOT*/\n);";
const LV=[
  ['n0','0','Qué es un CHECK','Básico'],['n1','1','Comparaciones y listas','Básico'],['n2','2','NULL y tres valores','Básico'],
  ['n3','3','Varias columnas','Intermedio'],['n4','4','Si… entonces…','Intermedio'],['n5','5','Texto','Intermedio'],
  ['n6','6','Números y fechas','Avanzado'],['n7','7','Lo que no se puede','Avanzado'],['n8','8','ALTER TABLE','Avanzado'],
  ['n9','9','Tablas completas','Experto'],['lab','·','Banco libre','']
];
const EX={
n0:[
 {t:'cond',q:'El precio de un producto tiene que ser mayor que cero.',ddl:PRODUCTO,
  rows:[[{nombre:'Teclado',precio:19.95},1],[{nombre:'Cable USB',precio:0.01},1],[{nombre:'Regalo',precio:0},0],[{nombre:'Devolución',precio:-5},0],[{nombre:'Sin precio',precio:null},1]],
  hint:'La condición es una comparación con la columna precio. Puedes escribir solo la condición o CHECK (…) completo.',
  sol:'CHECK (precio > 0)',
  note:'La fila con precio NULL entra: el CHECK solo rechaza cuando la condición es FALSE, y NULL > 0 no es ni verdadero ni falso. Lo verás a fondo en el nivel 2.'},
 {t:'cond',q:'El stock no puede ser negativo, y la restricción tiene que llamarse <code>prod_stock_ck</code>. Mira cómo cambia el mensaje de error.',ddl:PRODUCTO,needName:'prod_stock_ck',
  rows:[[{nombre:'Ratón',stock:0},1],[{nombre:'Monitor',stock:120},1],[{nombre:'Portátil',stock:-1},0]],
  hint:'Delante de CHECK va CONSTRAINT y el nombre: CONSTRAINT nombre CHECK (condición).',
  sol:'CONSTRAINT prod_stock_ck CHECK (stock >= 0)'},
 {t:'quiz',q:'Tu servidor es MySQL 8.0.13. Creas la tabla con <code>CHECK (precio > 0)</code> e insertas un producto con precio -5. ¿Qué ocurre?',
  opts:['ERROR 3819: Check constraint violated','La fila se inserta: antes de la 8.0.16 MySQL acepta la sintaxis CHECK pero la ignora','Error de sintaxis al crear la tabla','Se guarda el precio como NULL'],ok:1,
  exp:'Hasta la versión 8.0.16, CREATE TABLE aceptaba CHECK, pero no lo guardaba ni lo comprobaba. Comprueba tu versión con SELECT VERSION();'},
 {t:'quiz',q:'¿Cómo se llama la restricción <code>CHECK (total >= 0)</code> de esta tabla?',
  code:'CREATE TABLE pedido (\n  id        INT PRIMARY KEY,\n  total     DECIMAL(8,2),\n  cantidad  INT CHECK (cantidad > 0),\n  CHECK (total >= 0)\n);',
  opts:['pedido_chk_1','pedido_chk_2','total_chk_1','chk_pedido_2'],ok:1,
  exp:'Las restricciones sin nombre se numeran como tabla_chk_1, tabla_chk_2… en el orden en que aparecen. La de cantidad aparece antes, así que es pedido_chk_1 y esta es pedido_chk_2. Por eso conviene ponerles nombre siempre.'}
],
n1:[
 {t:'cond',q:'La nota tiene que estar entre 0 y 10, ambos incluidos.',ddl:"CREATE TABLE calificacion (\n  id    INT AUTO_INCREMENT PRIMARY KEY,\n  nota  DECIMAL(4,2)\n  /*SLOT*/\n);",
  rows:[[{nota:0},1],[{nota:10},1],[{nota:7.5},1],[{nota:-0.5},0],[{nota:10.25},0]],
  hint:'BETWEEN incluye los dos extremos. También vale nota >= 0 AND nota <= 10.',sol:'CHECK (nota BETWEEN 0 AND 10)'},
 {t:'cond',q:'El curso solo puede ser 1 o 2, y el turno, <code>MAÑANA</code> o <code>TARDE</code>.',ddl:"CREATE TABLE grupo (\n  id     INT AUTO_INCREMENT PRIMARY KEY,\n  curso  INT,\n  turno  VARCHAR(10)\n  /*SLOT*/\n);",
  rows:[[{curso:1,turno:'TARDE'},1],[{curso:2,turno:'MAÑANA'},1],[{curso:3,turno:'TARDE'},0],[{curso:1,turno:'NOCHE'},0],[{curso:1,turno:'tarde'},1],[{curso:2,turno:'Manana'},1]],
  hint:'Usa IN con una lista para cada columna y únelas con AND. O escribe dos CHECK separados por una coma.',
  sol:"CHECK (curso IN (1, 2) AND turno IN ('MAÑANA', 'TARDE'))",
  note:"Fíjate en las dos últimas filas: entran 'tarde' y 'Manana'. La colación por defecto de MySQL 8 (utf8mb4_0900_ai_ci) no distingue mayúsculas ni tildes. En el nivel 5 verás cómo exigir mayúsculas exactas."},
 {t:'cond',q:'El descuento solo puede ser 0, 5, 10, 15 o 20.',ddl:"CREATE TABLE oferta (\n  id         INT AUTO_INCREMENT PRIMARY KEY,\n  descuento  INT NOT NULL\n  /*SLOT*/\n);",
  rows:[[{descuento:0},1],[{descuento:15},1],[{descuento:20},1],[{descuento:12},0],[{descuento:25},0]],
  hint:'Una lista de valores numéricos con IN. Otra opción: descuento BETWEEN 0 AND 20 AND descuento % 5 = 0.',sol:'CHECK (descuento IN (0, 5, 10, 15, 20))'},
 {t:'predict',q:'Alguien escribió el rango al revés. Predice qué pasa con cada INSERT.',
  ddl:"CREATE TABLE socio (\n  id      INT PRIMARY KEY,\n  puntos  INT,\n  CONSTRAINT socio_puntos_ck CHECK (puntos BETWEEN 100 AND 0)\n);",
  rows:[{id:1,puntos:50},{id:2,puntos:0},{id:3,puntos:100},{id:4,puntos:null}],
  exp:'x BETWEEN a AND b equivale a x >= a AND x <= b. Si a es mayor que b, ningún número cumple las dos cosas: solo pasa NULL.'}
],
n2:[
 {t:'predict',q:'Predice el resultado de cada INSERT. Fíjate en la fila con NULL.',
  ddl:"CREATE TABLE tarifa (\n  id         INT PRIMARY KEY,\n  descuento  INT,\n  CONSTRAINT tar_desc_ck CHECK (descuento > 0 AND descuento < 50)\n);",
  rows:[{id:1,descuento:10},{id:2,descuento:0},{id:3,descuento:null},{id:4,descuento:60}],
  exp:'Con descuento NULL las dos comparaciones dan NULL, y NULL AND NULL = NULL. El CHECK solo rechaza FALSE, así que la fila entra.'},
 {t:'predict',q:'Regla: si la provincia es Madrid, el código postal empieza por 28. Predice cada INSERT.',
  ddl:"CREATE TABLE cliente (\n  id         INT PRIMARY KEY,\n  provincia  VARCHAR(30),\n  cp         CHAR(5),\n  CONSTRAINT cli_cp_ck CHECK (provincia <> 'Madrid' OR cp LIKE '28%')\n);",
  rows:[{id:1,provincia:'Madrid',cp:'28850'},{id:2,provincia:'Madrid',cp:'08001'},{id:3,provincia:'Madrid',cp:null},{id:4,provincia:null,cp:'08001'},{id:5,provincia:'Toledo',cp:'45001'}],
  exp:'FALSE OR NULL = NULL y NULL OR FALSE = NULL. Siempre que una parte desconocida pueda decidir el resultado, la fila entra.'},
 {t:'predict',q:'Una trampa clásica: NOT IN con un NULL dentro de la lista. Predice cada INSERT.',
  ddl:"CREATE TABLE pieza (\n  id      INT PRIMARY KEY,\n  codigo  VARCHAR(5),\n  CONSTRAINT pie_cod_ck CHECK (codigo NOT IN ('A1', 'B2', NULL))\n);",
  rows:[{id:1,codigo:'A1'},{id:2,codigo:'C3'},{id:3,codigo:null}],
  exp:"'C3' NOT IN ('A1','B2',NULL) equivale a 'C3'<>'A1' AND 'C3'<>'B2' AND 'C3'<>NULL. La última comparación es NULL, así que el resultado es NULL y la fila entra. Nunca pongas NULL en una lista de NOT IN."},
 {t:'cond',q:'El teléfono es obligatorio y tiene exactamente 9 caracteres. Hazlo todo con un CHECK, sin poner NOT NULL en la columna.',ddl:"CREATE TABLE tutor (\n  id        INT AUTO_INCREMENT PRIMARY KEY,\n  telefono  VARCHAR(15)\n  /*SLOT*/\n);",
  rows:[[{telefono:'612345678'},1],[{telefono:'61234'},0],[{telefono:null},0],[{telefono:'+34612345678'},0]],
  hint:'CHAR_LENGTH(telefono) = 9 da NULL si el teléfono es NULL, y NULL deja pasar la fila. ¿Qué condición da FALSE con NULL?',
  sol:'CHECK (telefono IS NOT NULL AND CHAR_LENGTH(telefono) = 9)',
  note:'FALSE AND NULL = FALSE, así que la fila NULL se rechaza. En una tabla real lo normal es declarar la columna NOT NULL: el error (1048) es más claro.'},
 {t:'quiz',q:'Con <code>CHECK (nota = NULL OR nota >= 0)</code>, ¿qué pasa al insertar una fila con nota NULL?',
  opts:['Entra, porque nota = NULL es verdadero','Entra, pero no por nota = NULL: esa comparación siempre da NULL, y el CHECK solo rechaza FALSE','ERROR 3819, porque la condición no es verdadera','Error al crear la tabla: no se puede comparar con NULL'],ok:1,
  exp:'Cualquier comparación con NULL usando =, <>, <, > da NULL. Para preguntar por NULL se usa IS NULL o IS NOT NULL (o el operador <=> de MySQL). Aquí la condición entera vale NULL y la fila entra.'}
],
n3:[
 {t:'cond',q:'La fecha de fin no puede ser anterior a la de inicio.',ddl:"CREATE TABLE curso_formacion (\n  id            INT AUTO_INCREMENT PRIMARY KEY,\n  fecha_inicio  DATE NOT NULL,\n  fecha_fin     DATE\n  /*SLOT*/\n);",
  rows:[[{fecha_inicio:'2026-09-08',fecha_fin:'2027-06-20'},1],[{fecha_inicio:'2026-09-08',fecha_fin:'2026-09-08'},1],[{fecha_inicio:'2026-09-08',fecha_fin:'2026-09-01'},0],[{fecha_inicio:'2026-09-08',fecha_fin:null},1]],
  hint:'Las fechas se comparan con los operadores de siempre.',sol:'CHECK (fecha_fin >= fecha_inicio)'},
 {t:'cond',q:'El precio de venta tiene que superar al de coste. Si hay precio de oferta, tiene que ser menor que el de venta y no bajar del de coste.',
  ddl:"CREATE TABLE articulo (\n  id             INT AUTO_INCREMENT PRIMARY KEY,\n  precio_coste   DECIMAL(8,2) NOT NULL,\n  precio_venta   DECIMAL(8,2) NOT NULL,\n  precio_oferta  DECIMAL(8,2)\n  /*SLOT*/\n);",
  rows:[[{precio_coste:10,precio_venta:15,precio_oferta:null},1],[{precio_coste:10,precio_venta:15,precio_oferta:12},1],[{precio_coste:10,precio_venta:15,precio_oferta:10},1],[{precio_coste:10,precio_venta:9,precio_oferta:null},0],[{precio_coste:10,precio_venta:15,precio_oferta:16},0],[{precio_coste:10,precio_venta:15,precio_oferta:8},0],[{precio_coste:10,precio_venta:15,precio_oferta:15},0]],
  hint:'Escribe las tres comparaciones con AND. No hace falta preguntar si la oferta es NULL: piensa qué valen las comparaciones cuando lo es.',
  sol:'CHECK (precio_venta > precio_coste\n   AND precio_oferta < precio_venta\n   AND precio_oferta >= precio_coste)',
  note:'Con oferta NULL: TRUE AND NULL AND NULL = NULL, y la fila entra. La lógica de tres valores trabaja a tu favor en las columnas opcionales.'},
 {t:'quiz',q:'¿Qué ocurre al ejecutar esta sentencia?',code:'CREATE TABLE t (\n  a INT CHECK (a > b),\n  b INT\n);',
  opts:['Se crea la tabla con una restricción de columna','Error: una restricción de columna solo puede usar su propia columna; hay que escribirla como restricción de tabla','Error: b todavía no está definida en ese punto','Se crea, pero el CHECK se ignora'],ok:1,
  exp:'El CHECK dentro de la definición de a es de columna, y solo puede usar a. Escrito como restricción de tabla, después de las columnas, puede usar cualquier columna, incluso las definidas más abajo.'},
 {t:'cond',q:'En una reserva: al menos un adulto, niños 0 o más, y entre adultos y niños no se pueden superar las plazas.',ddl:"CREATE TABLE reserva (\n  id       INT AUTO_INCREMENT PRIMARY KEY,\n  adultos  INT NOT NULL,\n  ninos    INT NOT NULL,\n  plazas   INT NOT NULL\n  /*SLOT*/\n);",
  rows:[[{adultos:2,ninos:1,plazas:4},1],[{adultos:1,ninos:0,plazas:1},1],[{adultos:0,ninos:2,plazas:4},0],[{adultos:2,ninos:3,plazas:4},0],[{adultos:2,ninos:-1,plazas:4},0]],
  hint:'Dentro de un CHECK se puede operar: adultos + ninos <= plazas.',sol:'CHECK (adultos >= 1 AND ninos >= 0 AND adultos + ninos <= plazas)'}
],
n4:[
 {t:'cond',q:"Si el estado es <code>BAJA</code>, la fecha de baja es obligatoria.",ddl:"CREATE TABLE alumno_estado (\n  id          INT AUTO_INCREMENT PRIMARY KEY,\n  estado      VARCHAR(10) NOT NULL,\n  fecha_baja  DATE\n  /*SLOT*/\n);",
  rows:[[{estado:'ACTIVO',fecha_baja:null},1],[{estado:'BAJA',fecha_baja:'2026-10-01'},1],[{estado:'BAJA',fecha_baja:null},0],[{estado:'ACTIVO',fecha_baja:'2026-10-01'},1]],
  hint:'«Si A entonces B» se escribe NOT A OR B: o no se da A, o se cumple B.',sol:"CHECK (estado <> 'BAJA' OR fecha_baja IS NOT NULL)"},
 {t:'cond',q:'Ahora en los dos sentidos: hay fecha de baja <b>si y solo si</b> el estado es <code>BAJA</code>.',ddl:"CREATE TABLE alumno_estado (\n  id          INT AUTO_INCREMENT PRIMARY KEY,\n  estado      VARCHAR(10) NOT NULL,\n  fecha_baja  DATE\n  /*SLOT*/\n);",
  rows:[[{estado:'ACTIVO',fecha_baja:null},1],[{estado:'BAJA',fecha_baja:'2026-10-01'},1],[{estado:'BAJA',fecha_baja:null},0],[{estado:'ACTIVO',fecha_baja:'2026-10-01'},0]],
  hint:'Dos casos válidos unidos con OR: (BAJA y con fecha) o (no BAJA y sin fecha). También puedes comparar dos condiciones: (A) = (B).',
  sol:"CHECK ((estado = 'BAJA' AND fecha_baja IS NOT NULL)\n    OR (estado <> 'BAJA' AND fecha_baja IS NULL))"},
 {t:'cond',q:'Un contacto tiene que tener <b>al menos</b> un email o un teléfono.',ddl:"CREATE TABLE contacto (\n  id        INT AUTO_INCREMENT PRIMARY KEY,\n  email     VARCHAR(100),\n  telefono  VARCHAR(15)\n  /*SLOT*/\n);",
  rows:[[{email:'ana@ies.es',telefono:null},1],[{email:null,telefono:'612345678'},1],[{email:'ana@ies.es',telefono:'612345678'},1],[{email:null,telefono:null},0]],
  hint:'IS NOT NULL en cada columna, unidas con OR.',sol:'CHECK (email IS NOT NULL OR telefono IS NOT NULL)'},
 {t:'cond',q:'Un pago se hace con tarjeta o con Bizum: <b>exactamente uno</b> de los dos campos tiene valor.',ddl:"CREATE TABLE pago (\n  id       INT AUTO_INCREMENT PRIMARY KEY,\n  tarjeta  CHAR(4),\n  bizum    VARCHAR(15)\n  /*SLOT*/\n);",
  rows:[[{tarjeta:'4417',bizum:null},1],[{tarjeta:null,bizum:'612345678'},1],[{tarjeta:'4417',bizum:'612345678'},0],[{tarjeta:null,bizum:null},0]],
  hint:'XOR es verdadero cuando exactamente una de las dos condiciones lo es. IS NULL nunca devuelve NULL, así que XOR funciona bien aquí.',
  sol:'CHECK ((tarjeta IS NULL) XOR (bizum IS NULL))'},
 {t:'cond',q:"El tipo de cliente es <code>PARTICULAR</code> o <code>EMPRESA</code>. Los particulares tienen DNI y no CIF; las empresas, CIF y no DNI. Prueba a resolverlo con CASE.",
  ddl:"CREATE TABLE cliente (\n  id    INT AUTO_INCREMENT PRIMARY KEY,\n  tipo  VARCHAR(10) NOT NULL,\n  dni   VARCHAR(9),\n  cif   VARCHAR(9)\n  /*SLOT*/\n);",
  rows:[[{tipo:'PARTICULAR',dni:'12345678Z',cif:null},1],[{tipo:'EMPRESA',dni:null,cif:'B12345678'},1],[{tipo:'PARTICULAR',dni:null,cif:null},0],[{tipo:'PARTICULAR',dni:'12345678Z',cif:'B12345678'},0],[{tipo:'EMPRESA',dni:'12345678Z',cif:null},0],[{tipo:'AUTONOMO',dni:'12345678Z',cif:null},0]],
  hint:'CASE tipo WHEN … THEN condición WHEN … THEN condición ELSE FALSE END. El ELSE FALSE rechaza cualquier otro tipo.',
  sol:"CHECK (CASE tipo\n         WHEN 'PARTICULAR' THEN dni IS NOT NULL AND cif IS NULL\n         WHEN 'EMPRESA'    THEN cif IS NOT NULL AND dni IS NULL\n         ELSE FALSE\n       END)"}
],
n5:[
 {t:'cond',q:'El login tiene entre 4 y 8 caracteres y no puede empezar ni terminar con espacios.',ddl:"CREATE TABLE usuario (\n  id     INT AUTO_INCREMENT PRIMARY KEY,\n  login  VARCHAR(20) NOT NULL\n  /*SLOT*/\n);",
  rows:[[{login:'ana1'},1],[{login:'abc'},0],[{login:' ana1'},0],[{login:'ana1 '},0],[{login:'ñañañaña'},1],[{login:'alfonso12'},0]],
  hint:'Cuenta caracteres con CHAR_LENGTH, no con LENGTH. Para los espacios, compara la columna con TRIM(columna).',
  sol:'CHECK (CHAR_LENGTH(login) BETWEEN 4 AND 8 AND login = TRIM(login))',
  note:"LENGTH cuenta bytes: 'ñañañaña' tiene 8 caracteres pero 12 bytes en utf8mb4. Con LENGTH esa fila se rechazaría."},
 {t:'cond',q:"El código de grupo empieza por <code>DAM</code> o por <code>SMR</code>.",ddl:"CREATE TABLE grupo_clase (\n  id      INT AUTO_INCREMENT PRIMARY KEY,\n  codigo  VARCHAR(10) NOT NULL\n  /*SLOT*/\n);",
  rows:[[{codigo:'DAM1A'},1],[{codigo:'SMR2B'},1],[{codigo:'ASIR1'},0],[{codigo:'XDAM'},0],[{codigo:'dam1a'},1]],
  hint:"LIKE con % detrás: % es cualquier texto (incluso vacío) y _ es un carácter.",sol:"CHECK (codigo LIKE 'DAM%' OR codigo LIKE 'SMR%')",
  note:"LIKE tampoco distingue mayúsculas con la colación por defecto: 'dam1a' entra."},
 {t:'cond',q:'La provincia tiene que guardarse en mayúsculas.',ddl:"CREATE TABLE sede (\n  id         INT AUTO_INCREMENT PRIMARY KEY,\n  provincia  VARCHAR(30) NOT NULL\n  /*SLOT*/\n);",
  rows:[[{provincia:'MADRID'},1],[{provincia:'TOLEDO'},1],[{provincia:'Madrid'},0],[{provincia:'toledo'},0]],
  hint:'Prueba primero provincia = UPPER(provincia) y mira qué pasa. Con la colación por defecto «Madrid» y «MADRID» son iguales. Fuerza una comparación binaria con COLLATE utf8mb4_bin.',
  sol:'CHECK (provincia COLLATE utf8mb4_bin = UPPER(provincia))',
  note:"Otras soluciones válidas: CAST(provincia AS BINARY) = UPPER(provincia), REGEXP_LIKE(provincia, '^[A-ZÑ ]+$', 'c') o declarar la columna con COLLATE utf8mb4_bin. El operador BINARY delante de una columna también funciona, pero está obsoleto desde MySQL 8.0.27."},
 {t:'cond',q:'El código postal son exactamente 5 dígitos. Usa una expresión regular (tienes el <a href="laboratorio_regexp_like.html">Laboratorio REGEXP_LIKE</a> para practicarlas).',ddl:"CREATE TABLE direccion (\n  id  INT AUTO_INCREMENT PRIMARY KEY,\n  cp  CHAR(5)\n  /*SLOT*/\n);",
  rows:[[{cp:'28850'},1],[{cp:'01001'},1],[{cp:'2885'},0],[{cp:'28a50'},0],[{cp:null},1]],
  hint:"REGEXP_LIKE(cp, '^[0-9]{5}$'). Sin ^ y $ bastaría con que el patrón apareciera en algún sitio.",sol:"CHECK (REGEXP_LIKE(cp, '^[0-9]{5}$'))"},
 {t:'predict',q:'LENGTH cuenta bytes, no letras. Predice cada INSERT.',
  ddl:"CREATE TABLE persona (\n  id      INT PRIMARY KEY,\n  nombre  VARCHAR(20),\n  CONSTRAINT per_nombre_ck CHECK (LENGTH(nombre) <= 5)\n);",
  rows:[{id:1,nombre:'López'},{id:2,nombre:'Lopez'},{id:3,nombre:'Muñoz'},{id:4,nombre:'Peña'}],
  exp:"En utf8mb4 la ñ y las vocales con tilde ocupan 2 bytes. 'López' y 'Muñoz' tienen 5 letras y 6 bytes; 'Peña', 4 letras y 5 bytes. Para contar letras usa CHAR_LENGTH."}
],
n6:[
 {t:'cond',q:'Las cajas son de 6 unidades: la cantidad es un múltiplo de 6 mayor que cero.',ddl:"CREATE TABLE pedido_cajas (\n  id        INT AUTO_INCREMENT PRIMARY KEY,\n  cantidad  INT NOT NULL\n  /*SLOT*/\n);",
  rows:[[{cantidad:6},1],[{cantidad:24},1],[{cantidad:0},0],[{cantidad:10},0],[{cantidad:-6},0]],
  hint:'cantidad % 6 (o MOD(cantidad, 6)) es el resto de dividir entre 6.',sol:'CHECK (cantidad > 0 AND cantidad % 6 = 0)'},
 {t:'cond',q:'La fecha de nacimiento tiene que ser posterior al 1 de enero de 1900 y anterior al 1 de enero de 2015.',ddl:"CREATE TABLE persona (\n  id                INT AUTO_INCREMENT PRIMARY KEY,\n  fecha_nacimiento  DATE\n  /*SLOT*/\n);",
  rows:[[{fecha_nacimiento:'2008-05-14'},1],[{fecha_nacimiento:'1900-01-02'},1],[{fecha_nacimiento:'1900-01-01'},0],[{fecha_nacimiento:'2015-01-01'},0],[{fecha_nacimiento:'2020-03-03'},0]],
  hint:"Las fechas se escriben como texto 'AAAA-MM-DD'. «Posterior» y «anterior» no incluyen el propio día.",
  sol:"CHECK (fecha_nacimiento > '1900-01-01' AND fecha_nacimiento < '2015-01-01')"},
 {t:'cond',q:'Un examen no se puede poner en sábado ni en domingo.',ddl:"CREATE TABLE examen (\n  id     INT AUTO_INCREMENT PRIMARY KEY,\n  fecha  DATE NOT NULL\n  /*SLOT*/\n);",
  rows:[[{fecha:'2026-10-14'},1],[{fecha:'2026-10-19'},1],[{fecha:'2026-10-17'},0],[{fecha:'2026-10-18'},0]],
  hint:'DAYOFWEEK devuelve 1 para el domingo y 7 para el sábado. WEEKDAY devuelve 0 para el lunes y 6 para el domingo.',
  sol:'CHECK (DAYOFWEEK(fecha) NOT IN (1, 7))'},
 {t:'cond',q:'El alumno tiene que tener 16 años cumplidos en la fecha de matrícula.',ddl:"CREATE TABLE inscripcion (\n  id                INT AUTO_INCREMENT PRIMARY KEY,\n  fecha_nacimiento  DATE NOT NULL,\n  fecha_matricula   DATE NOT NULL\n  /*SLOT*/\n);",
  rows:[[{fecha_nacimiento:'2010-10-14',fecha_matricula:'2026-10-14'},1],[{fecha_nacimiento:'2010-10-15',fecha_matricula:'2026-10-14'},0],[{fecha_nacimiento:'2005-03-01',fecha_matricula:'2026-09-10'},1],[{fecha_nacimiento:'2011-01-01',fecha_matricula:'2026-09-10'},0]],
  hint:'TIMESTAMPDIFF(YEAR, desde, hasta) devuelve los años completos entre dos fechas. Compara con la fecha de matrícula, no con la de hoy.',
  sol:'CHECK (TIMESTAMPDIFF(YEAR, fecha_nacimiento, fecha_matricula) >= 16)',
  note:'También vale fecha_matricula >= DATE_ADD(fecha_nacimiento, INTERVAL 16 YEAR). Con YEAR(fecha_matricula) - YEAR(fecha_nacimiento) fallaría la segunda fila: le falta un día.'},
 {t:'predict',q:'¿Restar fechas da días? Predice cada INSERT.',
  ddl:"CREATE TABLE prestamo (\n  id            INT PRIMARY KEY,\n  fecha_inicio  DATE,\n  fecha_fin     DATE,\n  CONSTRAINT pre_dias_ck CHECK (fecha_fin - fecha_inicio <= 30)\n);",
  rows:[{id:1,fecha_inicio:'2026-03-01',fecha_fin:'2026-03-25'},{id:2,fecha_inicio:'2026-01-20',fecha_fin:'2026-02-05'},{id:3,fecha_inicio:'2026-12-28',fecha_fin:'2027-01-03'}],
  exp:'En MySQL, restar dos fechas con - las convierte en números AAAAMMDD: 20260205 - 20260120 = 85, aunque solo han pasado 16 días. Para días usa DATEDIFF(fecha_fin, fecha_inicio).'}
],
n7:[
 {t:'quiz',q:'Quieres impedir que la fecha de matrícula sea posterior a hoy. ¿Qué haces?',
  opts:['CHECK (fecha_matricula <= CURDATE())','CHECK (fecha_matricula <= NOW())','Lo compruebo con un trigger BEFORE INSERT / BEFORE UPDATE, o en la aplicación','CHECK con una subconsulta a una tabla con la fecha del día'],ok:2,
  exp:'CURDATE() y NOW() no son deterministas (su resultado cambia cada día) y las subconsultas tampoco se admiten. Un CHECK solo puede depender de los valores de la propia fila.'},
 {t:'quiz',q:'La columna provincia de la tabla alumno tiene que existir en la tabla provincias. ¿Qué usas?',
  opts:['CHECK (provincia IN (SELECT nombre FROM provincias))','Una FOREIGN KEY de alumno.provincia a provincias','CHECK (provincias.nombre = provincia)','Un CHECK con una función almacenada que busque la provincia'],ok:1,
  exp:'Un CHECK no puede leer otras tablas ni llamar a funciones almacenadas. Comprobar que un valor existe en otra tabla es justo lo que hace una clave ajena.'},
 {t:'cond',q:'La entrega se hace el mismo día del pedido o, como mucho, 30 días después.',ddl:"CREATE TABLE envio (\n  id             INT AUTO_INCREMENT PRIMARY KEY,\n  fecha_pedido   DATE NOT NULL,\n  fecha_entrega  DATE\n  /*SLOT*/\n);",
  rows:[[{fecha_pedido:'2026-10-14',fecha_entrega:'2026-10-14'},1],[{fecha_pedido:'2026-10-14',fecha_entrega:'2026-11-13'},1],[{fecha_pedido:'2026-10-14',fecha_entrega:'2026-11-14'},0],[{fecha_pedido:'2026-10-14',fecha_entrega:'2026-10-10'},0],[{fecha_pedido:'2026-12-20',fecha_entrega:'2027-01-05'},1],[{fecha_pedido:'2026-10-14',fecha_entrega:null},1]],
  hint:'DATEDIFF(fecha_entrega, fecha_pedido) da los días que pasan entre las dos. Si intentas usar CURDATE() verás el error.',
  sol:'CHECK (DATEDIFF(fecha_entrega, fecha_pedido) BETWEEN 0 AND 30)'},
 {t:'quiz',q:'¿Cuál de estos CHECK se puede crear en MySQL?',
  opts:['CHECK (precio <= (SELECT MAX(precio) FROM tarifa))','CHECK (precio <= @precio_maximo)','CHECK (YEAR(fecha_alta) >= 2000)','CHECK (fecha_alta <= NOW())'],ok:2,
  exp:'YEAR() es determinista: con la misma fecha da siempre el mismo resultado. Las subconsultas, las variables y NOW() están prohibidas.'},
 {t:'quiz',q:'¿Qué ocurre con esta tabla?',code:'CREATE TABLE ticket (\n  id    INT AUTO_INCREMENT PRIMARY KEY,\n  zona  CHAR(1),\n  CHECK (id > 0)\n);',
  opts:['Se crea sin problemas','Error: un CHECK no puede usar una columna AUTO_INCREMENT','Se crea, pero el CHECK solo se aplica en UPDATE','Error: falta el nombre de la restricción'],ok:1,
  exp:'Las columnas AUTO_INCREMENT no pueden aparecer en un CHECK. El nombre es opcional: sin él, MySQL lo genera.'}
],
n8:[
 {t:'script',q:'Añade a la tabla una restricción llamada <code>prod_precio_ck</code> que impida precios menores o iguales a cero.',
  ddl:"CREATE TABLE producto (\n  id      INT AUTO_INCREMENT PRIMARY KEY,\n  nombre  VARCHAR(50) NOT NULL,\n  precio  DECIMAL(8,2),\n  stock   INT\n);",
  seed:[{id:1,nombre:'Teclado',precio:19.95,stock:10},{id:2,nombre:'Ratón',precio:9.5,stock:25},{id:3,nombre:'Monitor',precio:149,stock:3}],
  need:{name:'prod_precio_ck',enforced:true},tests:[[{nombre:'Regalo',precio:0},0],[{nombre:'Cable',precio:4.99},1]],
  hint:'ALTER TABLE tabla ADD CONSTRAINT nombre CHECK (condición);',sol:'ALTER TABLE producto ADD CONSTRAINT prod_precio_ck CHECK (precio > 0);'},
 {t:'script',q:'Añade <code>prod_stock_ck</code> para que el stock no sea negativo. Cuidado: hay una fila antigua con stock negativo. Corrígela poniéndole stock 0, sin borrarla.',
  ddl:"CREATE TABLE producto (\n  id      INT AUTO_INCREMENT PRIMARY KEY,\n  nombre  VARCHAR(50) NOT NULL,\n  precio  DECIMAL(8,2),\n  stock   INT\n);",
  seed:[{id:1,nombre:'Teclado',precio:19.95,stock:10},{id:2,nombre:'Ratón',precio:9.5,stock:25},{id:3,nombre:'Monitor',precio:149,stock:-3}],
  need:{name:'prod_stock_ck',enforced:true,rows:3},tests:[[{nombre:'Altavoz',stock:-1},0],[{nombre:'Altavoz',stock:0},1]],
  hint:'Si añades la restricción directamente, MySQL la comprueba con las filas que ya existen y falla con el error 3819. Primero UPDATE … SET stock = 0 WHERE stock < 0; después ALTER TABLE.',
  sol:'UPDATE producto SET stock = 0 WHERE stock < 0;\nALTER TABLE producto ADD CONSTRAINT prod_stock_ck CHECK (stock >= 0);'},
 {t:'script',q:'Vas a cargar abonos con precio negativo. Desactiva <code>prod_precio_ck</code> sin borrarla.',
  ddl:"CREATE TABLE producto (\n  id      INT AUTO_INCREMENT PRIMARY KEY,\n  nombre  VARCHAR(50) NOT NULL,\n  precio  DECIMAL(8,2),\n  stock   INT,\n  CONSTRAINT prod_precio_ck CHECK (precio > 0)\n);",
  seed:[{id:1,nombre:'Teclado',precio:19.95,stock:10},{id:2,nombre:'Ratón',precio:9.5,stock:25}],
  need:{name:'prod_precio_ck',enforced:false},tests:[[{nombre:'Abono',precio:-10},1]],
  hint:'ALTER TABLE tabla ALTER CHECK nombre NOT ENFORCED;',sol:'ALTER TABLE producto ALTER CHECK prod_precio_ck NOT ENFORCED;'},
 {t:'script',q:'Los abonos ya no se guardan en esta tabla. Vuelve a activar <code>prod_precio_ck</code>. Antes tendrás que borrar las filas que la incumplen.',
  ddl:"CREATE TABLE producto (\n  id      INT AUTO_INCREMENT PRIMARY KEY,\n  nombre  VARCHAR(50) NOT NULL,\n  precio  DECIMAL(8,2),\n  stock   INT,\n  CONSTRAINT prod_precio_ck CHECK (precio > 0) NOT ENFORCED\n);",
  seed:[{id:1,nombre:'Teclado',precio:19.95,stock:10},{id:2,nombre:'Ratón',precio:9.5,stock:25},{id:3,nombre:'Monitor',precio:149,stock:3},{id:4,nombre:'Abono',precio:-10,stock:null}],
  need:{name:'prod_precio_ck',enforced:true,rows:3},tests:[[{nombre:'Abono',precio:-5},0]],
  hint:'Al pasar una restricción a ENFORCED, MySQL comprueba las filas existentes. DELETE FROM … WHERE precio <= 0; y después ALTER TABLE … ALTER CHECK … ENFORCED;',
  sol:'DELETE FROM producto WHERE precio <= 0;\nALTER TABLE producto ALTER CHECK prod_precio_ck ENFORCED;'},
 {t:'script',q:'Cambia la regla de <code>prod_precio_ck</code>: ahora el precio debe estar entre 0.50 y 999.99, y la restricción conserva su nombre.',
  ddl:"CREATE TABLE producto (\n  id      INT AUTO_INCREMENT PRIMARY KEY,\n  nombre  VARCHAR(50) NOT NULL,\n  precio  DECIMAL(8,2),\n  stock   INT,\n  CONSTRAINT prod_precio_ck CHECK (precio > 0)\n);",
  seed:[{id:1,nombre:'Teclado',precio:19.95,stock:10},{id:2,nombre:'Ratón',precio:9.5,stock:25}],
  need:{name:'prod_precio_ck',enforced:true},tests:[[{nombre:'Pegatina',precio:0.49},0],[{nombre:'Chapa',precio:0.5},1],[{nombre:'Servidor',precio:999.99},1],[{nombre:'Servidor',precio:1000},0]],
  hint:'Una restricción CHECK no se modifica: se borra (DROP CHECK) y se vuelve a crear (ADD CONSTRAINT). Puedes hacerlo en una sola sentencia separando las dos acciones con una coma.',
  sol:'ALTER TABLE producto\n  DROP CHECK prod_precio_ck,\n  ADD CONSTRAINT prod_precio_ck CHECK (precio BETWEEN 0.50 AND 999.99);'},
 {t:'quiz',q:'¿Qué consulta te dice si las restricciones CHECK de tu base de datos están activas (ENFORCED)?',
  opts:["SELECT CONSTRAINT_NAME, ENFORCED FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_TYPE = 'CHECK';","SELECT CONSTRAINT_NAME, CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS;","SHOW CHECKS;","SELECT * FROM mysql.check_constraints;"],ok:0,
  exp:'TABLE_CONSTRAINTS tiene la columna ENFORCED (YES o NO) y el nombre de la tabla. CHECK_CONSTRAINTS guarda la condición (CHECK_CLAUSE), pero no dice si está activa ni de qué tabla es. SHOW CREATE TABLE también lo muestra para una tabla concreta.'},
 {t:'quiz',q:'Ejecutas <code>INSERT IGNORE INTO producto (nombre, precio) VALUES (\'Regalo\', 0);</code> y prod_precio_ck exige precio > 0. ¿Qué ocurre?',
  opts:['ERROR 3819 y no se inserta nada','La fila se inserta y se ignora la restricción','No se inserta la fila, y en lugar de un error MySQL devuelve un aviso (warning)','Se inserta con precio NULL'],ok:2,
  exp:'Con IGNORE, una fila que incumple un CHECK se salta y se genera un aviso en vez de un error. Con varias filas en el mismo INSERT IGNORE, las válidas sí se insertan.'}
],
n9:[
 {t:'create',q:'Crea la tabla <code>alumno</code> con todas sus restricciones.',table:'alumno',
  spec:['dni VARCHAR(9), clave primaria: 8 dígitos y una letra mayúscula.','nombre VARCHAR(50), obligatorio: al menos 2 caracteres y sin espacios al principio ni al final.','email VARCHAR(100), opcional: algún carácter, @, algún carácter, un punto y algún carácter más (usa LIKE).','fecha_nacimiento DATE, opcional: no anterior al 1950-01-01.','curso INT: 1 o 2.','ciclo VARCHAR(4): SMR, DAM, DAW o ASIR, en mayúsculas exactas.','Todas las restricciones CHECK con nombre.'],
  req:{cols:['dni','nombre','email','fecha_nacimiento','curso','ciclo'],pk:['dni'],named:true},
  tests:[
   [{dni:'12345678Z',nombre:'Ana López',email:'ana@ies.es',fecha_nacimiento:'2008-05-14',curso:1,ciclo:'DAM'},1],
   [{dni:'1234567Z',nombre:'Luis Pérez',curso:1,ciclo:'DAM'},0],
   [{dni:'12345678z',nombre:'Luis Pérez',curso:1,ciclo:'DAM'},0],
   [{dni:'23456789D',nombre:' Luis Pérez',curso:1,ciclo:'DAM'},0],
   [{dni:'23456789D',nombre:'L',curso:1,ciclo:'DAM'},0],
   [{dni:'23456789D',nombre:'Luis Pérez',email:'luis.ies.es',curso:1,ciclo:'SMR'},0],
   [{dni:'23456789D',nombre:'Luis Pérez',email:'luis@ies',curso:1,ciclo:'SMR'},0],
   [{dni:'23456789D',nombre:'Luis Pérez',curso:3,ciclo:'SMR'},0],
   [{dni:'23456789D',nombre:'Luis Pérez',curso:2,ciclo:'dam'},0],
   [{dni:'23456789D',nombre:'Luis Pérez',fecha_nacimiento:'1949-12-31',curso:2,ciclo:'DAW'},0],
   [{dni:'23456789D',nombre:'Luis Pérez',curso:2,ciclo:'DAW'},1],
   [{dni:'34567890V',nombre:null,curso:1,ciclo:'ASIR'},0],
   [{dni:'12345678Z',nombre:'Repetido',curso:1,ciclo:'SMR'},0],
   [{dni:'34567890V',nombre:'Marta Ruiz',email:'m.ruiz@educa.madrid.org',fecha_nacimiento:'2007-01-31',curso:2,ciclo:'ASIR'},1]],
  hint:"Para el DNI: REGEXP_LIKE con 'c'. Para el ciclo en mayúsculas exactas: ciclo COLLATE utf8mb4_bin IN (…). Para el email: LIKE '%_@_%._%'.",
  sol:"CREATE TABLE alumno (\n  dni               VARCHAR(9)   PRIMARY KEY,\n  nombre            VARCHAR(50)  NOT NULL,\n  email             VARCHAR(100),\n  fecha_nacimiento  DATE,\n  curso             INT,\n  ciclo             VARCHAR(4),\n  CONSTRAINT alu_dni_ck    CHECK (REGEXP_LIKE(dni, '^[0-9]{8}[A-Z]$', 'c')),\n  CONSTRAINT alu_nombre_ck CHECK (nombre = TRIM(nombre) AND CHAR_LENGTH(nombre) >= 2),\n  CONSTRAINT alu_email_ck  CHECK (email LIKE '%_@_%._%'),\n  CONSTRAINT alu_fnac_ck   CHECK (fecha_nacimiento >= '1950-01-01'),\n  CONSTRAINT alu_curso_ck  CHECK (curso IN (1, 2)),\n  CONSTRAINT alu_ciclo_ck  CHECK (ciclo COLLATE utf8mb4_bin IN ('SMR', 'DAM', 'DAW', 'ASIR'))\n);"},
 {t:'create',q:'Crea la tabla <code>matricula</code>. Las inserciones se hacen en orden, y el id lo pone AUTO_INCREMENT.',table:'matricula',
  spec:['id INT AUTO_INCREMENT, clave primaria.','dni_alumno VARCHAR(9), obligatorio.','modulo VARCHAR(7), obligatorio: 4 dígitos (0484) o 3 letras mayúsculas, guion y 3 dígitos (CMO-312).','fecha_matricula DATE, obligatoria.','fecha_baja DATE, opcional: no anterior a la matrícula.','convocatoria INT, obligatoria, 1 por defecto: de 1 a 4.','nota_ordinaria y nota_extra DECIMAL(4,2), opcionales: de 0 a 10.','Solo puede haber nota_extra si hay nota_ordinaria y es menor que 5.','Si hay fecha de baja, no hay ninguna nota.','Todas las restricciones CHECK con nombre.'],
  req:{cols:['id','dni_alumno','modulo','fecha_matricula','fecha_baja','convocatoria','nota_ordinaria','nota_extra'],pk:['id'],named:true},
  tests:[
   [{dni_alumno:'12345678Z',modulo:'0484',fecha_matricula:'2026-09-15'},1],
   [{dni_alumno:'12345678Z',modulo:'CMO-312',fecha_matricula:'2026-09-15',nota_ordinaria:7.5},1],
   [{dni_alumno:'12345678Z',modulo:'484',fecha_matricula:'2026-09-15'},0],
   [{dni_alumno:'12345678Z',modulo:'cmo-312',fecha_matricula:'2026-09-15'},0],
   [{dni_alumno:'12345678Z',modulo:'0484',fecha_matricula:'2026-09-15',convocatoria:5},0],
   [{dni_alumno:'12345678Z',modulo:'0484',fecha_matricula:'2026-09-15',convocatoria:0},0],
   [{dni_alumno:'12345678Z',modulo:'0490',fecha_matricula:'2026-09-15',nota_ordinaria:10.5},0],
   [{dni_alumno:'12345678Z',modulo:'0490',fecha_matricula:'2026-09-15',fecha_baja:'2026-09-01'},0],
   [{dni_alumno:'12345678Z',modulo:'0490',fecha_matricula:'2026-09-15',fecha_baja:'2026-11-20'},1],
   [{dni_alumno:'12345678Z',modulo:'0490',fecha_matricula:'2026-09-15',nota_ordinaria:6,nota_extra:7},0],
   [{dni_alumno:'12345678Z',modulo:'0490',fecha_matricula:'2026-09-15',nota_ordinaria:3.5,nota_extra:6},1],
   [{dni_alumno:'12345678Z',modulo:'0490',fecha_matricula:'2026-09-15',nota_extra:6},0],
   [{dni_alumno:'12345678Z',modulo:'0490',fecha_matricula:'2026-09-15',fecha_baja:'2026-11-20',nota_ordinaria:4},0],
   [{dni_alumno:'12345678Z',modulo:'0490',fecha_matricula:null},0],
   [{dni_alumno:'23456789D',modulo:'0225',fecha_matricula:'2026-09-15',convocatoria:2,nota_ordinaria:4.75,nota_extra:5.5},1]],
  hint:'Ojo con la nota extra: nota_extra IS NULL OR nota_ordinaria < 5 deja pasar una nota extra sin ordinaria, porque NULL < 5 es NULL. Exige también nota_ordinaria IS NOT NULL.',
  sol:"CREATE TABLE matricula (\n  id               INT AUTO_INCREMENT PRIMARY KEY,\n  dni_alumno       VARCHAR(9)   NOT NULL,\n  modulo           VARCHAR(7)   NOT NULL,\n  fecha_matricula  DATE         NOT NULL,\n  fecha_baja       DATE,\n  convocatoria     INT          NOT NULL DEFAULT 1,\n  nota_ordinaria   DECIMAL(4,2),\n  nota_extra       DECIMAL(4,2),\n  CONSTRAINT mat_modulo_ck CHECK (REGEXP_LIKE(modulo, '^([0-9]{4}|[A-Z]{3}-[0-9]{3})$', 'c')),\n  CONSTRAINT mat_conv_ck   CHECK (convocatoria BETWEEN 1 AND 4),\n  CONSTRAINT mat_nord_ck   CHECK (nota_ordinaria BETWEEN 0 AND 10),\n  CONSTRAINT mat_next_ck   CHECK (nota_extra BETWEEN 0 AND 10),\n  CONSTRAINT mat_baja_ck   CHECK (fecha_baja >= fecha_matricula),\n  CONSTRAINT mat_extra_ck  CHECK (nota_extra IS NULL\n                               OR (nota_ordinaria IS NOT NULL AND nota_ordinaria < 5)),\n  CONSTRAINT mat_bajanotas_ck CHECK (fecha_baja IS NULL\n                               OR (nota_ordinaria IS NULL AND nota_extra IS NULL))\n);"},
 {t:'create',q:'Crea la tabla <code>reserva_aula</code> para reservar aulas por horas enteras.',table:'reserva_aula',
  spec:['id INT AUTO_INCREMENT, clave primaria. El resto de columnas son obligatorias.','aula VARCHAR(10): AULA- o LAB- seguido de 1 a 3 dígitos, en mayúsculas (AULA-12, LAB-3).','fecha DATE: nunca en sábado ni domingo.','hora_inicio y hora_fin INT: el centro abre de 8 a 22.','La reserva dura entre 1 y 3 horas.','capacidad INT: de 1 a 40. alumnos INT: al menos 1 y nunca más que la capacidad.','Todas las restricciones CHECK con nombre.'],
  req:{cols:['id','aula','fecha','hora_inicio','hora_fin','alumnos','capacidad'],pk:['id'],named:true},
  tests:[
   [{aula:'AULA-12',fecha:'2026-10-14',hora_inicio:16,hora_fin:18,alumnos:20,capacidad:30},1],
   [{aula:'LAB-3',fecha:'2026-10-17',hora_inicio:16,hora_fin:18,alumnos:20,capacidad:30},0],
   [{aula:'Aula-12',fecha:'2026-10-14',hora_inicio:16,hora_fin:18,alumnos:20,capacidad:30},0],
   [{aula:'AULA-12',fecha:'2026-10-14',hora_inicio:7,hora_fin:9,alumnos:20,capacidad:30},0],
   [{aula:'AULA-12',fecha:'2026-10-14',hora_inicio:20,hora_fin:23,alumnos:20,capacidad:30},0],
   [{aula:'AULA-12',fecha:'2026-10-14',hora_inicio:18,hora_fin:16,alumnos:20,capacidad:30},0],
   [{aula:'AULA-12',fecha:'2026-10-14',hora_inicio:15,hora_fin:19,alumnos:20,capacidad:30},0],
   [{aula:'AULA-12',fecha:'2026-10-14',hora_inicio:16,hora_fin:18,alumnos:31,capacidad:30},0],
   [{aula:'AULA-12',fecha:'2026-10-14',hora_inicio:16,hora_fin:18,alumnos:0,capacidad:30},0],
   [{aula:'AULA-12',fecha:'2026-10-14',hora_inicio:16,hora_fin:18,alumnos:40,capacidad:45},0],
   [{aula:'AULA-1A',fecha:'2026-10-14',hora_inicio:16,hora_fin:18,alumnos:20,capacidad:30},0],
   [{aula:'LAB-1234',fecha:'2026-10-14',hora_inicio:16,hora_fin:18,alumnos:20,capacidad:30},0],
   [{aula:'LAB-3',fecha:'2026-10-19',hora_inicio:19,hora_fin:22,alumnos:12,capacidad:12},1],
   [{aula:'LAB-3',fecha:'2026-10-19',hora_inicio:'diez',hora_fin:12,alumnos:12,capacidad:12},0]],
  hint:"La duración es hora_fin - hora_inicio. alumnos BETWEEN 1 AND capacidad compara dos columnas en el mismo CHECK.",
  sol:"CREATE TABLE reserva_aula (\n  id           INT AUTO_INCREMENT PRIMARY KEY,\n  aula         VARCHAR(10) NOT NULL,\n  fecha        DATE        NOT NULL,\n  hora_inicio  INT         NOT NULL,\n  hora_fin     INT         NOT NULL,\n  alumnos      INT         NOT NULL,\n  capacidad    INT         NOT NULL,\n  CONSTRAINT res_aula_ck  CHECK (REGEXP_LIKE(aula, '^(AULA|LAB)-[0-9]{1,3}$', 'c')),\n  CONSTRAINT res_fecha_ck CHECK (DAYOFWEEK(fecha) NOT IN (1, 7)),\n  CONSTRAINT res_horas_ck CHECK (hora_inicio >= 8 AND hora_fin <= 22),\n  CONSTRAINT res_dur_ck   CHECK (hora_fin - hora_inicio BETWEEN 1 AND 3),\n  CONSTRAINT res_cap_ck   CHECK (capacidad BETWEEN 1 AND 40),\n  CONSTRAINT res_alu_ck   CHECK (alumnos BETWEEN 1 AND capacidad)\n);"}
]
};
window.__CHECKLAB_EX=EX;

/* =====================================================================
   3. INTERFAZ
   ===================================================================== */
const STORE='checklab-v1';
let state={inputs:{}};
try{const s=JSON.parse(localStorage.getItem(STORE)||'null');if(s&&s.inputs&&typeof s.inputs==='object')state.inputs=s.inputs;}catch(e){}
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch(e){}}

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const vis=s=>esc(s).replace(/ /g,'<span class="sp">·</span>');
function hlSql(s){
  return esc(s)
    .replace(/\/\*SLOT\*\//g,'<span class="slot">CHECK ( … )  ← lo que escribas abajo</span>')
    .replace(/(--[^\n]*)/g,'<span class="cm">$1</span>')
    .replace(/\b(CREATE TABLE|ALTER TABLE|ADD CONSTRAINT|CONSTRAINT|CHECK|NOT NULL|PRIMARY KEY|AUTO_INCREMENT|DEFAULT|NOT ENFORCED|ENFORCED|DROP CHECK|ALTER CHECK|INSERT INTO|VALUES|UPDATE|SET|WHERE|DELETE FROM)\b/g,'<span class="kw">$1</span>');
}
function slotPos(ddl){
  const i=ddl.indexOf('/*SLOT*/');if(i<0)return ddl;
  const before=ddl.slice(0,i).replace(/\s+$/,'');
  return before+',\n  /*SLOT*/'+ddl.slice(i+8);
}
function insertSql(T,row){
  const cols=Object.keys(row);
  return 'INSERT INTO '+T.name+' ('+cols.join(', ')+') VALUES ('+cols.map(c=>sqlLit(row[c])).join(', ')+');';
}
function cellHtml(v){return v===null||v===undefined?'<span class="null">NULL</span>':esc(S(v));}
function dataTable(T,rows){
  if(!rows.length)return '<p class="empty">(tabla vacía)</p>';
  return '<div class="dt-wrap"><table class="dt"><thead><tr>'+T.cols.map(c=>'<th>'+esc(c.n)+'</th>').join('')+'</tr></thead><tbody>'+
    rows.map(r=>'<tr>'+T.cols.map(c=>'<td>'+cellHtml(r[c.n])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function msgsHtml(list){return list.map(m=>'<div class="msg '+m[0]+'">'+m[1]+'</div>').join('');}

const cards=[];
const lvNum=id=>LV.find(l=>l[0]===id)[1];
function setPill(c,txt,cls){const p=c.el.querySelector('.pill');p.textContent=txt;p.className='pill'+(cls?' '+cls:'');}
function finish(c,pass,txt,cls){c.pass=pass;setPill(c,txt,cls);c.el.classList.toggle('pass',pass);progress();}

function makeCard(lv,k,ex){
  const id=lv+'-'+(k+1);const num=lvNum(lv)+'.'+(k+1);
  const el=document.createElement('article');el.className='ex ex-'+ex.t;el.id='ex-'+id;
  const label={cond:'Escribe el CHECK',predict:'Predice',quiz:'Test',script:'Guion SQL',create:'CREATE TABLE'}[ex.t];
  let body='';
  if(ex.t==='cond'){
    body='<pre class="ctx">'+hlSql(slotPos(ex.ddl))+'</pre><textarea class="sql-in" id="in-'+id+'" spellcheck="false" autocomplete="off" autocapitalize="off" rows="3" aria-label="Restricción del ejercicio '+num+'" placeholder="CHECK (…)"></textarea><div class="msgs"></div><div class="rows"></div>';
  }else if(ex.t==='predict'){
    body='<pre class="ctx">'+hlSql(ex.ddl)+'</pre><div class="prows"></div><div class="actions"><button type="button" class="primary b-check">Comprobar</button></div><div class="msgs"></div>';
  }else if(ex.t==='quiz'){
    body=(ex.code?'<pre class="ctx">'+hlSql(ex.code)+'</pre>':'')+'<div class="opts" role="group" aria-label="Opciones">'+ex.opts.map((o,i)=>'<button type="button" class="opt" data-i="'+i+'"><span class="ol">'+'ABCD'[i]+'</span><span>'+esc(o)+'</span></button>').join('')+'</div><div class="msgs"></div>';
  }else if(ex.t==='script'){
    body='<div class="sub">La tabla ahora</div><pre class="ctx">'+hlSql(ex.ddl)+'</pre><div class="seed"></div><textarea class="sql-in big" id="in-'+id+'" spellcheck="false" autocomplete="off" autocapitalize="off" rows="4" aria-label="Sentencias del ejercicio '+num+'" placeholder="ALTER TABLE …;"></textarea><div class="msgs"></div><div class="log"></div><div class="reqs"></div><div class="rows"></div>';
  }else if(ex.t==='create'){
    body='<ul class="spec">'+ex.spec.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><textarea class="sql-in huge" id="in-'+id+'" spellcheck="false" autocomplete="off" autocapitalize="off" rows="12" aria-label="CREATE TABLE del ejercicio '+num+'" placeholder="CREATE TABLE '+ex.table+' (\n  …\n);"></textarea><div class="msgs"></div><div class="made"></div><div class="reqs"></div><div class="rows"></div>';
  }
  el.innerHTML='<div class="ex-head"><span class="ex-num">Ejercicio '+num+' · '+label+'</span><span class="pill">Sin empezar</span></div><p class="q">'+ex.q+'</p>'+body+
    (ex.t==='quiz'||ex.t==='predict'?'':'<div class="actions"><button type="button" class="ghost b-hint">Pista</button><button type="button" class="ghost b-sol">Ver solución</button></div><div class="reveal r-hint" hidden></div><div class="reveal r-sol" hidden></div>');
  const card={id,lv,ex,el,pass:false};cards.push(card);
  if(ex.t==='cond'||ex.t==='script'||ex.t==='create'){
    const inp=el.querySelector('textarea');card.inp=inp;inp.value=state.inputs[id]||'';
    let tm;inp.addEventListener('input',()=>{state.inputs[id]=inp.value;clearTimeout(tm);tm=setTimeout(()=>{update(card);save();},150);});
    inp.addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.shiftKey&&ex.t==='create'){e.preventDefault();const s=inp.selectionStart;inp.setRangeText('  ',s,inp.selectionEnd,'end');inp.dispatchEvent(new Event('input'));}});
    const rh=el.querySelector('.r-hint'),rs=el.querySelector('.r-sol');
    rh.innerHTML='<p>'+esc(ex.hint)+'</p>';
    rs.innerHTML='<p>Una solución posible. Puede haber otras igual de válidas.</p><pre class="sol">'+esc(ex.sol)+'</pre>'+(ex.note?'<p>'+esc(ex.note)+'</p>':'')+'<button type="button" class="ghost b-use">Probarla en el ejercicio</button>';
    el.querySelector('.b-hint').addEventListener('click',()=>{rh.hidden=!rh.hidden;});
    el.querySelector('.b-sol').addEventListener('click',()=>{rs.hidden=!rs.hidden;});
    rs.querySelector('.b-use').addEventListener('click',()=>{inp.value=ex.sol;state.inputs[id]=ex.sol;save();update(card);inp.focus();});
    if(ex.t==='script'){const T=baseTable(ex);el.querySelector('.seed').innerHTML='<div class="sub">Filas que ya hay en la tabla</div>'+dataTable(T,T.rows);}
  }
  if(ex.t==='predict'){
    let ch=[];try{ch=JSON.parse(state.inputs[id]||'[]');}catch(e){}
    card.choice=Array.isArray(ch)?ch:[];card.checked=card.choice.length===ex.rows.length&&card.choice.every(Boolean)&&state.inputs[id+':ok']==='1';
    el.querySelector('.b-check').addEventListener('click',()=>{
      if(card.choice.filter(Boolean).length<ex.rows.length){el.querySelector('.msgs').innerHTML=msgsHtml([['warn','Elige «Entra» o «Error» en todas las filas antes de comprobar.']]);return;}
      card.checked=true;state.inputs[id+':ok']='1';save();update(card);
    });
  }
  if(ex.t==='quiz'){
    const v=state.inputs[id];card.choice=v===undefined?null:+v;
    el.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>{card.choice=+b.dataset.i;state.inputs[id]=String(card.choice);save();update(card);}));
  }
  return el;
}
function baseTable(ex){
  const T=parseCreate(lex(ex.ddl.replace('/*SLOT*/','')));
  if(ex.seed)for(const r of ex.seed){const p=prepRow(T,r);T.rows.push(p.rec);}
  return T;
}
function rowHtml(T,given,exp,res,extra){
  const acc=!!res.ok;const good=exp===undefined?null:acc===!!exp;
  const out=acc?'Query OK, 1 row affected':res.err;
  return '<div class="row'+(good===null?'':good?' good':' badc')+'"><span class="ico">'+(good===null?'·':good?'✓':'✗')+'</span><div><code class="stmt">'+esc(insertSql(T,given))+'</code><div class="res"><span class="out '+(acc?'acc':'rej')+'">'+esc(out)+'</span>'+(extra||'')+(exp===undefined?'':'<span class="exp">esperado: '+(exp?'se inserta':'error')+'</span>')+'</div></div></div>';
}
function pendingRows(T,rows){return rows.map(([g,e])=>'<div class="row"><span class="ico">·</span><div><code class="stmt">'+esc(insertSql(T,g))+'</code><div class="res"><span class="exp">esperado: '+(e?'se inserta':'error')+'</span></div></div></div>').join('');}
function valsLine(det,only){
  const d=only?det.filter(x=>only.includes(x.name)):det;
  if(!d.length)return '';
  return '<span class="vals">'+d.map(x=>'<span class="v v-'+x.v.toLowerCase()+'">'+esc(x.name)+' = '+x.v+(x.enforced?'':' (no activa)')+'</span>').join('')+'</span>';
}

function update(c){
  const ex=c.ex,el=c.el;
  try{
    if(ex.t==='cond')return upCond(c);
    if(ex.t==='predict')return upPredict(c);
    if(ex.t==='quiz')return upQuiz(c);
    if(ex.t==='script')return upScript(c);
    if(ex.t==='create')return upCreate(c);
  }catch(e){
    if(!e.sql)console.error(e);
    el.querySelector('.msgs').innerHTML=msgsHtml([['err',esc(e.sql?e.message:'Error inesperado del simulador: '+e.message)]]);
    finish(c,false,'Error','ko');
  }
}
function upCond(c){
  const ex=c.ex,el=c.el,T0=baseTable(ex),text=c.inp.value;
  const rowsEl=el.querySelector('.rows'),msgEl=el.querySelector('.msgs');
  if(!text.trim()){rowsEl.innerHTML=pendingRows(T0,ex.rows);msgEl.innerHTML='';return finish(c,false,'Sin empezar');}
  let mine;
  try{mine=parseConstraintInput(T0,text);}
  catch(e){if(!e.sql)throw e;msgEl.innerHTML=msgsHtml([['err','No se puede crear la restricción. '+esc(e.message)]]);rowsEl.innerHTML=pendingRows(T0,ex.rows);return finish(c,false,'Error','ko');}
  const msgs=[];const names=mine.map(m=>m.name);
  msgs.push(['info','Restricción creada: '+mine.map(m=>'<code>'+esc(m.name)+'</code>').join(', ')+(mine.some(m=>m.auto)?' (nombre generado por MySQL)':'')+'.']);
  let nameOk=true;
  if(ex.needName&&!mine.some(m=>m.name===ex.needName)){nameOk=false;msgs.push(['warn','Falta que la restricción se llame <code>'+esc(ex.needName)+'</code>.']);}
  let ok=0;
  rowsEl.innerHTML=ex.rows.map(([g,e])=>{const T=cloneT(T0);const r=insertRow(T,g);if(!!r.ok===!!e)ok++;
    const rec=r.rec||(r.ok?r.rec:null);const det=rec?checkDetails(T0,rec):[];
    return rowHtml(T0,g,e,r,rec?valsLine(det,names):'');}).join('');
  msgEl.innerHTML=msgsHtml(msgs);
  const pass=ok===ex.rows.length&&nameOk;
  finish(c,pass,pass?'Superado':ok===ex.rows.length?'Falta el nombre':ok+' de '+ex.rows.length,pass?'ok':'');
}
function upPredict(c){
  const ex=c.ex,el=c.el,T0=baseTable(ex);
  const res=ex.rows.map(g=>{const T=cloneT(T0);const r=insertRow(T,g);return {g,r,det:r.rec?checkDetails(T0,r.rec):[]};});
  const box=el.querySelector('.prows');
  box.innerHTML=res.map((x,i)=>{
    const ch=c.choice[i];const real=x.r.ok?'ok':'err';
    const verdict=c.checked?(ch===real?'good':'badc'):'';
    return '<div class="prow '+verdict+'"><code class="stmt">'+esc(insertSql(T0,x.g))+'</code><div class="pick" role="group" aria-label="Predicción fila '+(i+1)+'">'+
      '<button type="button" data-i="'+i+'" data-v="ok" aria-pressed="'+(ch==='ok')+'">Se inserta</button><button type="button" data-i="'+i+'" data-v="err" aria-pressed="'+(ch==='err')+'">Error</button></div>'+
      (c.checked?'<div class="res"><span class="ico">'+(ch===real?'✓':'✗')+'</span><span class="out '+(x.r.ok?'acc':'rej')+'">'+esc(x.r.ok?'Query OK, 1 row affected':x.r.err)+'</span>'+valsLine(x.det)+'</div>':'')+'</div>';
  }).join('');
  box.querySelectorAll('.pick button').forEach(b=>b.addEventListener('click',()=>{c.choice[+b.dataset.i]=b.dataset.v;c.checked=false;state.inputs[c.id]=JSON.stringify(c.choice);state.inputs[c.id+':ok']='0';save();update(c);}));
  const msgEl=el.querySelector('.msgs');
  if(!c.checked){msgEl.innerHTML='';const n=c.choice.filter(Boolean).length;return finish(c,false,n?n+' de '+ex.rows.length+' elegidas':'Sin empezar');}
  const ok=res.filter((x,i)=>c.choice[i]===(x.r.ok?'ok':'err')).length;const pass=ok===ex.rows.length;
  msgEl.innerHTML=msgsHtml([[pass?'info':'warn',(pass?'Todo correcto. ':'Has acertado '+ok+' de '+ex.rows.length+'. ')+esc(ex.exp)]]);
  finish(c,pass,pass?'Superado':ok+' de '+ex.rows.length,pass?'ok':'ko');
}
function upQuiz(c){
  const ex=c.ex,el=c.el;
  el.querySelectorAll('.opt').forEach((b,i)=>{b.classList.toggle('right',c.choice!==null&&i===ex.ok&&c.choice===ex.ok);b.classList.toggle('wrong',c.choice===i&&i!==ex.ok);b.setAttribute('aria-pressed',String(c.choice===i));});
  const msgEl=el.querySelector('.msgs');
  if(c.choice===null){msgEl.innerHTML='';return finish(c,false,'Sin empezar');}
  const pass=c.choice===ex.ok;
  msgEl.innerHTML=msgsHtml([[pass?'info':'warn',(pass?'Correcto. ':'No es esa. Prueba otra vez. ')+(pass?esc(ex.exp):'')]]);
  finish(c,pass,pass?'Superado':'Inténtalo de nuevo',pass?'ok':'ko');
}
function upScript(c){
  const ex=c.ex,el=c.el,T0=baseTable(ex),text=c.inp.value;
  const logEl=el.querySelector('.log'),reqEl=el.querySelector('.reqs'),rowsEl=el.querySelector('.rows'),msgEl=el.querySelector('.msgs');
  msgEl.innerHTML='';
  if(!text.trim()){logEl.innerHTML='';reqEl.innerHTML='';rowsEl.innerHTML=pendingRows(T0,ex.tests);return finish(c,false,'Sin empezar');}
  let run;
  try{run=runScript(T0,text);}catch(e){if(!e.sql)throw e;msgEl.innerHTML=msgsHtml([['err',esc(e.message)]]);logEl.innerHTML='';reqEl.innerHTML='';rowsEl.innerHTML=pendingRows(T0,ex.tests);return finish(c,false,'Error','ko');}
  logEl.innerHTML='<div class="sub">Resultado del guion</div>'+run.log.map(l=>'<div class="logl '+(l.ok?'ok':'ko')+'"><code class="stmt">'+esc(l.src)+';</code><div class="out '+(l.ok?'acc':'rej')+'">'+esc(l.msg)+'</div>'+(l.table?dataTable(run.T,l.table):'')+(l.ddl?'<pre class="ctx">'+esc(l.ddl)+'</pre>':'')+'</div>').join('')+
    (run.failed?'<p class="empty">El guion se detiene en la sentencia que falla. Las anteriores sí se han aplicado.</p>':'')+'<div class="sub">La tabla queda así</div>'+dataTable(run.T,run.T.rows);
  const T=run.T;const reqs=[];const n=ex.need;
  reqs.push([!run.failed,'El guion se ejecuta sin errores']);
  const ch=T.checks.find(x=>x.name===n.name);
  reqs.push([!!ch,'Existe la restricción '+n.name]);
  if(ch&&n.enforced!==undefined)reqs.push([ch.enforced===n.enforced,n.name+(n.enforced?' está activa (ENFORCED)':' está desactivada (NOT ENFORCED)')]);
  if(n.rows!==undefined)reqs.push([T.rows.length===n.rows,'La tabla conserva '+n.rows+' filas']);
  if(n.name&&ch&&n.enforced)reqs.push([T.rows.every(r=>truth(ev(ch.ast,r))!==false),'Todas las filas cumplen '+n.name]);
  reqEl.innerHTML='<ul class="req">'+reqs.map(([o,t])=>'<li class="'+(o?'ok':'ko')+'"><span>'+(o?'✓':'✗')+'</span>'+esc(t)+'</li>').join('')+'</ul>';
  let ok=0;
  rowsEl.innerHTML='<div class="sub">Después del guion se prueban estos INSERT</div>'+ex.tests.map(([g,e])=>{const X=cloneT(T);const r=insertRow(X,g);if(!!r.ok===!!e)ok++;return rowHtml(T,g,e,r,'');}).join('');
  const pass=reqs.every(r=>r[0])&&ok===ex.tests.length;
  const tot=reqs.length+ex.tests.length,got=reqs.filter(r=>r[0]).length+ok;
  finish(c,pass,pass?'Superado':got+' de '+tot,pass?'ok':'');
}
function upCreate(c){
  const ex=c.ex,el=c.el,text=c.inp.value;
  const madeEl=el.querySelector('.made'),reqEl=el.querySelector('.reqs'),rowsEl=el.querySelector('.rows'),msgEl=el.querySelector('.msgs');
  const ghost={name:ex.table,cols:[]};
  if(!text.trim()){msgEl.innerHTML='';madeEl.innerHTML='';reqEl.innerHTML='';rowsEl.innerHTML=pendingRows(ghost,ex.tests);return finish(c,false,'Sin empezar');}
  let T;
  try{const toks=lex(text);const st=splitStmts(toks);if(!st.length)throw E('Escribe la sentencia CREATE TABLE.');if(st.length>1)throw E('Escribe una sola sentencia: CREATE TABLE … ( … );');T=parseCreate(st[0]);}
  catch(e){if(!e.sql)throw e;msgEl.innerHTML=msgsHtml([['err','La tabla no se crea. '+esc(e.message)]]);madeEl.innerHTML='';reqEl.innerHTML='';rowsEl.innerHTML=pendingRows(ghost,ex.tests);return finish(c,false,'Error','ko');}
  const msgs=[['info','Query OK, 0 rows affected. Tabla <code>'+esc(T.name)+'</code> creada con '+T.checks.length+' restricci'+(T.checks.length===1?'ón':'ones')+' CHECK.']];
  if(T.notes.includes('fk'))msgs.push(['warn','La FOREIGN KEY se acepta, pero este simulador no comprueba la otra tabla.']);
  msgEl.innerHTML=msgsHtml(msgs);
  madeEl.innerHTML=T.checks.length?'<div class="sub">Restricciones CHECK</div><ul class="chk">'+T.checks.map(ch=>'<li><code>'+esc(ch.name)+'</code><span class="kind">'+(ch.colLevel?'de columna':'de tabla')+(ch.enforced?'':' · NOT ENFORCED')+'</span><span class="src">'+esc(ch.src)+'</span></li>').join('')+'</ul>':'';
  const r=ex.req;const reqs=[];
  reqs.push([key(T.name)===key(ex.table),'La tabla se llama '+ex.table]);
  const missing=r.cols.filter(n=>!T.cols.some(c=>key(c.n)===key(n)));
  reqs.push([!missing.length,missing.length?'Faltan columnas: '+missing.join(', '):'Tiene todas las columnas']);
  if(r.pk)reqs.push([!!T.pk&&T.pk.length===r.pk.length&&r.pk.every(n=>T.pk.some(x=>key(x)===key(n))),'Clave primaria: '+r.pk.join(', ')]);
  if(r.named){const un=T.checks.filter(ch=>ch.auto);reqs.push([T.checks.length>0&&!un.length,un.length?'Hay CHECK sin nombre: '+un.map(x=>x.name).join(', '):'Todas las CHECK tienen nombre']);}
  reqEl.innerHTML='<ul class="req">'+reqs.map(([o,t])=>'<li class="'+(o?'ok':'ko')+'"><span>'+(o?'✓':'✗')+'</span>'+esc(t)+'</li>').join('')+'</ul>';
  let ok=0;
  rowsEl.innerHTML='<div class="sub">INSERT de prueba, en este orden</div>'+ex.tests.map(([g,e])=>{const res=insertRow(T,g);if(!!res.ok===!!e)ok++;
    const failed=res.ch?'<span class="exp">la ha parado '+esc(res.ch.name)+'</span>':'';return rowHtml(T,g,e,res,failed);}).join('');
  const pass=reqs.every(x=>x[0])&&ok===ex.tests.length;
  finish(c,pass,pass?'Superado':ok+' de '+ex.tests.length+' INSERT',pass?'ok':'');
}

/* ---------- Índice y progreso ---------- */
const toc=document.getElementById('toc');let lastTier=null;
LV.forEach(([id,n,name,tier])=>{
  const g=tier||'Libre';
  if(g!==lastTier){const d=document.createElement('div');d.className='grp';d.textContent=g;toc.appendChild(d);lastTier=g;}
  const a=document.createElement('a');a.href='#'+id;a.dataset.lv=id;
  a.innerHTML='<span class="n">'+n+'</span><span class="t">'+esc(name)+'</span><span class="c"></span>';toc.appendChild(a);
});
function progress(){
  const tot=cards.length,ok=cards.filter(c=>c.pass).length;
  document.getElementById('bar').style.width=(tot?ok/tot*100:0)+'%';
  document.getElementById('progtxt').textContent=ok+' de '+tot+' ejercicios';
  toc.querySelectorAll('a').forEach(a=>{const cs=cards.filter(c=>c.lv===a.dataset.lv);const s=a.querySelector('.c');if(!cs.length){s.textContent='';return;}const o=cs.filter(c=>c.pass).length;s.textContent=o+'/'+cs.length;a.classList.toggle('done',o===cs.length);});
}

/* ---------- Banco libre ---------- */
const LAB_DDL="CREATE TABLE prueba (\n  id      INT AUTO_INCREMENT PRIMARY KEY,\n  nombre  VARCHAR(30) NOT NULL,\n  nota    DECIMAL(4,2),\n  fecha   DATE,\n  CONSTRAINT pru_nota_ck CHECK (nota BETWEEN 0 AND 10)\n);";
const LAB_SQL="INSERT INTO prueba (nombre, nota) VALUES ('Ana', 7.5);\nINSERT INTO prueba (nombre, nota) VALUES ('Luis', 11);\nINSERT INTO prueba (nombre, nota) VALUES ('Marta', NULL);\nSELECT * FROM prueba;";
const labDdl=document.getElementById('lab-ddl'),labSql=document.getElementById('lab-sql');
labDdl.value=state.inputs['lab-ddl']!=null?state.inputs['lab-ddl']:LAB_DDL;
labSql.value=state.inputs['lab-sql']!=null?state.inputs['lab-sql']:LAB_SQL;
function updateLab(){
  const out=document.getElementById('lab-out');
  let T;
  try{const st=splitStmts(lex(labDdl.value));if(st.length!==1)throw E('Escribe una sola sentencia CREATE TABLE.');T=parseCreate(st[0]);}
  catch(e){if(!e.sql)throw e;out.innerHTML=msgsHtml([['err','La tabla no se crea. '+esc(e.message)]]);return;}
  const head=msgsHtml([['info','Tabla <code>'+esc(T.name)+'</code> creada. Restricciones: '+(T.checks.length?T.checks.map(c=>'<code>'+esc(c.name)+'</code>').join(', '):'ninguna')+'.']]);
  if(!labSql.value.trim()){out.innerHTML=head;return;}
  // Mostrar el resultado de cada sentencia, sin detenerse en los errores
  const stmts=splitStmts(lex(labSql.value));let cur=T;let html='';
  for(const st of stmts){
    const src=srcOf(st,0,st.length-1);
    try{const r=execStmt(cur,st);cur=r.T;html+='<div class="logl ok"><code class="stmt">'+esc(src)+';</code><div class="out acc">'+esc(r.msg)+'</div>'+(r.table?dataTable(cur,r.table):'')+(r.ddl?'<pre class="ctx">'+esc(r.ddl)+'</pre>':'')+'</div>';}
    catch(e){if(!e.sql)throw e;html+='<div class="logl ko"><code class="stmt">'+esc(src)+';</code><div class="out rej">'+esc(e.message)+'</div></div>';}
  }
  out.innerHTML=head+html;
}
let lt;[labDdl,labSql].forEach(x=>x.addEventListener('input',()=>{state.inputs[x.id]=x.value;clearTimeout(lt);lt=setTimeout(()=>{try{updateLab();}catch(e){console.error(e);}save();},150);}));
document.getElementById('lab-reset').addEventListener('click',()=>{labDdl.value=LAB_DDL;labSql.value=LAB_SQL;delete state.inputs['lab-ddl'];delete state.inputs['lab-sql'];save();updateLab();});

/* ---------- Reinicio ---------- */
const rb=document.getElementById('reset');let armed=false,at;
rb.addEventListener('click',()=>{
  if(!armed){armed=true;rb.textContent='Pulsa otra vez para borrar todo';at=setTimeout(()=>{armed=false;rb.textContent='Borrar mis respuestas';},4000);return;}
  clearTimeout(at);armed=false;state.inputs={};save();location.reload();
});

/* ---------- Arranque ---------- */
Object.keys(EX).forEach(lv=>{
  const host=document.querySelector('.exs[data-level="'+lv+'"]');
  EX[lv].forEach((ex,k)=>host.appendChild(makeCard(lv,k,ex)));
});
cards.forEach(update);
try{updateLab();}catch(e){console.error(e);}
progress();
})();
