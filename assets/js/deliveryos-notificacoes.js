// ============================================================
// DELIVERYOS - NOTIFICAÇÕES VISUAIS GLOBAIS DE PEDIDOS
// Não toca som fora da página de Pedidos.
// Não cria botão de ativar som fora da página de Pedidos.
// ============================================================

(function () {
  if (window.DeliveryOSPedidosNotifier) return;

  const paginaAtual = (window.location.pathname || "").split("/").pop().toLowerCase();
  const estaNaPaginaPedidos = paginaAtual === "pedidos.html";
  const DELIVERYOS_PEDIDO_RESOLVIDO_KEY = "deliveryos_pedido_notificacao_resolvida";

  let canalPedidosGlobal = null;
  let lojaIdAtual = null;
  let intervaloTitulo = null;
  let tituloOriginal = document.title;
  let ultimoPedidoNotificado = null;
  let broadcastChannel = null;

  function normalizarTexto(valor) {
    return String(valor || "").trim();
  }

  function formatarMoeda(valor) {
    const numero = Number(valor || 0);
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function obterNomeCliente(pedido) {
    return (
      normalizarTexto(pedido?.cliente_nome) ||
      normalizarTexto(pedido?.nome_cliente) ||
      normalizarTexto(pedido?.nome) ||
      "Cliente"
    );
  }

  function obterTotalPedido(pedido) {
    return pedido?.total ?? pedido?.valor_total ?? pedido?.total_pedido ?? 0;
  }

  function iniciarPiscarTitulo() {
    pararPiscarTitulo();

    let alternar = false;
    intervaloTitulo = setInterval(() => {
      alternar = !alternar;
      document.title = alternar ? "🔔 Novo pedido!" : tituloOriginal;
    }, 900);
  }

  function pararPiscarTitulo() {
    if (intervaloTitulo) {
      clearInterval(intervaloTitulo);
      intervaloTitulo = null;
    }

    document.title = tituloOriginal;
  }

  function criarAlertaVisual() {
    let alerta = document.getElementById("deliveryosPedidoGlobalAlert");

    if (!alerta) {
      alerta = document.createElement("div");
      alerta.id = "deliveryosPedidoGlobalAlert";
      alerta.className = "deliveryos-pedido-global-alert oculto";
      alerta.innerHTML = `
        <div class="deliveryos-pedido-global-icon">🔔</div>
        <div class="deliveryos-pedido-global-content">
          <strong>Novo pedido recebido</strong>
          <span id="deliveryosPedidoGlobalTexto">Abra a tela de pedidos para aceitar.</span>
        </div>
        <div class="deliveryos-pedido-global-actions">
          <button type="button" id="deliveryosBtnVerPedidoGlobal">Ver pedidos</button>
          <button type="button" id="deliveryosBtnSilenciarPedidoGlobal" aria-label="Silenciar aviso">Silenciar</button>
        </div>
      `;
      document.body.appendChild(alerta);

      const btnVerPedidos = alerta.querySelector("#deliveryosBtnVerPedidoGlobal");
      const btnSilenciar = alerta.querySelector("#deliveryosBtnSilenciarPedidoGlobal");

      btnVerPedidos?.addEventListener("click", () => {
        pararNotificacaoGlobal(true);
        window.location.href = "pedidos.html";
      });

      btnSilenciar?.addEventListener("click", () => {
        pararNotificacaoGlobal(true);
      });
    }

    return alerta;
  }

  function mostrarAlertaVisual(pedido) {
    const alerta = criarAlertaVisual();
    const texto = alerta.querySelector("#deliveryosPedidoGlobalTexto");
    const cliente = obterNomeCliente(pedido);
    const total = obterTotalPedido(pedido);

    if (texto) {
      texto.textContent = `${cliente} • ${formatarMoeda(total)} • clique em Ver pedidos para aceitar.`;
    }

    alerta.classList.remove("oculto");
  }

  function ocultarAlertaVisual() {
    const alerta = document.getElementById("deliveryosPedidoGlobalAlert");
    if (alerta) alerta.classList.add("oculto");
  }

  function publicarPedidoResolvido() {
    const payload = {
      tipo: "pedido_resolvido",
      origem: paginaAtual || "painel",
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(DELIVERYOS_PEDIDO_RESOLVIDO_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("DeliveryOS: não foi possível publicar evento de pedido resolvido.", error);
    }

    try {
      if (broadcastChannel) broadcastChannel.postMessage(payload);
    } catch (error) {
      console.warn("DeliveryOS: BroadcastChannel indisponível.", error);
    }
  }

  function pararNotificacaoGlobal(publicar = false) {
    pararPiscarTitulo();
    ocultarAlertaVisual();

    if (publicar) publicarPedidoResolvido();
  }

  function mostrarToastPedido(pedido) {
    const cliente = obterNomeCliente(pedido);
    const total = obterTotalPedido(pedido);

    if (typeof window.showToast === "function") {
      window.showToast(`${cliente} • ${formatarMoeda(total)}. Abra a aba Pedidos para aceitar.`, "warning", {
        titulo: "Novo pedido recebido",
        duracao: 9000
      });
    }
  }

  function notificarNovoPedido(pedido) {
    if (!pedido?.id || pedido.id === ultimoPedidoNotificado) return;

    ultimoPedidoNotificado = pedido.id;
    mostrarToastPedido(pedido);
    mostrarAlertaVisual(pedido);
    iniciarPiscarTitulo();

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Novo pedido recebido", {
          body: `${obterNomeCliente(pedido)} • ${formatarMoeda(obterTotalPedido(pedido))}`,
          tag: `deliveryos-pedido-${pedido.id}`
        });
      } catch (error) {
        console.warn("DeliveryOS: notificação do navegador indisponível.", error);
      }
    }
  }

  async function carregarLojaDoUsuario() {
    if (!window.supabaseClient) return null;

    const {
      data: { user },
      error: erroUsuario
    } = await supabaseClient.auth.getUser();

    if (erroUsuario || !user) return null;

    const { data: vinculo, error: erroVinculo } = await supabaseClient
      .from("usuarios_loja")
      .select("loja_id")
      .eq("user_id", user.id)
      .single();

    if (erroVinculo || !vinculo?.loja_id) return null;

    lojaIdAtual = vinculo.loja_id;
    return lojaIdAtual;
  }

  async function iniciarRealtimeGlobal() {
    if (estaNaPaginaPedidos) return;

    const lojaId = await carregarLojaDoUsuario();
    if (!lojaId || !window.supabaseClient) return;

    if (canalPedidosGlobal) {
      supabaseClient.removeChannel(canalPedidosGlobal);
    }

    canalPedidosGlobal = supabaseClient
      .channel(`deliveryos-pedidos-global-visual-${lojaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pedidos",
          filter: `loja_id=eq.${lojaId}`
        },
        (payload) => {
          const pedido = payload.new;
          if (!pedido || pedido.loja_id !== lojaIdAtual) return;
          notificarNovoPedido(pedido);
        }
      )
      .subscribe((status) => {
        console.log("DeliveryOS notificações visuais de pedidos:", status);
      });
  }

  function pedirPermissaoNotificacaoDepoisDeInteracao() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;

    const jaPerguntou = localStorage.getItem("deliveryos_notificacao_browser_perguntou");
    if (jaPerguntou === "sim") return;

    localStorage.setItem("deliveryos_notificacao_browser_perguntou", "sim");
    Notification.requestPermission().catch(() => {});
  }

  function configurarBroadcast() {
    try {
      broadcastChannel = new BroadcastChannel("deliveryos_pedidos");
      broadcastChannel.onmessage = (event) => {
        if (event?.data?.tipo === "pedido_resolvido") {
          pararNotificacaoGlobal(false);
        }
      };
    } catch (error) {
      broadcastChannel = null;
    }
  }

  function configurarEventosGlobais() {
    ["pointerdown", "keydown", "touchstart", "click"].forEach((evento) => {
      window.addEventListener(evento, pedirPermissaoNotificacaoDepoisDeInteracao, { passive: true });
    });

    window.addEventListener("focus", () => {
      pararPiscarTitulo();
    });

    window.addEventListener("storage", (event) => {
      if (event.key === DELIVERYOS_PEDIDO_RESOLVIDO_KEY) {
        pararNotificacaoGlobal(false);
      }
    });
  }

  window.DeliveryOSPedidosNotifier = {
    iniciar: iniciarRealtimeGlobal,
    parar: pararNotificacaoGlobal,
    publicarPedidoResolvido
  };

  document.addEventListener("DOMContentLoaded", () => {
    configurarBroadcast();
    configurarEventosGlobais();
    iniciarRealtimeGlobal();
  });
})();
