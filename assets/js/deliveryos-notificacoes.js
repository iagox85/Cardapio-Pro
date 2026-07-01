// ============================================================
// DELIVERYOS - CENTRAL GLOBAL DE NOTIFICAÇÕES DE PEDIDOS
// Versão reescrita do zero
// ------------------------------------------------------------
// Responsabilidades deste arquivo:
// - Identificar a loja do usuário logado.
// - Escutar novos pedidos em todas as páginas do painel.
// - Usar Realtime + consulta periódica como fallback.
// - Tocar som fora da aba Pedidos.
// - Mostrar alerta visual fora da aba Pedidos.
// - Liberar áudio com modal de ativação apenas uma vez.
// - Sincronizar parada entre abas quando pedido for aceito/cancelado.
// ============================================================

(function () {
  "use strict";

  if (window.DeliveryOSNotificacoes?.__versao === "fresh-20260701") return;

  const paginaAtual = (window.location.pathname.split("/").pop() || "admin.html").toLowerCase();
  const estaNaPaginaPedidos = paginaAtual === "pedidos.html";

  const STORAGE_AUDIO_OK = "deliveryos_audio_alertas_ativado";
  const STORAGE_BASELINE = "deliveryos_notif_baseline_";
  const STORAGE_EVENTO_PARAR = "deliveryos_pedido_notificacao_resolvida";
  const STORAGE_ULTIMO_ALERTA = "deliveryos_notif_ultimo_alerta_";

  const CANAL_ABAS = "deliveryos_pedidos";
  const INTERVALO_POLLING_MS = 5000;
  const INTERVALO_SOM_MS = 2200;

  let lojaId = null;
  let canalRealtime = null;
  let canalAbas = null;
  let pollingTimer = null;
  let somTimer = null;
  let tituloTimer = null;
  let audioContext = null;
  let audioLiberado = false;
  let pedidoAtivoId = null;
  let tituloOriginal = document.title;
  let inicializando = false;

  function log(...args) {
    console.log("[DeliveryOS Notificações]", ...args);
  }

  function warn(...args) {
    console.warn("[DeliveryOS Notificações]", ...args);
  }

  function getStorage(chave, padrao = "") {
    try {
      const valor = localStorage.getItem(chave);
      return valor === null ? padrao : valor;
    } catch (error) {
      return padrao;
    }
  }

  function setStorage(chave, valor) {
    try {
      localStorage.setItem(chave, valor);
    } catch (error) {
      // ignora
    }
  }

  function audioAtivado() {
    return getStorage(STORAGE_AUDIO_OK) === "sim";
  }

  function statusEhNovo(status) {
    const s = String(status || "").trim().toLowerCase();
    return !s || s === "novo" || s === "pendente" || s === "recebido" || s === "novo_pedido";
  }

  function pedidoCriadoEm(pedido) {
    return new Date(pedido?.created_at || pedido?.criado_em || pedido?.data || Date.now()).getTime();
  }

  function nomeCliente(pedido) {
    return String(pedido?.cliente_nome || pedido?.nome_cliente || pedido?.nome || "Cliente").trim();
  }

  function totalPedido(pedido) {
    const total = pedido?.total ?? pedido?.valor_total ?? pedido?.total_pedido ?? 0;
    return Number(total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function baselineKey() {
    return `${STORAGE_BASELINE}${lojaId || "sem_loja"}`;
  }

  function ultimoAlertaKey() {
    return `${STORAGE_ULTIMO_ALERTA}${lojaId || "sem_loja"}`;
  }

  function criarAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass();
    return audioContext;
  }

  async function desbloquearAudio() {
    try {
      const ctx = criarAudioContext();
      if (!ctx) return false;

      if (ctx.state === "suspended") await ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);

      audioLiberado = true;
      setStorage(STORAGE_AUDIO_OK, "sim");
      removerModalAudio();
      removerAvisoAudio();
      return true;
    } catch (error) {
      warn("Áudio bloqueado pelo navegador.", error);
      audioLiberado = false;
      return false;
    }
  }

  function tocarSomUmaVez() {
    if (!audioAtivado()) {
      mostrarModalAudio();
      return false;
    }

    try {
      const ctx = criarAudioContext();
      if (!ctx) return false;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const agora = ctx.currentTime;

      function nota(freq, inicio, duracao, volume) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, agora + inicio);
        gain.gain.setValueAtTime(0.001, agora + inicio);
        gain.gain.exponentialRampToValueAtTime(volume, agora + inicio + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, agora + inicio + duracao);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(agora + inicio);
        osc.stop(agora + inicio + duracao);
      }

      nota(784, 0.00, 0.28, 0.24);
      nota(1046, 0.18, 0.34, 0.26);
      nota(784, 0.58, 0.28, 0.22);
      nota(1046, 0.76, 0.38, 0.24);
      return true;
    } catch (error) {
      warn("Falha ao tocar som.", error);
      return false;
    }
  }

  function iniciarSomContinuo() {
    pararSomContinuo();
    const ok = tocarSomUmaVez();
    if (!ok && !audioLiberado) mostrarAvisoAudio();
    somTimer = setInterval(() => {
      const tocou = tocarSomUmaVez();
      if (!tocou && !audioLiberado) mostrarAvisoAudio();
    }, INTERVALO_SOM_MS);
  }

  function pararSomContinuo() {
    if (somTimer) {
      clearInterval(somTimer);
      somTimer = null;
    }
  }

  function iniciarTituloPiscando() {
    pararTituloPiscando();
    let alternar = false;
    tituloTimer = setInterval(() => {
      alternar = !alternar;
      document.title = alternar ? "🔔 Novo pedido!" : tituloOriginal;
    }, 900);
  }

  function pararTituloPiscando() {
    if (tituloTimer) {
      clearInterval(tituloTimer);
      tituloTimer = null;
    }
    document.title = tituloOriginal;
  }

  function mostrarModalAudio() {
    if (audioAtivado()) return;
    if (document.getElementById("deliveryosAudioModal")) return;

    const modal = document.createElement("div");
    modal.id = "deliveryosAudioModal";
    modal.className = "deliveryos-audio-modal";
    modal.innerHTML = `
      <div class="deliveryos-audio-modal-card">
        <div class="deliveryos-audio-modal-icon">🔔</div>
        <h2>Ativar notificações sonoras</h2>
        <p>Para avisar quando chegar um novo pedido, toque em ativar. Você só precisa fazer isso uma vez neste dispositivo.</p>
        <button type="button" id="deliveryosBtnAtivarAudio">Ativar alertas</button>
        <small>O navegador exige essa confirmação para liberar sons.</small>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector("#deliveryosBtnAtivarAudio")?.addEventListener("click", async () => {
      const ok = await desbloquearAudio();
      if (ok && typeof window.showToast === "function") {
        window.showToast("Alertas sonoros ativados.", "success");
      }
    });
  }

  function removerModalAudio() {
    document.getElementById("deliveryosAudioModal")?.remove();
  }

  function mostrarAvisoAudio() {
    if (document.getElementById("deliveryosAudioTapHint")) return;
    const aviso = document.createElement("button");
    aviso.type = "button";
    aviso.id = "deliveryosAudioTapHint";
    aviso.className = "deliveryos-audio-tap-hint";
    aviso.textContent = "🔔 Toque para liberar o som dos pedidos";
    aviso.addEventListener("click", desbloquearAudio);
    document.body.appendChild(aviso);
  }

  function removerAvisoAudio() {
    document.getElementById("deliveryosAudioTapHint")?.remove();
  }

  function criarAlerta() {
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
      pararNotificacao(true, pedidoAtivoId);
      window.location.href = "pedidos.html";
    });

    alerta.querySelector("#deliveryosBtnSilenciarPedidoGlobal")?.addEventListener("click", () => {
      pararNotificacao(true, pedidoAtivoId);
    });

    return alerta;
  }

  function mostrarAlerta(pedido) {
    if (estaNaPaginaPedidos) return;
    const alerta = criarAlerta();
    const texto = alerta.querySelector("#deliveryosPedidoGlobalTexto");
    if (texto) texto.textContent = `${nomeCliente(pedido)} • ${totalPedido(pedido)}`;
    alerta.classList.remove("oculto");
  }

  function ocultarAlerta() {
    document.getElementById("deliveryosPedidoGlobalAlert")?.classList.add("oculto");
  }

  function mostrarToast(pedido) {
    if (estaNaPaginaPedidos) return;
    if (typeof window.showToast === "function") {
      window.showToast(`${nomeCliente(pedido)} • ${totalPedido(pedido)}`, "warning", {
        titulo: "Novo pedido recebido",
        duracao: 9000
      });
    }
  }

  function publicarParada(pedidoId) {
    const payload = {
      tipo: "pedido_resolvido",
      pedido_id: pedidoId || null,
      origem: paginaAtual,
      timestamp: Date.now()
    };

    setStorage(STORAGE_EVENTO_PARAR, JSON.stringify(payload));

    try {
      if (canalAbas) canalAbas.postMessage(payload);
    } catch (error) {
      // ignora
    }
  }

  function pararNotificacao(publicar = false, pedidoId = null) {
    pararSomContinuo();
    pararTituloPiscando();
    ocultarAlerta();
    pedidoAtivoId = null;
    if (publicar) publicarParada(pedidoId);
  }

  function notificarPedido(pedido, origem = "desconhecida") {
    if (!pedido?.id) return;
    if (!statusEhNovo(pedido.status)) return;

    const ultimo = getStorage(ultimoAlertaKey());
    if (String(ultimo) === String(pedido.id)) return;

    setStorage(ultimoAlertaKey(), String(pedido.id));
    pedidoAtivoId = pedido.id;

    log("Novo pedido detectado por", origem, pedido.id, paginaAtual);

    // Em pedidos.html a tela de pedidos continua exibindo o alerta da própria fila.
    // Fora dela, o painel global mostra toast, card e som.
    if (!estaNaPaginaPedidos) {
      mostrarToast(pedido);
      mostrarAlerta(pedido);
      iniciarSomContinuo();
      iniciarTituloPiscando();
    }
  }

  async function carregarLoja() {
    if (lojaId) return lojaId;
    if (!window.supabaseClient) {
      warn("supabaseClient não encontrado.");
      return null;
    }

    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData?.user) return null;

    const userId = authData.user.id;

    const { data: vinculo, error } = await supabaseClient
      .from("usuarios_loja")
      .select("loja_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !vinculo?.loja_id) {
      warn("Usuário sem loja vinculada para notificações.", error);
      return null;
    }

    lojaId = vinculo.loja_id;
    return lojaId;
  }

  async function definirBaselineInicial() {
    if (!lojaId) return;
    if (getStorage(baselineKey())) return;

    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("id, created_at")
      .eq("loja_id", lojaId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && Array.isArray(data) && data[0]) {
      setStorage(baselineKey(), String(pedidoCriadoEm(data[0])));
    } else {
      setStorage(baselineKey(), String(Date.now()));
    }
  }

  async function verificarPedidosNovos(origem = "polling") {
    if (!lojaId || !window.supabaseClient) return;

    const baseline = Number(getStorage(baselineKey(), "0")) || 0;

    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("*")
      .eq("loja_id", lojaId)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      warn("Erro no fallback de pedidos.", error);
      return;
    }

    const novos = (data || [])
      .filter((pedido) => statusEhNovo(pedido.status))
      .filter((pedido) => pedidoCriadoEm(pedido) > baseline)
      .sort((a, b) => pedidoCriadoEm(a) - pedidoCriadoEm(b));

    if (!novos.length) return;

    const pedidoMaisRecente = novos[novos.length - 1];
    setStorage(baselineKey(), String(pedidoCriadoEm(pedidoMaisRecente)));
    notificarPedido(pedidoMaisRecente, origem);
  }

  function iniciarPolling() {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(() => verificarPedidosNovos("polling"), INTERVALO_POLLING_MS);
  }

  async function iniciarRealtime() {
    if (!lojaId || !window.supabaseClient) return;

    try {
      if (canalRealtime) await supabaseClient.removeChannel(canalRealtime);
    } catch (error) {
      // ignora
    }

    canalRealtime = supabaseClient
      .channel(`deliveryos-notificacoes-${lojaId}-${Date.now()}`)
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

          if (payload.eventType === "INSERT" && novo) {
            if (!statusEhNovo(novo.status)) return;
            const criado = pedidoCriadoEm(novo);
            const baseline = Number(getStorage(baselineKey(), "0")) || 0;
            if (criado > baseline) setStorage(baselineKey(), String(criado));
            notificarPedido(novo, "realtime");
            return;
          }

          if (payload.eventType === "UPDATE" && novo) {
            if (pedidoAtivoId && String(novo.id) === String(pedidoAtivoId) && !statusEhNovo(novo.status)) {
              pararNotificacao(false, novo.id);
            }
            return;
          }

          if (payload.eventType === "DELETE" && antigo) {
            if (pedidoAtivoId && String(antigo.id) === String(pedidoAtivoId)) {
              pararNotificacao(false, antigo.id);
            }
          }
        }
      )
      .subscribe((status) => log("Realtime", status));
  }

  function configurarSincroniaAbas() {
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_EVENTO_PARAR) pararNotificacao(false);
    });

    try {
      canalAbas = new BroadcastChannel(CANAL_ABAS);
      canalAbas.onmessage = (event) => {
        if (event?.data?.tipo === "pedido_resolvido") pararNotificacao(false);
      };
    } catch (error) {
      canalAbas = null;
    }
  }

  function configurarDesbloqueioPorInteracao() {
    ["click", "pointerdown", "touchstart", "keydown"].forEach((evento) => {
      window.addEventListener(
        evento,
        () => {
          if (audioAtivado() && !audioLiberado) desbloquearAudio();
        },
        { passive: true }
      );
    });
  }

  async function iniciar() {
    if (inicializando) return;
    inicializando = true;

    configurarSincroniaAbas();
    configurarDesbloqueioPorInteracao();

    if (!audioAtivado()) mostrarModalAudio();

    await carregarLoja();
    if (!lojaId) return;

    await definirBaselineInicial();
    await iniciarRealtime();
    iniciarPolling();

    log("Serviço iniciado", { paginaAtual, lojaId, estaNaPaginaPedidos });
  }

  window.DeliveryOSNotificacoes = {
    __versao: "fresh-20260701",
    iniciar,
    verificarPedidosNovos,
    notificarPedido,
    parar: pararNotificacao,
    pararSomContinuo,
    iniciarSomContinuo,
    tocarSomPedido: tocarSomUmaVez,
    desbloquearAudio,
    audioEstaAtivado: audioAtivado,
    publicarPedidoResolvido: publicarParada
  };

  window.DeliveryOSPedidosNotifier = window.DeliveryOSNotificacoes;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
