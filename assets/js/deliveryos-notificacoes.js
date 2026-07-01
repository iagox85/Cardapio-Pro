(function () {
  if (window.DeliveryOSPedidosNotifier) return;

  const paginaAtual = (window.location.pathname || "").split("/").pop().toLowerCase();
  const estaNaPaginaPedidos = paginaAtual === "pedidos.html";

  const DELIVERYOS_SOM_PEDIDOS_KEY = "deliveryos_som_pedidos_ativo";
  const DELIVERYOS_AUDIO_DESBLOQUEADO_KEY = "deliveryos_audio_pedidos_desbloqueado";

  let canalPedidosGlobal = null;
  let lojaIdAtual = null;
  let audioDesbloqueado = false;
  let intervaloSom = null;
  let intervaloTitulo = null;
  let tituloOriginal = document.title;
  let ultimoPedidoNotificado = null;

  function somGlobalAtivo() {
    try {
      return localStorage.getItem(DELIVERYOS_SOM_PEDIDOS_KEY) === "sim";
    } catch (error) {
      return false;
    }
  }

  function salvarSomGlobalAtivo(ativo) {
    try {
      localStorage.setItem(DELIVERYOS_SOM_PEDIDOS_KEY, ativo ? "sim" : "nao");
    } catch (error) {
      console.warn("DeliveryOS: não foi possível salvar a preferência de som.", error);
    }
  }

  function salvarAudioDesbloqueado() {
    try {
      localStorage.setItem(DELIVERYOS_AUDIO_DESBLOQUEADO_KEY, "sim");
    } catch (error) {
      console.warn("DeliveryOS: não foi possível salvar o desbloqueio de áudio.", error);
    }
  }

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

  function atualizarBotaoSomGlobal() {
    const btn = document.getElementById("deliveryosBtnSomGlobal");
    if (!btn) return;

    if (somGlobalAtivo()) {
      btn.innerText = audioDesbloqueado ? "🔔 Som ativado" : "🔔 Ativar som nesta tela";
      btn.classList.add("som-ativo");
      btn.title = audioDesbloqueado
        ? "O som de novos pedidos está ativo."
        : "Clique uma vez nesta tela para liberar o som do navegador.";
    } else {
      btn.innerText = "🔕 Ativar som";
      btn.classList.remove("som-ativo");
      btn.title = "Ativar som de novos pedidos neste navegador.";
    }
  }

  function criarBotaoSomGlobal() {
    if (estaNaPaginaPedidos) return;
    if (document.getElementById("deliveryosBtnSomGlobal")) return;

    const btn = document.createElement("button");
    btn.id = "deliveryosBtnSomGlobal";
    btn.type = "button";
    btn.className = "deliveryos-som-global-btn";
    btn.addEventListener("click", () => {
      salvarSomGlobalAtivo(true);
      desbloquearAudio(true);
      atualizarBotaoSomGlobal();

      if (typeof window.showToast === "function") {
        window.showToast("Som de novos pedidos ativado nesta tela.", "success");
      }
    });

    document.body.appendChild(btn);
    atualizarBotaoSomGlobal();
  }

  function desbloquearAudio(teste = false) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;

      const audioContext = new AudioContextClass();
      const oscilador = audioContext.createOscillator();
      const ganho = audioContext.createGain();

      ganho.gain.setValueAtTime(0.0001, audioContext.currentTime);
      oscilador.connect(ganho);
      ganho.connect(audioContext.destination);
      oscilador.start();
      oscilador.stop(audioContext.currentTime + 0.02);

      audioDesbloqueado = true;
      salvarAudioDesbloqueado();
      atualizarBotaoSomGlobal();

      if (teste) tocarSomNovoPedido(true);
      return true;
    } catch (error) {
      audioDesbloqueado = false;
      atualizarBotaoSomGlobal();
      return false;
    }
  }

  function tocarSomNovoPedido(teste = false) {
    if (!teste && !somGlobalAtivo()) return;
    if (!teste && !audioDesbloqueado) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();

      const tocarNota = (frequencia, inicio, duracao, volume = 0.18) => {
        const oscilador = audioContext.createOscillator();
        const ganho = audioContext.createGain();

        oscilador.type = "sine";
        oscilador.frequency.setValueAtTime(frequencia, audioContext.currentTime + inicio);

        ganho.gain.setValueAtTime(0.001, audioContext.currentTime + inicio);
        ganho.gain.exponentialRampToValueAtTime(volume, audioContext.currentTime + inicio + 0.03);
        ganho.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + inicio + duracao);

        oscilador.connect(ganho);
        ganho.connect(audioContext.destination);

        oscilador.start(audioContext.currentTime + inicio);
        oscilador.stop(audioContext.currentTime + inicio + duracao);
      };

      tocarNota(784, 0.00, 0.25, 0.20);
      tocarNota(1046, 0.18, 0.32, 0.22);
      tocarNota(784, 0.58, 0.25, 0.18);
      tocarNota(1046, 0.76, 0.34, 0.20);
    } catch (error) {
      console.warn("DeliveryOS: não foi possível tocar o som do pedido.", error);
    }
  }

  function iniciarSomContinuo() {
    pararSomContinuo();

    if (!somGlobalAtivo()) return;

    if (!audioDesbloqueado) {
      criarAvisoLiberarSom();
      return;
    }

    tocarSomNovoPedido();
    intervaloSom = setInterval(() => {
      tocarSomNovoPedido();
    }, 2300);
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
          <button type="button" id="deliveryosBtnLiberarSomGlobal">Ativar som</button>
          <button type="button" id="deliveryosBtnSilenciarPedidoGlobal" aria-label="Silenciar aviso">Silenciar</button>
        </div>
      `;
      document.body.appendChild(alerta);

      const btnVerPedidos = alerta.querySelector("#deliveryosBtnVerPedidoGlobal");
      const btnLiberarSom = alerta.querySelector("#deliveryosBtnLiberarSomGlobal");
      const btnSilenciar = alerta.querySelector("#deliveryosBtnSilenciarPedidoGlobal");

      btnVerPedidos?.addEventListener("click", () => {
        pararNotificacaoGlobal();
        window.location.href = "pedidos.html";
      });

      btnLiberarSom?.addEventListener("click", () => {
        salvarSomGlobalAtivo(true);
        desbloquearAudio(true);
        iniciarSomContinuo();
        atualizarBotaoSomGlobal();
      });

      btnSilenciar?.addEventListener("click", () => {
        pararNotificacaoGlobal();
      });
    }

    return alerta;
  }

  function criarAvisoLiberarSom() {
    const alerta = criarAlertaVisual();
    const btnLiberarSom = alerta.querySelector("#deliveryosBtnLiberarSomGlobal");
    if (btnLiberarSom) btnLiberarSom.style.display = "inline-flex";
  }

  function mostrarAlertaVisual(pedido) {
    const alerta = criarAlertaVisual();
    const texto = alerta.querySelector("#deliveryosPedidoGlobalTexto");
    const btnLiberarSom = alerta.querySelector("#deliveryosBtnLiberarSomGlobal");
    const cliente = obterNomeCliente(pedido);
    const total = obterTotalPedido(pedido);

    if (texto) {
      texto.textContent = `${cliente} • ${formatarMoeda(total)} • clique em Ver pedidos para aceitar.`;
    }

    if (btnLiberarSom) {
      btnLiberarSom.style.display = somGlobalAtivo() && !audioDesbloqueado ? "inline-flex" : "none";
    }

    alerta.classList.remove("oculto");
  }

  function ocultarAlertaVisual() {
    const alerta = document.getElementById("deliveryosPedidoGlobalAlert");
    if (alerta) alerta.classList.add("oculto");
  }

  function pararNotificacaoGlobal() {
    pararSomContinuo();
    pararPiscarTitulo();
    ocultarAlertaVisual();
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
    iniciarSomContinuo();

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
      .channel(`deliveryos-pedidos-global-${lojaId}`)
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
        console.log("DeliveryOS notificações de pedidos:", status);
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

  function configurarEventosGlobais() {
    ["pointerdown", "keydown", "touchstart"].forEach((evento) => {
      window.addEventListener(
        evento,
        () => {
          if (somGlobalAtivo()) desbloquearAudio(false);
          pedirPermissaoNotificacaoDepoisDeInteracao();
        },
        { passive: true }
      );
    });

    window.addEventListener("focus", () => {
      if (!intervaloSom) pararPiscarTitulo();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !intervaloSom) {
        pararPiscarTitulo();
      }
    });

    window.addEventListener("storage", (event) => {
      if (event.key === DELIVERYOS_SOM_PEDIDOS_KEY) atualizarBotaoSomGlobal();
    });
  }

  window.DeliveryOSPedidosNotifier = {
    iniciar: iniciarRealtimeGlobal,
    parar: pararNotificacaoGlobal,
    desbloquearAudio,
    ativarSom: () => {
      salvarSomGlobalAtivo(true);
      desbloquearAudio(true);
    },
    desativarSom: () => {
      salvarSomGlobalAtivo(false);
      pararNotificacaoGlobal();
      atualizarBotaoSomGlobal();
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    configurarEventosGlobais();
    criarBotaoSomGlobal();
    iniciarRealtimeGlobal();
  });
})();
