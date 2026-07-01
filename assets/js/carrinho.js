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

function calcularSubtotalCarrinho() {
  return carrinho.reduce((total, item) => {
    return total + calcularSubtotalItem(item);
  }, 0);
}

function obterTaxaEntrega() {
  const loja = window.DeliveryOSLojaAtual || {};

  const possiveisCampos = [
    loja.taxa_entrega,
    loja.valor_entrega,
    loja.entrega_valor,
    loja.delivery_fee,
    loja.taxaDelivery
  ];

  const valorEncontrado = possiveisCampos.find((valor) => {
    return valor !== undefined && valor !== null && valor !== "";
  });

  return Number(valorEncontrado || 0);
}

function calcularTotalCarrinho() {
  return calcularSubtotalCarrinho() + obterTaxaEntrega();
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
    observacao: String(item.observacao || "").trim(),
    imagem_url: item.imagem_url || item.imagem || item.foto || ""
  };

  itemNormalizado.subtotal = calcularSubtotalItem(itemNormalizado);

  return itemNormalizado;
}

function instalarEstilosCarrinho() {
  if (document.getElementById("deliveryos-carrinho-estilos")) return;

  const style = document.createElement("style");
  style.id = "deliveryos-carrinho-estilos";
  style.innerHTML = `
    .deliveryos-carrinho-pulse {
      animation: deliveryosCarrinhoPulse 0.32s ease;
    }

    .deliveryos-carrinho-contador-pulse {
      animation: deliveryosCarrinhoContadorPulse 0.32s ease;
    }

    .deliveryos-item-entrada {
      animation: deliveryosItemEntrada 0.22s ease;
    }

    #modalCarrinho .modal-produto-content {
      width: min(720px, calc(100vw - 28px));
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
      border-radius: 24px;
      background: #ffffff;
    }

    #modalCarrinho h2 {
      padding: 24px 26px 14px;
      margin: 0;
      font-size: 25px;
      font-weight: 900;
      letter-spacing: -0.03em;
      color: #111827;
    }

    #modalCarrinho .fechar-modal {
      z-index: 4;
    }

    #itensCarrinho {
      margin-top: 0;
      padding: 0 22px 14px;
      overflow-y: auto;
      flex: 1;
      display: grid;
      gap: 12px;
    }

    #itensCarrinho::-webkit-scrollbar {
      width: 8px;
    }

    #itensCarrinho::-webkit-scrollbar-thumb {
      background: #e5e7eb;
      border-radius: 999px;
    }

    .item-carrinho {
      border: 1px solid #eef0f3;
      border-radius: 20px;
      padding: 12px;
      background: #ffffff;
      box-shadow: 0 6px 18px rgba(17, 24, 39, 0.055);
    }

    .item-carrinho-topo {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      align-items: flex-start;
    }

    .item-carrinho-info {
      display: flex;
      gap: 12px;
      min-width: 0;
    }

    .item-carrinho-foto {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      overflow: hidden;
      font-size: 11px;
      font-weight: 800;
      color: #9ca3af;
      text-align: center;
    }

    .item-carrinho-foto img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .item-carrinho h3 {
      font-size: 17px;
      line-height: 1.18;
      margin: 0 0 4px;
      color: #111827;
      letter-spacing: -0.02em;
    }

    .item-carrinho-preco-base {
      color: #6b7280;
      font-size: 13px;
      margin: 0 0 8px;
    }

    .adicionais-carrinho-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .adicional-carrinho-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #f9fafb;
      border: 1px solid #edf0f3;
      color: #4b5563;
      border-radius: 999px;
      padding: 5px 8px;
      font-size: 12px;
      font-weight: 750;
      line-height: 1;
    }

    .adicional-carrinho-chip strong {
      color: #111827;
      font-weight: 800;
    }

    .sem-adicionais-carrinho {
      display: inline-flex;
      color: #9ca3af;
      font-size: 12px;
      margin-top: 5px;
    }

    .item-carrinho-total-box {
      text-align: right;
      min-width: 92px;
      display: grid;
      gap: 3px;
    }

    .item-carrinho-total-label {
      color: #9ca3af;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .item-carrinho-preco {
      font-weight: 950;
      color: #ef4444;
      white-space: nowrap;
      font-size: 20px;
      letter-spacing: -0.03em;
    }

    .observacao-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #f3f4f6;
      color: #4b5563;
      border-radius: 999px;
      padding: 6px 9px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 8px;
      max-width: 100%;
    }

    .observacao-vazia {
      color: #9ca3af;
      font-size: 12px;
      margin-top: 7px;
    }

    .item-carrinho-acoes {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      gap: 10px;
    }

    .grupo-acoes-item {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .item-carrinho-acoes button {
      border: none;
      cursor: pointer;
      transition: transform 0.12s ease, opacity 0.12s ease, background 0.12s ease;
    }

    .item-carrinho-acoes button:active {
      transform: scale(0.96);
    }

    .btn-remover-item,
    .btn-editar-observacao {
      width: 36px;
      height: 36px;
      padding: 0 !important;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 900;
    }

    .btn-remover-item {
      background: #fff1f2;
      color: #e11d48;
    }

    .btn-remover-item:hover {
      background: #ffe4e6;
    }

    .btn-editar-observacao {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-editar-observacao:hover {
      background: #e5e7eb;
    }

    .controle-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      padding: 4px;
    }

    .controle-item button {
      width: 31px;
      height: 31px;
      padding: 0;
      background: #ef4444;
      color: white;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      font-size: 17px;
      font-weight: 900;
    }

    .controle-item strong {
      min-width: 26px;
      text-align: center;
      color: #111827;
      font-size: 14px;
      font-weight: 900;
    }

    .carrinho-footer-fixo {
      border-top: 1px solid #edf0f3;
      padding: 14px 24px 24px;
      background: #ffffff;
      box-shadow: 0 -8px 22px rgba(17, 24, 39, 0.045);
      flex: 0 0 auto;
    }

    .carrinho-detalhes-financeiros {
      display: grid;
      gap: 7px;
      margin-bottom: 10px;
      color: #6b7280;
      font-size: 14px;
    }

    .carrinho-linha-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .carrinho-linha-total strong {
      color: #111827;
    }

    #modalCarrinho .total-carrinho {
      border-top: 1px solid #f3f4f6;
      margin-top: 10px;
      padding-top: 12px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
    }

    #modalCarrinho .total-carrinho span {
      color: #111827;
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding-bottom: 4px;
    }

    #modalCarrinho .total-carrinho strong {
      font-size: 34px;
      color: #ef4444;
      line-height: 1;
      letter-spacing: -0.04em;
      font-weight: 950;
    }

    .carrinho-footer-acoes {
      display: grid;
      grid-template-columns: 1fr 1.45fr;
      gap: 10px;
    }

    .btn-continuar-comprando {
      width: 100%;
      border: 1px solid #e5e7eb;
      background: white;
      color: #374151;
      padding: 14px;
      border-radius: 15px;
      font-size: 15px;
      font-weight: 900;
      cursor: pointer;
    }

    .btn-continuar-comprando:hover {
      background: #f9fafb;
    }

    #modalCarrinho #finalizarPedido {
      margin: 0;
      padding: 14px;
      border-radius: 15px;
      font-size: 16px;
      font-weight: 950;
      box-shadow: 0 10px 22px rgba(239, 68, 68, 0.22);
    }

    .carrinho-vazio {
      text-align: center;
      padding: 34px 12px;
      color: #6b7280;
      background: #f9fafb;
      border: 1px dashed #d1d5db;
      border-radius: 18px;
      font-weight: 700;
    }

    @keyframes deliveryosCarrinhoPulse {
      0% { transform: translateX(-50%) translateY(0) scale(1); }
      45% { transform: translateX(-50%) translateY(-3px) scale(1.025); }
      100% { transform: translateX(-50%) translateY(0) scale(1); }
    }

    @keyframes deliveryosCarrinhoContadorPulse {
      0% { transform: scale(1); }
      45% { transform: scale(1.17); }
      100% { transform: scale(1); }
    }

    @keyframes deliveryosItemEntrada {
      0% { opacity: 0; transform: translateY(6px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 700px) {
      #modalCarrinho .modal-produto-content {
        width: calc(100vw - 16px);
        max-height: 92vh;
        border-radius: 22px;
      }

      #modalCarrinho h2 {
        padding: 24px 18px 14px;
        font-size: 23px;
      }

      #itensCarrinho {
        padding: 0 14px 12px;
      }

      .item-carrinho {
        padding: 11px;
        border-radius: 18px;
      }

      .item-carrinho-topo {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .item-carrinho-foto {
        width: 66px;
        height: 66px;
      }

      .item-carrinho-total-box {
        text-align: left;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        background: #f9fafb;
        border-radius: 14px;
        padding: 10px;
      }

      .item-carrinho-total-label {
        font-size: 11px;
      }

      .item-carrinho-acoes {
        align-items: center;
      }

      .controle-item button {
        width: 30px;
        height: 30px;
      }

      .carrinho-footer-fixo {
        padding: 13px 16px 20px;
      }

      .carrinho-footer-acoes {
        grid-template-columns: 1fr;
      }

      #modalCarrinho .total-carrinho strong {
        font-size: 30px;
      }
    }
  `;

  document.head.appendChild(style);
}

function prepararFooterCarrinho() {
  if (!modalCarrinho || !finalizarPedido) return;

  const conteudoModal = modalCarrinho.querySelector(".modal-produto-content");
  const totalCarrinhoBox = totalCarrinhoModal ? totalCarrinhoModal.closest(".total-carrinho") : null;

  if (!conteudoModal || !totalCarrinhoBox) return;

  let footer = conteudoModal.querySelector(".carrinho-footer-fixo");

  if (!footer) {
    footer = document.createElement("div");
    footer.className = "carrinho-footer-fixo";

    const detalhes = document.createElement("div");
    detalhes.id = "carrinhoDetalhesFinanceiros";
    detalhes.className = "carrinho-detalhes-financeiros";

    const acoes = document.createElement("div");
    acoes.className = "carrinho-footer-acoes";

    const btnContinuar = document.createElement("button");
    btnContinuar.type = "button";
    btnContinuar.id = "continuarComprando";
    btnContinuar.className = "btn-continuar-comprando";
    btnContinuar.textContent = "Continuar comprando";
    btnContinuar.addEventListener("click", fecharModalCarrinho);

    conteudoModal.appendChild(footer);
    footer.appendChild(detalhes);
    footer.appendChild(totalCarrinhoBox);
    footer.appendChild(acoes);
    acoes.appendChild(btnContinuar);
    acoes.appendChild(finalizarPedido);
  }
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

function criarFotoItemHTML(item) {
  if (item.imagem_url) {
    return `
      <div class="item-carrinho-foto">
        <img src="${escaparHTML(item.imagem_url)}" alt="${escaparHTML(item.nome)}">
      </div>
    `;
  }

  return `<div class="item-carrinho-foto"><span>Sem foto</span></div>`;
}

function renderizarItensCarrinho(animar = false) {
  if (!itensCarrinho) return;

  if (!carrinho.length) {
    itensCarrinho.innerHTML = `<p class="carrinho-vazio">Seu carrinho está vazio.</p>`;
    return;
  }

  itensCarrinho.innerHTML = carrinho.map((item) => {
    const adicionaisHTML = (item.adicionais || []).length
      ? `
        <div class="adicionais-carrinho-chips">
          ${(item.adicionais || []).map((adicional) => {
            return `
              <span class="adicional-carrinho-chip">
                + ${escaparHTML(adicional.nome)}
                <strong>${formatarMoeda(adicional.preco)}</strong>
              </span>
            `;
          }).join("")}
        </div>
      `
      : `<span class="sem-adicionais-carrinho">Sem adicionais</span>`;

    const observacaoHTML = item.observacao
      ? `<span class="observacao-tag">📝 ${escaparHTML(item.observacao)}</span>`
      : `<p class="observacao-vazia">Sem observação</p>`;

    const quantidade = Number(item.quantidade || 1);

    return `
      <div class="item-carrinho ${animar ? "deliveryos-item-entrada" : ""}">
        <div class="item-carrinho-topo">
          <div class="item-carrinho-info">
            ${criarFotoItemHTML(item)}

            <div>
              <h3>${escaparHTML(item.nome)}</h3>
              <p class="item-carrinho-preco-base">${formatarMoeda(item.preco_unitario)} cada</p>
              ${adicionaisHTML}
              ${observacaoHTML}
            </div>
          </div>

          <div class="item-carrinho-total-box">
            <span class="item-carrinho-total-label">Total do item</span>
            <strong class="item-carrinho-preco">
              ${formatarMoeda(calcularSubtotalItem(item))}
            </strong>
          </div>
        </div>

        <div class="item-carrinho-acoes">
          <div class="grupo-acoes-item">
            <button class="btn-remover-item" title="Remover item" onclick="DeliveryOSCarrinho.remover('${item.id}')">
              🗑️
            </button>

            <button class="btn-editar-observacao" title="Editar observação" onclick="DeliveryOSCarrinho.editarObservacao('${item.id}')">
              ✏️
            </button>
          </div>

          <div class="controle-item">
            <button onclick="DeliveryOSCarrinho.alterarQuantidade('${item.id}', ${quantidade - 1})">−</button>
            <strong>${quantidade}</strong>
            <button onclick="DeliveryOSCarrinho.alterarQuantidade('${item.id}', ${quantidade + 1})">+</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function atualizarDetalhesFinanceiros() {
  const detalhes = document.getElementById("carrinhoDetalhesFinanceiros");

  if (!detalhes) return;

  const subtotal = calcularSubtotalCarrinho();
  const taxaEntrega = obterTaxaEntrega();

  detalhes.innerHTML = `
    <div class="carrinho-linha-total">
      <span>Subtotal</span>
      <strong>${formatarMoeda(subtotal)}</strong>
    </div>

    <div class="carrinho-linha-total">
      <span>Entrega</span>
      <strong>${taxaEntrega > 0 ? formatarMoeda(taxaEntrega) : "A combinar"}</strong>
    </div>
  `;
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

  atualizarDetalhesFinanceiros();
  ultimaQuantidadeCarrinho = quantidade;
}

function atualizarCarrinho(animar = false) {
  prepararFooterCarrinho();
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
  const taxaEntrega = obterTaxaEntrega();
  let mensagem = "Olá! Quero fazer um pedido:\n\n";

  carrinho.forEach((item, index) => {
    mensagem += `*${index + 1}. ${item.nome}*\n`;
    mensagem += `Quantidade: ${item.quantidade}\n`;
    mensagem += `Valor do item: ${formatarMoeda(calcularSubtotalItem(item))}\n`;

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

  mensagem += `Subtotal: ${formatarMoeda(calcularSubtotalCarrinho())}\n`;
  mensagem += `Entrega: ${taxaEntrega > 0 ? formatarMoeda(taxaEntrega) : "A combinar"}\n`;
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

instalarEstilosCarrinho();
prepararFooterCarrinho();

window.DeliveryOSCarrinho = {
  adicionar: adicionarAoCarrinho,
  remover: removerDoCarrinho,
  alterarQuantidade: alterarQuantidadeItem,
  editarObservacao: editarObservacaoItem,
  limpar: limparCarrinho,
  abrir: abrirModalCarrinho,
  atualizar: atualizarCarrinho,
  listar: () => carrinho,
  subtotal: calcularSubtotalCarrinho,
  total: calcularTotalCarrinho,
  quantidade: calcularQuantidadeCarrinho
};

atualizarCarrinho();
