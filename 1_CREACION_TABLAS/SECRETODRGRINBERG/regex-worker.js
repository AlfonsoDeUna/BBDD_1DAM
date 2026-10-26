/* Isolated execution keeps a slow expression from blocking the room controls. */
self.onmessage = ({data}) => {
  const {pattern, stage} = data;
  if (typeof pattern !== 'string' || pattern.length === 0 || pattern.length > 120 || ![0,1].includes(stage)) {
    self.postMessage({error:'empty'});
    return;
  }
  let regex;
  try { regex = new RegExp(pattern); } catch { self.postMessage({error:'syntax'}); return; }
  const visible = stage === 0
    ? ['CANAL_04 / SIN SEÑAL', 'ORIGEN / TRANSMISIÓN 01', 'SENSOR / PUERTA CERRADA', 'CANAL_07 > ORIGEN', 'origen / señal de prueba', 'PAQUETE_ORIGEN_03', 'OR1GEN / DATO CORRUPTO']
    : ['ORIGEN', 'ORIGEN_2', 'FALSO_ORIGEN', 'ORIGEN_COPIA', 'origen', ' ORIGEN', 'ORIGEN '];
  const probes = [...visible, '', 'ORIGE', 'ORIGENN', 'ORIGENORIGEN', 'XORIGEN', 'ORIGENX', 'PRE ORIGEN POST', '_ORIGEN_', 'ORIGEN.', '.ORIGEN', 'ORIGEN/17', '0ORIGEN0', 'ORIGEN-2026', 'Origen', 'RUIDO', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA!'];
  for (const prefix of ['','A','57','[', 'RECIBIDO: ']) {
    for (const suffix of ['','Z','93',']',' / FIN']) probes.push(prefix + 'ORIGEN' + suffix);
  }
  const expected = (text) => stage === 0 ? text.includes('ORIGEN') : text === 'ORIGEN';
  const results = probes.map((text) => {
    const match = regex.exec(text);
    return {text, matched:!!match, start:match ? match.index : -1, length:match ? match[0].length : 0, expected:expected(text)};
  });
  const failed = results.find((result) => result.matched !== result.expected);
  self.postMessage({rows:results.slice(0,visible.length), passed:!failed, failed:failed || null});
};
