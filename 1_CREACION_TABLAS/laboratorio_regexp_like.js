(function(){
"use strict";
const R=String.raw;

/* ---------- Datos ---------- */
const LV=[
  ['l0','0','Literales','Básico'],['l1','1','Anclas ^ $','Básico'],['l2','2','Punto y escape','Básico'],['l3','3','Clases [ ]','Básico'],
  ['l4','4','Atajos y POSIX','Intermedio'],['l5','5','Cuantificadores','Intermedio'],['l6','6','Grupos y |','Intermedio'],
  ['l7','7','Formatos compuestos','Avanzado'],['l8','8','Retroreferencias','Avanzado'],
  ['l9','9','Formatos españoles','Experto'],['sql','10','REGEXP_LIKE en CHECK','Experto'],['lab','·','Banco libre','']
];

const EX={
l0:[
 {q:'Escribe un patrón que encuentre el texto <b>SMR</b>.',yes:['SMR','1º SMR A','Ciclo SMR'],no:['DAM','smr','S M R'],hint:'Un literal se escribe tal cual. Las mayúsculas cuentan.',sol:'SMR'},
 {q:'Detecta los textos que contienen una arroba <b>@</b>.',yes:['ana@ies.es','@','usuario@'],no:['ana.ies.es','ana(at)ies.es'],hint:'La arroba no es un carácter especial: se escribe tal cual.',sol:'@'}
],
l1:[
 {q:'Textos que <b>empiezan</b> por ES.',yes:['ES9121000418450200051332','ES','ESPAÑA'],no:['XES12','es12',' ES12'],hint:'El ancla de inicio va delante de todo.',sol:'^ES'},
 {q:'Textos que <b>terminan</b> en «es».',yes:['ies.es','clases','es'],no:['escuela','esto es.','es '],hint:'El ancla de final va detrás de todo. Fíjate en el último caso: termina en espacio.',sol:'es$'},
 {q:'Exactamente el texto <b>DAM</b>, nada más.',yes:['DAM'],no:['DAM1','1DAM','DAMA',' DAM','DAM '],hint:'Combina las dos anclas.',sol:'^DAM$'}
],
l2:[
 {q:'Palabras de exactamente 4 caracteres que empiezan por «c» y terminan en «a».',yes:['casa','cosa','c12a','c--a'],no:['caa','cassa','Casa','casas'],hint:'Cada punto vale por un carácter. Entre la c y la a hay dos. Y necesitas las dos anclas.',sol:'^c..a$'},
 {q:'Nombres de fichero que terminan en <b>.sql</b>.',yes:['backup.sql','a.sql','.sql'],no:['backupxsql','backup.sql.gz','mysql'],hint:'Sin escapar, el punto acepta cualquier carácter y «backupxsql» colaría.',sol:R`\.sql$`},
 {q:'Exactamente la IP <b>192.168.1.1</b>.',yes:['192.168.1.1'],no:['192x168x1x1','192.168.1.10','10.192.168.1.1'],hint:'Escapa cada punto y ancla los dos extremos.',sol:R`^192\.168\.1\.1$`}
],
l3:[
 {q:'Un grupo de clase: 1 o 2 seguido de una letra de la A a la D (1A, 2C…). Solo eso.',yes:['1A','2D','1C','2B'],no:['3A','1E','1a','12A','1AB'],hint:'Dos clases seguidas: una para el número y otra para la letra.',sol:'^[12][A-D]$'},
 {q:'Un byte en hexadecimal: exactamente 2 caracteres, cada uno 0-9 o A-F, en mayúscula o minúscula.',yes:['FF','0a','9C','00'],no:['G1','0x','F','FFF'],hint:'Una clase con tres rangos seguidos, escrita dos veces (todavía no sabes cuantificadores).',sol:'^[0-9A-Fa-f][0-9A-Fa-f]$'},
 {q:'Textos cuyo primer carácter <b>no</b> es un dígito.',yes:['A12','_x','-5','ñandú'],no:['1A','99','0abc'],hint:'El ^ dentro de corchetes y en primera posición niega la clase. Fuera de corchetes ancla al inicio.',sol:'^[^0-9]'}
],
l4:[
 {q:'Exactamente tres dígitos, usando <code>\\d</code>.',yes:['000','123','987'],no:['12','1234','12a','a123'],hint:'Un \\d por cada dígito, y las dos anclas.',sol:R`^\d\d\d$`},
 {q:'Una letra mayúscula y dos dígitos, usando clases POSIX (<code>[[:upper:]]</code>, <code>[[:digit:]]</code>).',yes:['A12','Z00','M45'],no:['a12','AB1','A1','A123'],hint:'Fíjate en los dobles corchetes: el de fuera es la clase, y [:digit:] va dentro.',sol:'^[[:upper:]][[:digit:]][[:digit:]]$'},
 {q:'Textos que contienen al menos un espacio en blanco (espacio o tabulador).',yes:['hola mundo','a b',' x'],no:['holamundo','a_b','a-b'],hint:'Sin anclas: basta con que aparezca en algún sitio.',sol:R`\s`}
],
l5:[
 {q:'Código postal: exactamente 5 dígitos.',yes:['28850','01001','28320'],no:['2885','288500','28a50','CP28850'],hint:'{5} repite cinco veces lo anterior. Sin anclas, «288500» colaría.',sol:'^[0-9]{5}$'},
 {q:'Nombre de usuario: de 3 a 10 letras minúsculas (a-z).',yes:['ana','alfonso','abcdefghij'],no:['al','abcdefghijk','Ana','ana1','ana lopez'],hint:'{3,10} significa entre 3 y 10 veces.',sol:'^[a-z]{3,10}$'},
 {q:'Número entero con signo opcional (+ o -).',yes:['7','-15','+300','0'],no:['--1','1.5','+','12-'],hint:'El signo es opcional (?) y los dígitos van una o más veces (+). Dentro de corchetes, el guion al final.',sol:'^[+-]?[0-9]+$'},
 {q:'Matrícula española actual: 4 dígitos y 3 consonantes mayúsculas (sin vocales, sin Ñ ni Q).',yes:['1234BCD','0000ZZZ','9876KLM'],no:['1234ABC','123BCD','1234bcd','1234BCDF','1234QQQ'],hint:'Escribe la lista de consonantes permitidas dentro de una clase y repítela tres veces.',sol:'^[0-9]{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$'}
],
l6:[
 {q:'Exactamente uno de estos ciclos: SMR, DAM, DAW o ASIR.',yes:['SMR','DAM','DAW','ASIR'],no:['SMRx','xDAM','dam','SMRDAM','AS'],hint:'Si escribes ^SMR|DAM$ el ancla solo afecta a la primera y a la última opción. Agrupa las alternativas.',sol:'^(SMR|DAM|DAW|ASIR)$'},
 {q:'Teléfono: 9 dígitos que empiezan por 6, 7, 8 o 9, con prefijo <b>+34</b> opcional, seguido de un espacio también opcional.',yes:['612345678','+34612345678','+34 912345678'],no:['512345678','+3461234567','34612345678','+34  612345678'],hint:'El + es metacarácter: escápalo. El grupo entero (prefijo y espacio) es opcional.',sol:R`^(\+34 ?)?[6-9][0-9]{8}$`},
 {q:'Hora en formato 24 h, HH:MM (de 00:00 a 23:59).',yes:['00:00','09:30','23:59','19:05'],no:['24:00','9:30','12:60','12:5'],hint:'Las horas tienen dos casos: 00-19 y 20-23. Los minutos empiezan por 0-5.',sol:'^([01][0-9]|2[0-3]):[0-5][0-9]$'}
],
l7:[
 {q:'Fecha DD/MM/AAAA con días 01-31 y meses 01-12.',yes:['01/01/2026','31/12/1999','14/10/2026','20/02/2000'],no:['32/01/2026','00/05/2026','15/13/2026','1/1/2026','14/10/26'],hint:'Días: 01-09, 10-29, 30-31. Meses: 01-09, 10-12. No hace falta comprobar si el mes tiene 31 días.',sol:'^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/[0-9]{4}$'},
 {q:'Email simplificado: usuario (letras, dígitos, . _ % + -), arroba, dominio (letras, dígitos, . -), un punto y una extensión de 2 letras o más.',yes:['alfonso@educa.madrid.org','a.b+c@ies.es','ANA_1@X-Y.COM'],no:['alfonso@','@ies.es','alfonso@ies','alfonso ies@x.es','a@b.c'],hint:'Dentro de corchetes el punto es literal y el guion va al final. Fuera, el punto antes de la extensión hay que escaparlo.',sol:R`^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`},
 {q:'Dirección IPv4: cuatro números de 0 a 255 separados por puntos, sin ceros a la izquierda.',yes:['192.168.1.1','10.0.0.255','255.255.255.0','0.0.0.0'],no:['256.1.1.1','192.168.1','192.168.01.1','1.2.3.4.5','300.1.1.1'],hint:'Escribe primero un octeto 0-255 como alternativas: 250-255, 200-249, 100-199, 0-99. Después repite «octeto + punto» tres veces y termina con un octeto.',sol:R`^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$`}
],
l8:[
 {q:'Textos con una letra minúscula repetida dos veces seguidas (ll, rr, ee…).',yes:['llave','carro','aa','leer'],no:['casa','abc','aA'],hint:'Captura una letra con un grupo y repítela con \\1.',sol:R`([a-z])\1`},
 {q:'Fecha DD?MM?AAAA donde el separador puede ser - / o . pero tiene que ser <b>el mismo</b> las dos veces.',yes:['14-10-2026','14/10/2026','14.10.2026'],no:['14-10/2026','14/10.2026','14102026'],hint:'Captura el primer separador con un grupo y usa \\1 en el segundo.',sol:R`^[0-9]{2}([-/.])[0-9]{2}\1[0-9]{4}$`}
],
l9:[
 {q:'DNI: 8 dígitos y una letra de control en mayúscula (no existen I, Ñ, O ni U).',yes:['12345678Z','00000000T','45678912S'],no:['1234567Z','12345678I','12345678z','123456789','12345678U','12345678O'],hint:'Construye la clase de letras con rangos que salten la I, la O y la U: A-H, J-N, P-T, V-Z.',sol:'^[0-9]{8}[A-HJ-NP-TV-Z]$'},
 {q:'NIE: X, Y o Z, 7 dígitos y la letra de control.',yes:['X1234567L','Y0000000Z','Z7654321H'],no:['A1234567L','X12345678L','X1234567O','x1234567L'],hint:'Como el DNI, con una letra delante y un dígito menos.',sol:'^[XYZ][0-9]{7}[A-HJ-NP-TV-Z]$'},
 {q:'Código postal español real: las dos primeras cifras son la provincia (01 a 52).',yes:['28850','01001','52001','50001','19005'],no:['00123','53000','99999','2885'],hint:'Provincias: 01-09, 10-49, 50-52. Después, tres dígitos cualesquiera.',sol:'^(0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$'},
 {q:'IBAN español: ES, 2 dígitos de control y 20 dígitos, que pueden ir todos juntos o en bloques de 4 separados por un espacio.',yes:['ES9121000418450200051332','ES91 2100 0418 4502 0005 1332'],no:['FR7630006000011234567890189','ES912100041845020005133','ES91  2100 0418 4502 0005 1332','es9121000418450200051332'],hint:'Los 20 dígitos son 5 bloques de 4. Cada bloque puede llevar delante un espacio opcional.',sol:'^ES[0-9]{2}( ?[0-9]{4}){5}$'}
],
sql:[
 {q:'La columna <b>dni</b> solo admite 8 dígitos y una letra de DNI válida en mayúscula (sin I, Ñ, O, U).',table:'alumno',col:'dni',len:9,cname:'alu_dni_ck',
  rows:[['12345678Z',1],['00000000T',1],['1234567Z',0],['12345678z',0],['X12345678Z',0],['12345678ZA',0],['12345678I',0],[null,1]],
  hint:'Reutiliza el patrón del nivel 9 y no olvides las anclas: «X12345678Z» contiene un DNI válido. Fíjate en la fila NULL: se espera que entre.',
  sol:{oracle:"CHECK (REGEXP_LIKE(dni, '^[0-9]{8}[A-HJ-NP-TV-Z]$'))",mysql:"CHECK (REGEXP_LIKE(dni, '^[0-9]{8}[A-HJ-NP-TV-Z]$', 'c'))"},
  note:'La fila NULL entra porque REGEXP_LIKE(NULL, …) es UNKNOWN. Si el DNI es obligatorio, se declara NOT NULL en la columna.'},
 {q:'La columna <b>cp</b> solo admite códigos postales de la Comunidad de Madrid: 28 seguido de tres dígitos.',table:'centro',col:'cp',len:5,cname:'cen_cp_ck',
  rows:[['28850',1],['28001',1],['08001',0],['288500',0],['CP28850',0],['2885',0]],
  hint:'Literal 28, tres dígitos, y las dos anclas.',
  sol:{oracle:"CHECK (REGEXP_LIKE(cp, '^28[0-9]{3}$'))",mysql:"CHECK (REGEXP_LIKE(cp, '^28[0-9]{3}$'))"}},
 {q:'La columna <b>email</b> sigue el formato simplificado del nivel 7, sin distinguir mayúsculas. Usa el tercer parámetro de REGEXP_LIKE en vez de escribir A-Z y a-z.',table:'profesor',col:'email',len:100,cname:'pro_email_ck',
  rows:[['alfonso@educa.madrid.org',1],['Ana.Lopez@IES.es',1],['ana@',0],['ana lopez@ies.es',0],['@ies.es',0],['ana@ies',0],['ana@iesmadrid',0]],
  hint:"Con 'i' basta con escribir [a-z]. En MySQL, recuerda cómo se escribe la barra del punto escapado dentro de una cadena.",
  sol:{oracle:R`CHECK (REGEXP_LIKE(email, '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$', 'i'))`,mysql:R`CHECK (REGEXP_LIKE(email, '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$', 'i'))`},
  note:"En MySQL, '\\.' dentro de la cadena llega al motor como un punto sin escapar, que acepta cualquier carácter. Por eso «ana@iesmadrid» colaría. Alternativa válida en los dos motores: [.]"},
 {q:'La columna <b>telefono</b> es obligatoria y tiene 9 dígitos empezando por 6, 7, 8 o 9. Resuélvelo todo dentro del CHECK, sin NOT NULL en la columna.',table:'tutor_legal',col:'telefono',len:9,cname:'tut_tel_ck',
  rows:[['612345678',1],['912345678',1],['512345678',0],['61234567',0],['+34612345678',0],[null,0]],
  hint:'Un CHECK solo rechaza cuando la condición es FALSE, y REGEXP_LIKE(NULL, …) es UNKNOWN. ¿Qué condición da FALSE con NULL? Únela con AND.',
  sol:{oracle:"CHECK (telefono IS NOT NULL AND REGEXP_LIKE(telefono, '^[6-9][0-9]{8}$'))",mysql:"CHECK (telefono IS NOT NULL AND REGEXP_LIKE(telefono, '^[6-9][0-9]{8}$'))"},
  note:'FALSE AND UNKNOWN = FALSE, así que la fila NULL se rechaza. En una tabla real lo normal es poner NOT NULL en la columna.'},
 {q:'La columna <b>clave</b> exige: mínimo 8 caracteres, al menos una mayúscula, al menos una minúscula y al menos un dígito. Tiene que funcionar en Oracle, que no admite lookahead.',table:'usuario',col:'clave',len:60,cname:'usu_clave_ck',
  rows:[['Secreta123',1],['Aa345678',1],['secreta123',0],['SECRETA123',0],['Secreta',0],['Sec1',0],['SecretaAbc',0]],
  hint:"Divide el problema: una REGEXP_LIKE por requisito, unidas con AND, cada una sin anclas salvo la de longitud. La longitud puede ser '^.{8,}$' o LENGTH(clave) >= 8.",
  sol:{oracle:"CHECK (LENGTH(clave) >= 8\n   AND REGEXP_LIKE(clave, '[A-Z]')\n   AND REGEXP_LIKE(clave, '[a-z]')\n   AND REGEXP_LIKE(clave, '[0-9]'))",mysql:"CHECK (CHAR_LENGTH(clave) >= 8\n   AND REGEXP_LIKE(clave, '[A-Z]', 'c')\n   AND REGEXP_LIKE(clave, '[a-z]', 'c')\n   AND REGEXP_LIKE(clave, '[0-9]'))"},
  note:"En MySQL, sin 'c', [A-Z] también acepta minúsculas y «secreta123» entraría."},
 {q:'La columna <b>matricula</b>: 4 dígitos, un separador opcional (un espacio o un guion) y 3 consonantes mayúsculas (sin vocales, Ñ ni Q).',table:'vehiculo',col:'matricula',len:8,cname:'veh_mat_ck',
  rows:[['1234BCD',1],['1234 BCD',1],['1234-BCD',1],['1234ABC',0],['1234  BCD',0],['1234bcd',0],['12345BCD',0]],
  hint:'El separador es una clase de dos caracteres, [ -], con ? detrás.',
  sol:{oracle:"CHECK (REGEXP_LIKE(matricula, '^[0-9]{4}[ -]?[BCDFGHJKLMNPRSTVWXYZ]{3}$'))",mysql:"CHECK (REGEXP_LIKE(matricula, '^[0-9]{4}[ -]?[BCDFGHJKLMNPRSTVWXYZ]{3}$', 'c'))"}},
 {q:'La columna <b>codigo</b> de un módulo admite dos formatos: 4 dígitos (0484) o 3 letras mayúsculas, guion y 3 dígitos (CMO-312).',table:'modulo',col:'codigo',len:7,cname:'mod_cod_ck',
  rows:[['0484',1],['0225',1],['CMO-312',1],['CMO312',0],['484',0],['cmo-312',0],['0484-CMO',0],['04840',0]],
  hint:'Cuidado con la precedencia de |: si no agrupas, el ^ solo afecta a la primera opción y el $ a la segunda. Dos alternativas o dos REGEXP_LIKE con OR.',
  sol:{oracle:"CHECK (REGEXP_LIKE(codigo, '^([0-9]{4}|[A-Z]{3}-[0-9]{3})$'))",mysql:"CHECK (REGEXP_LIKE(codigo, '^([0-9]{4}|[A-Z]{3}-[0-9]{3})$', 'c'))"}}
]
};

/* ---------- Estado ---------- */
const STORE='rxlab-v1';
let state={dialect:'oracle',inputs:{}};
try{const s=JSON.parse(localStorage.getItem(STORE)||'null');if(s&&typeof s==='object'){state.dialect=s.dialect==='mysql'?'mysql':'oracle';state.inputs=s.inputs&&typeof s.inputs==='object'?s.inputs:{};}}catch(e){}
function save(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch(e){}}

/* ---------- Utilidades ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const vis=s=>esc(s).replace(/ /g,'<span class="sp">·</span>').replace(/\t/g,'<span class="sp">→</span>');
function hl(s,idx,len){
  if(idx<0)return vis(s);
  return vis(s.slice(0,idx))+(len?'<mark>'+vis(s.slice(idx,idx+len))+'</mark>':'<mark class="zero"></mark>')+vis(s.slice(idx+len));
}
function hlAll(s,re){
  const g=new RegExp(re.source,re.flags.replace('g','')+'g');let out='',last=0,m,guard=0;
  while((m=g.exec(s))&&guard++<500){
    out+=vis(s.slice(last,m.index));
    out+=m[0].length?'<mark>'+vis(m[0])+'</mark>':'<mark class="zero"></mark>';
    last=m.index+m[0].length;
    if(!m[0].length)g.lastIndex++;
  }
  return out+vis(s.slice(last));
}

/* ---------- Motor ---------- */
const POSIX={alpha:'A-Za-zÀ-ÖØ-öø-ÿ',digit:'0-9',alnum:'A-Za-z0-9À-ÖØ-öø-ÿ',upper:'A-ZÀ-ÖØ-Þ',lower:'a-zß-öø-ÿ',space:'\\s',blank:' \\t',punct:'!-\\/:-@\\[-`{-~',xdigit:'0-9A-Fa-f',cntrl:'\\x00-\\x1F\\x7F',print:'\\x20-\\x7E',graph:'\\x21-\\x7E'};

function toJs(pat,dialect){
  const warn=[];let err=null;
  if(dialect==='oracle'){
    if(/\(\?<[=!]/.test(pat))err='Oracle no admite lookbehind (?<=…). Divide la condición en varias REGEXP_LIKE.';
    else if(/\(\?[=!]/.test(pat))err='Oracle no admite lookahead (?=…) ni (?!…). Encadena varias REGEXP_LIKE con AND.';
    else if(/\(\?:/.test(pat))err='Oracle no admite grupos sin captura (?:…). Usa un grupo normal ( … ).';
  }
  let out='',i=0,inC=false;
  while(i<pat.length){
    const c=pat[i];
    if(!inC){
      if(c==='\\'){
        const nx=pat[i+1];
        if(nx===undefined){err=err||'El patrón termina en una barra \\ suelta.';break;}
        if(dialect==='oracle'&&(nx==='b'||nx==='B'))err=err||'Oracle no reconoce \\b como límite de palabra.';
        out+=c+nx;i+=2;continue;
      }
      if(c==='['){
        inC=true;out+='[';i++;
        if(pat[i]==='^'){out+='^';i++;}
        if(pat[i]===']'){out+='\\]';i++;}
        continue;
      }
      out+=c;i++;continue;
    }
    if(c==='['&&pat[i+1]===':'){
      const e=pat.indexOf(':]',i+2);
      if(e>0){const name=pat.slice(i+2,e);if(!POSIX[name])err=err||'No conozco la clase POSIX [:'+name+':].';out+=POSIX[name]||'';i=e+2;continue;}
    }
    if(c==='\\'){
      if(dialect==='oracle'){
        warn.push('Dentro de [ ] Oracle trata la barra \\ como un carácter normal: [\\d] significa «una barra o una d». Usa [0-9] o [[:digit:]].');
        out+='\\\\';i++;continue;
      }
      out+=c+(pat[i+1]||'');i+=2;continue;
    }
    if(c==='['){out+='\\[';i++;continue;}
    if(c===']'){inC=false;out+=']';i++;continue;}
    out+=c;i++;
  }
  if(inC)err=err||'Falta cerrar un corchete ].';
  return {src:out,warn:[...new Set(warn)],err};
}

function buildRegex(pat,dialect,param,sqlMode){
  let ci=!!(sqlMode&&dialect==='mysql'),mm=false,dot=false,ext=false;
  for(const ch of (param||'')){
    if(ch==='i')ci=true;else if(ch==='c')ci=false;else if(ch==='m')mm=true;else if(ch==='n')dot=true;
    else if(ch==='x'&&dialect==='oracle')ext=true;else if(ch==='u'&&dialect==='mysql'){}
    else return {err:"Parámetro de coincidencia no válido: '"+ch+"'.",warn:[]};
  }
  if(ext)pat=pat.replace(/\s/g,'');
  if(pat==='')return {err:'El patrón está vacío.',warn:[]};
  const c=toJs(pat,dialect);
  if(c.err)return {err:c.err,warn:c.warn};
  try{return {re:new RegExp(c.src,(ci?'i':'')+(mm?'m':'')+(dot?'s':'')),warn:c.warn,ci};}
  catch(e){return {err:'El patrón no es válido: revisa que paréntesis, corchetes y llaves estén cerrados y que cada cuantificador tenga algo delante.',warn:c.warn};}
}

/* ---------- Desglose del patrón ---------- */
const PNAME={alpha:'letra',digit:'dígito',alnum:'letra o dígito',upper:'mayúscula',lower:'minúscula',space:'espacio',blank:'espacio o tab',punct:'puntuación',xdigit:'hexadecimal',cntrl:'control',print:'imprimible',graph:'visible'};
function descClass(body){
  let neg=false;if(body[0]==='^'){neg=true;body=body.slice(1);}
  const it=[];let k=0;
  while(k<body.length){
    if(body.startsWith('[:',k)){const e=body.indexOf(':]',k);if(e>0){const n=body.slice(k+2,e);it.push(PNAME[n]||n);k=e+2;continue;}}
    if(body[k]==='\\'&&body[k+1]){it.push('\\'+body[k+1]);k+=2;continue;}
    if(body[k+1]==='-'&&k+2<body.length){it.push(body[k]+'–'+body[k+2]);k+=3;continue;}
    it.push(body[k]===' '?'espacio':body[k]);k++;
  }
  return (neg?'un carácter que NO sea: ':'uno de: ')+it.join(' · ');
}
function explain(p){
  const out=[];let i=0,lit='',grp=0;
  const flush=()=>{if(lit){out.push({c:lit,d:lit.length>1?'el texto «'+lit+'»':'el carácter «'+lit+'»',k:'lit'});lit='';}};
  const ESC={d:'un dígito',D:'cualquier cosa menos un dígito',w:'letra, dígito o _',W:'cualquier cosa menos letra, dígito o _',s:'un espacio en blanco',S:'cualquier cosa menos un espacio',b:'límite de palabra',B:'no límite de palabra',n:'salto de línea',t:'tabulador'};
  while(i<p.length){
    const ch=p[i];
    if(ch==='*'||ch==='+'||ch==='?'||ch==='{'){
      let q=ch,j=i+1,d;
      if(ch==='{'){
        const m=/^\{(\d*)(,?)(\d*)\}/.exec(p.slice(i));
        if(!m||(!m[1]&&!m[3])){lit+=ch;i++;continue;}
        q=m[0];j=i+q.length;
        d=!m[2]?('exactamente '+m[1]+(m[1]==='1'?' vez':' veces')):(m[3]?('entre '+(m[1]||0)+' y '+m[3]+' veces'):(m[1]+' o más veces'));
      }else d=ch==='*'?'0 o más veces':ch==='+'?'1 o más veces':'opcional (0 o 1 vez)';
      if(p[j]==='?'){q+='?';j++;d+=', las mínimas posibles';}
      if(lit.length>1){const last=lit.slice(-1);lit=lit.slice(0,-1);flush();lit=last;}
      flush();
      if(!out.length)out.push({c:q,d:'cuantificador sin nada delante',k:'err'});
      else out.push({c:q,d:'↑ '+d,k:'q'});
      i=j;continue;
    }
    if(ch==='\\'){
      flush();const nx=p[i+1];
      if(nx===undefined){out.push({c:'\\',d:'barra suelta: falta el carácter',k:'err'});i++;continue;}
      if(ESC[nx])out.push({c:'\\'+nx,d:ESC[nx],k:'cls'});
      else if(/[1-9]/.test(nx))out.push({c:'\\'+nx,d:'repite lo capturado por el grupo '+nx,k:'grp'});
      else out.push({c:'\\'+nx,d:nx==='.'?'un punto de verdad':'el carácter «'+nx+'»',k:'lit'});
      i+=2;continue;
    }
    if(ch==='['){
      flush();let j=i+1;if(p[j]==='^')j++;if(p[j]===']')j++;
      while(j<p.length&&p[j]!==']'){if(p[j]==='['&&p[j+1]===':'){const e=p.indexOf(':]',j+2);j=e<0?p.length:e+2;continue;}j++;}
      if(j>=p.length){out.push({c:p.slice(i),d:'falta cerrar el corchete ]',k:'err'});i=p.length;continue;}
      out.push({c:p.slice(i,j+1),d:descClass(p.slice(i+1,j)),k:'cls'});i=j+1;continue;
    }
    if(ch==='('){
      flush();
      if(p.startsWith('(?:',i)){out.push({c:'(?:',d:'abre grupo sin captura',k:'grp'});i+=3;continue;}
      if(p.startsWith('(?=',i)||p.startsWith('(?!',i)){out.push({c:p.slice(i,i+3),d:p[i+2]==='='?'lookahead: comprueba sin avanzar':'lookahead negativo',k:'grp'});i+=3;continue;}
      grp++;out.push({c:'(',d:'abre el grupo '+grp,k:'grp'});i++;continue;
    }
    if(ch===')'){flush();out.push({c:')',d:'cierra grupo',k:'grp'});i++;continue;}
    if(ch==='|'){flush();out.push({c:'|',d:'o bien',k:'anc'});i++;continue;}
    if(ch==='^'){flush();out.push({c:'^',d:'inicio del texto',k:'anc'});i++;continue;}
    if(ch==='$'){flush();out.push({c:'$',d:'final del texto',k:'anc'});i++;continue;}
    if(ch==='.'){flush();out.push({c:'.',d:'un carácter cualquiera',k:'cls'});i++;continue;}
    lit+=ch;i++;
  }
  flush();return out;
}
function renderChips(el,p){
  if(!p){el.innerHTML='';return;}
  let t=[];try{t=explain(p);}catch(e){}
  el.innerHTML=t.map(x=>'<span class="tok k-'+x.k+'"><code>'+esc(x.c).replace(/ /g,'␣')+'</code><span>'+esc(x.d)+'</span></span>').join('');
}

/* ---------- Mini parser SQL ---------- */
function lex(s,dialect){
  const t=[];let i=0;
  while(i<s.length){
    const c=s[i];
    if(/\s/.test(c)){i++;continue;}
    if(c==='-'&&s[i+1]==='-'){while(i<s.length&&s[i]!=='\n')i++;continue;}
    if(c==="'"||(c==='"'&&dialect==='mysql')){
      const q=c;let raw='',val='',closed=false;i++;
      while(i<s.length){
        const d=s[i];
        if(d===q){if(s[i+1]===q){raw+=q+q;val+=q;i+=2;continue;}closed=true;i++;break;}
        if(d==='\\'&&dialect==='mysql'){
          const e=s[i+1];if(e===undefined){raw+=d;i++;continue;}
          const M={'0':'\0',"'":"'",'"':'"',b:'\b',n:'\n',r:'\r',t:'\t',Z:'\x1A','\\':'\\','%':'\\%','_':'\\_'};
          raw+=d+e;val+=(e in M)?M[e]:e;i+=2;continue;
        }
        raw+=d;val+=d;i++;
      }
      if(!closed)throw new Error('Falta cerrar una comilla simple.');
      t.push({t:'str',raw,val});continue;
    }
    if(c==='"')throw new Error('En Oracle las cadenas van entre comillas simples \' \'. Las dobles son para nombres de columna.');
    if(/[0-9]/.test(c)){let j=i;while(j<s.length&&/[0-9]/.test(s[j]))j++;t.push({t:'num',v:+s.slice(i,j)});i=j;continue;}
    if(/[A-Za-z_]/.test(c)){let j=i;while(j<s.length&&/[A-Za-z0-9_$#]/.test(s[j]))j++;t.push({t:'id',v:s.slice(i,j).toUpperCase(),raw:s.slice(i,j)});i=j;continue;}
    if(c==='`'&&dialect==='mysql'){const e=s.indexOf('`',i+1);if(e<0)throw new Error('Falta cerrar un acento grave `.');const n=s.slice(i+1,e);t.push({t:'id',v:n.toUpperCase(),raw:n});i=e+1;continue;}
    const two=s.slice(i,i+2);
    if(['>=','<=','<>','!='].includes(two)){t.push({t:'op',v:two});i+=2;continue;}
    if('(),=<>;'.includes(c)){t.push({t:'op',v:c});i++;continue;}
    throw new Error('Carácter inesperado «'+c+'».');
  }
  return t;
}
function parseCheck(text,col,dialect){
  const rx=[];
  try{
    const toks=lex(text,dialect);
    while(toks.length&&toks[toks.length-1].t==='op'&&toks[toks.length-1].v===';')toks.pop();
    let i=0;
    if(toks[0]&&toks[0].t==='id'&&toks[0].v==='CONSTRAINT'){if(!toks[1]||toks[1].t!=='id')throw new Error('Después de CONSTRAINT va el nombre de la restricción.');i=2;}
    if(toks[i]&&toks[i].t==='id'&&toks[i].v==='CHECK')i++;
    const COL=col.toUpperCase();
    const peek=()=>toks[i];
    const isKw=k=>toks[i]&&toks[i].t==='id'&&toks[i].v===k;
    const isOp=o=>toks[i]&&toks[i].t==='op'&&toks[i].v===o;
    const show=t=>!t?'el final':t.t==='str'?"'"+t.raw+"'":t.t==='id'?t.raw:String(t.v);
    const expect=o=>{if(!isOp(o))throw new Error('Esperaba «'+o+'» y he encontrado '+show(peek())+'.');i++;};
    const FN=['UPPER','LOWER','TRIM','LENGTH','CHAR_LENGTH'];
    function val(){
      const t=toks[i++];
      if(!t)throw new Error('La condición está incompleta.');
      if(t.t==='num')return {k:'num',v:t.v};
      if(t.t==='str')return {k:'str',v:t.val};
      if(t.t==='id'){
        if(FN.includes(t.v)&&isOp('(')){i++;const a=val();expect(')');return {k:'fn',f:t.v,a};}
        if(t.v===COL)return {k:'col'};
        if(t.v==='NULL')return {k:'null'};
        if(t.v==='REGEXP_LIKE')throw new Error('REGEXP_LIKE ya devuelve verdadero o falso: no se compara con nada.');
        throw new Error('No reconozco «'+t.raw+'». En este ejercicio la columna se llama '+col+'.');
      }
      throw new Error('No esperaba '+show(t)+' aquí.');
    }
    function rxNode(src,pt,par){
      if(!pt||pt.t!=='str')throw new Error('El patrón tiene que ir entre comillas simples.');
      const b=buildRegex(pt.val,dialect,par,true);
      rx.push({raw:pt.raw,val:pt.val,par,warn:b.warn||[]});
      if(b.err)throw new Error(b.err);
      return {k:'rx',src,re:b.re};
    }
    function primary(){
      if(isOp('(')){i++;const e=or();expect(')');return e;}
      if(isKw('REGEXP_LIKE')){
        i++;expect('(');const s=val();expect(',');const pt=toks[i++];let par='';
        if(isOp(',')){i++;const q=toks[i++];if(!q||q.t!=='str')throw new Error("El tercer argumento va entre comillas, por ejemplo 'i'.");par=q.val;}
        expect(')');return rxNode(s,pt,par);
      }
      const a=val();
      if(isKw('IS')){i++;let neg=false;if(isKw('NOT')){neg=true;i++;}if(!isKw('NULL'))throw new Error('Después de IS va NULL o NOT NULL.');i++;return {k:'isnull',a,neg};}
      let neg=false;if(isKw('NOT')){neg=true;i++;}
      if(isKw('BETWEEN')){i++;const lo=val();if(!isKw('AND'))throw new Error('BETWEEN necesita AND.');i++;const hi=val();return {k:'between',a,lo,hi,neg};}
      if(isKw('REGEXP')||isKw('RLIKE')){
        if(dialect!=='mysql')throw new Error('En Oracle no existe el operador REGEXP: usa la función REGEXP_LIKE(col, \'patrón\').');
        i++;const n=rxNode(a,toks[i++],'');return neg?{k:'not',e:n}:n;
      }
      if(isKw('LIKE'))throw new Error('LIKE usa comodines % y _, no expresiones regulares. Aquí se practica REGEXP_LIKE.');
      if(neg)throw new Error('Hay un NOT en una posición que no entiendo.');
      const t=peek();
      if(t&&t.t==='op'&&['=','<>','!=','<','>','<=','>='].includes(t.v)){i++;const b=val();return {k:'cmp',op:t.v,a,b};}
      throw new Error('Falta una comparación o un REGEXP_LIKE antes de '+show(t)+'.');
    }
    function not(){if(isKw('NOT')){i++;return {k:'not',e:not()};}return primary();}
    function and(){let l=not();while(isKw('AND')){i++;l={k:'and',l,r:not()};}return l;}
    function or(){let l=and();while(isKw('OR')){i++;l={k:'or',l,r:and()};}return l;}
    if(i>=toks.length)throw new Error('Escribe la condición del CHECK.');
    const ast=or();
    if(i<toks.length)throw new Error('Sobra algo a partir de '+show(toks[i])+'. ¿Falta un AND o sobra un paréntesis?');
    return {ast,rx};
  }catch(e){return {err:e.message,rx};}
}
function evalNode(n,v,dialect){
  const N=x=>(x===''&&dialect==='oracle')?null:x;
  function ev(n){
    switch(n.k){
      case 'num':return n.v;
      case 'str':return N(n.v);
      case 'null':return null;
      case 'col':return N(v);
      case 'fn':{const a=ev(n.a);if(a===null)return null;const s=String(a);
        if(n.f==='UPPER')return s.toUpperCase();if(n.f==='LOWER')return s.toLowerCase();if(n.f==='TRIM')return N(s.trim());return s.length;}
      case 'rx':{const s=ev(n.src);if(s===null)return null;return n.re.test(String(s));}
      case 'isnull':{const r=ev(n.a)===null;return n.neg?!r:r;}
      case 'cmp':{const a=ev(n.a),b=ev(n.b);if(a===null||b===null)return null;
        switch(n.op){case '=':return a==b;case '<>':case '!=':return a!=b;case '<':return a<b;case '>':return a>b;case '<=':return a<=b;default:return a>=b;}}
      case 'between':{const a=ev(n.a),lo=ev(n.lo),hi=ev(n.hi);if(a===null||lo===null||hi===null)return null;const r=a>=lo&&a<=hi;return n.neg?!r:r;}
      case 'not':{const a=ev(n.e);return a===null?null:!a;}
      case 'and':{const a=ev(n.l),b=ev(n.r);if(a===false||b===false)return false;if(a===null||b===null)return null;return true;}
      case 'or':{const a=ev(n.l),b=ev(n.r);if(a===true||b===true)return true;if(a===null||b===null)return null;return false;}
    }
    return null;
  }
  return ev(n);
}

/* ---------- Tarjetas ---------- */
const cards=[];
const lvNum=id=>LV.find(l=>l[0]===id)[1];

function sqlLit(v){return v===null?'NULL':"'"+v.replace(/'/g,"''")+"'";}
function ctxHtml(ex){
  const ty=state.dialect==='oracle'?'VARCHAR2':'VARCHAR';
  return '<span class="kw">CREATE TABLE</span> '+ex.table+' (\n  '+ex.col+' '+ty+'('+ex.len+'),\n  <span class="kw">CONSTRAINT</span> '+ex.cname+'\n    <span class="slot">CHECK ( … )</span>   <span class="cm">-- lo que escribas abajo</span>\n);';
}

function makeCard(lv,k,ex){
  const id=lv+'-'+(k+1);const sql=lv==='sql';
  const el=document.createElement('article');
  el.className='ex'+(sql?' sqlex':'');el.id='ex-'+id;
  const num=lvNum(lv)+'.'+(k+1);
  el.innerHTML=
    '<div class="ex-head"><span class="ex-num">Ejercicio '+num+'</span><span class="pill">Sin empezar</span></div>'+
    '<p class="q">'+ex.q+'</p>'+
    (sql
      ?'<pre class="ctx"></pre><textarea class="sql-in" id="in-'+id+'" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Condición CHECK del ejercicio '+num+'" placeholder="CHECK (REGEXP_LIKE('+ex.col+', \'…\'))"></textarea>'
      :'<label class="rx-input" for="in-'+id+'"><span class="sl" aria-hidden="true">\'</span><input id="in-'+id+'" class="mono" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="escribe tu patrón" aria-label="Patrón del ejercicio '+num+'"><span class="sl" aria-hidden="true">\'</span></label><div class="chips"></div>')+
    '<div class="msgs"></div>'+
    (sql?'<div class="rows"></div>'
       :'<div class="cases"><div class="col"><h4>Debe coincidir</h4><div class="list yes"></div></div><div class="col"><h4>No debe coincidir</h4><div class="list no"></div></div></div>')+
    '<div class="actions"><button type="button" class="ghost b-hint">Pista</button><button type="button" class="ghost b-sol">Ver solución</button></div>'+
    '<div class="reveal r-hint" hidden></div><div class="reveal r-sol" hidden></div>';
  const inp=el.querySelector(sql?'textarea':'input');
  inp.value=state.inputs[id]||'';
  const card={id,lv,ex,el,inp,sql,pass:false};
  let tmr;
  inp.addEventListener('input',()=>{state.inputs[id]=inp.value;clearTimeout(tmr);tmr=setTimeout(()=>{update(card);save();},90);});
  const rh=el.querySelector('.r-hint'),rs=el.querySelector('.r-sol');
  rh.innerHTML='<p>'+esc(ex.hint)+'</p>';
  el.querySelector('.b-hint').addEventListener('click',()=>{rh.hidden=!rh.hidden;});
  el.querySelector('.b-sol').addEventListener('click',()=>{rs.hidden=!rs.hidden;if(!rs.hidden)fillSol(card);});
  rs.addEventListener('click',e=>{
    if(e.target.classList.contains('b-use')){inp.value=solText(card);state.inputs[id]=inp.value;save();update(card);inp.focus();}
  });
  cards.push(card);
  return el;
}
function solText(c){return c.sql?c.ex.sol[state.dialect]:c.ex.sol;}
function fillSol(c){
  const rs=c.el.querySelector('.r-sol');
  rs.innerHTML='<p>Una solución posible'+(c.sql?' en '+(state.dialect==='oracle'?'Oracle':'MySQL 8'):'')+'. Puede haber otras igual de válidas.</p><code class="sol">'+esc(solText(c))+'</code>'+
    (c.ex.note?'<p>'+esc(c.ex.note)+'</p>':'')+'<button type="button" class="ghost b-use">Probarla en el ejercicio</button>';
}

function setPill(c,txt,cls){const p=c.el.querySelector('.pill');p.textContent=txt;p.className='pill'+(cls?' '+cls:'');}
function msgsHtml(list){return list.map(m=>'<div class="msg '+m[0]+'">'+m[1]+'</div>').join('');}

function update(c){
  if(c.sql)return updateSql(c);
  const pat=c.inp.value;
  renderChips(c.el.querySelector('.chips'),pat);
  const yesEl=c.el.querySelector('.list.yes'),noEl=c.el.querySelector('.list.no'),msgEl=c.el.querySelector('.msgs');
  const neutral=s=>'<div class="case"><span class="ico">·</span><span class="str">'+vis(s)+'</span></div>';
  if(!pat){
    yesEl.innerHTML=c.ex.yes.map(neutral).join('');noEl.innerHTML=c.ex.no.map(neutral).join('');
    msgEl.innerHTML='';setPill(c,'Sin empezar');c.pass=false;c.el.classList.remove('pass');return;
  }
  const b=buildRegex(pat,state.dialect,'',false);
  const msgs=(b.warn||[]).map(w=>['warn',esc(w)]);
  if(b.err){
    msgs.unshift(['err',esc(b.err)]);msgEl.innerHTML=msgsHtml(msgs);
    yesEl.innerHTML=c.ex.yes.map(neutral).join('');noEl.innerHTML=c.ex.no.map(neutral).join('');
    setPill(c,'Error','ko');c.pass=false;c.el.classList.remove('pass');return;
  }
  let ok=0;const tot=c.ex.yes.length+c.ex.no.length;
  const row=(s,want)=>{
    const m=b.re.exec(s);const hit=!!m;const good=hit===want;if(good)ok++;
    return '<div class="case '+(good?'good':'badc')+'"><span class="ico">'+(good?'✓':'✗')+'</span><span class="str">'+(m?hl(s,m.index,m[0].length):vis(s))+'</span></div>';
  };
  yesEl.innerHTML=c.ex.yes.map(s=>row(s,true)).join('');
  noEl.innerHTML=c.ex.no.map(s=>row(s,false)).join('');
  msgEl.innerHTML=msgsHtml(msgs);
  c.pass=ok===tot;
  setPill(c,c.pass?'Superado':ok+' de '+tot,c.pass?'ok':'');
  c.el.classList.toggle('pass',c.pass);
  progress();
}

function updateSql(c){
  const d=state.dialect;
  c.el.querySelector('.ctx').innerHTML=ctxHtml(c.ex);
  const text=c.inp.value,rowsEl=c.el.querySelector('.rows'),msgEl=c.el.querySelector('.msgs');
  const ins=v=>'INSERT INTO '+c.ex.table+' ('+c.ex.col+') VALUES ('+sqlLit(v)+');';
  const expTxt=e=>'esperado: '+(e?'aceptar':'rechazar');
  if(!text.trim()){
    rowsEl.innerHTML=c.ex.rows.map(([v,e])=>'<div class="row"><span class="ico">·</span><div><code class="stmt">'+esc(ins(v))+'</code><div class="res"><span class="exp">'+expTxt(e)+'</span></div></div></div>').join('');
    msgEl.innerHTML='';setPill(c,'Sin empezar');c.pass=false;c.el.classList.remove('pass');progress();return;
  }
  const p=parseCheck(text,c.ex.col,d);
  const msgs=[];
  for(const r of p.rx){
    if(d==='mysql'&&r.raw!==r.val)msgs.push(['info','Patrón que recibe el motor: <code>'+vis(r.val)+'</code> (has escrito <code>'+vis(r.raw)+'</code>; en MySQL la barra dentro de una cadena es carácter de escape).']);
    for(const w of r.warn)msgs.push(['warn',esc(w)]);
  }
  if(p.err){
    msgs.unshift(['err',(d==='oracle'?'Error de sintaxis o de patrón: ':'Error: ')+esc(p.err)]);
    msgEl.innerHTML=msgsHtml(msgs);
    rowsEl.innerHTML=c.ex.rows.map(([v,e])=>'<div class="row"><span class="ico">·</span><div><code class="stmt">'+esc(ins(v))+'</code><div class="res"><span class="exp">'+expTxt(e)+'</span></div></div></div>').join('');
    setPill(c,'Error','ko');c.pass=false;c.el.classList.remove('pass');progress();return;
  }
  let ok=0;
  rowsEl.innerHTML=c.ex.rows.map(([v,e])=>{
    const r=evalNode(p.ast,v,d);const acc=r!==false;const good=acc===!!e;if(good)ok++;
    const out=acc?(d==='oracle'?'1 fila creada.':'Query OK, 1 row affected')
      :(d==='oracle'?'ORA-02290: restricción de control (DAM.'+c.ex.cname.toUpperCase()+') violada':"ERROR 3819 (HY000): Check constraint '"+c.ex.cname+"' is violated.");
    const why=r===null?' <span class="exp">(la condición da UNKNOWN)</span>':'';
    return '<div class="row '+(good?'good':'badc')+'"><span class="ico">'+(good?'✓':'✗')+'</span><div><code class="stmt">'+esc(ins(v))+'</code><div class="res"><span class="out '+(acc?'acc':'rej')+'">'+esc(out)+'</span>'+why+'<span class="exp">'+expTxt(e)+'</span></div></div></div>';
  }).join('');
  msgEl.innerHTML=msgsHtml(msgs);
  const tot=c.ex.rows.length;c.pass=ok===tot;
  setPill(c,c.pass?'Superado':ok+' de '+tot,c.pass?'ok':'');
  c.el.classList.toggle('pass',c.pass);
  progress();
}

/* ---------- Índice y progreso ---------- */
const toc=document.getElementById('toc');
let lastTier=null;
LV.forEach(([id,n,name,tier])=>{
  if(tier&&tier!==lastTier){const g=document.createElement('div');g.className='grp';g.textContent=tier;toc.appendChild(g);lastTier=tier;}
  if(!tier){const g=document.createElement('div');g.className='grp';g.textContent='Libre';toc.appendChild(g);}
  const a=document.createElement('a');a.href='#'+id;a.dataset.lv=id;
  a.innerHTML='<span class="n">'+n+'</span><span class="t">'+esc(name)+'</span><span class="c"></span>';
  toc.appendChild(a);
});
function progress(){
  const tot=cards.length,ok=cards.filter(c=>c.pass).length;
  document.getElementById('bar').style.width=(tot?ok/tot*100:0)+'%';
  document.getElementById('progtxt').textContent=ok+' de '+tot+' ejercicios';
  toc.querySelectorAll('a').forEach(a=>{
    const cs=cards.filter(c=>c.lv===a.dataset.lv);const span=a.querySelector('.c');
    if(!cs.length){span.textContent='';return;}
    const o=cs.filter(c=>c.pass).length;span.textContent=o+'/'+cs.length;a.classList.toggle('done',o===cs.length);
  });
}

/* ---------- Motor (selector) ---------- */
function setDialect(d){
  state.dialect=d;save();
  document.querySelectorAll('.seg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.d===d)));
  cards.forEach(c=>{update(c);const rs=c.el.querySelector('.r-sol');if(!rs.hidden)fillSol(c);});
  updateLab();progress();
}
document.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>setDialect(b.dataset.d)));

/* ---------- Banco libre ---------- */
const labRx=document.getElementById('lab-rx'),labText=document.getElementById('lab-text'),labI=document.getElementById('lab-i');
labRx.value=state.inputs['lab-rx']!=null?state.inputs['lab-rx']:'^[0-9]{8}[A-HJ-NP-TV-Z]$';
labText.value=state.inputs['lab-text']!=null?state.inputs['lab-text']:'12345678Z\n1234567Z\nX12345678Z\n28850\nalfonso@educa.madrid.org\n1234 BCD\n192.168.1.1\n14/10/2026';
function updateLab(){
  const pat=labRx.value;renderChips(document.getElementById('lab-chips'),pat);
  const res=document.getElementById('lab-res'),msg=document.getElementById('lab-msgs');
  const lines=labText.value.split('\n');
  if(!pat){msg.innerHTML='';res.innerHTML='';return;}
  const b=buildRegex(pat,state.dialect,labI.checked?'i':'',false);
  const ms=(b.warn||[]).map(w=>['warn',esc(w)]);
  if(b.err){ms.unshift(['err',esc(b.err)]);msg.innerHTML=msgsHtml(ms);res.innerHTML='';return;}
  msg.innerHTML=msgsHtml(ms);
  res.innerHTML=lines.filter(l=>l.length).map(l=>{const hit=b.re.test(l);
    return '<div class="case '+(hit?'good':'')+'"><span class="ico">'+(hit?'✓':'·')+'</span><span class="str">'+hlAll(l,b.re)+'</span><span class="tag">'+(hit?'verdadero':'falso')+'</span></div>';}).join('');
}
let lt;
[labRx,labText].forEach(x=>x.addEventListener('input',()=>{state.inputs[x.id]=x.value;clearTimeout(lt);lt=setTimeout(()=>{updateLab();save();},90);}));
labI.addEventListener('change',updateLab);

/* ---------- Reinicio ---------- */
const rb=document.getElementById('reset');let armed=false,at;
rb.addEventListener('click',()=>{
  if(!armed){armed=true;rb.textContent='Pulsa otra vez para borrar todo';at=setTimeout(()=>{armed=false;rb.textContent='Borrar mis respuestas';},4000);return;}
  clearTimeout(at);armed=false;rb.textContent='Respuestas borradas';
  state.inputs={};save();
  cards.forEach(c=>{c.inp.value='';update(c);});
  setTimeout(()=>{rb.textContent='Borrar mis respuestas';},2500);
});

/* ---------- Arranque ---------- */
Object.keys(EX).forEach(lv=>{
  const host=document.querySelector('.exs[data-level="'+lv+'"]');
  EX[lv].forEach((ex,k)=>host.appendChild(makeCard(lv,k,ex)));
});
setDialect(state.dialect);
})();
