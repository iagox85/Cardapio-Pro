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

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function carregarCarrinho() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || [];
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

function adicionaisIguais(adicionaisA = [], adicionaisB = []) {
  if (adicionaisA.length !== adicionaisB.length) return false;

  const idsA = adicionaisA.map((adicional) => adicional.id).sort().join("|");
  const idsB = adicionaisB.map((adicional) => adicional.id).sort().join("|");

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

function adicionarAoCarrinho(item) {
  const itemExistente = buscarItemIgual(item);

  if (itemExistente) {
    itemExistente.quantidade += Number(item.quantidade || 1);
    itemExistente.subtotal = calcularSubtotalItem(itemExistente);
  } else {
    carrinho.push({
      ...item,
      id: gerarIdItem(),
      quantidade: Number(item.quantidade || 1),
      subtotal: calcularSubtotalItem(item)
    });
  }

  salvarCarrinho();
  atualizarCarrinho();
  abrirModalCarrinho();
}

function removerDoCarrinho(itemId) {
  carrinho = carrinho.filter((item) => item.id !== itemId);
  salvarCarrinho();
  atualizarCarrinho();
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
  atualizarCarrinho();
}

function limparCarrinho() {
  carrinho = [];
  salvarCarrinho();
  atualizarCarrinho();
}

function renderizarItensCarrinho() {
  if (!itensCarrinho) return;

  if (!carrinho.length) {
    itensCarrinho.innerHTML = `<p class="carrinho-vazio">Seu carrinho está vazio.</p>`;
    return;
  }

  itensCarrinho.innerHTML = carrinho.map((item) => {
    const adicionaisHTML = (item.adicionais || []).length
      ? (item.adicionais || []).map((adicional) => {
          return `<small>+ ${adicional.nome} — ${formatarMoeda(adicional.preco)}</small>`;
        }).join("")
      : `<small>Sem adicionais</small>`;

    const observacaoHTML = item.observacao
      ? `<p><strong>Obs:</strong> ${item.observacao}</p>`
      : "";

    return `
      <div class="item-carrinho">
        <div class="item-carrinho-topo">
          <div>
            <h3>${item.nome}</h3>
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

          <div class="controle-item">
            <button onclick="DeliveryOSCarrinho.alterarQuantidade('${item.id}', ${Number(item.quantidade || 1) - 1})">-</button>
            <strong>${item.quantidade}</strong>
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
  }

  if (carrinhoTotal) {
    carrinhoTotal.innerText = formatarMoeda(total);
  }

  if (totalCarrinhoModal) {
    totalCarrinhoModal.innerText = formatarMoeda(total);
  }
}

function atualizarCarrinho() {
  renderizarItensCarrinho();
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

function montarMensagemWhatsApp() {
  let mensagem = "Olá! Quero fazer um pedido:%0A%0A";

  carrinho.forEach((item, index) => {
    mensagem += `*${index + 1}. ${item.nome}*%0A`;
    mensagem += `Quantidade: ${item.quantidade}%0A`;
    mensagem += `Valor: ${formatarMoeda(calcularSubtotalItem(item))}%0A`;

    if ((item.adicionais || []).length) {
      mensagem += "Adicionais:%0A";

      item.adicionais.forEach((adicional) => {
        mensagem += `+ ${adicional.nome} - ${formatarMoeda(adicional.preco)}%0A`;
      });
    }

    if (item.observacao) {
      mensagem += `Obs: ${item.observacao}%0A`;
    }

    mensagem += "%0A";
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

  const link = `https://wa.me/55${numeroWhatsApp.replace(/^55/, "")}?text=${montarMensagemWhatsApp()}`;
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

window.DeliveryOSCarrinho = {
  adicionar: adicionarAoCarrinho,
  remover: removerDoCarrinho,
  alterarQuantidade: alterarQuantidadeItem,
  limpar: limparCarrinho,
  abrir: abrirModalCarrinho,
  atualizar: atualizarCarrinho,
  listar: () => carrinho,
  total: calcularTotalCarrinho
};

atualizarCarrinho();
