// ============================================================
// DELIVERYOS - CORE / NOTIFICAÇÕES
// ------------------------------------------------------------
// Orquestra alertas globais do painel a partir dos eventos do
// DeliveryOSRealtime. Não escuta Supabase diretamente.
// ============================================================

(function () {
  "use strict";

  if (window.DeliveryOSNotifications) return;

  const CANAL_ABAS = "deliveryos_core_notifications";
  const STORAGE_EVENT_KEY = "deliveryos_core_notification_event";
  const TITULO_ORIGINAL = document.title;

  let iniciado = false;
  let canal = null;
  let pedidoAtivo = null;
  let intervaloTitulo = null;
  let tituloPiscando = false;

  function paginaAtual() {
    return (window.DeliveryOS?.pagina || location.pathname.split("/").pop() || "admin.html").toLowerCase();
  }

  function estaEmPedidos() {
    return paginaAtual() === "pedidos.html";
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function resumoPedido(pedido) {
    const nome = pedido?.cliente_nome || pedido?.cliente || pedido?.nome_cliente || "Novo pedido";
    const total = formatarMoeda(pedido?.total || 0);
    return `${nome} • ${total}`;
  }

  function publicarAbas(payload) {
    const evento = {
      ...payload,
      timestamp: Date.now(),
      origem: paginaAtual()
    };

    try {
      localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(evento));
    } catch (_) {}

    try {
      if (!canal) canal = new BroadcastChannel(CANAL_ABAS);
      canal.postMessage(evento);
    } catch (_) {}
  }

  function removerToastPedido() {
    document.getElementById("deliveryosPedidoGlobalAlert")?.remove();
  }

  function mostrarToastPedido(pedido) {
    if (estaEmPedidos()) return;

    removerToastPedido();

    const alerta = document.createElement("div");
    alerta.id = "deliveryosPedidoGlobalAlert";
    alerta.className = "deliveryos-pedido-global-alert";
    alerta.innerHTML = `
      <div class="deliveryos-pedido-global-icon">🔔</div>
      <div class="deliveryos-pedido-global-content">
        <strong>Novo pedido recebido</strong>
        <span>${resumoPedido(pedido)}</span>
        <div class="deliveryos-pedido-global-actions">
          <button type="button" id="deliveryosBtnVerPedidoGlobal">Ver pedidos</button>
          <button type="button" id="deliveryosBtnSilenciarPedidoGlobal">Silenciar</button>
        </div>
      </div>
    `;

    document.body.appendChild(alerta);

    alerta.querySelector("#deliveryosBtnVerPedidoGlobal")?.addEventListener("click", () => {
      pararAlertas({ avisarAbas: true });
      window.location.href = "pedidos.html";
    });

    alerta.querySelector("#deliveryosBtnSilenciarPedidoGlobal")?.addEventListener("click", () => {
      pararAlertas({ avisarAbas: true });
    });
  }

  function iniciarPiscarTitulo() {
    if (estaEmPedidos() || intervaloTitulo) return;

    intervaloTitulo = setInterval(() => {
      tituloPiscando = !tituloPiscando;
      document.title = tituloPiscando ? "🔔 Novo pedido!" : TITULO_ORIGINAL;
    }, 900);
  }

  function pararPiscarTitulo() {
    if (intervaloTitulo) {
      clearInterval(intervaloTitulo);
      intervaloTitulo = null;
    }
    tituloPiscando = false;
    document.title = TITULO_ORIGINAL;
  }

  function iniciarAlertas(pedido, { avisarAbas = true } = {}) {
    if (!pedido?.id) return;

    pedidoAtivo = pedido;

    if (estaEmPedidos()) {
      if (avisarAbas) publicarAbas({ tipo: "parar_alerta", pedido_id: pedido.id });
      return;
    }

    mostrarToastPedido(pedido);
    iniciarPiscarTitulo();
    window.DeliveryOSAudio?.startLoop?.();

    if (avisarAbas) {
      publicarAbas({ tipo: "pedido_novo", pedido });
    }
  }

  function pararAlertas({ avisarAbas = false } = {}) {
    window.DeliveryOSAudio?.stopLoop?.();
    removerToastPedido();
    pararPiscarTitulo();

    const pedidoId = pedidoAtivo?.id || null;
    pedidoAtivo = null;

    if (avisarAbas) {
      publicarAbas({ tipo: "parar_alerta", pedido_id: pedidoId });
    }
  }

  function pedidoFoiResolvido(pedido) {
    const status = pedido?.status || "novo";
    return status && status !== "novo";
  }

  function aoPedidoNovo(event) {
    const pedido = event?.detail?.pedido;
    iniciarAlertas(pedido, { avisarAbas: true });
  }

  function aoPedidoAtualizado(event) {
    const pedido = event?.detail?.pedido;
    if (!pedido?.id) return;

    if (pedidoAtivo?.id === pedido.id && pedidoFoiResolvido(pedido)) {
      pararAlertas({ avisarAbas: true });
    }
  }

  function aoMensagemAbas(payload) {
    if (!payload?.tipo) return;

    if (payload.tipo === "pedido_novo") {
      const pedido = payload.pedido;
      if (pedidoAtivo?.id === pedido?.id) return;
      iniciarAlertas(pedido, { avisarAbas: false });
    }

    if (payload.tipo === "parar_alerta") {
      pararAlertas({ avisarAbas: false });
    }
  }

  function configurarComunicacaoAbas() {
    try {
      canal = new BroadcastChannel(CANAL_ABAS);
      canal.onmessage = (event) => aoMensagemAbas(event.data);
    } catch (_) {}

    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_EVENT_KEY || !event.newValue) return;
      try {
        aoMensagemAbas(JSON.parse(event.newValue));
      } catch (_) {}
    });
  }

  function configurarParadaAoAbrirPedidos() {
    if (!estaEmPedidos()) return;

    const parar = () => publicarAbas({ tipo: "parar_alerta", motivo: "pedidos_aberto" });

    parar();
    window.addEventListener("focus", parar);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) parar();
    });
  }

  function start() {
    if (iniciado) return;
    iniciado = true;

    window.DeliveryOSAudio?.init?.();

    configurarComunicacaoAbas();
    configurarParadaAoAbrirPedidos();

    window.addEventListener("deliveryos:pedido-novo", aoPedidoNovo);
    window.addEventListener("deliveryos:pedido-atualizado", aoPedidoAtualizado);

    window.DeliveryOSRealtime?.start?.();
  }

  function stop() {
    pararAlertas({ avisarAbas: false });
    window.removeEventListener("deliveryos:pedido-novo", aoPedidoNovo);
    window.removeEventListener("deliveryos:pedido-atualizado", aoPedidoAtualizado);
    window.DeliveryOSRealtime?.stop?.();
    iniciado = false;
  }

  const Notifications = {
    start,
    stop,
    notifyOrder: iniciarAlertas,
    stopAlerts: pararAlertas,
    isOrderPage: estaEmPedidos
  };

  window.DeliveryOSNotifications = Notifications;

  // Compatibilidade temporária com tentativas antigas.
  window.DeliveryOSNotificacoes = {
    iniciarSomContinuo: () => window.DeliveryOSAudio?.startLoop?.(),
    pararSomContinuo: () => window.DeliveryOSAudio?.stopLoop?.(),
    desbloquearAudio: () => window.DeliveryOSAudio?.unlock?.(),
    start,
    stop
  };

  window.DeliveryOS?.registrarModulo?.("notifications", Notifications);
})();
