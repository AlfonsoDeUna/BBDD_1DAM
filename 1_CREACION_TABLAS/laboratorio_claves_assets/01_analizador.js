const SQLLab = (() => {
  class SqlError extends Error {}
  function lex(text) {
    if(text.length > 24000) throw new SqlError('Este comprobador admite hasta 24 000 caracteres por ejercicio.');
    const out=[]; let i=0;
    while(i<text.length){
      let c=text[i];
      if(/\s/.test(c)){i++;continue;}
      if(text.startsWith('--',i) && (!text[i+2] || /\s/.test(text[i+2])) || c==='#'){while(i<text.length && text[i]!=='\n')i++;continue;}
      if(text.startsWith('/*',i)){const j=text.indexOf('*/',i+2);if(j<0)throw new SqlError('Falta cerrar un comentario /* ... */.');i=j+2;continue;}
      if(c==='`'){let val='';i++;let closed=false;while(i<text.length){if(text[i]==='`'){if(text[i+1]==='`'){val+='`';i+=2;}else{i++;closed=true;break;}}else val+=text[i++];}if(!closed)throw new SqlError('Falta cerrar un identificador con ` .');out.push({v:val.toLowerCase(),kind:'id'});continue;}
      if(c==="'" || c==='"'){const q=c;let val='';i++;let closed=false;while(i<text.length){if(text[i]==='\\'){val+=text.slice(i,i+2);i+=2;}else if(text[i]===q){if(text[i+1]===q){val+=q;i+=2;}else{i++;closed=true;break;}}else val+=text[i++];}if(!closed)throw new SqlError('Falta cerrar una cadena de texto.');out.push({v:val,kind:'str'});continue;}
      if(/[a-zA-Z_\u00c0-\u024f]/.test(c)){let s=i++;while(i<text.length && /[\w$\u00c0-\u024f]/.test(text[i]))i++;out.push({v:text.slice(s,i).toLowerCase(),kind:'id'});continue;}
      if(/[0-9]/.test(c)){let s=i++;while(/[0-9.]/.test(text[i]||'') && i<text.length)i++;out.push({v:text.slice(s,i),kind:'num'});continue;}
      if('(),;=+-'.includes(c)){out.push({v:c,kind:'sym'});i++;continue;}
      throw new SqlError(`No se reconoce «${c}». Revisa el código o pruébalo en MySQL si utilizas sintaxis fuera del laboratorio.`);
    }return out;
  }
  class Cursor{
    constructor(tokens){this.t=tokens;this.i=0;}
    peek(){return this.t[this.i]?.v;}
    has(v){return this.peek()===v;}
    take(v){if(this.has(v)){this.i++;return true;}return false;}
    need(v){if(!this.take(v))throw new SqlError(`Se esperaba ${v.toUpperCase()} y aparece ${this.peek() ? '«'+this.peek()+'»' : 'el final del código'}. Revisa también las comas.`);}
    id(){const x=this.t[this.i++];if(!x || x.kind!=='id')throw new SqlError('Se esperaba un nombre de tabla, columna o restricción (sin comillas simples).');return x.v;}
    list(){this.need('(');const a=[this.id()];while(this.take(','))a.push(this.id());this.need(')');if(new Set(a).size!==a.length)throw new SqlError('Has repetido una columna dentro de la misma clave.');return a;}
    end(){return this.i>=this.t.length;}
    done(){if(!this.end())throw new SqlError(`No se ha podido interpretar «${this.peek()}» en esta definición. Puede faltar una coma o estar fuera del subconjunto del laboratorio.`);}
  }
  const normalizedAction=a=>a==='no action'?'restrict':(a||'restrict');
  const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>v===b[i]);
  const sameSet=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&[...a].sort().join('|')===[...b].sort().join('|');
  function action(c){if(c.take('cascade'))return 'cascade';if(c.take('restrict'))return 'restrict';if(c.take('no')){c.need('action');return 'no action';}if(c.take('set')){if(c.take('null'))return 'set null';if(c.take('default'))throw new SqlError('InnoDB no admite SET DEFAULT como acción referencial.');}throw new SqlError('Usa RESTRICT, CASCADE, SET NULL o NO ACTION después de ON DELETE / ON UPDATE.');}
  function constraint(c,s){
    let name=null;if(c.take('constraint')){if(!['primary','foreign','unique'].includes(c.peek()))name=c.id();}
    if(name){if(s.names.includes(name))throw new SqlError('Has repetido el nombre de una restricción.');s.names.push(name);}
    if(c.take('primary')){c.need('key');s.pks.push(c.list());}
    else if(c.take('unique')){if(c.has('key')||c.has('index'))c.i++;if(!c.has('('))c.id();s.uniques.push(c.list());}
    else if(c.take('foreign')){c.need('key');if(!c.has('('))c.id();const local=c.list();c.need('references');const table=c.id();const remote=c.list();if(local.length!==remote.length)throw new SqlError('Una FK debe tener el mismo número de columnas a ambos lados de REFERENCES.');const fk={name,cols:local,table,ref:remote,del:'restrict',upd:'restrict',explicit:{}};while(c.take('on')){let k;if(c.take('delete'))k='del';else if(c.take('update'))k='upd';else throw new SqlError('Después de ON escribe DELETE o UPDATE.');if(fk.explicit[k])throw new SqlError('Has repetido una acción ON DELETE u ON UPDATE.');fk.explicit[k]=true;fk[k]=action(c);}s.fks.push(fk);}
    else throw new SqlError('Se esperaba PRIMARY KEY, UNIQUE o FOREIGN KEY después de CONSTRAINT.');
    c.done();
  }
  function column(c,s){
    const name=c.id();if(s.cols[name])throw new SqlError(`La columna ${name} está definida dos veces.`);
    let type=c.id();if(type==='number'||type==='varchar2')throw new SqlError(`${type.toUpperCase()} es del ejemplo Oracle. En este laboratorio MySQL utiliza INT para estos identificadores y VARCHAR(n) para los textos.`);
    if(type==='integer')type='int';if(!['int','smallint','bigint','tinyint','mediumint','varchar','char','decimal','numeric','text','date','datetime','timestamp','boolean','bool','float','double'].includes(type))throw new SqlError(`El tipo «${type}» no está reconocido por este comprobador. Usa los tipos del enunciado.`);
    let size=[];if(c.take('(')){if(c.t[c.i]?.kind!=='num')throw new SqlError('Escribe una longitud o precisión numérica.');size.push(c.t[c.i++].v);if(c.take(',')){if(c.t[c.i]?.kind!=='num')throw new SqlError('Escribe el número de decimales.');size.push(c.t[c.i++].v);}c.need(')');}
    if(['varchar','char'].includes(type)&&!size.length)throw new SqlError(`Falta la longitud de ${type.toUpperCase()} en ${name}.`);
    const col={name,type,size,unsigned:false,nullable:true,auto:false};s.cols[name]=col;
    let nullSeen=false, pkSeen=false, uniqueSeen=false;
    while(!c.end()){
      if(c.take('unsigned')){if(col.unsigned)throw new SqlError('UNSIGNED está repetido.');col.unsigned=true;}
      else if(c.take('not')){c.need('null');if(nullSeen)throw new SqlError('La nulabilidad está declarada más de una vez.');col.nullable=false;nullSeen=true;}
      else if(c.take('null')){if(nullSeen)throw new SqlError('La nulabilidad está declarada más de una vez.');col.nullable=true;nullSeen=true;}
      else if(c.take('primary')){c.need('key');if(pkSeen)throw new SqlError('PRIMARY KEY está repetido.');s.pks.push([name]);pkSeen=true;}
      else if(c.take('unique')){c.take('key');if(uniqueSeen)throw new SqlError('UNIQUE está repetido.');s.uniques.push([name]);uniqueSeen=true;}
      else if(c.take('auto_increment')){if(col.auto)throw new SqlError('AUTO_INCREMENT está repetido.');col.auto=true;}
      else if(c.take('default')){if(c.end())throw new SqlError('Falta el valor DEFAULT.');const d=c.t[c.i++];if(!['str','num'].includes(d.kind)&&!['null','current_timestamp'].includes(d.v))throw new SqlError('Este comprobador admite valores DEFAULT literales sencillos; comprueba otras expresiones en MySQL.');if(d.v==='null'&&d.kind==='id')col.defaultNull=true;}
      else if(c.take('comment')){if(c.t[c.i]?.kind!=='str')throw new SqlError('COMMENT necesita texto entre comillas.');c.i++;}
      else if(c.has('references'))throw new SqlError('En MySQL 8.0/8.4, REFERENCES junto a la columna no crea la FK. Escribe una restricción de tabla: FOREIGN KEY (...) REFERENCES ... (...).');
      else if(c.has('constraint'))throw new SqlError('Para los ejemplos MySQL de esta lección, escribe CONSTRAINT como definición de tabla, separada por una coma.');
      else throw new SqlError(`No se reconoce «${c.peek()}» después de la columna ${name}. ¿Falta una coma entre columnas o antes de una restricción?`);
    }
  }
  function validateStructure(s){
    if(s.pks.length>1)throw new SqlError('Una tabla solo puede tener una PRIMARY KEY. Si la clave tiene dos columnas, escribe PRIMARY KEY (columna1, columna2), no dos PRIMARY KEY.');
    s.pk=s.pks[0]||[];
    [...s.pks,...s.uniques,...s.fks.map(f=>f.cols)].forEach(keys=>keys.forEach(k=>{if(!s.cols[k])throw new SqlError(`La columna ${k} se usa en una restricción, pero no está declarada en la tabla.`);}));
    s.pk.forEach(k=>s.cols[k].nullable=false);
    for(const col of Object.values(s.cols))if(col.defaultNull&&!col.nullable)throw new SqlError('DEFAULT NULL es incompatible con la obligatoriedad de '+col.name+'.');
    for(const f of s.fks)if([f.del,f.upd].includes('set null')&&f.cols.some(k=>!s.cols[k].nullable))throw new SqlError('SET NULL no es compatible con una columna NOT NULL ni con una columna que forme parte de la PRIMARY KEY. Revisa la definición antes de probar la acción.');
    const auto=Object.values(s.cols).filter(c=>c.auto);if(auto.length>1)throw new SqlError('MySQL solo admite una columna AUTO_INCREMENT por tabla.');
    for(const c of auto){if(!['int','smallint','bigint','tinyint','mediumint'].includes(c.type))throw new SqlError('En estos ejercicios AUTO_INCREMENT se utiliza con un identificador entero.');if(![s.pk,...s.uniques].some(k=>k[0]===c.name))throw new SqlError('AUTO_INCREMENT necesita un índice adecuado. En este ejercicio coloca el identificador como PRIMARY KEY.');}
    return s;
  }
  function parseCreate(text){
    const c=new Cursor(lex(text));c.need('create');c.need('table');if(c.take('if')){c.need('not');c.need('exists');}const table=c.id();c.need('(');
    const s={table,cols:{},pks:[],uniques:[],fks:[],names:[],engine:'innodb'};let part=[],depth=0,closed=false;
    const consume=()=>{if(!part.length)throw new SqlError('Hay una definición vacía. Revisa las comas; no debe haber coma antes del paréntesis final.');const p=new Cursor(part);if(['constraint','primary','foreign','unique'].includes(p.peek()))constraint(p,s);else column(p,s);part=[];};
    while(!c.end()){const t=c.t[c.i++];if(t.v===')'&&depth===0){consume();closed=true;break;}if(t.v===','&&depth===0){consume();continue;}if(t.v==='(')depth++;if(t.v===')')depth--;part.push(t);}
    if(!closed)throw new SqlError('Falta cerrar el paréntesis de CREATE TABLE.');
    if(c.take('engine')){c.take('=');s.engine=c.id();if(s.engine!=='innodb')throw new SqlError('Usa ENGINE = InnoDB: es el motor de estos ejercicios.');}
    c.take(';');c.done();return validateStructure(s);
  }
  function externalCheck(s,catalog){
    for(const f of s.fks){const parent=f.table===s.table?s:catalog[f.table];if(!parent)throw new SqlError(`La tabla referenciada ${f.table} no está en el esquema de este ejercicio. Comprueba su nombre.`);
      if(![parent.pk,...(parent.uniques||[])].some(k=>same(k,f.ref)))throw new SqlError(`REFERENCES ${f.table} debe apuntar a su clave primaria o a una clave única completa. Revisa las columnas y su orden.`);
      f.cols.forEach((k,i)=>{const a=s.cols[k],b=parent.cols[f.ref[i]];if(!b)throw new SqlError(`La columna ${f.ref[i]} no existe en ${f.table}.`);if(a.type!==b.type||!!a.unsigned!==!!b.unsigned)throw new SqlError(`Los tipos de ${k} y ${f.table}.${f.ref[i]} no coinciden. En los enteros comprueba también UNSIGNED.`);});
    }
  }
  function parseAlter(text,base){const c=new Cursor(lex(text));c.need('alter');c.need('table');const table=c.id();if(table!==base.table)throw new SqlError(`Este reto modifica ${base.table}, no ${table}.`);c.need('add');let t=c.t.slice(c.i);if(t.at(-1)?.v===';')t=t.slice(0,-1);const s=JSON.parse(JSON.stringify(base));s.names=[];constraint(new Cursor(t),s);return validateStructure(s);}
  function check(text,spec,catalog){
    try{
      const s=spec.mode==='alter'?parseAlter(text,spec.base):parseCreate(text);externalCheck(s,catalog);
      if(s.table!==spec.table)throw new SqlError(`La sentencia es para la tabla ${spec.table}; revisa el nombre de la tabla.`);
      if(Object.keys(s.cols).some(k=>!Object.prototype.hasOwnProperty.call(spec.cols||{},k)))throw new SqlError('En este reto conserva las columnas del enunciado. Las columnas añadidas no forman parte de la comprobación.');
      for(const [name,want] of Object.entries(spec.cols||{})){const got=s.cols[name];if(!got)throw new SqlError(`Falta la columna ${name}.`);if(want.type && got.type!==want.type)throw new SqlError(`En este reto ${name} debe ser ${want.type.toUpperCase()}.`);if(want.nullable!==undefined&&got.nullable!==want.nullable)throw new SqlError(want.nullable?`${name} debe permitir NULL en este caso.`:`${name} debe ser obligatorio: añade NOT NULL, salvo que ya forme parte de la PK.`);}
      if(spec.pk&&!sameSet(s.pk,spec.pk))throw new SqlError(`Revisa la PRIMARY KEY: debe identificar ${spec.pk.length===1?'cada fila mediante '+spec.pk[0]:'la combinación ('+spec.pk.join(', ')+')'}.`);
      for(const unique of spec.unique||[])if(!s.uniques.some(x=>sameSet(x,unique))&&!sameSet(s.pk,unique))throw new SqlError(`Falta impedir duplicados en (${unique.join(', ')}). Añade una restricción UNIQUE.`);
      for(const forbidden of spec.nonUnique||[])if(s.uniques.some(k=>sameSet(k,[forbidden]))||sameSet(s.pk,[forbidden]))throw new SqlError(`No hagas único ${forbidden}: en esta relación puede repetirse. La unicidad individual impediría el lado «muchos».`);
      if(s.fks.length!==(spec.fks||[]).length)throw new SqlError(`Este diseño necesita ${(spec.fks||[]).length} restricción(es) FOREIGN KEY; has escrito ${s.fks.length}. Una FK compuesta es una sola restricción.`);
      for(const w of spec.fks||[]){const f=s.fks.find(x=>same(x.cols,w.cols)&&x.table===w.table&&same(x.ref,w.ref));if(!f)throw new SqlError(`Revisa esta relación: (${w.cols.join(', ')}) → ${w.table} (${w.ref.join(', ')}). Escribe los campos locales antes de REFERENCES.`);if(normalizedAction(f.del)!==normalizedAction(w.del)||normalizedAction(f.upd)!==normalizedAction(w.upd))throw new SqlError(`En la FK hacia ${w.table}, el caso pide ON DELETE ${(w.del||'restrict').toUpperCase()} y ON UPDATE ${(w.upd||'restrict').toUpperCase()}. Son decisiones independientes.`);}
      return {ok:true,message:'La estructura y las restricciones cumplen el objetivo del ejercicio. Puedes contrastar la sentencia en MySQL Workbench. El comprobador revisa el subconjunto de esta lección, no ejecuta un servidor MySQL.',schema:s};
    }catch(e){return {ok:false,message:e instanceof SqlError?e.message:'No se ha podido analizar esta variante. Comprueba los paréntesis y las comas o contrástala en MySQL Workbench.'};}
  }
  return {lex,parseCreate,parseAlter,check,same,normalizedAction};
})();


/* Contenido de la lección: editar aquí títulos, consignas, ejemplos y retos. */
