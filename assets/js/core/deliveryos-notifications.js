// ============================================================
// DELIVERYOS - CORE / NOTIFICAÇÕES
// ------------------------------------------------------------
// Orquestra notificações globais do painel a partir dos eventos
// emitidos pelo DeliveryOSRealtime.
// ============================================================

(function () {
  "use strict";

  if (window.DeliveryOSNotifications) return;

  const CANAL_ABAS = "deliveryos_notificacoes_painel";
  const STORAGE_EVENT_KEY = "deliveryos_notificacoes_evento";
  const TITULO_ORIGINAL = document.title;

  let iniciado = false;
  let canal = null;
  let pedidoAtivo = null;
  let intervaloTitulo = null;
  let tituloPiscando = false;
  let badgePedidos = null;
  let observerMenu = null;

  function paginaAtual() {
    return (window.DeliveryOS?.pagina || location.pathname.split("/").pop() || "admin.html").toLowerCase();
  }

  function estaEmPedidos() {
    return paginaAtual() === "pedidos.html";
  }

  function idPedido(pedido) {
    return pedido?.id ? String(pedido.id) : null;
  }

  function statusPedido(pedido) {
    return String(pedido?.status || "novo").toLowerCase();
  }

  function pedidoFoiResolvido(pedido) {
    const status = statusPedido(pedido);
    return status && status !== "novo";
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function quantidadeItens(pedido) {
    const itens = Array.isArray(pedido?.itens) ? pedido.itens : [];
    return itens.reduce((total, item) => total + Number(item?.quantidade || 1), 0);
  }

  function tipoRecebimento(pedido) {
    const tipo = String(pedido?.tipo_recebimento || pedido?.tipo_entrega || "delivery").toLowerCase();
    return tipo === "retirada" ? "Retirada" : "Entrega";
  }

  function resumoPedido(pedido) {
    const nome = pedido?.cliente_nome || pedido?.cliente || pedido?.nome_cliente || "Novo pedido";
    return `${nome} • ${formatarMoeda(pedido?.total || 0)}`;
  }

  function detalhesPedido(pedido) {
    const qtd = quantidadeItens(pedido);
    const itensTexto = qtd === 1 ? "1 item" : `${qtd || 0} itens`;
    return `${itensTexto} • ${tipoRecebimento(pedido)}`;
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
    alerta.className = "deliveryos-pedido-global-alert deliveryos-pedido-global-alert--compacto";
    alerta.innerHTML = `
      <div class="deliveryos-pedido-global-barra" aria-hidden="true"></div>
      <div class="deliveryos-pedido-global-icon" aria-hidden="true">🔔</div>
      <div class="deliveryos-pedido-global-content">
        <small>Novo pedido</small>
        <strong>${resumoPedido(pedido)}</strong>
        <span>${detalhesPedido(pedido)}</span>
        <div class="deliveryos-pedido-global-actions">
          <button type="button" id="deliveryosBtnVerPedidoGlobal">Ver pedido</button>
          <button type="button" id="deliveryosBtnSilenciarPedidoGlobal">Silenciar</button>
        </div>
      </div>
      <button type="button" class="deliveryos-pedido-global-fechar" id="deliveryosBtnFecharPedidoGlobal" aria-label="Silenciar notificação">×</button>
    `;

    document.body.appendChild(alerta);

    alerta.querySelector("#deliveryosBtnVerPedidoGlobal")?.addEventListener("click", () => {
      pararAlertas({ avisarAbas: true });
      window.location.href = "pedidos.html";
    });

    alerta.querySelector("#deliveryosBtnSilenciarPedidoGlobal")?.addEventListener("click", () => {
      pararAlertas({ avisarAbas: true });
    });

    alerta.querySelector("#deliveryosBtnFecharPedidoGlobal")?.addEventListener("click", () => {
      pararAlertas({ avisarAbas: true });
    });
  }

  function encontrarLinkPedidos() {
    return document.querySelector('.sidebar a[href="pedidos.html"], #sidebar a[href="pedidos.html"], nav a[href="pedidos.html"]');
  }

  function aplicarBadgeMenu() {
    const link = encontrarLinkPedidos();
    if (!link) return false;

    link.classList.add("deliveryos-menu-pedidos-alerta");

    badgePedidos = link.querySelector(".deliveryos-menu-pedidos-badge");
    if (!badgePedidos) {
      badgePedidos = document.createElement("span");
      badgePedidos.className = "deliveryos-menu-pedidos-badge";
      link.appendChild(badgePedidos);
    }

    badgePedidos.textContent = "1";
    badgePedidos.setAttribute("aria-label", "1 pedido novo");
    return true;
  }

  function iniciarBadgeMenu() {
    if (estaEmPedidos()) return;
    if (aplicarBadgeMenu()) return;

    if (observerMenu) return;

    observerMenu = new MutationObserver(() => {
      if (aplicarBadgeMenu()) {
        observerMenu.disconnect();
        observerMenu = null;
      }
    });

    observerMenu.observe(document.body, { childList: true, subtree: true });
  }

  function pararBadgeMenu() {
    if (observerMenu) {
      observerMenu.disconnect();
      observerMenu = null;
    }

    document.querySelectorAll(".deliveryos-menu-pedidos-alerta").forEach((link) => {
      link.classList.remove("deliveryos-menu-pedidos-alerta");
      link.querySelector(".deliveryos-menu-pedidos-badge")?.remove();
    });

    badgePedidos = null;
  }

  function iniciarTituloPiscando() {
    if (intervaloTitulo || estaEmPedidos()) return;

    intervaloTitulo = setInterval(() => {
      tituloPiscando = !tituloPiscando;
      document.title = tituloPiscando ? "🔴 Novo pedido!" : TITULO_ORIGINAL;
    }, 900);
  }

  function pararTituloPiscando() {
    if (intervaloTitulo) {
      clearInterval(intervaloTitulo);
      intervaloTitulo = null;
    }

    tituloPiscando = false;
    document.title = TITULO_ORIGINAL;
  }

  function iniciarAlertas(pedido, { avisarAbas = true, origemAbas = false } = {}) {
    const id = idPedido(pedido);
    if (!id) return;

    pedidoAtivo = pedido;

    if (estaEmPedidos()) {
      window.DeliveryOSAudio?.startLoop?.();
    } else {
      mostrarToastPedido(pedido);
      iniciarTituloPiscando();
      iniciarBadgeMenu();
      window.DeliveryOSAudio?.startLoop?.();
    }

    if (avisarAbas && !origemAbas) {
      publicarAbas({ tipo: "pedido_novo", pedido });
    }
  }

  function pararAlertas({ avisarAbas = false } = {}) {
    window.DeliveryOSAudio?.stopLoop?.();
    removerToastPedido();
    pararTituloPiscando();
    pararBadgeMenu();

    const pedidoId = pedidoAtivo?.id || null;
    pedidoAtivo = null;

    if (avisarAbas) {
      publicarAbas({ tipo: "parar_alerta", pedido_id: pedidoId });
    }
  }

  function aoPedidoNovo(event) {
    const pedido = event?.detail?.pedido;
    iniciarAlertas(pedido, { avisarAbas: true });
  }

  function aoPedidoAtualizado(event) {
    const pedido = event?.detail?.pedido;
    if (!pedido?.id) return;

    if (pedidoAtivo?.id && String(pedidoAtivo.id) === String(pedido.id) && pedidoFoiResolvido(pedido)) {
      pararAlertas({ avisarAbas: true });
    }
  }

  function aoPedidoRemovido(event) {
    const pedido = event?.detail?.pedido;
    if (!pedido?.id) return;

    if (pedidoAtivo?.id && String(pedidoAtivo.id) === String(pedido.id)) {
      pararAlertas({ avisarAbas: true });
    }
  }

  function aoMensagemAbas(payload) {
    if (!payload?.tipo) return;

    if (payload.tipo === "pedido_novo") {
      const pedido = payload.pedido;
      if (!pedido?.id) return;
      if (pedidoAtivo?.id && String(pedidoAtivo.id) === String(pedido.id)) return;
      iniciarAlertas(pedido, { avisarAbas: false, origemAbas: true });
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

  function configurarParadaAoEntrarEmPedidos() {
    if (!estaEmPedidos()) return;

    // Ao abrir a página de pedidos, qualquer alerta vindo de outra página para.
    publicarAbas({ tipo: "parar_alerta", motivo: "pedidos_aberto" });
  }

  async function start() {
    if (iniciado) return;
    iniciado = true;

    configurarComunicacaoAbas();
    configurarParadaAoEntrarEmPedidos();

    window.addEventListener("deliveryos:pedido-novo", aoPedidoNovo);
    window.addEventListener("deliveryos:pedido-atualizado", aoPedidoAtualizado);
    window.addEventListener("deliveryos:pedido-removido", aoPedidoRemovido);

  }

  function stop() {
    pararAlertas({ avisarAbas: false });

    window.removeEventListener("deliveryos:pedido-novo", aoPedidoNovo);
    window.removeEventListener("deliveryos:pedido-atualizado", aoPedidoAtualizado);
    window.removeEventListener("deliveryos:pedido-removido", aoPedidoRemovido);

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
  window.DeliveryOS?.registrarModulo?.("notifications", Notifications);
})();
