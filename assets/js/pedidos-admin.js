// ============================================================
// PEDIDOS ADMIN - DELIVERYOS
// Pedidos em tempo real com Supabase Realtime
// ============================================================

const listaPedidos = document.getElementById("listaPedidos");
const totalPedidosNovos = document.getElementById("totalPedidosNovos");
const totalPedidosPreparo = document.getElementById("totalPedidosPreparo");
const totalPedidosFinalizados = document.getElementById("totalPedidosFinalizados");
const totalFaturamentoPedidos = document.getElementById("totalFaturamentoPedidos");
const btnAtualizarPedidos = document.getElementById("btnAtualizarPedidos");
const btnSomPedidos = document.getElementById("btnSomPedidos");
const alertaPedidoNovo = document.getElementById("alertaPedidoNovo");

let pedidosCache = [];
let filtroStatusAtual = "todos";
let somPedidosAtivo = false;
let audioPedidoDesbloqueado = false;
let intervaloSomPedido = null;
let canalPedidos = null;
let pedidosDestacados = new Set();
let lojaAtualPedidos = null;

const DELIVERYOS_SOM_PEDIDOS_KEY = "deliveryos_som_pedidos_ativo";
const DELIVERYOS_AUDIO_DESBLOQUEADO_KEY = "deliveryos_audio_pedidos_desbloqueado";

function salvarPreferenciaSomPedidos(ativo) {
  try {
    localStorage.setItem(DELIVERYOS_SOM_PEDIDOS_KEY, ativo ? "sim" : "nao");
  } catch (error) {
    console.warn("Não foi possível salvar preferência de som.", error);
  }
}

function lerPreferenciaSomPedidos() {
  try {
    return localStorage.getItem(DELIVERYOS_SOM_PEDIDOS_KEY) === "sim";
  } catch (error) {
    return false;
  }
}

function salvarAudioDesbloqueadoPedidos() {
  try {
    localStorage.setItem(DELIVERYOS_AUDIO_DESBLOQUEADO_KEY, "sim");
  } catch (error) {
    console.warn("Não foi possível salvar desbloqueio de áudio.", error);
  }
}

function atualizarBotaoSomPedidos() {
  if (!btnSomPedidos) return;

  if (somPedidosAtivo) {
    btnSomPedidos.innerText = "🔔 Som ativado";
    btnSomPedidos.classList.add("som-ativo");
    btnSomPedidos.title = "O som de novos pedidos está ativado neste navegador.";
  } else {
    btnSomPedidos.innerText = "🔕 Ativar som";
    btnSomPedidos.classList.remove("som-ativo");
    btnSomPedidos.title = "Clique para ativar o som de novos pedidos neste navegador.";
  }
}

function inicializarPreferenciaSomPedidos() {
  somPedidosAtivo = lerPreferenciaSomPedidos();
  atualizarBotaoSomPedidos();
}


const STATUS_PEDIDOS = {
  novo: {
    label: "🔴 Novo pedido",
    classe: "status-novo",
    proximo: "preparando",
    acao: "Aceitar pedido"
  },
  aceito: {
    label: "🔵 Aceito",
    classe: "status-aceito",
    proximo: "preparando",
    acao: "Preparar"
  },
  preparando: {
    label: "👨‍🍳 Preparando",
    classe: "status-preparando",
    proximo: "pronto",
    acao: "Pronto"
  },
  pronto: {
    label: "📦 Pronto",
    classe: "status-pronto",
    proximo: "saiu_entrega",
    acao: "Saiu para entrega"
  },
  saiu_entrega: {
    label: "🛵 Saiu para entrega",
    classe: "status-entrega",
    proximo: "finalizado",
    acao: "Finalizar"
  },
  finalizado: {
    label: "✅ Finalizado",
    classe: "status-finalizado",
    proximo: null,
    acao: null
  },
  cancelado: {
    label: "❌ Cancelado",
    classe: "status-cancelado",
    proximo: null,
    acao: null
  }
};

function pedidoEhRetirada(pedido) {
  return pedido.tipo_recebimento === "retirada" || pedido.tipo_entrega === "retirada";
}

function obterAcaoPrincipalPedido(pedido) {
  const status = normalizarStatus(pedido.status);
  const retirada = pedidoEhRetirada(pedido);

  if (status === "novo") {
    return {
      proximo: "preparando",
      acao: "Aceitar pedido"
    };
  }

  if (status === "aceito") {
    return {
      proximo: "preparando",
      acao: "Preparar"
    };
  }

  if (status === "preparando" && retirada) {
    return {
      proximo: "pronto",
      acao: "Pronto para retirada"
    };
  }

  if (status === "preparando") {
    return {
      proximo: "pronto",
      acao: "Pedido pronto"
    };
  }

  if (status === "pronto" && retirada) {
    return {
      proximo: "finalizado",
      acao: "Marcar como retirado"
    };
  }

  if (status === "pronto") {
    return {
      proximo: "saiu_entrega",
      acao: "Saiu para entrega"
    };
  }

  if (status === "saiu_entrega") {
    return {
      proximo: "finalizado",
      acao: "Marcar como entregue"
    };
  }

  return {
    proximo: null,
    acao: null
  };
}

function obterStatusVisualPedido(pedido) {
  const status = normalizarStatus(pedido.status);
  const retirada = pedidoEhRetirada(pedido);

  if (status === "pronto" && retirada) {
    return {
      label: "📦 Pronto para retirada",
      classe: "status-pronto"
    };
  }

  if (status === "finalizado" && retirada) {
    return {
      label: "✅ Retirado",
      classe: "status-finalizado"
    };
  }

  if (status === "finalizado") {
    return {
      label: "✅ Entregue",
      classe: "status-finalizado"
    };
  }

  return STATUS_PEDIDOS[status] || STATUS_PEDIDOS.novo;
}
function formatarMoedaPedidos(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarDataPedido(data) {
  if (!data) return "";

  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function calcularTempoPedido(data) {
  if (!data) return "";

  const minutos = Math.max(0, Math.floor((Date.now() - new Date(data).getTime()) / 60000));

  if (minutos < 1) {
    return "agora";
  }

  if (minutos < 60) {
    return `${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return `${horas}h ${resto}min`;
}

function classeTempoPedido(data) {
  if (!data) return "tempo-ok";

  const minutos = Math.max(0, Math.floor((Date.now() - new Date(data).getTime()) / 60000));

  if (minutos >= 20) return "tempo-atrasado";
  if (minutos >= 10) return "tempo-alerta";

  return "tempo-ok";
}

function escaparHTMLPedido(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizarStatus(status) {
  return status || "novo";
}

async function carregarLojaDoUsuarioPedidos() {
  const {
    data: { user },
    error: erroUsuario
  } = await supabaseClient.auth.getUser();

  if (erroUsuario) {
    console.error("Erro ao verificar usuário:", erroUsuario);
    return null;
  }

  if (!user) {
    window.location.href = "login.html";
    return null;
  }

  const { data: vinculo, error: erroVinculo } = await supabaseClient
    .from("usuarios_loja")
    .select("loja_id")
    .eq("user_id", user.id)
    .single();

  if (erroVinculo || !vinculo?.loja_id) {
    console.error("Usuário sem loja vinculada:", erroVinculo);
    return null;
  }

  const { data: loja, error: erroLoja } = await supabaseClient
    .from("lojas")
    .select("*")
    .eq("id", vinculo.loja_id)
    .single();

  if (erroLoja || !loja) {
    console.error("Erro ao carregar loja:", erroLoja);
    return null;
  }

  lojaAtualPedidos = loja;
  return loja;
}

async function carregarPedidos() {
  if (!listaPedidos) return;

  listaPedidos.innerHTML = "<p>Carregando pedidos...</p>";

  if (!lojaAtualPedidos) {
    await carregarLojaDoUsuarioPedidos();
  }

  if (!lojaAtualPedidos?.id) {
    listaPedidos.innerHTML = `
      <div class="pedido-estado-vazio">
        <h3>Loja não vinculada</h3>
        <p>Este usuário ainda não está vinculado a uma loja.</p>
      </div>
    `;
    return;
  }

  const { data, error } = await supabaseClient
    .from("pedidos")
    .select("*")
    .eq("loja_id", lojaAtualPedidos.id)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    console.error("Erro ao carregar pedidos:", error);
    listaPedidos.innerHTML = `
      <div class="pedido-estado-vazio">
        <h3>Erro ao carregar pedidos</h3>
        <p>Verifique se o SQL de pedidos foi rodado no Supabase.</p>
      </div>
    `;
    return;
  }

  pedidosCache = data || [];
  renderizarPedidos();
  atualizarResumoPedidos();
}

function filtrarPedidos() {
  if (filtroStatusAtual === "todos") {
    return pedidosCache;
  }

  return pedidosCache.filter((pedido) => {
    return normalizarStatus(pedido.status) === filtroStatusAtual;
  });
}

function renderizarPedidos() {
  const pedidos = filtrarPedidos();

  if (!pedidos.length) {
    listaPedidos.innerHTML = `
      <div class="pedido-estado-vazio">
        <h3>Nenhum pedido encontrado</h3>
        <p>Quando um cliente finalizar o checkout, o pedido aparecerá aqui automaticamente.</p>
      </div>
    `;
    return;
  }

  listaPedidos.innerHTML = pedidos.map((pedido) => criarCardPedido(pedido)).join("");
}

function criarCardPedido(pedido) {
  const status = normalizarStatus(pedido.status);
  const statusInfo = obterStatusVisualPedido(pedido);
  const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
  const quantidadeItens = itens.reduce((total, item) => total + Number(item.quantidade || 1), 0);
  const endereco = pedido.endereco || {};
  const numeroPedido = pedido.numero_pedido ? `#${String(pedido.numero_pedido).padStart(4, "0")}` : `#${pedido.id.slice(0, 6)}`;
  const tipoRecebimentoRaw = pedido.tipo_recebimento || pedido.tipo_entrega || "delivery";
  const tipoRecebimento = pedidoEhRetirada(pedido) ? "Retirada" : "Delivery";
  const acaoPrincipal = obterAcaoPrincipalPedido(pedido);

  const itensHTML = itens.map((item) => {
    const adicionais = (item.adicionais || []).map((adicional) => {
      return `<small>+ ${escaparHTMLPedido(adicional.nome)} — ${formatarMoedaPedidos(adicional.preco)}</small>`;
    }).join("");

    const observacao = item.observacao
      ? `<small class="pedido-observacao">Obs: ${escaparHTMLPedido(item.observacao)}</small>`
      : "";

    return `
      <div class="pedido-item">
        <div>
          <strong>${Number(item.quantidade || 1)}x ${escaparHTMLPedido(item.nome)}</strong>
          ${adicionais}
          ${observacao}
        </div>
      </div>
    `;
  }).join("");

  const enderecoHTML = pedidoEhRetirada(pedido)
    ? `<p><strong>Recebimento:</strong> Retirada no balcão</p>`
    : `
      <p><strong>Endereço:</strong> ${escaparHTMLPedido(endereco.rua)}, ${escaparHTMLPedido(endereco.numero)}</p>
      <p><strong>Bairro:</strong> ${escaparHTMLPedido(endereco.bairro || "")}</p>
      ${endereco.complemento ? `<p><strong>Complemento:</strong> ${escaparHTMLPedido(endereco.complemento)}</p>` : ""}
      ${endereco.referencia ? `<p><strong>Referência:</strong> ${escaparHTMLPedido(endereco.referencia)}</p>` : ""}
    `;

  const acaoHTML = acaoPrincipal.proximo
    ? `<button class="btn-status-pedido" onclick="alterarStatusPedido('${pedido.id}', '${acaoPrincipal.proximo}')">${acaoPrincipal.acao}</button>`
    : "";

  const cancelarHTML = status !== "cancelado" && status !== "finalizado"
    ? `<button class="btn-cancelar-pedido" onclick="alterarStatusPedido('${pedido.id}', 'cancelado')">Cancelar</button>`
    : "";

  const destaqueRecente = pedidosDestacados.has(pedido.id);

  return `
    <article class="pedido-card ${status === "novo" ? "pedido-novo-destaque" : ""} ${destaqueRecente ? "pedido-recem-chegado" : ""}">
      <div class="pedido-card-topo">
        <div>
          <div class="pedido-topo-badges">
            <span class="pedido-numero">${numeroPedido}</span>
            <span class="pedido-tempo ${classeTempoPedido(pedido.created_at)}">🕒 ${calcularTempoPedido(pedido.created_at)}</span>
          </div>
          <h3>${escaparHTMLPedido(pedido.cliente_nome || "Cliente não informado")}</h3>
          <p>${formatarDataPedido(pedido.created_at)} • ${tipoRecebimento} • 🛒 ${quantidadeItens === 1 ? "1 item" : `${quantidadeItens} itens`}</p>
        </div>

        <span class="pedido-status ${statusInfo.classe}">
          ${statusInfo.label}
        </span>
      </div>

      <div class="pedido-card-grid">
        <div class="pedido-bloco">
          <h4>Cliente</h4>
          <p><strong>WhatsApp:</strong> ${escaparHTMLPedido(pedido.cliente_whatsapp || "Não informado")}</p>
          ${enderecoHTML}
        </div>

        <div class="pedido-bloco">
          <h4>Itens</h4>
          <div class="pedido-itens">
            ${itensHTML || "<p>Nenhum item registrado.</p>"}
          </div>
        </div>

        <div class="pedido-bloco pedido-bloco-total">
          <h4>Resumo</h4>
          <p><span>Subtotal</span><strong>${formatarMoedaPedidos(pedido.subtotal)}</strong></p>
          <p><span>Entrega</span><strong>${Number(pedido.taxa_entrega || 0) > 0 ? formatarMoedaPedidos(pedido.taxa_entrega) : pedidoEhRetirada(pedido) ? "Retirada" : "A combinar"}</strong></p>
          <p class="pedido-total"><span>Total</span><strong>${formatarMoedaPedidos(pedido.total)}</strong></p>
          <p><span>Pagamento</span><strong>${formatarPagamentoPedido(pedido)}</strong></p>
          ${pedido.observacao ? `<div class="pedido-observacao-geral"><strong>Obs. geral:</strong> ${escaparHTMLPedido(pedido.observacao)}</div>` : ""}
        </div>
      </div>

      <div class="pedido-card-acoes">
        ${acaoHTML}
        ${cancelarHTML}
        <button class="btn-imprimir-pedido" onclick="imprimirPedido('${pedido.id}')">Imprimir</button>
      </div>
    </article>
  `;
}

function formatarPagamentoPedido(pedido) {
  const mapa = {
    pix: "PIX",
    dinheiro: pedido.troco_para ? `Dinheiro - troco para ${formatarMoedaPedidos(pedido.troco_para)}` : "Dinheiro",
    cartao_entrega: "Cartão na entrega",
    outro: "Combinar"
  };

  return mapa[pedido.pagamento] || pedido.pagamento || "Não informado";
}

function atualizarResumoPedidos() {
  const hoje = new Date().toISOString().slice(0, 10);

  const novos = pedidosCache.filter((pedido) => normalizarStatus(pedido.status) === "novo").length;
  const preparo = pedidosCache.filter((pedido) => {
    const status = normalizarStatus(pedido.status);
    return ["aceito", "preparando", "pronto", "saiu_entrega"].includes(status);
  }).length;

  const finalizadosHoje = pedidosCache.filter((pedido) => {
    return normalizarStatus(pedido.status) === "finalizado" && String(pedido.created_at || "").slice(0, 10) === hoje;
  });

  const faturamentoHoje = pedidosCache
    .filter((pedido) => {
      return normalizarStatus(pedido.status) !== "cancelado" && String(pedido.created_at || "").slice(0, 10) === hoje;
    })
    .reduce((total, pedido) => total + Number(pedido.total || 0), 0);

  if (totalPedidosNovos) totalPedidosNovos.innerText = novos;
  if (totalPedidosPreparo) totalPedidosPreparo.innerText = preparo;
  if (totalPedidosFinalizados) totalPedidosFinalizados.innerText = finalizadosHoje.length;
  if (totalFaturamentoPedidos) totalFaturamentoPedidos.innerText = formatarMoedaPedidos(faturamentoHoje);
}

async function alterarStatusPedido(pedidoId, novoStatus) {
  pararAlertaSonoroPedido();
  let query = supabaseClient
    .from("pedidos")
    .update({
      status: novoStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", pedidoId);

  if (lojaAtualPedidos?.id) {
    query = query.eq("loja_id", lojaAtualPedidos.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Erro ao alterar status:", error);
    alert("Não foi possível alterar o status do pedido.");
    return;
  }

  const pedido = pedidosCache.find((item) => item.id === pedidoId);

  if (pedido) {
    pedido.status = novoStatus;
    pedido.updated_at = new Date().toISOString();
  }

  renderizarPedidos();
  atualizarResumoPedidos();
}

function tocarSomNovoPedido(teste = false) {
  if (!somPedidosAtivo && !teste) return;
  if (!audioPedidoDesbloqueado && !teste) return;

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const tocarNota = (frequencia, inicio, duracao, volume = 0.22) => {
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

    // Ding-dong mais perceptível, em duas ondas
    tocarNota(784, 0.00, 0.28, 0.24);
    tocarNota(1046, 0.18, 0.34, 0.26);
    tocarNota(784, 0.58, 0.28, 0.22);
    tocarNota(1046, 0.76, 0.38, 0.24);

    audioPedidoDesbloqueado = true;
    salvarAudioDesbloqueadoPedidos();
  } catch (error) {
    console.warn("Não foi possível tocar som:", error);
  }
}

function iniciarAlertaSonoroPedido() {
  if (!somPedidosAtivo || !audioPedidoDesbloqueado) return;

  pararAlertaSonoroPedido();

  tocarSomNovoPedido();

  intervaloSomPedido = setInterval(() => {
    tocarSomNovoPedido();
  }, 2200);
}

function pararAlertaSonoroPedido() {
  if (intervaloSomPedido) {
    clearInterval(intervaloSomPedido);
    intervaloSomPedido = null;
  }
}

function ativarSomPedidos() {
  somPedidosAtivo = true;
  audioPedidoDesbloqueado = true;

  salvarPreferenciaSomPedidos(true);
  salvarAudioDesbloqueadoPedidos();
  tocarSomNovoPedido(true);
  atualizarBotaoSomPedidos();

  if (typeof window.showToast === "function") {
    window.showToast("Som de novos pedidos ativado neste navegador.", "success");
  }
}

function desativarSomPedidos() {
  somPedidosAtivo = false;
  pararAlertaSonoroPedido();

  salvarPreferenciaSomPedidos(false);
  atualizarBotaoSomPedidos();

  if (typeof window.showToast === "function") {
    window.showToast("Som de novos pedidos desativado.", "info");
  }
}

function mostrarAlertaNovoPedido() {
  if (!alertaPedidoNovo) return;

  alertaPedidoNovo.innerHTML = "🔔 Novo pedido recebido! Clique em Aceitar ou Cancelar para parar o som.";
  alertaPedidoNovo.classList.remove("oculto");

  setTimeout(() => {
    alertaPedidoNovo.classList.add("oculto");
  }, 9000);
}

function iniciarRealtimePedidos() {
  if (canalPedidos) {
    supabaseClient.removeChannel(canalPedidos);
  }

  const canalNome = lojaAtualPedidos?.id
    ? `deliveryos-pedidos-${lojaAtualPedidos.id}`
    : "deliveryos-pedidos";

  const configRealtime = {
    event: "*",
    schema: "public",
    table: "pedidos"
  };

  if (lojaAtualPedidos?.id) {
    configRealtime.filter = `loja_id=eq.${lojaAtualPedidos.id}`;
  }

  canalPedidos = supabaseClient
    .channel(canalNome)
    .on(
      "postgres_changes",
      configRealtime,
      (payload) => {
        const pedidoNovo = payload.new;
        const pedidoAntigo = payload.old;

        if (lojaAtualPedidos?.id && pedidoNovo?.loja_id && pedidoNovo.loja_id !== lojaAtualPedidos.id) {
          return;
        }

        if (payload.eventType === "INSERT") {
          pedidosCache = pedidosCache.filter((pedido) => pedido.id !== pedidoNovo.id);
          pedidosCache.unshift(pedidoNovo);

          pedidosDestacados.add(pedidoNovo.id);

          iniciarAlertaSonoroPedido();
          mostrarAlertaNovoPedido();

          setTimeout(() => {
            pedidosDestacados.delete(pedidoNovo.id);
            renderizarPedidos();
          }, 18000);
        }

        if (payload.eventType === "UPDATE") {
          pedidosCache = pedidosCache.map((pedido) => {
            return pedido.id === pedidoNovo.id ? pedidoNovo : pedido;
          });
        }

        if (payload.eventType === "DELETE") {
          pedidosCache = pedidosCache.filter((pedido) => pedido.id !== pedidoAntigo.id);
        }

        renderizarPedidos();
        atualizarResumoPedidos();
      }
    )
    .subscribe((status) => {
      console.log("Realtime pedidos:", status);
    });
}

function imprimirPedido(pedidoId) {
  pararAlertaSonoroPedido();
  const pedido = pedidosCache.find((item) => item.id === pedidoId);

  if (!pedido) return;

  const janela = window.open("", "_blank", "width=420,height=700");

  if (!janela) {
    alert("O navegador bloqueou a janela de impressão.");
    return;
  }

  const itens = Array.isArray(pedido.itens) ? pedido.itens : [];

  janela.document.write(`
    <html>
      <head>
        <title>Pedido ${pedido.numero_pedido || ""}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 16px;
            color: #111;
          }

          h1 {
            font-size: 22px;
            margin: 0 0 8px;
          }

          h2 {
            font-size: 16px;
            margin: 18px 0 8px;
            border-top: 1px dashed #999;
            padding-top: 12px;
          }

          p {
            margin: 4px 0;
            font-size: 14px;
          }

          .total {
            font-size: 20px;
            font-weight: bold;
            margin-top: 14px;
            border-top: 1px dashed #999;
            padding-top: 12px;
          }

          small {
            display: block;
            margin-left: 12px;
          }

          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Pedido #${pedido.numero_pedido || pedido.id.slice(0, 6)}</h1>
        <p><strong>Cliente:</strong> ${escaparHTMLPedido(pedido.cliente_nome)}</p>
        <p><strong>WhatsApp:</strong> ${escaparHTMLPedido(pedido.cliente_whatsapp)}</p>
        <p><strong>Data:</strong> ${formatarDataPedido(pedido.created_at)}</p>

        <h2>Itens</h2>
        ${itens.map((item) => `
          <p><strong>${item.quantidade}x ${escaparHTMLPedido(item.nome)}</strong></p>
          ${(item.adicionais || []).map((adicional) => `<small>+ ${escaparHTMLPedido(adicional.nome)} - ${formatarMoedaPedidos(adicional.preco)}</small>`).join("")}
          ${item.observacao ? `<small>Obs: ${escaparHTMLPedido(item.observacao)}</small>` : ""}
        `).join("")}

        <h2>Pagamento</h2>
        <p>${formatarPagamentoPedido(pedido)}</p>

        <p class="total">Total: ${formatarMoedaPedidos(pedido.total)}</p>

        <button onclick="window.print()">Imprimir</button>
      </body>
    </html>
  `);

  janela.document.close();
}

function instalarFiltrosPedidos() {
  document.querySelectorAll("[data-status-filtro]").forEach((botao) => {
    botao.addEventListener("click", () => {
      filtroStatusAtual = botao.dataset.statusFiltro;

      document.querySelectorAll("[data-status-filtro]").forEach((btn) => {
        btn.classList.remove("active");
      });

      botao.classList.add("active");
      renderizarPedidos();
    });
  });
}

function instalarEstilosPedidos() {
  if (document.getElementById("deliveryos-pedidos-estilos")) return;

  const style = document.createElement("style");
  style.id = "deliveryos-pedidos-estilos";
  style.innerHTML = `
    .pedidos-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .pedidos-actions button,
    .pedidos-filtros button {
      border: none;
      border-radius: 12px;
      padding: 10px 14px;
      font-weight: 800;
      cursor: pointer;
      background: #f3f4f6;
      color: #111827;
    }

    #btnSomPedidos.som-ativo {
      background: #dcfce7;
      color: #166534;
    }

    .pedidos-filtros {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 16px 0 20px;
    }

    .pedidos-filtros button.active {
      background: #ef4444;
      color: white;
    }

    .alerta-pedido-novo {
      background: #ecfdf5;
      color: #166534;
      border: 1px solid #bbf7d0;
      padding: 14px 16px;
      border-radius: 16px;
      font-weight: 900;
      margin-bottom: 16px;
      animation: pedidoPulse 1s ease infinite alternate;
    }

    @keyframes pedidoPulse {
      from { transform: scale(1); }
      to { transform: scale(1.01); }
    }

    .pedidos-lista {
      display: grid;
      gap: 16px;
    }

    .pedido-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 22px;
      padding: 18px;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
    }

    .pedido-novo-destaque {
      border-color: #ef4444;
      box-shadow: 0 12px 34px rgba(239, 68, 68, 0.12);
    }

    .pedido-recem-chegado {
      animation: pedidoNovoDestaque 1.1s ease-in-out infinite alternate;
    }

    @keyframes pedidoNovoDestaque {
      from {
        border-color: #ef4444;
        box-shadow: 0 12px 34px rgba(239, 68, 68, 0.15);
        transform: translateY(0);
      }

      to {
        border-color: #b91c1c;
        box-shadow: 0 18px 46px rgba(239, 68, 68, 0.28);
        transform: translateY(-2px);
      }
    }

    .pedido-card-topo {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .pedido-topo-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 8px;
    }

    .pedido-numero {
      display: inline-flex;
      background: #111827;
      color: white;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
    }

    .pedido-tempo {
      display: inline-flex;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
    }

    .tempo-ok {
      background: #dcfce7;
      color: #166534;
    }

    .tempo-alerta {
      background: #fef3c7;
      color: #92400e;
    }

    .tempo-atrasado {
      background: #fee2e2;
      color: #991b1b;
    }

    .pedido-card h3 {
      margin: 0 0 4px;
      font-size: 22px;
    }

    .pedido-card-topo p {
      margin: 0;
      color: #6b7280;
    }

    .pedido-status {
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .status-novo { background: #fee2e2; color: #991b1b; }
    .status-aceito { background: #dbeafe; color: #1d4ed8; }
    .status-preparando { background: #fef3c7; color: #92400e; }
    .status-pronto { background: #dcfce7; color: #166534; }
    .status-entrega { background: #ede9fe; color: #6d28d9; }
    .status-finalizado { background: #ecfdf5; color: #047857; }
    .status-cancelado { background: #f3f4f6; color: #4b5563; }

    .pedido-card-grid {
      display: grid;
      grid-template-columns: 1fr 1.2fr 0.9fr;
      gap: 14px;
    }

    .pedido-bloco {
      background: #f9fafb;
      border-radius: 16px;
      padding: 14px;
    }

    .pedido-bloco h4 {
      margin: 0 0 10px;
      font-size: 15px;
    }

    .pedido-bloco p {
      margin: 5px 0;
      color: #374151;
      line-height: 1.35;
    }

    .pedido-itens {
      display: grid;
      gap: 10px;
    }

    .pedido-item strong {
      display: block;
      margin-bottom: 4px;
    }

    .pedido-item small {
      display: block;
      color: #6b7280;
      line-height: 1.35;
    }

    .pedido-observacao {
      color: #92400e !important;
      font-weight: 800;
    }

    .pedido-bloco-total p {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }

    .pedido-total {
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 18px;
    }

    .pedido-total strong {
      color: #ef4444;
    }

    .pedido-observacao-geral {
      margin-top: 10px;
      padding: 10px;
      background: #fffbeb;
      border-radius: 12px;
      color: #92400e;
      line-height: 1.35;
    }

    .pedido-card-acoes {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      flex-wrap: wrap;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .pedido-card-acoes button {
      border: none;
      border-radius: 12px;
      padding: 11px 14px;
      font-weight: 900;
      cursor: pointer;
    }

    .btn-status-pedido {
      background: #ef4444;
      color: white;
    }

    .btn-cancelar-pedido {
      background: #fee2e2;
      color: #991b1b;
    }

    .btn-imprimir-pedido {
      background: #f3f4f6;
      color: #111827;
    }

    .pedido-estado-vazio {
      text-align: center;
      padding: 40px 16px;
      border: 1px dashed #d1d5db;
      border-radius: 22px;
      color: #6b7280;
    }

    .pedido-estado-vazio h3 {
      margin-bottom: 8px;
      color: #111827;
    }

    @media (max-width: 980px) {
      .pedido-card-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .pedido-card-topo {
        flex-direction: column;
      }

      .pedido-card-acoes {
        justify-content: stretch;
      }

      .pedido-card-acoes button {
        flex: 1;
      }
    }
  `;

  document.head.appendChild(style);
}

if (btnAtualizarPedidos) {
  btnAtualizarPedidos.addEventListener("click", () => {
    pararAlertaSonoroPedido();
    carregarPedidos();
  });
}

if (btnSomPedidos) {
  inicializarPreferenciaSomPedidos();

  btnSomPedidos.addEventListener("click", () => {
    if (!somPedidosAtivo || !audioPedidoDesbloqueado) {
      ativarSomPedidos();
    } else {
      desativarSomPedidos();
    }
  });
}

window.alterarStatusPedido = alterarStatusPedido;
window.imprimirPedido = imprimirPedido;

async function iniciarPedidosAdmin() {
  instalarEstilosPedidos();
  instalarFiltrosPedidos();
  await carregarLojaDoUsuarioPedidos();
  await carregarPedidos();
  iniciarRealtimePedidos();

  setInterval(() => {
    renderizarPedidos();
  }, 60000);
}

iniciarPedidosAdmin();
