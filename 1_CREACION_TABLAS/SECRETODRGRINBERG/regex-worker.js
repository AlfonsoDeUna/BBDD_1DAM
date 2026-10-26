/* User expressions run in an isolated, disposable reader. */
importScripts('room-data.js?v=4');
self.onmessage = ({data}) => {
  const {pattern,stage,room = 0} = data;
  const challenge = globalThis.GrinbergRooms[room]?.challenges[stage];
  if (typeof pattern !== 'string' || !pattern.length || pattern.length > 120 || !challenge) {
    self.postMessage({error:'empty'});
    return;
  }
  let regex;
  try { regex = new RegExp(pattern); } catch { self.postMessage({error:'syntax'}); return; }
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
