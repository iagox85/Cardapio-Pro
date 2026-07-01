// ============================================================
// DELIVERYOS - NOTIFICAÇÕES GLOBAIS DE PEDIDOS
// ------------------------------------------------------------
// Comportamento correto:
// - Sem botão de ativar/desativar som.
// - Som sempre ativo por padrão no painel.
// - Funciona em Pedidos, Produtos, Configurações, Relatórios etc.
// - Ao aceitar/cancelar/atualizar o pedido para outro status, para em todas as abas.
// - Mantém um único áudio ativo por pedido para evitar várias abas tocando juntas.
// ============================================================

(function () {
  if (window.DeliveryOSPedidosNotifier) return;

  const paginaAtual = (window.location.pathname || "").split("/").pop().toLowerCase();
  const estaNaPaginaPedidos = paginaAtual === "pedidos.html";

  const CANAL_BROADCAST = "deliveryos_pedidos";
  const PEDIDO_RESOLVIDO_KEY = "deliveryos_pedido_notificacao_resolvida";
  const PEDIDO_ATIVO_KEY = "deliveryos_pedido_notificacao_ativa";
  const AUDIO_DESBLOQUEADO_KEY = "deliveryos_audio_pedidos_desbloqueado";
  const AUDIO_LOCK_KEY = "deliveryos_pedido_audio_lock";

  const TAB_ID = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const TEMPO_LOCK_AUDIO = 4500;
  const TEMPO_PEDIDO_ATIVO = 1000 * 60 * 60;

  let canalPedidosGlobal = null;
  let broadcastChannel = null;
  let lojaIdAtual = null;
  let intervaloSom = null;
  let intervaloTitulo = null;
  let tituloOriginal = document.title;
  let ultimoPedidoNotificado = null;
  let pedidoAtualNotificando = null;
  let audioContext = null;
  let audioDesbloqueado = false;

  function normalizarTexto(valor) {
    return String(valor || "").trim();
  }

  function statusAindaNovo(status) {
    const valor = normalizarTexto(status).toLowerCase();
    return valor === "novo" || valor === "novo_pedido" || valor === "pendente" || valor === "recebido" || valor === "";
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

  function salvarJSON(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch (error) {
      // ignora
    }
  }

  function lerJSON(chave) {
    try {
      const valor = localStorage.getItem(chave);
      return valor ? JSON.parse(valor) : null;
    } catch (error) {
      return null;
    }
  }

  function removerStorage(chave) {
    try {
      localStorage.removeItem(chave);
    } catch (error) {
      // ignora
    }
  }

  function obterAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    return audioContext;
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
    try {
      const ctx = obterAudioContext();
      if (!ctx) return false;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const oscilador = ctx.createOscillator();
      const ganho = ctx.createGain();

      ganho.gain.setValueAtTime(0.0001, ctx.currentTime);
      oscilador.connect(ganho);
      ganho.connect(ctx.destination);
      oscilador.start();
      oscilador.stop(ctx.currentTime + 0.02);

      marcarAudioDesbloqueado();
      return true;
    } catch (error) {
      return false;
    }
  }

  function instalarDesbloqueioAutomatico() {
    const eventos = ["pointerdown", "keydown", "touchstart", "click"];

    const liberar = () => {
      tentarDesbloquearAudio();

      if (pedidoAtualNotificando) {
        iniciarSomContinuo();
      }
    };

    eventos.forEach((evento) => {
      window.addEventListener(evento, liberar, { passive: true });
    });
  }

  function adquirirLockAudio(pedidoId) {
    const agora = Date.now();
    const lockAtual = lerJSON(AUDIO_LOCK_KEY);

    if (
      lockAtual &&
      lockAtual.pedido_id === pedidoId &&
      lockAtual.tab_id !== TAB_ID &&
      Number(lockAtual.expires_at || 0) > agora
    ) {
      return false;
    }

    salvarJSON(AUDIO_LOCK_KEY, {
      pedido_id: pedidoId,
      tab_id: TAB_ID,
      expires_at: agora + TEMPO_LOCK_AUDIO
    });

    return true;
  }

  function liberarLockAudio(pedidoId = null) {
    const lockAtual = lerJSON(AUDIO_LOCK_KEY);
    if (!lockAtual) return;

    if (lockAtual.tab_id === TAB_ID || !pedidoId || lockAtual.pedido_id === pedidoId) {
      removerStorage(AUDIO_LOCK_KEY);
    }
  }

  function tocarSomPedido() {
    if (!pedidoAtualNotificando) return;
    if (!adquirirLockAudio(pedidoAtualNotificando)) return;

    try {
      const ctx = obterAudioContext();
      if (!ctx) return;

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

      marcarAudioDesbloqueado();
    } catch (error) {
      console.warn("DeliveryOS: não foi possível tocar o som de novo pedido.", error);
    }
  }

  function iniciarSomContinuo() {
    pararSomContinuo();
    tentarDesbloquearAudio();
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

    liberarLockAudio(pedidoAtualNotificando);
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

  function mostrarAlertaNaPaginaPedidos(pedido) {
    const alerta = document.getElementById("alertaPedidoNovo");
    if (!alerta) return false;

    alerta.innerHTML = `🔔 Novo pedido recebido de <strong>${obterNomeCliente(pedido)}</strong>. Clique em Aceitar ou Cancelar para parar o som.`;
    alerta.classList.remove("oculto");
    return true;
  }

  function criarAlertaFlutuante() {
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
        window.location.href = "pedidos.html";
      });

      alerta.querySelector("#deliveryosBtnSilenciarPedidoGlobal")?.addEventListener("click", () => {
        pararNotificacaoGlobal(true, pedidoAtualNotificando);
      });
    }

    return alerta;
  }

  function mostrarAlertaVisual(pedido) {
    if (estaNaPaginaPedidos && mostrarAlertaNaPaginaPedidos(pedido)) return;

    const alerta = criarAlertaFlutuante();
    const texto = alerta.querySelector("#deliveryosPedidoGlobalTexto");

    if (texto) {
      texto.textContent = `${obterNomeCliente(pedido)} • ${formatarMoeda(obterTotalPedido(pedido))} • clique em Ver pedidos para aceitar.`;
    }

    alerta.classList.remove("oculto");
  }

  function ocultarAlertaVisual() {
    const alertaFlutuante = document.getElementById("deliveryosPedidoGlobalAlert");
    if (alertaFlutuante) alertaFlutuante.classList.add("oculto");

    const alertaPedidos = document.getElementById("alertaPedidoNovo");
    if (alertaPedidos) alertaPedidos.classList.add("oculto");
  }

  function mostrarToastPedido(pedido) {
    if (typeof window.showToast === "function") {
      window.showToast(`${obterNomeCliente(pedido)} • ${formatarMoeda(obterTotalPedido(pedido))}`, "warning", {
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

    salvarJSON(PEDIDO_RESOLVIDO_KEY, payload);

    try {
      if (broadcastChannel) broadcastChannel.postMessage(payload);
    } catch (error) {
      // ignora
    }
  }

  function salvarPedidoAtivo(pedido) {
    if (!pedido?.id) return;

    salvarJSON(PEDIDO_ATIVO_KEY, {
      pedido_id: pedido.id,
      loja_id: pedido.loja_id || lojaIdAtual,
      cliente: obterNomeCliente(pedido),
      total: obterTotalPedido(pedido),
      criado_em: Date.now()
    });
  }

  function limparPedidoAtivo(pedidoId = null) {
    const ativo = lerJSON(PEDIDO_ATIVO_KEY);
    if (!ativo) return;

    if (!pedidoId || ativo.pedido_id === pedidoId) {
      removerStorage(PEDIDO_ATIVO_KEY);
    }
  }

  function pararNotificacaoGlobal(publicar = false, pedidoId = null) {
    pararSomContinuo();
    pararPiscarTitulo();
    ocultarAlertaVisual();
    limparPedidoAtivo(pedidoId || pedidoAtualNotificando);
    liberarLockAudio(pedidoId || pedidoAtualNotificando);
    pedidoAtualNotificando = null;

    if (publicar) publicarPedidoResolvido(pedidoId);
  }

  function notificarNovoPedido(pedido, forcar = false) {
    if (!pedido?.id) return;
    if (!forcar && pedido.id === ultimoPedidoNotificado) return;
    if (!statusAindaNovo(pedido.status)) return;

    ultimoPedidoNotificado = pedido.id;
    pedidoAtualNotificando = pedido.id;

    salvarPedidoAtivo(pedido);
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

  async function restaurarPedidoAtivoSeExistir() {
    const ativo = lerJSON(PEDIDO_ATIVO_KEY);
    if (!ativo?.pedido_id || ativo.loja_id !== lojaIdAtual) return;

    if (Date.now() - Number(ativo.criado_em || 0) > TEMPO_PEDIDO_ATIVO) {
      limparPedidoAtivo(ativo.pedido_id);
      return;
    }

    const { data: pedido, error } = await supabaseClient
      .from("pedidos")
      .select("*")
      .eq("id", ativo.pedido_id)
      .eq("loja_id", lojaIdAtual)
      .maybeSingle();

    if (error || !pedido || !statusAindaNovo(pedido.status)) {
      pararNotificacaoGlobal(false, ativo.pedido_id);
      return;
    }

    notificarNovoPedido(pedido, true);
  }

  async function iniciarRealtimeGlobal() {
    const lojaId = await carregarLojaDoUsuario();
    if (!lojaId || !window.supabaseClient) return;

    if (canalPedidosGlobal) {
      supabaseClient.removeChannel(canalPedidosGlobal);
    }

    canalPedidosGlobal = supabaseClient
      .channel(`deliveryos-pedidos-notificacoes-${lojaId}`)
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
              pararNotificacaoGlobal(true, pedidoNovo.id);
            }
            return;
          }

          if (payload.eventType === "DELETE") {
            if (pedidoAtualNotificando && pedidoAntigo?.id === pedidoAtualNotificando) {
              pararNotificacaoGlobal(true, pedidoAntigo.id);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("DeliveryOS notificações de pedidos:", status);
      });

    await restaurarPedidoAtivoSeExistir();
  }

  function configurarEventosGlobais() {
    instalarDesbloqueioAutomatico();

    if ("Notification" in window && Notification.permission === "default") {
      window.addEventListener(
        "click",
        () => {
          const jaPerguntou = localStorage.getItem("deliveryos_notificacao_browser_perguntou");
          if (jaPerguntou === "sim") return;

          localStorage.setItem("deliveryos_notificacao_browser_perguntou", "sim");
          Notification.requestPermission().catch(() => {});
        },
        { once: true, passive: true }
      );
    }

    window.addEventListener("storage", (event) => {
      if (event.key === PEDIDO_RESOLVIDO_KEY) {
        const payload = lerJSON(PEDIDO_RESOLVIDO_KEY);
        pararNotificacaoGlobal(false, payload?.pedido_id || null);
      }

      if (event.key === PEDIDO_ATIVO_KEY && event.newValue && !pedidoAtualNotificando) {
        const ativo = lerJSON(PEDIDO_ATIVO_KEY);
        if (ativo?.loja_id === lojaIdAtual) {
          restaurarPedidoAtivoSeExistir();
        }
      }
    });

    window.addEventListener("beforeunload", () => {
      liberarLockAudio(pedidoAtualNotificando);
    });
  }

  function configurarBroadcast() {
    try {
      broadcastChannel = new BroadcastChannel(CANAL_BROADCAST);
      broadcastChannel.onmessage = (event) => {
        if (event?.data?.tipo === "pedido_resolvido") {
          pararNotificacaoGlobal(false, event.data.pedido_id || null);
        }
      };
    } catch (error) {
      broadcastChannel = null;
    }
  }

  window.DeliveryOSPedidosNotifier = {
    iniciar: iniciarRealtimeGlobal,
    parar: pararNotificacaoGlobal,
    publicarPedidoResolvido,
    desbloquearAudio: tentarDesbloquearAudio
  };

  document.addEventListener("DOMContentLoaded", () => {
    try {
      audioDesbloqueado = localStorage.getItem(AUDIO_DESBLOQUEADO_KEY) === "sim";
    } catch (error) {
      audioDesbloqueado = false;
    }

    configurarBroadcast();
    configurarEventosGlobais();
    iniciarRealtimeGlobal();
  });
})();
