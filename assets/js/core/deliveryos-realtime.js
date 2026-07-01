// ============================================================
// DELIVERYOS - CORE / REALTIME
// ------------------------------------------------------------
// Serviço único de Realtime do painel.
// Ele não toca som e não mostra toast; apenas emite eventos.
// ============================================================

(function () {
  "use strict";

  if (window.DeliveryOSRealtime) return;

  let iniciado = false;
  let canalPedidos = null;
  let lojaAtual = null;
  let idsConhecidos = new Set();
  let ultimoPoll = 0;
  let intervaloPoll = null;

  const EVENTO_PEDIDO_NOVO = "deliveryos:pedido-novo";
  const EVENTO_PEDIDO_ATUALIZADO = "deliveryos:pedido-atualizado";
  const EVENTO_PEDIDO_REMOVIDO = "deliveryos:pedido-removido";

  function emitir(nome, detalhe = {}) {
    window.dispatchEvent(new CustomEvent(nome, { detail: detalhe }));
  }

  function normalizarStatus(status) {
    return status || "novo";
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
      console.warn("[DeliveryOS Realtime] Usuário não autenticado.", authError);
      return null;
    }

    const { data: vinculo, error: vinculoError } = await supabaseClient
      .from("usuarios_loja")
      .select("loja_id")
      .eq("usuario_id", usuario.id)
      .eq("ativo", true)
      .maybeSingle();

    if (vinculoError || !vinculo?.loja_id) {
      console.warn("[DeliveryOS Realtime] Loja do usuário não encontrada.", vinculoError);
      return null;
    }

    lojaAtual = { id: vinculo.loja_id };
    return lojaAtual;
  }

  async function carregarBasePedidosConhecidos() {
    if (!lojaAtual?.id) return;

    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("id, created_at")
      .eq("loja_id", lojaAtual.id)
      .eq("status", "novo")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[DeliveryOS Realtime] Não foi possível carregar base de pedidos.", error);
      return;
    }

    (data || []).forEach((pedido) => idsConhecidos.add(String(pedido.id)));
    ultimoPoll = Date.now();
  }

  function tratarInsert(pedido, origem = "realtime") {
    if (!pedido?.id) return;
    if (lojaAtual?.id && pedido.loja_id && pedido.loja_id !== lojaAtual.id) return;

    const id = String(pedido.id);
    if (idsConhecidos.has(id)) return;

    idsConhecidos.add(id);

    if (normalizarStatus(pedido.status) === "novo") {
      emitir(EVENTO_PEDIDO_NOVO, { pedido, origem });
    }
  }

  function tratarUpdate(pedidoNovo, pedidoAntigo = null, origem = "realtime") {
    if (!pedidoNovo?.id) return;
    if (lojaAtual?.id && pedidoNovo.loja_id && pedidoNovo.loja_id !== lojaAtual.id) return;

    idsConhecidos.add(String(pedidoNovo.id));
    emitir(EVENTO_PEDIDO_ATUALIZADO, { pedido: pedidoNovo, anterior: pedidoAntigo, origem });
  }

  function tratarDelete(pedidoAntigo, origem = "realtime") {
    if (!pedidoAntigo?.id) return;
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
          if (payload.eventType === "INSERT") tratarInsert(payload.new, "realtime");
          if (payload.eventType === "UPDATE") tratarUpdate(payload.new, payload.old, "realtime");
          if (payload.eventType === "DELETE") tratarDelete(payload.old, "realtime");
        }
      )
      .subscribe((status) => {
        console.log("[DeliveryOS Realtime] pedidos:", status);
      });
  }

  async function verificarPedidosNovosFallback() {
    if (!lojaAtual?.id || !window.supabaseClient) return;

    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("*")
      .eq("loja_id", lojaAtual.id)
      .eq("status", "novo")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.warn("[DeliveryOS Realtime] Fallback de pedidos falhou.", error);
      return;
    }

    (data || [])
      .slice()
      .reverse()
      .forEach((pedido) => tratarInsert(pedido, "polling"));

    ultimoPoll = Date.now();
  }

  function iniciarFallback() {
    if (intervaloPoll) clearInterval(intervaloPoll);
    intervaloPoll = setInterval(verificarPedidosNovosFallback, 5000);
  }

  async function start() {
    if (iniciado) return;
    iniciado = true;

    lojaAtual = await obterLojaAtual();
    if (!lojaAtual?.id) return;

    await carregarBasePedidosConhecidos();
    iniciarCanalPedidos();
    iniciarFallback();
  }

  function stop() {
    iniciado = false;

    if (intervaloPoll) {
      clearInterval(intervaloPoll);
      intervaloPoll = null;
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
