/*
 * Bootstrap do modo nativo (Capacitor / Android).
 * A página é embutida no APK (contexto seguro), então não há origem do PC:
 * o usuário escaneia o QR do app do PC (ou digita o IP), e conectamos direto
 * no ws:// puro (porta 8445) — o WebView nativo rejeita o WSS self-signed.
 *
 * Expõe:
 *   window.PW_NATIVE_MODE  -> boolean
 *   window.PW_resolveServer() -> Promise<{ ip, wsUrl }>  (mostra a UI de conexão)
 */
(function () {
  const isNative = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function'
    && window.Capacitor.isNativePlatform());
  window.PW_NATIVE_MODE = isNative;
  if (!isNative) return;

  const WS_PLAIN_PORT = 8445;
  const LS_KEY = 'pw_last_ip';

  // Extrai um IPv4 de um texto (aceita "https://192.168.0.5:8443" ou só o IP).
  function parseIP(text) {
    if (!text) return null;
    const m = String(text).match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    return m ? m[1] : null;
  }

  function injectUI() {
    const el = document.createElement('div');
    el.id = 'pw-native-connect';
    el.innerHTML = `
      <style>
        #pw-native-connect{position:fixed;inset:0;z-index:99999;background:#0a0a0f;color:#fff;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          font-family:system-ui,-apple-system,sans-serif;padding:24px;gap:16px;text-align:center}
        #pw-native-connect h1{font-size:20px;margin:0;color:#a78bfa}
        #pw-native-connect p{font-size:13px;color:#9ca3af;margin:0;max-width:320px}
        #pw-scan-wrap{width:100%;max-width:320px;aspect-ratio:1;background:#000;border-radius:16px;
          overflow:hidden;position:relative;display:none;border:2px solid #7c3aed}
        #pw-scan-video{width:100%;height:100%;object-fit:cover}
        #pw-scan-frame{position:absolute;inset:18%;border:3px solid #a78bfa;border-radius:12px;
          box-shadow:0 0 0 9999px rgba(0,0,0,.35)}
        .pw-btn{background:#7c3aed;color:#fff;border:0;border-radius:12px;padding:14px 20px;
          font-size:15px;font-weight:600;width:100%;max-width:320px;cursor:pointer}
        .pw-btn.sec{background:#1f2937}
        #pw-manual{display:flex;gap:8px;width:100%;max-width:320px}
        #pw-ip{flex:1;background:#111827;border:1px solid #374151;color:#fff;border-radius:12px;
          padding:14px;font-size:15px;text-align:center}
        #pw-err{color:#f87171;font-size:12px;min-height:16px}
      </style>
      <h1>📷 Phone Webcam</h1>
      <p>Escaneie o QR Code que aparece no aplicativo do PC, ou digite o IP mostrado nele.</p>
      <div id="pw-scan-wrap"><video id="pw-scan-video" playsinline muted></video><div id="pw-scan-frame"></div></div>
      <button class="pw-btn" id="pw-scan-btn">Escanear QR Code</button>
      <div id="pw-manual">
        <input id="pw-ip" inputmode="decimal" placeholder="192.168.x.x" />
        <button class="pw-btn sec" id="pw-connect-btn" style="width:auto">Conectar</button>
      </div>
      <div id="pw-err"></div>
    `;
    document.body.appendChild(el);
    return el;
  }

  window.PW_resolveServer = function () {
    return new Promise((resolve) => {
      const ui = injectUI();
      const scanWrap = ui.querySelector('#pw-scan-wrap');
      const video = ui.querySelector('#pw-scan-video');
      const scanBtn = ui.querySelector('#pw-scan-btn');
      const ipInput = ui.querySelector('#pw-ip');
      const connectBtn = ui.querySelector('#pw-connect-btn');
      const errEl = ui.querySelector('#pw-err');
      let scanStream = null, scanning = false, rafId = null;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const last = localStorage.getItem(LS_KEY);
      if (last) ipInput.value = last;

      function stopScan() {
        scanning = false;
        if (rafId) cancelAnimationFrame(rafId);
        if (scanStream) { scanStream.getTracks().forEach((t) => t.stop()); scanStream = null; }
        scanWrap.style.display = 'none';
      }

      function finish(ip) {
        if (!ip) { errEl.textContent = 'IP inválido.'; return; }
        localStorage.setItem(LS_KEY, ip);
        stopScan();
        ui.remove();
        resolve({ ip, wsUrl: `ws://${ip}:${WS_PLAIN_PORT}` });
      }

      async function startScan() {
        errEl.textContent = '';
        try {
          scanStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }, audio: false
          });
          video.srcObject = scanStream;
          await video.play();
          scanWrap.style.display = 'block';
          scanning = true;
          tick();
        } catch (e) {
          errEl.textContent = 'Sem acesso à câmera para escanear. Digite o IP.';
        }
      }

      function tick() {
        if (!scanning) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA && window.jsQR) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (code && code.data) {
            const ip = parseIP(code.data);
            if (ip) { finish(ip); return; }
          }
        }
        rafId = requestAnimationFrame(tick);
      }

      scanBtn.addEventListener('click', () => {
        if (scanning) stopScan(); else startScan();
      });
      connectBtn.addEventListener('click', () => finish(parseIP(ipInput.value)));
      ipInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(parseIP(ipInput.value)); });
    });
  };
})();
