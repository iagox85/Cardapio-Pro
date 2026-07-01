// ============================================================
// DELIVERYOS - NOTIFICAÇÕES GLOBAIS DE PEDIDOS
// ------------------------------------------------------------
// - Um único serviço global para alertas de novos pedidos.
// - Funciona em todo o painel: Pedidos, Produtos, Configurações,
//   Categorias, Relatórios etc.
// - Usa Supabase Realtime por loja.
// - Exibe modal de ativação sonora por sessão, necessário por
//   bloqueio de áudio dos navegadores, principalmente no celular.
// - Depois de ativado, toca som contínuo até o pedido ser aceito,
//   cancelado, silenciado ou ter o status alterado.
// ============================================================

(function () {
  if (window.DeliveryOSPedidosNotifier) return;

  const CANAL_ABAS = "deliveryos_pedidos";
  const AUDIO_PERMITIDO_KEY = "deliveryos_audio_pedidos_permitido";
  const AUDIO_SESSAO_KEY = "deliveryos_audio_pedidos_sessao_liberada";
  const PEDIDO_RESOLVIDO_KEY = "deliveryos_pedido_notificacao_resolvida";
  const ULTIMO_PEDIDO_KEY = "deliveryos_ultimo_pedido_notificado";

  let lojaIdAtual = null;
  let canalRealtime = null;
  let canalAbas = null;
  let audioContext = null;
  let intervaloSom = null;
  let intervaloTitulo = null;
  let tituloOriginal = document.title;
  let pedidoAtualId = null;
  let pedidoAtualDados = null;
  let ultimoPedidoNotificado = null;
  let audioLiberadoNaSessao = false;

  function normalizar(valor) {
    return String(valor || "").trim();
  }

  function getPathPagina() {
    return (window.location.pathname || "").split("/").pop() || "admin.html";
  }

  function audioPermitidoPeloUsuario() {
    try {
      return localStorage.getItem(AUDIO_PERMITIDO_KEY) === "sim";
    } catch (error) {
      return false;
    }
  }

  function audioLiberadoNestaSessao() {
    try {
      return sessionStorage.getItem(AUDIO_SESSAO_KEY) === "sim";
    } catch (error) {
      return audioLiberadoNaSessao;
    }
  }

  function marcarAudioLiberado() {
    audioLiberadoNaSessao = true;

    try {
      localStorage.setItem(AUDIO_PERMITIDO_KEY, "sim");
    } catch (error) {
      // ignora
    }

    try {
      sessionStorage.setItem(AUDIO_SESSAO_KEY, "sim");
    } catch (error) {
      // ignora
    }

    removerModalAudio();
    removerAvisoAudioBloqueado();
  }

  function obterAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    return audioContext;
  }

  async function desbloquearAudio() {
    try {
      const ctx = obterAudioContext();
      if (!ctx) return false;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const agora = ctx.currentTime;
      const oscilador = ctx.createOscillator();
      const ganho = ctx.createGain();

      oscilador.type = "sine";
      oscilador.frequency.setValueAtTime(880, agora);
      ganho.gain.setValueAtTime(0.0001, agora);

      oscilador.connect(ganho);
      ganho.connect(ctx.destination);
      oscilador.start(agora);
      oscilador.stop(agora + 0.03);

      marcarAudioLiberado();
      return true;
    } catch (error) {
      console.warn("DeliveryOS: áudio ainda bloqueado pelo navegador.", error);
      mostrarModalAudio();
      return false;
    }
  }

  async function tocarSomPedido() {
    if (!audioLiberadoNestaSessao()) {
      mostrarModalAudio();
      return false;
    }

    try {
      const ctx = obterAudioContext();
      if (!ctx) return false;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      if (ctx.state !== "running") {
        mostrarAvisoAudioBloqueado();
        return false;
      }

      const agora = ctx.currentTime;

      function nota(frequencia, inicio, duracao, volume) {
        const oscilador = ctx.createOscillator();
        const ganho = ctx.createGain();

        oscilador.type = "sine";
        oscilador.frequency.setValueAtTime(frequencia, agora + inicio);

        ganho.gain.setValueAtTime(0.001, agora + inicio);
        ganho.gain.exponentialRampToValueAtTime(volume, agora + inicio + 0.025);
        ganho.gain.exponentialRampToValueAtTime(0.001, agora + inicio + duracao);

        oscilador.connect(ganho);
        ganho.connect(ctx.destination);
        oscilador.start(agora + inicio);
        oscilador.stop(agora + inicio + duracao);
      }

      nota(784, 0.00, 0.24, 0.24);
      nota(1046, 0.17, 0.28, 0.28);
      nota(784, 0.52, 0.24, 0.22);
      nota(1046, 0.69, 0.32, 0.25);

      return true;
    } catch (error) {
      console.warn("DeliveryOS: não foi possível tocar o alerta sonoro.", error);
      mostrarAvisoAudioBloqueado();
      return false;
    }
  }

  async function iniciarSomContinuo() {
    pararSomContinuo();

    const tocou = await tocarSomPedido();

    if (!tocou) {
      mostrarModalAudio();
      return;
    }

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

  function iniciarPiscarTitulo() {
    pararPiscarTitulo();
    let alternar = false;

    intervaloTitulo = setInterval(() => {
      alternar = !alternar;
      document.title = alternar ? "🔔 Novo pedido!" : tituloOriginal;
    }, 850);
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
    return normalizar(pedido?.cliente_nome) || normalizar(pedido?.nome_cliente) || normalizar(pedido?.nome) || "Cliente";
  }

  function totalPedido(pedido) {
    return pedido?.total ?? pedido?.valor_total ?? pedido?.total_pedido ?? 0;
  }

  function pedidoEstaNovo(status) {
    const valor = normalizar(status).toLowerCase();
    return ["", "novo", "novo_pedido", "pendente", "recebido"].includes(valor);
  }

  function pedidoFoiResolvido(pedidoId) {
    try {
      const bruto = localStorage.getItem(PEDIDO_RESOLVIDO_KEY);
      if (!bruto) return false;
      const dados = JSON.parse(bruto);
      return Boolean(dados?.pedido_id && pedidoId && String(dados.pedido_id) === String(pedidoId));
    } catch (error) {
      return false;
    }
  }

  function criarAlertaVisual() {
    let alerta = document.getElementById("deliveryosPedidoGlobalAlert");

    if (alerta) return alerta;

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
      parar(true, pedidoAtualId);
    });

    return alerta;
  }

  function mostrarAlertaVisual(pedido) {
    const alerta = criarAlertaVisual();
    const texto = alerta.querySelector("#deliveryosPedidoGlobalTexto");

    if (texto) {
      texto.textContent = `${nomeCliente(pedido)} • ${formatarMoeda(totalPedido(pedido))}`;
    }

    alerta.classList.remove("oculto");
  }

  function ocultarAlertaVisual() {
    const alerta = document.getElementById("deliveryosPedidoGlobalAlert");
    if (alerta) alerta.classList.add("oculto");
  }

  function mostrarToastPedido(pedido) {
    if (typeof window.showToast === "function") {
      window.showToast(`${nomeCliente(pedido)} • ${formatarMoeda(totalPedido(pedido))}`, "warning", {
        titulo: "Novo pedido recebido",
        duracao: 9000
      });
    }
  }

  function mostrarAvisoAudioBloqueado() {
    if (document.getElementById("deliveryosAudioBloqueadoAviso")) return;

    const aviso = document.createElement("div");
    aviso.id = "deliveryosAudioBloqueadoAviso";
    aviso.className = "deliveryos-audio-bloqueado-aviso";
    aviso.innerHTML = `
      <span>🔔</span>
      <div>
        <strong>Som bloqueado pelo navegador</strong>
        <small>Toque em Ativar alertas para liberar o som dos pedidos.</small>
      </div>
      <button type="button">Ativar</button>
    `;

    aviso.querySelector("button")?.addEventListener("click", async () => {
      const liberou = await desbloquearAudio();
      if (liberou && pedidoAtualDados) iniciarSomContinuo();
    });

    document.body.appendChild(aviso);
  }

  function removerAvisoAudioBloqueado() {
    const aviso = document.getElementById("deliveryosAudioBloqueadoAviso");
    if (aviso) aviso.remove();
  }

  function mostrarModalAudio() {
    if (audioLiberadoNestaSessao()) return;
    if (document.getElementById("deliveryosAudioModal")) return;

    const modal = document.createElement("div");
    modal.id = "deliveryosAudioModal";
    modal.className = "deliveryos-audio-modal-overlay";
    modal.innerHTML = `
      <div class="deliveryos-audio-modal-card">
        <div class="deliveryos-audio-modal-icon">🔔</div>
        <span class="deliveryos-audio-modal-kicker">Alertas de pedidos</span>
        <h2>Ativar notificações sonoras</h2>
        <p>Para o DeliveryOS tocar quando chegar um novo pedido, toque no botão abaixo. O navegador exige essa confirmação uma vez por sessão.</p>
        <button type="button" id="deliveryosBtnAtivarAudioPedidos">Ativar alertas</button>
        <small>Recomendado para computador, tablet e celular usado no balcão.</small>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#deliveryosBtnAtivarAudioPedidos")?.addEventListener("click", async () => {
      const liberou = await desbloquearAudio();
      if (liberou) {
        pedirPermissaoNotificacaoBrowser();
        if (pedidoAtualDados) iniciarSomContinuo();
      }
    });
  }

  function removerModalAudio() {
    const modal = document.getElementById("deliveryosAudioModal");
    if (modal) modal.remove();
  }

  function publicarResolvido(pedidoId = null) {
    const payload = {
      tipo: "pedido_resolvido",
      pedido_id: pedidoId,
      origem: getPathPagina(),
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(PEDIDO_RESOLVIDO_KEY, JSON.stringify(payload));
    } catch (error) {
      // ignora
    }

    try {
      if (canalAbas) canalAbas.postMessage(payload);
    } catch (error) {
      // ignora
    }
  }

  function parar(publicar = false, pedidoId = null) {
    pararSomContinuo();
    pararPiscarTitulo();
    ocultarAlertaVisual();
    removerAvisoAudioBloqueado();

    pedidoAtualId = null;
    pedidoAtualDados = null;

    if (publicar) publicarResolvido(pedidoId);
  }

  function notificarNovoPedido(pedido, origem = "realtime") {
    if (!pedido?.id) return;
    if (!pedidoEstaNovo(pedido.status)) return;
    if (pedidoFoiResolvido(pedido.id)) return;

    const idPedido = String(pedido.id);
    const ultimo = String(ultimoPedidoNotificado || localStorage.getItem(ULTIMO_PEDIDO_KEY) || "");

    if (pedidoAtualId === idPedido && ultimo === idPedido) return;

    pedidoAtualId = idPedido;
    pedidoAtualDados = pedido;
    ultimoPedidoNotificado = idPedido;

    try {
      localStorage.setItem(ULTIMO_PEDIDO_KEY, idPedido);
    } catch (error) {
      // ignora
    }

    mostrarToastPedido(pedido);
    mostrarAlertaVisual(pedido);
    iniciarPiscarTitulo();

    if (!audioLiberadoNestaSessao()) {
      mostrarModalAudio();
    } else {
      iniciarSomContinuo();
    }

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Novo pedido recebido", {
          body: `${nomeCliente(pedido)} • ${formatarMoeda(totalPedido(pedido))}`,
          tag: `deliveryos-pedido-${idPedido}`
        });
      } catch (error) {
        // ignora
      }
    }
  }

  async function carregarLojaDoUsuario() {
    if (!window.supabaseClient) return null;

    const { data: authData, error: erroAuth } = await supabaseClient.auth.getUser();
    const user = authData?.user;

    if (erroAuth || !user) return null;

    const { data: vinculo, error: erroVinculo } = await supabaseClient
      .from("usuarios_loja")
      .select("loja_id")
      .eq("user_id", user.id)
      .single();

    if (erroVinculo || !vinculo?.loja_id) return null;

    lojaIdAtual = vinculo.loja_id;
    return lojaIdAtual;
  }

  async function verificarPedidoPendenteInicial() {
    if (!lojaIdAtual || !window.supabaseClient) return;

    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("*")
      .eq("loja_id", lojaIdAtual)
      .eq("status", "novo")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !Array.isArray(data) || !data.length) return;

    notificarNovoPedido(data[0], "inicial");
  }

  async function iniciarRealtime() {
    const lojaId = await carregarLojaDoUsuario();
    if (!lojaId || !window.supabaseClient) return;

    if (canalRealtime) {
      supabaseClient.removeChannel(canalRealtime);
    }

    canalRealtime = supabaseClient
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
          const novo = payload.new;
          const antigo = payload.old;

          if (payload.eventType === "INSERT") {
            if (!novo || String(novo.loja_id) !== String(lojaIdAtual)) return;
            notificarNovoPedido(novo, "realtime");
            return;
          }

          if (payload.eventType === "UPDATE") {
            if (!novo || String(novo.loja_id) !== String(lojaIdAtual)) return;

            if (pedidoAtualId && String(novo.id) === String(pedidoAtualId) && !pedidoEstaNovo(novo.status)) {
              parar(true, novo.id);
            }
            return;
          }

          if (payload.eventType === "DELETE") {
            if (pedidoAtualId && String(antigo?.id) === String(pedidoAtualId)) {
              parar(true, antigo.id);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("DeliveryOS notificações globais:", status);
      });

    verificarPedidoPendenteInicial();
  }

  function pedirPermissaoNotificacaoBrowser() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;

    try {
      Notification.requestPermission().catch(() => {});
    } catch (error) {
      // ignora
    }
  }

  function configurarComunicacaoEntreAbas() {
    try {
      canalAbas = new BroadcastChannel(CANAL_ABAS);
      canalAbas.onmessage = (event) => {
        if (event?.data?.tipo === "pedido_resolvido") {
          parar(false);
        }
      };
    } catch (error) {
      canalAbas = null;
    }

    window.addEventListener("storage", (event) => {
      if (event.key === PEDIDO_RESOLVIDO_KEY) {
        parar(false);
      }
    });
  }

  function configurarInteracoes() {
    // Caso a sessão já tenha consentimento salvo e o usuário clique em qualquer lugar,
    // tentamos liberar o áudio sem mostrar botão permanente.
    ["pointerdown", "touchstart", "keydown", "click"].forEach((evento) => {
      window.addEventListener(
        evento,
        () => {
          if (audioPermitidoPeloUsuario() && !audioLiberadoNestaSessao()) {
            desbloquearAudio();
          }
        },
        { passive: true }
      );
    });

    window.addEventListener("visibilitychange", () => {
      if (!document.hidden && pedidoAtualDados && pedidoAtualId && audioLiberadoNestaSessao()) {
        tocarSomPedido();
      }
    });
  }

  window.DeliveryOSPedidosNotifier = {
    iniciar: iniciarRealtime,
    parar,
    publicarPedidoResolvido: publicarResolvido,
    notificarNovoPedido,
    desbloquearAudio,
    mostrarAtivacaoAudio: mostrarModalAudio
  };

  document.addEventListener("DOMContentLoaded", () => {
    audioLiberadoNaSessao = audioLiberadoNestaSessao();

    configurarComunicacaoEntreAbas();
    configurarInteracoes();
    iniciarRealtime();

    setTimeout(() => {
      if (!audioLiberadoNestaSessao()) {
        mostrarModalAudio();
      }
    }, 650);
  });
})();
