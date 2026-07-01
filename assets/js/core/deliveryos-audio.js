// ============================================================
// DELIVERYOS - CORE / AUDIO
// ------------------------------------------------------------
// Responsável por desbloquear, tocar e parar alertas sonoros.
// Não conhece regras de pedido, páginas ou Supabase.
// ============================================================

(function () {
  "use strict";

  if (window.DeliveryOSAudio) return;

  const STORAGE_KEY = "deliveryos_audio_alertas_ativado";
  const SESSION_KEY = "deliveryos_audio_sessao_desbloqueada";

  let audioContext = null;
  let audioLiberadoSessao = false;
  let intervaloSom = null;
  let modalAberto = false;
  let hintElement = null;

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

  async function desbloquear() {
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

      audioLiberadoSessao = true;
      storageSet(STORAGE_KEY, "sim");
      sessionSet(SESSION_KEY, "sim");
      removerModalAtivacao();
      removerHintToque();

      window.dispatchEvent(new CustomEvent("deliveryos:audio-unlocked"));
      return true;
    } catch (error) {
      console.warn("[DeliveryOS Audio] Não foi possível desbloquear o áudio.", error);
      return false;
    }
  }

  function audioAtivado() {
    return storageGet(STORAGE_KEY) === "sim";
  }

  function audioLiberado() {
    return audioLiberadoSessao || sessionGet(SESSION_KEY) === "sim";
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
    if (!audioAtivado()) return false;

    const ctx = obterAudioContext();
    if (!ctx) return false;

    try {
      if (ctx.state === "suspended") {
        const ok = await desbloquear();
        if (!ok) {
          mostrarHintToque();
          return false;
        }
      }

      tocarNota(784, 0.0, 0.28, 0.24);
      tocarNota(1046, 0.18, 0.34, 0.26);
      tocarNota(784, 0.58, 0.28, 0.22);
      tocarNota(1046, 0.76, 0.38, 0.24);
      return true;
    } catch (error) {
      console.warn("[DeliveryOS Audio] Erro ao tocar alerta.", error);
      mostrarHintToque();
      return false;
    }
  }

  function iniciarSomContinuo() {
    if (intervaloSom) return;

    tocarUmaVez();
    intervaloSom = window.setInterval(() => {
      tocarUmaVez();
    }, 2400);
  }

  function pararSomContinuo() {
    if (intervaloSom) {
      clearInterval(intervaloSom);
      intervaloSom = null;
    }
  }

  function removerModalAtivacao() {
    modalAberto = false;
    document.getElementById("deliveryosAudioModal")?.remove();
  }

  function mostrarModalAtivacao() {
    if (audioAtivado() || modalAberto || !document.body) return;

    modalAberto = true;

    const modal = document.createElement("div");
    modal.id = "deliveryosAudioModal";
    modal.className = "deliveryos-audio-modal";
    modal.innerHTML = `
      <div class="deliveryos-audio-modal-card" role="dialog" aria-modal="true" aria-labelledby="deliveryosAudioModalTitle">
        <div class="deliveryos-audio-modal-icon">🔔</div>
        <h2 id="deliveryosAudioModalTitle">Ativar alertas sonoros</h2>
        <p>Para avisar quando chegar um novo pedido, o DeliveryOS precisa liberar o som neste navegador.</p>
        <button type="button" id="deliveryosBtnAtivarAudio">Ativar alertas</button>
        <small>Você só precisa fazer isso uma vez neste navegador.</small>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#deliveryosBtnAtivarAudio")?.addEventListener("click", async () => {
      const ok = await desbloquear();
      if (ok && window.DeliveryOS?.showToast) {
        window.DeliveryOS.showToast("Alertas sonoros ativados.", "success");
      }
    });
  }

  function removerHintToque() {
    hintElement?.remove();
    hintElement = null;
  }

  function mostrarHintToque() {
    if (hintElement || !document.body) return;

    hintElement = document.createElement("button");
    hintElement.type = "button";
    hintElement.className = "deliveryos-audio-tap-hint";
    hintElement.textContent = "🔔 Toque para ativar o som dos pedidos";
    hintElement.addEventListener("click", desbloquear);
    document.body.appendChild(hintElement);
  }

  function inicializar() {
    audioLiberadoSessao = sessionGet(SESSION_KEY) === "sim";

    if (!audioAtivado()) {
      setTimeout(mostrarModalAtivacao, 700);
    }

    ["pointerdown", "keydown", "touchstart", "click"].forEach((evento) => {
      window.addEventListener(
        evento,
        () => {
          if (audioAtivado() && !audioLiberado()) desbloquear();
        },
        { passive: true, once: false }
      );
    });
  }

  const AudioModule = {
    init: inicializar,
    unlock: desbloquear,
    isEnabled: audioAtivado,
    isUnlocked: audioLiberado,
    playOnce: tocarUmaVez,
    startLoop: iniciarSomContinuo,
    stopLoop: pararSomContinuo,
    showActivationModal: mostrarModalAtivacao,
    showTapHint: mostrarHintToque
  };

  window.DeliveryOSAudio = AudioModule;
  window.DeliveryOS?.registrarModulo?.("audio", AudioModule);
})();
