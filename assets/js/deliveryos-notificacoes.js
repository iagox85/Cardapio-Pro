// ============================================================
// DELIVERYOS - NOTIFICAÇÕES GLOBAIS DE PEDIDOS
// Versão definitiva/isolada: não interfere nos scripts das páginas.
// ------------------------------------------------------------
// - Carregado no final do HTML.
// - Funciona fora da página Pedidos.
// - Em pedidos.html não exibe toast global.
// - Usa Realtime + polling a cada 4s.
// - Modal libera o áudio conforme regra do navegador.
// - Entrar em pedidos.html para o alerta das outras abas.
// ============================================================

(function () {
  "use strict";

  const VERSION = "20260701-fixdef";
  if (window.DeliveryOSNotificacoes && window.DeliveryOSNotificacoes.__version === VERSION) return;

  const page = (location.pathname.split("/").pop() || "admin.html").toLowerCase();
  const isPedidosPage = page === "pedidos.html";

  const POLL_MS = 4000;
  const SOUND_MS = 2200;

  const KEY_AUDIO = "deliveryos_audio_alertas_ativado";
  const KEY_BASELINE_PREFIX = "deliveryos_notif_fixdef_baseline_";
  const KEY_LAST_ALERT_PREFIX = "deliveryos_notif_fixdef_last_alert_";
  const KEY_STOP_EVENT = "deliveryos_notif_fixdef_stop_event";
  const BC_NAME = "deliveryos_notificacoes_pedidos";

  let lojaId = null;
  let userId = null;
  let realtimeChannel = null;
  let broadcast = null;
  let pollTimer = null;
  let soundTimer = null;
  let titleTimer = null;
  let audioCtx = null;
  let audioUnlockedThisPage = false;
  let activeOrderId = null;
  let originalTitle = document.title;
  let started = false;

  function safe(fn, fallback = null) {
    try { return fn(); } catch (_) { return fallback; }
  }

  function log(...args) {
    console.log("[DeliveryOS Notificações]", ...args);
  }

  function warn(...args) {
    console.warn("[DeliveryOS Notificações]", ...args);
  }

  function getLS(key, fallback = "") {
    return safe(() => localStorage.getItem(key), null) ?? fallback;
  }

  function setLS(key, value) {
    safe(() => localStorage.setItem(key, String(value)));
  }

  function audioEnabled() {
    return getLS(KEY_AUDIO) === "sim";
  }

  function baselineKey() {
    return KEY_BASELINE_PREFIX + (lojaId || "sem_loja");
  }

  function lastAlertKey() {
    return KEY_LAST_ALERT_PREFIX + (lojaId || "sem_loja");
  }

  function isNovoStatus(status) {
    const s = String(status || "").trim().toLowerCase();
    return !s || s === "novo" || s === "pendente" || s === "recebido" || s === "novo_pedido";
  }

  function orderTime(order) {
    const raw = order?.created_at || order?.criado_em || order?.data || order?.updated_at;
    const t = raw ? new Date(raw).getTime() : Date.now();
    return Number.isFinite(t) ? t : Date.now();
  }

  function orderClient(order) {
    return String(order?.cliente_nome || order?.nome_cliente || order?.nome || "Cliente").trim();
  }

  function orderTotal(order) {
    const value = Number(order?.total ?? order?.valor_total ?? order?.total_pedido ?? 0) || 0;
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function getAudioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  }

  async function unlockAudio() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return false;
      if (ctx.state === "suspended") await ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);

      audioUnlockedThisPage = true;
      setLS(KEY_AUDIO, "sim");
      removeAudioModal();
      removeTapHint();
      return true;
    } catch (error) {
      warn("Áudio ainda bloqueado pelo navegador.", error);
      audioUnlockedThisPage = false;
      return false;
    }
  }

  function playBeep() {
    if (!audioEnabled()) {
      showAudioModal();
      return false;
    }

    try {
      const ctx = getAudioContext();
      if (!ctx) return false;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const notes = [
        [784, 0.00, 0.28, 0.24],
        [1046, 0.18, 0.34, 0.26],
        [784, 0.58, 0.28, 0.22],
        [1046, 0.76, 0.38, 0.24]
      ];

      notes.forEach(([freq, start, duration, volume]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.exponentialRampToValueAtTime(volume, now + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration);
      });

      return true;
    } catch (error) {
      warn("Falha ao tocar alerta sonoro.", error);
      showTapHint();
      return false;
    }
  }

  function startSound() {
    stopSound();
    if (!playBeep()) showTapHint();
    soundTimer = setInterval(() => {
      if (!playBeep()) showTapHint();
    }, SOUND_MS);
  }

  function stopSound() {
    if (soundTimer) clearInterval(soundTimer);
    soundTimer = null;
  }

  function startTitleBlink() {
    stopTitleBlink();
    let on = false;
    titleTimer = setInterval(() => {
      on = !on;
      document.title = on ? "🔔 Novo pedido!" : originalTitle;
    }, 900);
  }

  function stopTitleBlink() {
    if (titleTimer) clearInterval(titleTimer);
    titleTimer = null;
    document.title = originalTitle;
  }

  function showAudioModal() {
    if (audioEnabled()) return;
    if (document.getElementById("deliveryosAudioModal")) return;

    const modal = document.createElement("div");
    modal.id = "deliveryosAudioModal";
    modal.className = "deliveryos-audio-modal";
    modal.innerHTML = `
      <div class="deliveryos-audio-modal-card">
        <div class="deliveryos-audio-modal-icon">🔔</div>
        <h2>Ativar notificações sonoras</h2>
        <p>Ative os alertas para o painel tocar quando chegar um novo pedido.</p>
        <button type="button" id="deliveryosBtnAtivarAudio">Ativar alertas</button>
        <small>O navegador exige esse toque para liberar sons.</small>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#deliveryosBtnAtivarAudio")?.addEventListener("click", async () => {
      const ok = await unlockAudio();
      if (ok && typeof window.showToast === "function") {
        window.showToast("Alertas sonoros ativados.", "success");
      }
    });
  }

  function removeAudioModal() {
    document.getElementById("deliveryosAudioModal")?.remove();
  }

  function showTapHint() {
    if (!audioEnabled()) return;
    if (document.getElementById("deliveryosAudioTapHint")) return;

    const hint = document.createElement("button");
    hint.id = "deliveryosAudioTapHint";
    hint.type = "button";
    hint.className = "deliveryos-audio-tap-hint";
    hint.textContent = "🔔 Toque para liberar o som dos pedidos";
    hint.addEventListener("click", unlockAudio);
    document.body.appendChild(hint);
  }

  function removeTapHint() {
    document.getElementById("deliveryosAudioTapHint")?.remove();
  }

  function getAlertEl() {
    let el = document.getElementById("deliveryosPedidoGlobalAlert");
    if (el) return el;

    el = document.createElement("div");
    el.id = "deliveryosPedidoGlobalAlert";
    el.className = "deliveryos-pedido-global-alert oculto";
    el.innerHTML = `
      <div class="deliveryos-pedido-global-icon">🔔</div>
      <div class="deliveryos-pedido-global-content">
        <strong>Novo pedido recebido</strong>
        <span id="deliveryosPedidoGlobalTexto">Abra Pedidos para aceitar.</span>
      </div>
      <div class="deliveryos-pedido-global-actions">
        <button type="button" id="deliveryosBtnVerPedidoGlobal">Ver pedidos</button>
        <button type="button" id="deliveryosBtnSilenciarPedidoGlobal">Silenciar</button>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector("#deliveryosBtnVerPedidoGlobal")?.addEventListener("click", () => {
      publishStop(activeOrderId);
      stopAll(false);
      location.href = "pedidos.html";
    });

    el.querySelector("#deliveryosBtnSilenciarPedidoGlobal")?.addEventListener("click", () => {
      publishStop(activeOrderId);
      stopAll(false);
    });

    return el;
  }

  function showGlobalAlert(order) {
    if (isPedidosPage) return;
    const el = getAlertEl();
    const text = el.querySelector("#deliveryosPedidoGlobalTexto");
    if (text) text.textContent = `${orderClient(order)} • ${orderTotal(order)}`;
    el.classList.remove("oculto");
  }

  function hideGlobalAlert() {
    document.getElementById("deliveryosPedidoGlobalAlert")?.classList.add("oculto");
  }

  function showToast(order) {
    if (isPedidosPage) return;
    if (typeof window.showToast === "function") {
      window.showToast(`${orderClient(order)} • ${orderTotal(order)}`, "warning", {
        titulo: "Novo pedido recebido",
        duracao: 10000
      });
    }
  }

  function publishStop(orderId) {
    const payload = { type: "stop", orderId: orderId || null, page, at: Date.now() };
    setLS(KEY_STOP_EVENT, JSON.stringify(payload));
    safe(() => broadcast && broadcast.postMessage(payload));
  }

  function stopAll(shouldPublish = false, orderId = null) {
    stopSound();
    stopTitleBlink();
    hideGlobalAlert();
    activeOrderId = null;
    if (shouldPublish) publishStop(orderId);
  }

  function notify(order, source = "unknown") {
    if (!order || !order.id || !isNovoStatus(order.status)) return;

    const id = String(order.id);
    if (getLS(lastAlertKey()) === id) return;
    setLS(lastAlertKey(), id);

    activeOrderId = id;
    log("Novo pedido", id, "via", source, "página", page);

    if (isPedidosPage) return;

    showToast(order);
    showGlobalAlert(order);
    startSound();
    startTitleBlink();
  }

  async function waitForSupabase() {
    for (let i = 0; i < 80; i++) {
      if (window.supabaseClient) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  async function loadStore() {
    const ok = await waitForSupabase();
    if (!ok) {
      warn("supabaseClient não encontrado.");
      return null;
    }

    const { data: authData, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !authData?.user?.id) return null;
    userId = authData.user.id;

    let res = await window.supabaseClient
      .from("usuarios_loja")
      .select("loja_id")
      .eq("user_id", userId)
      .maybeSingle();

    if ((!res.data || res.error) && res.error) {
      // fallback para bancos antigos que usaram usuario_id
      const res2 = await window.supabaseClient
        .from("usuarios_loja")
        .select("loja_id")
        .eq("usuario_id", userId)
        .maybeSingle();
      res = res2;
    }

    if (!res.data?.loja_id) {
      warn("Nenhuma loja encontrada para notificação global.", res.error || "");
      return null;
    }

    lojaId = res.data.loja_id;
    return lojaId;
  }

  async function fetchLatestOrders(limit = 8) {
    if (!lojaId || !window.supabaseClient) return [];
    const { data, error } = await window.supabaseClient
      .from("pedidos")
      .select("*")
      .eq("loja_id", lojaId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      warn("Erro ao buscar pedidos para notificações.", error);
      return [];
    }
    return Array.isArray(data) ? data : [];
  }

  async function setInitialBaseline() {
    const orders = await fetchLatestOrders(1);
    const latest = orders[0];
    const current = Number(getLS(baselineKey(), "0")) || 0;
    const latestTime = latest ? orderTime(latest) : Date.now();

    // Nova versão usa chave nova. Na primeira carga, não toca pedidos antigos.
    if (!current) setLS(baselineKey(), String(latestTime));

    // Ao entrar em Pedidos, considera tudo visualizado e para outras abas.
    if (isPedidosPage) {
      setLS(baselineKey(), String(Math.max(current, latestTime)));
      publishStop(null);
    }
  }

  async function checkNewOrders(source = "polling") {
    if (!lojaId) return;
    const baseline = Number(getLS(baselineKey(), "0")) || 0;
    const orders = await fetchLatestOrders(10);

    const newOnes = orders
      .filter((o) => isNovoStatus(o.status))
      .filter((o) => orderTime(o) > baseline)
      .sort((a, b) => orderTime(a) - orderTime(b));

    if (!newOnes.length) return;

    const latest = newOnes[newOnes.length - 1];
    setLS(baselineKey(), String(orderTime(latest)));
    notify(latest, source);
  }

  async function startRealtime() {
    if (!lojaId || !window.supabaseClient) return;

    try {
      if (realtimeChannel) await window.supabaseClient.removeChannel(realtimeChannel);
    } catch (_) {}

    realtimeChannel = window.supabaseClient
      .channel(`deliveryos-global-orders-${lojaId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos", filter: `loja_id=eq.${lojaId}` },
        (payload) => {
          const order = payload.new;
          const old = payload.old;

          if (payload.eventType === "INSERT" && order && isNovoStatus(order.status)) {
            const t = orderTime(order);
            const baseline = Number(getLS(baselineKey(), "0")) || 0;
            if (t > baseline) setLS(baselineKey(), String(t));
            notify(order, "realtime");
            return;
          }

          if (payload.eventType === "UPDATE" && order) {
            if (activeOrderId && String(order.id) === String(activeOrderId) && !isNovoStatus(order.status)) {
              stopAll(false, order.id);
            }
            return;
          }

          if (payload.eventType === "DELETE" && old) {
            if (activeOrderId && String(old.id) === String(activeOrderId)) stopAll(false, old.id);
          }
        }
      )
      .subscribe((status) => log("Realtime:", status));
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => checkNewOrders("polling"), POLL_MS);
  }

  function setupCrossTab() {
    window.addEventListener("storage", (event) => {
      if (event.key === KEY_STOP_EVENT) stopAll(false);
    });

    try {
      broadcast = new BroadcastChannel(BC_NAME);
      broadcast.onmessage = (event) => {
        if (event?.data?.type === "stop") stopAll(false);
      };
    } catch (_) {
      broadcast = null;
    }
  }

  function setupAudioGestures() {
    ["click", "pointerdown", "touchstart", "keydown"].forEach((eventName) => {
      window.addEventListener(eventName, () => {
        if (audioEnabled() && !audioUnlockedThisPage) unlockAudio();
      }, { passive: true });
    });
  }

  async function start() {
    if (started) return;
    started = true;

    setupCrossTab();
    setupAudioGestures();

    if (!audioEnabled()) showAudioModal();

    await loadStore();
    if (!lojaId) return;

    await setInitialBaseline();
    await startRealtime();
    startPolling();

    // Pequena checagem inicial após tudo carregar.
    setTimeout(() => checkNewOrders("startup-check"), 1500);

    log("Serviço iniciado", { page, lojaId, isPedidosPage, version: VERSION });
  }

  window.DeliveryOSNotificacoes = {
    __version: VERSION,
    start,
    iniciar: start,
    checkNewOrders,
    verificarPedidosNovos: checkNewOrders,
    notify,
    notificarPedido: notify,
    stop: stopAll,
    parar: stopAll,
    stopSound,
    pararSomContinuo: stopSound,
    startSound,
    iniciarSomContinuo: startSound,
    unlockAudio,
    desbloquearAudio: unlockAudio,
    audioEnabled,
    audioEstaAtivado: audioEnabled,
    publishStop,
    publicarPedidoResolvido: publishStop
  };

  window.DeliveryOSPedidosNotifier = window.DeliveryOSNotificacoes;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(start, 0));
  } else {
    setTimeout(start, 0);
  }
})();
