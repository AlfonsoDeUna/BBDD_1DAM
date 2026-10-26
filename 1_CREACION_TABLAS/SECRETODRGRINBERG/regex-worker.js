/* User expressions run in an isolated, disposable reader. */
importScripts('room-data.js?v=7');

// A small lexer for this lesson's MySQL CHECK, not a SQL execution engine.
// String escapes follow MySQL's default mode (NO_BACKSLASH_ESCAPES is off).
function readCheck(sql,column) {
  const fail = (message) => ({error:'sql',message});
  const tokens = [];
  let i = 0;
  while (i < sql.length) {
    if (/\s/.test(sql[i])) { i++; continue; }
    if ('(),;'.includes(sql[i])) { tokens.push({type:sql[i],value:sql[i++]}); continue; }
    if (sql[i] === "'") {
      i++; let value = ''; let closed = false;
      while (i < sql.length) {
        if (sql[i] === '\\') {
          const escaped = sql[++i];
          if (escaped === undefined) break;
          const escapes = {'0':'\0',b:'\b',n:'\n',r:'\r',t:'\t',Z:'\x1a'};
          value += escapes[escaped] ?? (escaped === '%' || escaped === '_' ? '\\' + escaped : escaped);
          i++;
        } else if (sql[i] === "'") {
          if (sql[i+1] === "'") { value += "'"; i += 2; }
          else { i++; closed = true; break; }
        } else value += sql[i++];
      }
      if (!closed) return fail('Falta cerrar una comilla simple. El patrón debe ir entre comillas simples.');
      tokens.push({type:'string',value}); continue;
    }
    const word = /^[A-Za-z_][A-Za-z0-9_$#]*/.exec(sql.slice(i));
    if (word) { tokens.push({type:'word',value:word[0]}); i += word[0].length; continue; }
    return fail('Revisa la sintaxis del CHECK. Usa comillas simples (\') para el patrón; escribe solo la restricción mostrada en la plantilla.');
  }
  let cursor = 0;
  const take = (type,value) => {
    const token = tokens[cursor];
    if (!token || token.type !== type || (value && token.value.toUpperCase() !== value)) return null;
    cursor++; return token;
  };
  if (tokens[0]?.value.toUpperCase() === 'CONSTRAINT') {
    cursor++; if (!take('word')) return fail('Después de CONSTRAINT debe ir el nombre de la restricción. También puedes escribir directamente CHECK.');
  }
  if (!take('word','CHECK') || !take('(')) return fail('Empieza con CHECK ( ... ). Dentro irá la condición REGEXP_LIKE.');
  const fn = take('word');
  if (fn?.value.toUpperCase() !== 'REGEXP_LIKE') return fail('El nombre correcto es REGEXP_LIKE, con P. Ejemplo: CHECK (REGEXP_LIKE(codigo, \'patrón\')).');
  if (!take('(')) return fail('Abre un paréntesis después de REGEXP_LIKE.');
  const field = take('word');
  if (field?.value.toLowerCase() !== column) return fail('El primer argumento debe ser ' + column + ', sin comillas: es el nombre de la columna.');
  if (!take(',')) return fail('Separa la columna y el patrón con una coma.');
  const pattern = take('string');
  if (!pattern) return fail('El patrón debe ir entre comillas simples. Consulta el patrón que ya has comprobado.');
  // The exercise's column uses utf8mb4_0900_as_cs, so the default is case-sensitive.
  let flags = '';
  if (take(',')) {
    const option = take('string');
    if (!option || !/^[ci]*$/.test(option.value)) return fail('El tercer argumento es opcional. Para esta práctica basta con la columna y el patrón; elimina la coma final y ese argumento.');
    flags = option.value.lastIndexOf('i') > option.value.lastIndexOf('c') ? 'i' : '';
  }
  if (!take(')') || !take(')')) return fail('Cierra los dos paréntesis: uno de REGEXP_LIKE y otro de CHECK.');
  take(';');
  if (cursor !== tokens.length) return fail('Escribe solo este CHECK (con CONSTRAINT opcional). No añadas otras condiciones ni sentencias.');
  if (!pattern.value.length || pattern.value.length > 120) return fail('El patrón del CHECK debe tener entre 1 y 120 caracteres.');
  return {pattern:pattern.value.replace(/\[\[:digit:\]\]/g,'[0-9]'),flags};
}

self.onmessage = ({data}) => {
  let {pattern,stage,room = 0} = data;
  const challenge = globalThis.GrinbergRooms[room]?.challenges[stage];
  if (typeof pattern !== 'string' || !pattern.length || !challenge || pattern.length > (challenge.kind === 'sql' ? 1200 : 120)) {
    self.postMessage({error:'empty'});
    return;
  }
  let flags = '';
  if (challenge.kind === 'sql') {
    const parsed = readCheck(pattern,challenge.column);
    if (parsed.error) { self.postMessage(parsed); return; }
    pattern = parsed.pattern;
    flags = parsed.flags;
  }
  let regex;
  try { regex = new RegExp(pattern,flags); } catch { self.postMessage({error:'syntax'}); return; }
  const expected = new RegExp(challenge.expected);
  const probes = [...challenge.records,...challenge.probes];
  for (const sample of challenge.records.filter((text) => expected.test(text))) {
    for (const edge of ['X','0',' ','_','.']) probes.push(edge + sample,sample + edge);
  }
  probes.push('A'.repeat(60) + '!');
  const results = probes.map((text) => {
    const match = regex.exec(text);
    return {text, matched:!!match, start:match ? match.index : -1, length:match ? match[0].length : 0, expected:expected.test(text)};
  });
  const failed = results.find((result) => result.matched !== result.expected);
  self.postMessage({rows:results.slice(0,challenge.records.length), passed:!failed, failed:failed || null});
};
self.postMessage({ready:true});
