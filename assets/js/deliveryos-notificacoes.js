// ============================================================
// DELIVERYOS - NOTIFICAÇÕES GLOBAIS DE PEDIDOS
// ------------------------------------------------------------
// Regras:
// - O áudio é ativado uma única vez por modal.
// - Fora de pedidos.html: notifica visualmente e toca som.
// - Em pedidos.html: não mostra toast global; o som é usado pelo pedidos-admin.js.
// - Ao aceitar/cancelar pedido em pedidos.html, todas as abas param.
// ============================================================

(function () {
  if (window.DeliveryOSNotificacoes && window.DeliveryOSNotificacoes.__ativo) return;

  const paginaAtual = (window.location.pathname || "").split("/").pop().toLowerCase() || "admin.html";
  const estaNaPaginaPedidos = paginaAtual === "pedidos.html";

  const AUDIO_ATIVADO_KEY = "deliveryos_audio_alertas_ativado";
  const PEDIDO_RESOLVIDO_KEY = "deliveryos_pedido_notificacao_resolvida";
  const NOTIFICACAO_BROWSER_KEY = "deliveryos_notificacao_browser_perguntou";

  let lojaIdAtual = null;
  let canalPedidosGlobal = null;
  let audioContext = null;
  let audioLiberadoNestaPagina = false;
  let intervaloSom = null;
  let intervaloTitulo = null;
  let tituloOriginal = document.title;
  let pedidoAtualId = null;
  let ultimoPedidoNotificado = null;
  let broadcastChannel = null;

  function normalizarTexto(valor) {
    return String(valor || "").trim();
  }

  function audioEstaAtivado() {
    try {
      return localStorage.getItem(AUDIO_ATIVADO_KEY) === "sim";
    } catch (error) {
      return false;
    }
  }

  function salvarAudioAtivado() {
    try {
      localStorage.setItem(AUDIO_ATIVADO_KEY, "sim");
    } catch (error) {
      // ignora
    }
  }

  function criarAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    return audioContext;
  }

  async function desbloquearAudio() {
    try {
      const ctx = criarAudioContext();
      if (!ctx) return false;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const oscilador = ctx.createOscillator();
      const ganho = ctx.createGain();

      ganho.gain.setValueAtTime(0.0001, ctx.currentTime);
      oscilador.connect(ganho);
      ganho.connect(ctx.destination);
      oscilador.start();
      oscilador.stop(ctx.currentTime + 0.03);

      audioLiberadoNestaPagina = true;
      salvarAudioAtivado();
      removerModalAtivacaoAudio();
      removerAvisoToqueAudio();
      pedirPermissaoBrowserNotification();
      return true;
    } catch (error) {
      audioLiberadoNestaPagina = false;
      return false;
    }
  }

  function pedirPermissaoBrowserNotification() {
    try {
      if (!("Notification" in window)) return;
      if (Notification.permission !== "default") return;
      if (localStorage.getItem(NOTIFICACAO_BROWSER_KEY) === "sim") return;

      localStorage.setItem(NOTIFICACAO_BROWSER_KEY, "sim");
      Notification.requestPermission().catch(() => {});
    } catch (error) {
      // ignora
    }
  }

  function tocarSomPedido() {
    if (!audioEstaAtivado()) return false;

    try {
      const ctx = criarAudioContext();
      if (!ctx) return false;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const agora = ctx.currentTime;

      function nota(frequencia, inicio, duracao, volume) {
        const oscilador = ctx.createOscillator();
        const ganho = ctx.createGain();

        oscilador.type = "sine";
        oscilador.frequency.setValueAtTime(frequencia, agora + inicio);

        ganho.gain.setValueAtTime(0.001, agora + inicio);
        ganho.gain.exponentialRampToValueAtTime(volume, agora + inicio + 0.03);
        ganho.gain.exponentialRampToValueAtTime(0.001, agora + inicio + duracao);

        oscilador.connect(ganho);
        ganho.connect(ctx.destination);
        oscilador.start(agora + inicio);
        oscilador.stop(agora + inicio + duracao);
      }

      nota(784, 0.00, 0.28, 0.24);
      nota(1046, 0.18, 0.34, 0.26);
      nota(784, 0.58, 0.28, 0.22);
      nota(1046, 0.76, 0.38, 0.24);

      return true;
    } catch (error) {
      return false;
    }
  }

  function iniciarSomContinuo() {
    if (!audioEstaAtivado()) {
      mostrarModalAtivacaoAudio();
      return;
    }

    pararSomContinuo();

    const tocou = tocarSomPedido();
    if (!tocou && !audioLiberadoNestaPagina) {
      mostrarAvisoToqueAudio();
    }

    intervaloSom = setInterval(() => {
      const ok = tocarSomPedido();
      if (!ok && !audioLiberadoNestaPagina) {
        mostrarAvisoToqueAudio();
      }
    }, 2200);
  }

  function pararSomContinuo() {
    if (intervaloSom) {
      clearInterval(intervaloSom);
      intervaloSom = null;
    }
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

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function nomeCliente(pedido) {
    return normalizarTexto(pedido?.cliente_nome) || normalizarTexto(pedido?.nome_cliente) || normalizarTexto(pedido?.nome) || "Cliente";
  }

  function totalPedido(pedido) {
    return pedido?.total ?? pedido?.valor_total ?? pedido?.total_pedido ?? 0;
  }

  function statusNovo(status) {
    const valor = normalizarTexto(status).toLowerCase();
    return valor === "" || valor === "novo" || valor === "novo_pedido" || valor === "pendente" || valor === "recebido";
  }

  function mostrarModalAtivacaoAudio() {
    if (document.getElementById("deliveryosAudioModal")) return;

    const modal = document.createElement("div");
    modal.id = "deliveryosAudioModal";
    modal.className = "deliveryos-audio-modal";
    modal.innerHTML = `
      <div class="deliveryos-audio-modal-card">
        <div class="deliveryos-audio-modal-icon">🔔</div>
        <h2>Ativar notificações sonoras</h2>
        <p>Para avisar quando chegar um novo pedido, o DeliveryOS precisa ativar o som neste navegador.</p>
        <button type="button" id="deliveryosBtnAtivarAudio">Ativar alertas</button>
        <small>Você só precisa fazer isso uma vez neste dispositivo.</small>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#deliveryosBtnAtivarAudio")?.addEventListener("click", async () => {
      const ok = await desbloquearAudio();
      if (!ok && typeof window.showToast === "function") {
        window.showToast("Não foi possível ativar o áudio. Toque novamente na tela e tente de novo.", "error");
      }
    });
  }

  function removerModalAtivacaoAudio() {
    document.getElementById("deliveryosAudioModal")?.remove();
  }

  function mostrarAvisoToqueAudio() {
    if (document.getElementById("deliveryosAudioTapHint")) return;

    const aviso = document.createElement("button");
    aviso.type = "button";
    aviso.id = "deliveryosAudioTapHint";
    aviso.className = "deliveryos-audio-tap-hint";
    aviso.innerHTML = "🔔 Toque aqui para liberar o som dos pedidos";
    document.body.appendChild(aviso);

    aviso.addEventListener("click", desbloquearAudio);
  }

  function removerAvisoToqueAudio() {
    document.getElementById("deliveryosAudioTapHint")?.remove();
  }

  function criarAlertaGlobal() {
    let alerta = document.getElementById("deliveryosPedidoGlobalAlert");
    if (alerta) return alerta;

    alerta = document.createElement("div");
    alerta.id = "deliveryosPedidoGlobalAlert";
    alerta.className = "deliveryos-pedido-global-alert oculto";
    alerta.innerHTML = `
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

    document.body.appendChild(alerta);

    alerta.querySelector("#deliveryosBtnVerPedidoGlobal")?.addEventListener("click", () => {
      pararNotificacao(false);
      window.location.href = "pedidos.html";
    });

    alerta.querySelector("#deliveryosBtnSilenciarPedidoGlobal")?.addEventListener("click", () => {
      pararNotificacao(true, pedidoAtualId);
    });

    return alerta;
  }

  function mostrarAlertaGlobal(pedido) {
    if (estaNaPaginaPedidos) return;

    const alerta = criarAlertaGlobal();
    const texto = alerta.querySelector("#deliveryosPedidoGlobalTexto");

    if (texto) {
      texto.textContent = `${nomeCliente(pedido)} • ${formatarMoeda(totalPedido(pedido))}`;
    }

    alerta.classList.remove("oculto");
  }

  function ocultarAlertaGlobal() {
    document.getElementById("deliveryosPedidoGlobalAlert")?.classList.add("oculto");
  }

  function mostrarToastGlobal(pedido) {
    if (estaNaPaginaPedidos) return;

    if (typeof window.showToast === "function") {
      window.showToast(`${nomeCliente(pedido)} • ${formatarMoeda(totalPedido(pedido))}`, "warning", {
        titulo: "Novo pedido recebido",
        duracao: 9000
      });
    }
  }

  function publicarPedidoResolvido(pedidoId = null) {
    const payload = {
      tipo: "pedido_resolvido",
      pedido_id: pedidoId,
      origem: paginaAtual,
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

  function pararNotificacao(publicar = false, pedidoId = null) {
    pararSomContinuo();
    pararPiscarTitulo();
    ocultarAlertaGlobal();
    pedidoAtualId = null;

    if (publicar) publicarPedidoResolvido(pedidoId);
  }

  function notificarNovoPedido(pedido) {
    if (!pedido?.id) return;
    if (pedido.id === ultimoPedidoNotificado) return;

    ultimoPedidoNotificado = pedido.id;
    pedidoAtualId = pedido.id;

    mostrarToastGlobal(pedido);
    mostrarAlertaGlobal(pedido);
    iniciarPiscarTitulo();
    iniciarSomContinuo();

    if (!estaNaPaginaPedidos && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Novo pedido recebido", {
          body: `${nomeCliente(pedido)} • ${formatarMoeda(totalPedido(pedido))}`,
          tag: `deliveryos-pedido-${pedido.id}`
        });
      } catch (error) {
        // ignora
      }
    }
  }

  async function carregarLojaDoUsuario() {
    if (!window.supabaseClient) return null;

    const { data: { user }, error: erroUsuario } = await supabaseClient.auth.getUser();
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
    // Em pedidos.html, quem controla a fila e o som é pedidos-admin.js.
    // O global fica carregado só para modal/desbloqueio/parada entre abas.
    if (estaNaPaginaPedidos) return;

    const lojaId = await carregarLojaDoUsuario();
    if (!lojaId || !window.supabaseClient) return;

    if (canalPedidosGlobal) {
      supabaseClient.removeChannel(canalPedidosGlobal);
    }

    canalPedidosGlobal = supabaseClient
      .channel(`deliveryos-pedidos-global-${lojaId}-${Date.now()}`)
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
            if (!statusNovo(pedidoNovo.status)) return;
            notificarNovoPedido(pedidoNovo);
            return;
          }

          if (payload.eventType === "UPDATE") {
            if (!pedidoNovo || pedidoNovo.loja_id !== lojaIdAtual) return;
            if (pedidoAtualId && pedidoNovo.id === pedidoAtualId && !statusNovo(pedidoNovo.status)) {
              pararNotificacao(false, pedidoNovo.id);
            }
            return;
          }

          if (payload.eventType === "DELETE") {
            if (pedidoAtualId && pedidoAntigo?.id === pedidoAtualId) {
              pararNotificacao(false, pedidoAntigo.id);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("DeliveryOS notificações globais:", status);
      });
  }

  function configurarSincroniaAbas() {
    window.addEventListener("storage", (event) => {
      if (event.key === PEDIDO_RESOLVIDO_KEY) {
        pararNotificacao(false);
      }
    });

    try {
      broadcastChannel = new BroadcastChannel("deliveryos_pedidos");
      broadcastChannel.onmessage = (event) => {
        if (event?.data?.tipo === "pedido_resolvido") {
          pararNotificacao(false);
        }
      };
    } catch (error) {
      broadcastChannel = null;
    }
  }

  function configurarDesbloqueioPorInteracao() {
    ["pointerdown", "touchstart", "keydown", "click"].forEach((evento) => {
      window.addEventListener(evento, () => {
        if (audioEstaAtivado() && !audioLiberadoNestaPagina) {
          desbloquearAudio();
        }
      }, { passive: true, once: false });
    });
  }

  function inicializar() {
    configurarSincroniaAbas();
    configurarDesbloqueioPorInteracao();

    if (!audioEstaAtivado()) {
      mostrarModalAtivacaoAudio();
    } else {
      // Tenta preparar automaticamente. Se o navegador bloquear, a próxima interação libera.
      desbloquearAudio();
    }

    iniciarRealtimeGlobal();
  }

  window.DeliveryOSNotificacoes = {
    __ativo: true,
    iniciar: iniciarRealtimeGlobal,
    parar: pararNotificacao,
    publicarPedidoResolvido,
    iniciarSomContinuo,
    pararSomContinuo,
    tocarSomPedido,
    desbloquearAudio,
    audioEstaAtivado
  };

  // Compatibilidade com versões anteriores do painel.
  window.DeliveryOSPedidosNotifier = window.DeliveryOSNotificacoes;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializar);
  } else {
    inicializar();
  }
})();
