// Verificação rápida (sem câmera real): quando o celular para de mandar
// imagem, a webcam virtual continua recebendo o último quadro.
// Uso: node scripts/check-vcam-keepalive.js  (só Linux)
const assert = require('assert');
const { EventEmitter } = require('events');
const cp = require('child_process');

let writes = 0;
cp.spawn = () => {
  const p = new EventEmitter();
  p.stdin = Object.assign(new EventEmitter(), { writable: true, write: () => { writes++; }, end() {} });
  p.stderr = new EventEmitter();
  p.kill = () => {};
  return p;
};

const VirtualCamera = require('../src/virtualcam');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const cam = new VirtualCamera();
  const r = await cam.start({ device: '/dev/video-teste' });
  assert.ok(r.success, r.message);

  await cam.sendJpegFrame(Buffer.from('quadro'));
  await sleep(1000); // celular mudo por 1s
  assert.ok(writes >= 6, `esperava o último quadro repetido, veio ${writes} escrita(s)`);

  cam.stop();
  const depois = writes;
  await sleep(400);
  assert.strictEqual(writes, depois, 'continuou escrevendo depois do stop()');
  console.log(`ok: ${depois} escritas com o celular mudo por 1s; parou no stop()`);
})();
