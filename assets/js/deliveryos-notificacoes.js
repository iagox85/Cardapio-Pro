// ============================================================
// DELIVERYOS - NOTIFICAÇÕES GLOBAIS DE PEDIDOS
// ------------------------------------------------------------
// - Funciona nas páginas do painel fora de pedidos.html.
// - Não cria botão de som fora da página de Pedidos.
// - Usa a preferência salva pelo botão da tela Pedidos.
// - Toca som nas outras páginas quando chegar pedido novo.
// - Para o alerta/som em todas as abas quando o pedido é aceito.
// ============================================================

(function () {
  if (window.DeliveryOSPedidosNotifier) return;

  const paginaAtual = (window.location.pathname || "").split("/").pop().toLowerCase();
  const estaNaPaginaPedidos = paginaAtual === "pedidos.html";

  const SOM_KEY = "deliveryos_som_pedidos_ativo";
  const PEDIDO_RESOLVIDO_KEY = "deliveryos_pedido_notificacao_resolvida";
  const AUDIO_DESBLOQUEADO_KEY = "deliveryos_audio_pedidos_desbloqueado";

  let canalPedidosGlobal = null;
  let lojaIdAtual = null;
  let intervaloSom = null;
  let intervaloTitulo = null;
  let tituloOriginal = document.title;
  let ultimoPedidoNotificado = null;
  let audioContext = null;
  let audioDesbloqueado = false;
  let broadcastChannel = null;
  let pedidoAtualNotificando = null;

  function normalizarTexto(valor) {
    return String(valor || "").trim();
  }

  function somEstaAtivo() {
    try {
      return localStorage.getItem(SOM_KEY) === "sim";
    } catch (error) {
      return false;
    }
  }

  function marcarAudioDesbloqueado() {
    audioDesbloqueado = true;
    try {
      localStorage.setItem(AUDIO_DESBLOQUEADO_KEY, "sim");
    } catch (error) {
      // ignora
    }
  }

  function tentarDesbloquearAudio() {
    if (!somEstaAtivo()) return false;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;

      if (!audioContext) {
        audioContext = new AudioContextClass();
      }

      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }

      const oscilador = audioContext.createOscillator();
      const ganho = audioContext.createGain();

      ganho.gain.setValueAtTime(0.0001, audioContext.currentTime);
      oscilador.connect(ganho);
      ganho.connect(audioContext.destination);
      oscilador.start();
      oscilador.stop(audioContext.currentTime + 0.02);

      marcarAudioDesbloqueado();
      return true;
    } catch (error) {
      return false;
    }
  }

  function tocarSomPedido() {
    if (!somEstaAtivo()) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContext) {
        audioContext = new AudioContextClass();
      }

      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }

      const agora = audioContext.currentTime;

      function nota(frequencia, inicio, duracao, volume) {
        const oscilador = audioContext.createOscillator();
        const ganho = audioContext.createGain();

        oscilador.type = "sine";
        oscilador.frequency.setValueAtTime(frequencia, agora + inicio);

        ganho.gain.setValueAtTime(0.001, agora + inicio);
        ganho.gain.exponentialRampToValueAtTime(volume, agora + inicio + 0.03);
        ganho.gain.exponentialRampToValueAtTime(0.001, agora + inicio + duracao);

        oscilador.connect(ganho);
        ganho.connect(audioContext.destination);

        oscilador.start(agora + inicio);
        oscilador.stop(agora + inicio + duracao);
      }

      nota(784, 0.00, 0.28, 0.24);
      nota(1046, 0.18, 0.34, 0.26);
      nota(784, 0.58, 0.28, 0.22);
      nota(1046, 0.76, 0.38, 0.24);

      marcarAudioDesbloqueado();
    } catch (error) {
      console.warn("DeliveryOS: não foi possível tocar som global de pedido.", error);
    }
  }

  function iniciarSomContinuo() {
    if (!somEstaAtivo()) return;

    tentarDesbloquearAudio();
    pararSomContinuo();
    tocarSomPedido();

    intervaloSom = setInterval(() => {
      tocarSomPedido();
    }, 2200);
  }

  function pararSomContinuo() {
    if (intervaloSom) {
      clearInterval(intervaloSom);
      intervaloSom = null;
    }
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
          <button type="button" id="deliveryosBtnSilenciarPedidoGlobal">Silenciar</button>
        </div>
      `;
      document.body.appendChild(alerta);

      alerta.querySelector("#deliveryosBtnVerPedidoGlobal")?.addEventListener("click", () => {
        pararNotificacaoGlobal(false);
        window.location.href = "pedidos.html";
      });

      alerta.querySelector("#deliveryosBtnSilenciarPedidoGlobal")?.addEventListener("click", () => {
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

  function mostrarToastPedido(pedido) {
    const cliente = obterNomeCliente(pedido);
    const total = obterTotalPedido(pedido);

    if (typeof window.showToast === "function") {
      window.showToast(`${cliente} • ${formatarMoeda(total)}. Abra Pedidos para aceitar.`, "warning", {
        titulo: "Novo pedido recebido",
        duracao: 9000
      });
    }
  }

  function publicarPedidoResolvido(pedidoId = null) {
    const payload = {
      tipo: "pedido_resolvido",
      pedido_id: pedidoId,
      origem: paginaAtual || "painel",
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(PEDIDO_RESOLVIDO_KEY, JSON.stringify(payload));
    } catch (error) {
      // ignora
    }

    try {
      if (broadcastChannel) broadcastChannel.postMessage(payload);
    } catch (error) {
      // ignora
    }
  }

  function pararNotificacaoGlobal(publicar = false, pedidoId = null) {
    pararSomContinuo();
    pararPiscarTitulo();
    ocultarAlertaVisual();
    pedidoAtualNotificando = null;

    if (publicar) publicarPedidoResolvido(pedidoId);
  }

  function notificarNovoPedido(pedido) {
    if (!pedido?.id || pedido.id === ultimoPedidoNotificado) return;

    ultimoPedidoNotificado = pedido.id;
    pedidoAtualNotificando = pedido.id;

    mostrarToastPedido(pedido);
    mostrarAlertaVisual(pedido);
    iniciarPiscarTitulo();
    iniciarSomContinuo();

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Novo pedido recebido", {
          body: `${obterNomeCliente(pedido)} • ${formatarMoeda(obterTotalPedido(pedido))}`,
          tag: `deliveryos-pedido-${pedido.id}`
        });
      } catch (error) {
        // ignora
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

  function statusAindaNovo(status) {
    const valor = normalizarTexto(status).toLowerCase();
    return valor === "novo" || valor === "novo_pedido" || valor === "pendente" || valor === "recebido" || valor === "";
  }

  async function iniciarRealtimeGlobal() {
    // pedidos.html já tem o próprio som e o próprio realtime.
    if (estaNaPaginaPedidos) return;

    const lojaId = await carregarLojaDoUsuario();
    if (!lojaId || !window.supabaseClient) return;

    if (canalPedidosGlobal) {
      supabaseClient.removeChannel(canalPedidosGlobal);
    }

    canalPedidosGlobal = supabaseClient
      .channel(`deliveryos-pedidos-global-${lojaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `loja_id=eq.${lojaId}`
        },
        (payload) => {
          const pedidoNovo = payload.new;
          const pedidoAntigo = payload.old;

          if (payload.eventType === "INSERT") {
            if (!pedidoNovo || pedidoNovo.loja_id !== lojaIdAtual) return;
            notificarNovoPedido(pedidoNovo);
            return;
          }

          if (payload.eventType === "UPDATE") {
            if (!pedidoNovo || pedidoNovo.loja_id !== lojaIdAtual) return;
            if (pedidoAtualNotificando && pedidoNovo.id === pedidoAtualNotificando && !statusAindaNovo(pedidoNovo.status)) {
              pararNotificacaoGlobal(false, pedidoNovo.id);
            }
            return;
          }

          if (payload.eventType === "DELETE") {
            if (pedidoAtualNotificando && pedidoAntigo?.id === pedidoAtualNotificando) {
              pararNotificacaoGlobal(false, pedidoAntigo.id);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("DeliveryOS notificações globais de pedidos:", status);
      });
  }

  function pedirPermissaoNotificacaoDepoisDeInteracao() {
    if (!somEstaAtivo()) return;

    tentarDesbloquearAudio();

    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;

    const jaPerguntou = localStorage.getItem("deliveryos_notificacao_browser_perguntou");
    if (jaPerguntou === "sim") return;

    localStorage.setItem("deliveryos_notificacao_browser_perguntou", "sim");
    Notification.requestPermission().catch(() => {});
  }

  function configurarEventosGlobais() {
    ["pointerdown", "keydown", "touchstart", "click"].forEach((evento) => {
      window.addEventListener(evento, pedirPermissaoNotificacaoDepoisDeInteracao, { passive: true });
    });

    window.addEventListener("storage", (event) => {
      if (event.key === PEDIDO_RESOLVIDO_KEY) {
        pararNotificacaoGlobal(false);
      }

      if (event.key === SOM_KEY && event.newValue !== "sim") {
        pararSomContinuo();
      }
    });
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
