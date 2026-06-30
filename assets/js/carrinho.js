const modalCarrinho = document.getElementById("modalCarrinho");
const fecharCarrinho = document.getElementById("fecharCarrinho");
const itensCarrinho = document.getElementById("itensCarrinho");
const totalCarrinhoModal = document.getElementById("totalCarrinhoModal");
const carrinhoResumo = document.getElementById("carrinhoResumo");
const carrinhoQuantidade = document.getElementById("carrinhoQuantidade");
const carrinhoTotal = document.getElementById("carrinhoTotal");
const abrirCarrinho = document.getElementById("abrirCarrinho");
const finalizarPedido = document.getElementById("finalizarPedido");

const CHAVE_CARRINHO = "deliveryos_carrinho";

let carrinho = carregarCarrinho();
let ultimaQuantidadeCarrinho = calcularQuantidadeCarrinho();

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function escaparHTML(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function carregarCarrinho() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || [];

    if (!Array.isArray(dados)) {
      return [];
    }

    return dados;
  } catch (error) {
    console.error("Erro ao carregar carrinho:", error);
    return [];
  }
}

function salvarCarrinho() {
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
}

function calcularSubtotalItem(item) {
  const precoProduto = Number(item.preco_unitario || 0);

  const totalAdicionais = (item.adicionais || []).reduce((total, adicional) => {
    return total + Number(adicional.preco || 0);
  }, 0);

  return (precoProduto + totalAdicionais) * Number(item.quantidade || 1);
}

function calcularTotalCarrinho() {
  return carrinho.reduce((total, item) => {
    return total + calcularSubtotalItem(item);
  }, 0);
}

function calcularQuantidadeCarrinho() {
  return carrinho.reduce((total, item) => {
    return total + Number(item.quantidade || 1);
  }, 0);
}

function gerarIdItem() {
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ordenarAdicionais(adicionais = []) {
  return [...adicionais].sort((a, b) => {
    return String(a.id).localeCompare(String(b.id));
  });
}

function adicionaisIguais(adicionaisA = [], adicionaisB = []) {
  if (adicionaisA.length !== adicionaisB.length) return false;

  const idsA = ordenarAdicionais(adicionaisA).map((adicional) => adicional.id).join("|");
  const idsB = ordenarAdicionais(adicionaisB).map((adicional) => adicional.id).join("|");

  return idsA === idsB;
}

function buscarItemIgual(novoItem) {
  return carrinho.find((item) => {
    return (
      item.produto_id === novoItem.produto_id &&
      (item.observacao || "") === (novoItem.observacao || "") &&
      adicionaisIguais(item.adicionais || [], novoItem.adicionais || [])
    );
  });
}

function normalizarItem(item) {
  const precoProduto = Number(item.preco_unitario || item.preco || 0);
  const quantidade = Math.max(1, Number(item.quantidade || 1));
  const adicionais = Array.isArray(item.adicionais) ? item.adicionais : [];

  const itemNormalizado = {
    ...item,
    produto_id: item.produto_id || item.id_produto || item.id,
    loja_id: item.loja_id || null,
    nome: item.nome || "Produto",
    descricao: item.descricao || "",
    preco_unitario: precoProduto,
    quantidade,
    adicionais,
    observacao: String(item.observacao || "").trim()
  };

  itemNormalizado.subtotal = calcularSubtotalItem(itemNormalizado);

  return itemNormalizado;
}

function instalarAnimacoesCarrinho() {
  if (document.getElementById("deliveryos-carrinho-animacoes")) return;

  const style = document.createElement("style");
  style.id = "deliveryos-carrinho-animacoes";
  style.innerHTML = `
    .deliveryos-carrinho-pulse {
      animation: deliveryosCarrinhoPulse 0.35s ease;
    }

    .deliveryos-carrinho-contador-pulse {
      animation: deliveryosCarrinhoContadorPulse 0.35s ease;
    }

    .deliveryos-item-entrada {
      animation: deliveryosItemEntrada 0.25s ease;
    }

    @keyframes deliveryosCarrinhoPulse {
      0% { transform: translateY(0) scale(1); }
      45% { transform: translateY(-3px) scale(1.03); }
      100% { transform: translateY(0) scale(1); }
    }

    @keyframes deliveryosCarrinhoContadorPulse {
      0% { transform: scale(1); }
      45% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    @keyframes deliveryosItemEntrada {
      0% { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `;

  document.head.appendChild(style);
}

function animarElemento(elemento, classe) {
  if (!elemento) return;

  elemento.classList.remove(classe);

  void elemento.offsetWidth;

  elemento.classList.add(classe);

  setTimeout(() => {
    elemento.classList.remove(classe);
  }, 450);
}

function animarCarrinho() {
  animarElemento(carrinhoResumo, "deliveryos-carrinho-pulse");
  animarElemento(carrinhoQuantidade, "deliveryos-carrinho-contador-pulse");
}

function adicionarAoCarrinho(item) {
  const novoItem = normalizarItem(item);
  const itemExistente = buscarItemIgual(novoItem);

  if (itemExistente) {
    itemExistente.quantidade += Number(novoItem.quantidade || 1);
    itemExistente.subtotal = calcularSubtotalItem(itemExistente);
  } else {
    carrinho.push({
      ...novoItem,
      id: gerarIdItem(),
      subtotal: calcularSubtotalItem(novoItem)
    });
  }

  salvarCarrinho();
  atualizarCarrinho(true);
  animarCarrinho();
  abrirModalCarrinho();
}

function removerDoCarrinho(itemId) {
  carrinho = carrinho.filter((item) => item.id !== itemId);
  salvarCarrinho();
  atualizarCarrinho(true);
}

function alterarQuantidadeItem(itemId, novaQuantidade) {
  const item = carrinho.find((produto) => produto.id === itemId);

  if (!item) return;

  if (novaQuantidade <= 0) {
    removerDoCarrinho(itemId);
    return;
  }

  item.quantidade = novaQuantidade;
  item.subtotal = calcularSubtotalItem(item);

  salvarCarrinho();
  atualizarCarrinho(true);
}

function editarObservacaoItem(itemId) {
  const item = carrinho.find((produto) => produto.id === itemId);

  if (!item) return;

  const novaObservacao = prompt(
    "Observação do item:",
    item.observacao || ""
  );

  if (novaObservacao === null) return;

  item.observacao = novaObservacao.trim();
  item.subtotal = calcularSubtotalItem(item);

  salvarCarrinho();
  atualizarCarrinho(true);
}

function limparCarrinho() {
  const confirmar = confirm("Tem certeza que deseja limpar o carrinho?");

  if (!confirmar) return;

  carrinho = [];
  salvarCarrinho();
  atualizarCarrinho(true);
  fecharModalCarrinho();
}

function renderizarItensCarrinho(animar = false) {
  if (!itensCarrinho) return;

  if (!carrinho.length) {
    itensCarrinho.innerHTML = `<p class="carrinho-vazio">Seu carrinho está vazio.</p>`;
    return;
  }

  itensCarrinho.innerHTML = carrinho.map((item) => {
    const adicionaisHTML = (item.adicionais || []).length
      ? (item.adicionais || []).map((adicional) => {
          return `<small>+ ${escaparHTML(adicional.nome)} — ${formatarMoeda(adicional.preco)}</small>`;
        }).join("")
      : `<small>Sem adicionais</small>`;

    const observacaoHTML = item.observacao
      ? `<p><strong>Obs:</strong> ${escaparHTML(item.observacao)}</p>`
      : `<p class="observacao-vazia">Sem observação</p>`;

    return `
      <div class="item-carrinho ${animar ? "deliveryos-item-entrada" : ""}">
        <div class="item-carrinho-topo">
          <div>
            <h3>${escaparHTML(item.nome)}</h3>
            <p>${formatarMoeda(item.preco_unitario)}</p>
            ${adicionaisHTML}
            ${observacaoHTML}
          </div>

          <strong class="item-carrinho-preco">
            ${formatarMoeda(calcularSubtotalItem(item))}
          </strong>
        </div>

        <div class="item-carrinho-acoes">
          <button class="btn-remover-item" onclick="DeliveryOSCarrinho.remover('${item.id}')">
            Remover
          </button>

          <button class="btn-editar-observacao" onclick="DeliveryOSCarrinho.editarObservacao('${item.id}')">
            Editar obs.
          </button>

          <div class="controle-item">
            <button onclick="DeliveryOSCarrinho.alterarQuantidade('${item.id}', ${Number(item.quantidade || 1) - 1})">-</button>
            <strong>${Number(item.quantidade || 1)}</strong>
            <button onclick="DeliveryOSCarrinho.alterarQuantidade('${item.id}', ${Number(item.quantidade || 1) + 1})">+</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function atualizarResumoCarrinho() {
  const quantidade = calcularQuantidadeCarrinho();
  const total = calcularTotalCarrinho();

  if (carrinhoResumo) {
    carrinhoResumo.classList.toggle("oculto", quantidade === 0);
  }

  if (carrinhoQuantidade) {
    carrinhoQuantidade.innerText = quantidade === 1 ? "1 item" : `${quantidade} itens`;

    if (quantidade !== ultimaQuantidadeCarrinho) {
      animarElemento(carrinhoQuantidade, "deliveryos-carrinho-contador-pulse");
    }
  }

  if (carrinhoTotal) {
    carrinhoTotal.innerText = formatarMoeda(total);
  }

  if (totalCarrinhoModal) {
    totalCarrinhoModal.innerText = formatarMoeda(total);
  }

  ultimaQuantidadeCarrinho = quantidade;
}

function atualizarCarrinho(animar = false) {
  renderizarItensCarrinho(animar);
  atualizarResumoCarrinho();
}

function abrirModalCarrinho() {
  if (!modalCarrinho) return;

  atualizarCarrinho();
  modalCarrinho.classList.remove("oculto");
}

function fecharModalCarrinho() {
  if (!modalCarrinho) return;

  modalCarrinho.classList.add("oculto");
}

function montarTextoPedido() {
  let mensagem = "Olá! Quero fazer um pedido:\n\n";

  carrinho.forEach((item, index) => {
    mensagem += `*${index + 1}. ${item.nome}*\n`;
    mensagem += `Quantidade: ${item.quantidade}\n`;
    mensagem += `Valor: ${formatarMoeda(calcularSubtotalItem(item))}\n`;

    if ((item.adicionais || []).length) {
      mensagem += "Adicionais:\n";

      item.adicionais.forEach((adicional) => {
        mensagem += `+ ${adicional.nome} - ${formatarMoeda(adicional.preco)}\n`;
      });
    }

    if (item.observacao) {
      mensagem += `Obs: ${item.observacao}\n`;
    }

    mensagem += "\n";
  });

  mensagem += `*Total: ${formatarMoeda(calcularTotalCarrinho())}*`;

  return mensagem;
}

function normalizarWhatsApp(numero) {
  return String(numero || "").replace(/\D/g, "");
}

function finalizarPedidoCarrinho() {
  if (!carrinho.length) {
    alert("Seu carrinho está vazio.");
    return;
  }

  const loja = window.DeliveryOSLojaAtual || {};
  const numeroWhatsApp = normalizarWhatsApp(loja.whatsapp || loja.telefone || "");

  if (!numeroWhatsApp) {
    alert("WhatsApp da loja não configurado. Cadastre o WhatsApp em Configurações.");
    return;
  }

  const numeroFinal = `55${numeroWhatsApp.replace(/^55/, "")}`;
  const mensagem = encodeURIComponent(montarTextoPedido());
  const link = `https://wa.me/${numeroFinal}?text=${mensagem}`;

  window.open(link, "_blank");
}

if (abrirCarrinho) {
  abrirCarrinho.addEventListener("click", abrirModalCarrinho);
}

if (fecharCarrinho) {
  fecharCarrinho.addEventListener("click", fecharModalCarrinho);
}

if (modalCarrinho) {
  modalCarrinho.addEventListener("click", (event) => {
    if (event.target === modalCarrinho) {
      fecharModalCarrinho();
    }
  });
}

if (finalizarPedido) {
  finalizarPedido.addEventListener("click", finalizarPedidoCarrinho);
}

instalarAnimacoesCarrinho();

window.DeliveryOSCarrinho = {
  adicionar: adicionarAoCarrinho,
  remover: removerDoCarrinho,
  alterarQuantidade: alterarQuantidadeItem,
  editarObservacao: editarObservacaoItem,
  limpar: limparCarrinho,
  abrir: abrirModalCarrinho,
  atualizar: atualizarCarrinho,
  listar: () => carrinho,
  total: calcularTotalCarrinho,
  quantidade: calcularQuantidadeCarrinho
};

atualizarCarrinho();
