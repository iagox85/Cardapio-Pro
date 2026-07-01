// ============================================================
// DELIVERYOS - CORE / AUDIO
// ------------------------------------------------------------
// Responsável por liberar, tocar e parar o som global do painel.
// Não conhece Supabase, pedidos ou páginas.
// ============================================================

(function () {
  "use strict";

  if (window.DeliveryOSAudio) return;

  const STORAGE_KEY = "deliveryos_audio_alertas_ativado";
  const SESSION_KEY = "deliveryos_audio_sessao_liberada";

  let audioContext = null;
  let intervaloSom = null;
  let modalAberto = false;
  let hintAberto = false;

  function storageGet(key, fallback = null) {
    if (window.DeliveryOSStorage?.get) return window.DeliveryOSStorage.get(key, fallback);
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    if (window.DeliveryOSStorage?.set) return window.DeliveryOSStorage.set(key, value);
    try {
      localStorage.setItem(key, String(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function sessionGet(key, fallback = null) {
    if (window.DeliveryOSStorage?.session?.get) return window.DeliveryOSStorage.session.get(key, fallback);
    try {
      return sessionStorage.getItem(key) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function sessionSet(key, value) {
    if (window.DeliveryOSStorage?.session?.set) return window.DeliveryOSStorage.session.set(key, value);
    try {
      sessionStorage.setItem(key, String(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function obterAudioContext() {
    if (audioContext) return audioContext;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    audioContext = new AudioContextClass();
    return audioContext;
  }

  function estaAtivado() {
    return storageGet(STORAGE_KEY) === "sim";
  }

  function estaLiberadoNaSessao() {
    return sessionGet(SESSION_KEY) === "sim";
  }

  function removerModal() {
    modalAberto = false;
    document.getElementById("deliveryosAudioModal")?.remove();
  }

  function removerHint() {
    hintAberto = false;
    document.getElementById("deliveryosAudioHint")?.remove();
  }

  async function liberarAudio() {
    const ctx = obterAudioContext();
    if (!ctx) return false;

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const oscilador = ctx.createOscillator();
      const ganho = ctx.createGain();

      ganho.gain.setValueAtTime(0.0001, ctx.currentTime);
      oscilador.frequency.setValueAtTime(440, ctx.currentTime);
      oscilador.connect(ganho);
      ganho.connect(ctx.destination);
      oscilador.start();
      oscilador.stop(ctx.currentTime + 0.03);

      storageSet(STORAGE_KEY, "sim");
      sessionSet(SESSION_KEY, "sim");
      removerModal();
      removerHint();

      window.dispatchEvent(new CustomEvent("deliveryos:audio-liberado"));
      return true;
    } catch (error) {
      console.warn("[DeliveryOS Audio] Não foi possível liberar áudio.", error);
      return false;
    }
  }

  function mostrarModalAtivacao() {
    if (estaAtivado() || modalAberto || !document.body) return;

    modalAberto = true;

    const modal = document.createElement("div");
    modal.id = "deliveryosAudioModal";
    modal.className = "deliveryos-audio-modal";
    modal.innerHTML = `
      <div class="deliveryos-audio-modal-card" role="dialog" aria-modal="true" aria-labelledby="deliveryosAudioTitle">
        <div class="deliveryos-audio-modal-icon">🔔</div>
        <h2 id="deliveryosAudioTitle">Ativar alertas sonoros</h2>
        <p>Para avisar quando chegar um novo pedido, o DeliveryOS precisa liberar o áudio neste navegador.</p>
        <button type="button" id="deliveryosBtnLiberarAudio">Ativar alertas</button>
        <small>Isso aparece apenas uma vez neste navegador.</small>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#deliveryosBtnLiberarAudio")?.addEventListener("click", async () => {
      const ok = await liberarAudio();
      if (ok) {
        window.DeliveryOS?.showToast?.("Alertas sonoros ativados.", "success");
      } else {
        window.DeliveryOS?.showToast?.("Não foi possível ativar o som neste navegador.", "warning");
      }
    });
  }

  function mostrarHintToque() {
    if (hintAberto || !document.body || estaLiberadoNaSessao()) return;

    hintAberto = true;

    const hint = document.createElement("button");
    hint.id = "deliveryosAudioHint";
    hint.className = "deliveryos-audio-tap-hint";
    hint.type = "button";
    hint.textContent = "🔔 Toque para ativar o som dos pedidos";

    hint.addEventListener("click", liberarAudio);
    document.body.appendChild(hint);
  }

  function tocarNota(frequencia, inicio, duracao, volume = 0.2) {
    const ctx = obterAudioContext();
    if (!ctx) return false;

    const oscilador = ctx.createOscillator();
    const ganho = ctx.createGain();

    oscilador.type = "sine";
    oscilador.frequency.setValueAtTime(frequencia, ctx.currentTime + inicio);

    ganho.gain.setValueAtTime(0.001, ctx.currentTime + inicio);
    ganho.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + inicio + 0.03);
    ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao);

    oscilador.connect(ganho);
    ganho.connect(ctx.destination);

    oscilador.start(ctx.currentTime + inicio);
    oscilador.stop(ctx.currentTime + inicio + duracao);
    return true;
  }

  async function tocarUmaVez() {
    if (!estaAtivado()) {
      mostrarModalAtivacao();
      return false;
    }

    const ctx = obterAudioContext();
    if (!ctx) return false;

    try {
      if (ctx.state === "suspended") {
        const ok = await liberarAudio();
        if (!ok) {
          mostrarHintToque();
          return false;
        }
      }

      tocarNota(784, 0.0, 0.26, 0.22);
      tocarNota(1046, 0.18, 0.34, 0.25);
      tocarNota(784, 0.58, 0.26, 0.2);
      tocarNota(1046, 0.76, 0.38, 0.24);
      return true;
    } catch (error) {
      console.warn("[DeliveryOS Audio] Erro ao tocar alerta.", error);
      mostrarHintToque();
      return false;
    }
  }

  function iniciarLoop() {
    if (intervaloSom) return;

    tocarUmaVez();
    intervaloSom = window.setInterval(() => {
      tocarUmaVez();
    }, 2400);
  }

  function pararLoop() {
    if (!intervaloSom) return;
    clearInterval(intervaloSom);
    intervaloSom = null;
  }

  function init() {
    if (!document.body) return;
    if (!estaAtivado()) mostrarModalAtivacao();
  }

  const Audio = {
    init,
    unlock: liberarAudio,
    startLoop: iniciarLoop,
    stopLoop: pararLoop,
    playOnce: tocarUmaVez,
    isEnabled: estaAtivado,
    isUnlocked: estaLiberadoNaSessao
  };

  window.DeliveryOSAudio = Audio;
  window.DeliveryOS?.registrarModulo?.("audio", Audio);
})();
