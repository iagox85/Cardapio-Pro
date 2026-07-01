// ============================================================
// DELIVERYOS - CORE / REALTIME
// ------------------------------------------------------------
// Serviço global de eventos do painel.
// Escuta pedidos no Supabase e emite eventos internos.
// Não toca som, não mostra toast e não altera tela.
// ============================================================

(function () {
  "use strict";

  if (window.DeliveryOSRealtime) return;

  const EVENTO_PEDIDO_NOVO = "deliveryos:pedido-novo";
  const EVENTO_PEDIDO_ATUALIZADO = "deliveryos:pedido-atualizado";
  const EVENTO_PEDIDO_REMOVIDO = "deliveryos:pedido-removido";

  let iniciado = false;
  let lojaAtual = null;
  let canalPedidos = null;
  let intervaloPolling = null;
  let idsConhecidos = new Set();

  function emitir(nome, detalhe = {}) {
    window.dispatchEvent(new CustomEvent(nome, { detail: detalhe }));
  }

  function idPedido(pedido) {
    return pedido?.id ? String(pedido.id) : null;
  }

  function statusPedido(pedido) {
    return String(pedido?.status || "novo").toLowerCase();
  }

  function pedidoPertenceLoja(pedido) {
    if (!pedido?.id) return false;
    if (!lojaAtual?.id) return true;
    if (!pedido.loja_id) return true;
    return String(pedido.loja_id) === String(lojaAtual.id);
  }

  async function obterLojaAtual() {
    if (lojaAtual?.id) return lojaAtual;

    if (!window.supabaseClient) {
      console.warn("[DeliveryOS Realtime] supabaseClient não encontrado.");
      return null;
    }

    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    const usuario = authData?.user;

    if (authError || !usuario?.id) {
      console.warn("[DeliveryOS Realtime] usuário não autenticado.", authError);
      return null;
    }

    const { data: vinculo, error: vinculoError } = await supabaseClient
      .from("usuarios_loja")
      .select("loja_id")
      .eq("user_id", usuario.id)
      .maybeSingle();

    if (vinculoError || !vinculo?.loja_id) {
      console.warn("[DeliveryOS Realtime] loja do usuário não encontrada.", vinculoError);
      return null;
    }

    lojaAtual = { id: vinculo.loja_id };
    return lojaAtual;
  }

  async function carregarBaseInicial() {
    if (!lojaAtual?.id || !window.supabaseClient) return;

    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("id")
      .eq("loja_id", lojaAtual.id)
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      console.warn("[DeliveryOS Realtime] falha ao carregar base inicial.", error);
      return;
    }

    (data || []).forEach((pedido) => {
      const id = idPedido(pedido);
      if (id) idsConhecidos.add(id);
    });
  }

  function tratarNovoPedido(pedido, origem = "realtime") {
    const id = idPedido(pedido);
    if (!id || !pedidoPertenceLoja(pedido)) return;

    if (idsConhecidos.has(id)) return;
    idsConhecidos.add(id);

    if (statusPedido(pedido) === "novo") {
      emitir(EVENTO_PEDIDO_NOVO, { pedido, origem });
    }
  }

  function tratarAtualizacaoPedido(pedidoNovo, pedidoAntigo = null, origem = "realtime") {
    const id = idPedido(pedidoNovo);
    if (!id || !pedidoPertenceLoja(pedidoNovo)) return;

    idsConhecidos.add(id);
    emitir(EVENTO_PEDIDO_ATUALIZADO, { pedido: pedidoNovo, anterior: pedidoAntigo, origem });
  }

  function tratarRemocaoPedido(pedidoAntigo, origem = "realtime") {
    const id = idPedido(pedidoAntigo);
    if (!id) return;

    idsConhecidos.delete(id);
    emitir(EVENTO_PEDIDO_REMOVIDO, { pedido: pedidoAntigo, origem });
  }

  function iniciarCanalPedidos() {
    if (!lojaAtual?.id || !window.supabaseClient) return;

    if (canalPedidos) {
      try {
        supabaseClient.removeChannel(canalPedidos);
      } catch (_) {}
    }

    canalPedidos = supabaseClient
      .channel(`deliveryos-core-pedidos-${lojaAtual.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `loja_id=eq.${lojaAtual.id}`
        },
        (payload) => {
          if (payload.eventType === "INSERT") tratarNovoPedido(payload.new, "realtime");
          if (payload.eventType === "UPDATE") tratarAtualizacaoPedido(payload.new, payload.old, "realtime");
          if (payload.eventType === "DELETE") tratarRemocaoPedido(payload.old, "realtime");
        }
      )
      .subscribe((status) => {
        console.log("[DeliveryOS Realtime] pedidos:", status);
      });
  }

  async function verificarPedidosNovosPorPolling() {
    if (!lojaAtual?.id || !window.supabaseClient) return;

    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("*")
      .eq("loja_id", lojaAtual.id)
      .eq("status", "novo")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.warn("[DeliveryOS Realtime] polling falhou.", error);
      return;
    }

    (data || [])
      .slice()
      .reverse()
      .forEach((pedido) => tratarNovoPedido(pedido, "polling"));
  }

  function iniciarPolling() {
    if (intervaloPolling) clearInterval(intervaloPolling);
    intervaloPolling = setInterval(verificarPedidosNovosPorPolling, 5000);
  }

  async function start() {
    if (iniciado) return;
    iniciado = true;

    lojaAtual = await obterLojaAtual();
    if (!lojaAtual?.id) return;

    await carregarBaseInicial();
    iniciarCanalPedidos();
    iniciarPolling();
  }

  function stop() {
    iniciado = false;

    if (intervaloPolling) {
      clearInterval(intervaloPolling);
      intervaloPolling = null;
    }

    if (canalPedidos && window.supabaseClient) {
      try {
        supabaseClient.removeChannel(canalPedidos);
      } catch (_) {}
    }

    canalPedidos = null;
  }

  const Realtime = {
    start,
    stop,
    getLojaAtual: () => lojaAtual,
    eventos: {
      pedidoNovo: EVENTO_PEDIDO_NOVO,
      pedidoAtualizado: EVENTO_PEDIDO_ATUALIZADO,
      pedidoRemovido: EVENTO_PEDIDO_REMOVIDO
    }
  };

  window.DeliveryOSRealtime = Realtime;
  window.DeliveryOS?.registrarModulo?.("realtime", Realtime);
})();
