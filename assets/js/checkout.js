// ============================================================
// CHECKOUT - DELIVERYOS 1.0
// Fluxo inspirado em aplicativos profissionais:
// Pedido -> Entrega/Retirada -> Endereço -> Pagamento -> Confirmação
// ============================================================

const CHECKOUT_STORAGE_KEY = "deliveryos_checkout_dados";

let checkoutEtapaAtual = 1;
let checkoutDados = carregarDadosCheckout();

function checkoutMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function checkoutEscaparHTML(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function carregarDadosCheckout() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHECKOUT_STORAGE_KEY)) || {};

    return {
      tipoRecebimento: dados.tipoRecebimento || "delivery",
      nomeCliente: dados.nomeCliente || "",
      telefoneCliente: dados.telefoneCliente || "",
      cep: dados.cep || "",
      rua: dados.rua || "",
      numero: dados.numero || "",
      complemento: dados.complemento || "",
      bairro: dados.bairro || "",
      cidade: dados.cidade || "",
      referencia: dados.referencia || "",
      pagamento: dados.pagamento || "pix",
      trocoPara: dados.trocoPara || "",
      observacaoPedido: dados.observacaoPedido || ""
    };
  } catch (error) {
    console.error("Erro ao carregar checkout:", error);

    return {
      tipoRecebimento: "delivery",
      nomeCliente: "",
      telefoneCliente: "",
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      referencia: "",
      pagamento: "pix",
      trocoPara: "",
      observacaoPedido: ""
    };
  }
}

function salvarDadosCheckout() {
  localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(checkoutDados));
}

function obterItensCheckout() {
  if (!window.DeliveryOSCarrinho || typeof window.DeliveryOSCarrinho.listar !== "function") {
    return [];
  }

  return window.DeliveryOSCarrinho.listar() || [];
}

function calcularSubtotalItemCheckout(item) {
  const precoProduto = Number(item.preco_unitario || item.preco || 0);
  const totalAdicionais = (item.adicionais || []).reduce((total, adicional) => {
    return total + Number(adicional.preco || 0);
  }, 0);

  return (precoProduto + totalAdicionais) * Number(item.quantidade || 1);
}

function calcularSubtotalCheckout() {
  return obterItensCheckout().reduce((total, item) => {
    return total + calcularSubtotalItemCheckout(item);
  }, 0);
}

function obterTaxaEntregaCheckout() {
  if (checkoutDados.tipoRecebimento === "retirada") {
    return 0;
  }

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

function calcularTotalCheckout() {
  return calcularSubtotalCheckout() + obterTaxaEntregaCheckout();
}

function instalarCheckout() {
  if (document.getElementById("modalCheckout")) return;

  instalarEstilosCheckout();

  const modal = document.createElement("div");
  modal.id = "modalCheckout";
  modal.className = "checkout-modal oculto";
  modal.innerHTML = `
    <div class="checkout-content">
      <button id="fecharCheckout" class="checkout-fechar" type="button">×</button>

      <div class="checkout-layout">
        <section class="checkout-main">
          <header class="checkout-header">
            <span>Checkout</span>
            <h2>Finalize seu pedido</h2>
            <p>Preencha apenas o necessário para confirmar.</p>
          </header>

          <div class="checkout-steps" id="checkoutSteps"></div>
          <div id="checkoutEtapa" class="checkout-etapa"></div>
        </section>

        <aside class="checkout-resumo">
          <h3>Resumo</h3>
          <div id="checkoutResumoItens"></div>
          <div class="checkout-totais" id="checkoutTotais"></div>
        </aside>
      </div>

      <footer class="checkout-footer">
        <button id="checkoutVoltar" class="checkout-btn checkout-btn-secundario" type="button">Voltar</button>
        <button id="checkoutContinuar" class="checkout-btn checkout-btn-principal" type="button">Continuar</button>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("fecharCheckout").addEventListener("click", fecharCheckout);
  document.getElementById("checkoutVoltar").addEventListener("click", voltarCheckout);
  document.getElementById("checkoutContinuar").addEventListener("click", continuarCheckout);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      fecharCheckout();
    }
  });
}

function instalarEstilosCheckout() {
  if (document.getElementById("deliveryos-checkout-estilos")) return;

  const style = document.createElement("style");
  style.id = "deliveryos-checkout-estilos";
  style.innerHTML = `
    .checkout-modal {
      position: fixed;
      inset: 0;
      background: rgba(17, 24, 39, 0.64);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      z-index: 1200;
    }

    .checkout-content {
      position: relative;
      width: min(1080px, 100%);
      max-height: 94vh;
      background: #ffffff;
      border-radius: 28px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 28px 80px rgba(0, 0, 0, 0.28);
    }

    .checkout-fechar {
      position: absolute;
      right: 18px;
      top: 18px;
      z-index: 4;
      width: 42px;
      height: 42px;
      border: 0;
      border-radius: 14px;
      background: #f3f4f6;
      color: #111827;
      font-size: 28px;
      cursor: pointer;
    }

    .checkout-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      min-height: 640px;
      overflow: hidden;
    }

    .checkout-main {
      padding: 30px;
      overflow-y: auto;
    }

    .checkout-header span {
      display: inline-flex;
      background: #fee2e2;
      color: #991b1b;
      padding: 7px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
      margin-bottom: 12px;
    }

    .checkout-header h2 {
      margin: 0 0 6px;
      font-size: 32px;
      letter-spacing: -0.04em;
      color: #111827;
    }

    .checkout-header p {
      margin: 0;
      color: #6b7280;
    }

    .checkout-steps {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin: 24px 0;
    }

    .checkout-step {
      border-radius: 999px;
      height: 8px;
      background: #e5e7eb;
      overflow: hidden;
    }

    .checkout-step.ativo,
    .checkout-step.concluido {
      background: #ef4444;
    }

    .checkout-etapa {
      display: grid;
      gap: 18px;
    }

    .checkout-card {
      border: 1px solid #e5e7eb;
      border-radius: 22px;
      padding: 18px;
      background: #ffffff;
      box-shadow: 0 8px 24px rgba(17, 24, 39, 0.05);
    }

    .checkout-card h3 {
      margin: 0 0 8px;
      font-size: 20px;
      color: #111827;
    }

    .checkout-card p {
      margin: 0;
      color: #6b7280;
      line-height: 1.45;
    }

    .checkout-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .checkout-campo {
      display: grid;
      gap: 7px;
    }

    .checkout-campo label {
      font-weight: 900;
      color: #374151;
      font-size: 13px;
    }

    .checkout-campo input,
    .checkout-campo textarea {
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 15px;
      padding: 13px 14px;
      outline: none;
      color: #111827;
      background: #ffffff;
    }

    .checkout-campo input:focus,
    .checkout-campo textarea:focus {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.10);
    }

    .checkout-campo-full {
      grid-column: 1 / -1;
    }

    .checkout-opcoes {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .checkout-opcao {
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      padding: 16px;
      cursor: pointer;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      background: #ffffff;
      transition: border-color .16s ease, background .16s ease, transform .16s ease;
    }

    .checkout-opcao:hover {
      transform: translateY(-1px);
    }

    .checkout-opcao.ativo {
      border-color: #ef4444;
      background: #fff5f5;
    }

    .checkout-opcao input {
      margin-top: 4px;
      accent-color: #ef4444;
    }

    .checkout-opcao strong {
      display: block;
      color: #111827;
      margin-bottom: 4px;
    }

    .checkout-opcao span {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.35;
    }

    .checkout-resumo {
      background: #f9fafb;
      border-left: 1px solid #e5e7eb;
      padding: 30px 24px;
      overflow-y: auto;
    }

    .checkout-resumo h3 {
      margin: 0 0 16px;
      font-size: 22px;
      letter-spacing: -0.03em;
      color: #111827;
    }

    .checkout-resumo-item {
      display: grid;
      gap: 4px;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .checkout-resumo-item-topo {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      font-weight: 900;
      color: #111827;
    }

    .checkout-resumo-item small {
      display: block;
      color: #6b7280;
      line-height: 1.35;
    }

    .checkout-totais {
      display: grid;
      gap: 10px;
      margin-top: 18px;
    }

    .checkout-total-linha {
      display: flex;
      justify-content: space-between;
      color: #4b5563;
      font-weight: 800;
    }

    .checkout-total-linha.final {
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid #d1d5db;
      font-size: 22px;
      color: #111827;
    }

    .checkout-total-linha.final strong {
      color: #ef4444;
    }

    .checkout-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      background: #ffffff;
    }

    .checkout-btn {
      border: none;
      border-radius: 16px;
      padding: 14px 20px;
      font-weight: 900;
      cursor: pointer;
      min-height: 52px;
    }

    .checkout-btn-secundario {
      background: #f3f4f6;
      color: #111827;
    }

    .checkout-btn-principal {
      background: #ef4444;
      color: white;
      min-width: 210px;
    }

    .checkout-confirmacao {
      display: grid;
      gap: 12px;
    }

    .checkout-confirmacao-linha {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 12px;
      padding: 13px;
      border-radius: 16px;
      background: #f9fafb;
    }

    .checkout-confirmacao-linha span {
      color: #6b7280;
      font-weight: 800;
    }

    .checkout-confirmacao-linha strong {
      color: #111827;
    }

    .checkout-alerta {
      border-radius: 16px;
      padding: 14px;
      background: #fff7ed;
      color: #9a3412;
      font-weight: 800;
      line-height: 1.35;
    }

    @media (max-width: 880px) {
      .checkout-modal {
        align-items: flex-end;
        padding: 0;
      }

      .checkout-content {
        max-height: 96vh;
        border-radius: 28px 28px 0 0;
      }

      .checkout-layout {
        grid-template-columns: 1fr;
        min-height: auto;
        overflow-y: auto;
      }

      .checkout-main {
        padding: 24px 18px;
      }

      .checkout-resumo {
        border-left: 0;
        border-top: 1px solid #e5e7eb;
        padding: 20px 18px;
      }

      .checkout-steps {
        grid-template-columns: repeat(5, 1fr);
      }

      .checkout-grid,
      .checkout-opcoes {
        grid-template-columns: 1fr;
      }

      .checkout-footer {
        position: sticky;
        bottom: 0;
      }

      .checkout-btn-principal {
        min-width: 0;
        flex: 1;
      }
    }

    @media (max-width: 460px) {
      .checkout-header h2 {
        font-size: 27px;
      }

      .checkout-confirmacao-linha {
        grid-template-columns: 1fr;
        gap: 4px;
      }
    }
  `;

  document.head.appendChild(style);
}

function abrirCheckout() {
  instalarCheckout();

  const itens = obterItensCheckout();

  if (!itens.length) {
    alert("Seu carrinho está vazio.");
    return;
  }

  checkoutEtapaAtual = 1;
  renderizarCheckout();
  document.getElementById("modalCheckout").classList.remove("oculto");
  document.body.classList.add("modal-aberto");
}

function fecharCheckout() {
  const modal = document.getElementById("modalCheckout");

  if (modal) {
    modal.classList.add("oculto");
  }

  document.body.classList.remove("modal-aberto");
}

function renderizarCheckout() {
  renderizarStepsCheckout();
  renderizarEtapaCheckout();
  renderizarResumoCheckout();
  atualizarBotoesCheckout();
}

function renderizarStepsCheckout() {
  const steps = document.getElementById("checkoutSteps");

  if (!steps) return;

  steps.innerHTML = [1, 2, 3, 4, 5].map((etapa) => {
    const classe = etapa < checkoutEtapaAtual ? "concluido" : etapa === checkoutEtapaAtual ? "ativo" : "";
    return `<div class="checkout-step ${classe}"></div>`;
  }).join("");
}

function renderizarEtapaCheckout() {
  const container = document.getElementById("checkoutEtapa");

  if (!container) return;

  if (checkoutEtapaAtual === 1) {
    container.innerHTML = renderizarEtapaPedido();
  }

  if (checkoutEtapaAtual === 2) {
    container.innerHTML = renderizarEtapaRecebimento();
  }

  if (checkoutEtapaAtual === 3) {
    container.innerHTML = renderizarEtapaEndereco();
  }

  if (checkoutEtapaAtual === 4) {
    container.innerHTML = renderizarEtapaPagamento();
  }

  if (checkoutEtapaAtual === 5) {
    container.innerHTML = renderizarEtapaConfirmacao();
  }

  preencherEventosEtapa();
}

function renderizarEtapaPedido() {
  const itens = obterItensCheckout();

  return `
    <div class="checkout-card">
      <h3>Revise seu pedido</h3>
      <p>Confira os itens antes de continuar. Para alterar quantidades, volte ao carrinho.</p>
    </div>

    <div class="checkout-card">
      ${itens.map((item) => {
        const adicionais = (item.adicionais || []).map((adicional) => `+ ${checkoutEscaparHTML(adicional.nome)}`).join("<br>");
        const observacao = item.observacao ? `<small>Obs: ${checkoutEscaparHTML(item.observacao)}</small>` : "";

        return `
          <div class="checkout-resumo-item">
            <div class="checkout-resumo-item-topo">
              <span>${Number(item.quantidade || 1)}x ${checkoutEscaparHTML(item.nome)}</span>
              <strong>${checkoutMoeda(calcularSubtotalItemCheckout(item))}</strong>
            </div>
            ${adicionais ? `<small>${adicionais}</small>` : ""}
            ${observacao}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderizarEtapaRecebimento() {
  return `
    <div class="checkout-card">
      <h3>Como deseja receber?</h3>
      <p>Escolha se o cliente vai receber em casa ou retirar no balcão.</p>
    </div>

    <div class="checkout-opcoes">
      <label class="checkout-opcao ${checkoutDados.tipoRecebimento === "delivery" ? "ativo" : ""}">
        <input type="radio" name="tipoRecebimento" value="delivery" ${checkoutDados.tipoRecebimento === "delivery" ? "checked" : ""}>
        <div>
          <strong>Delivery</strong>
          <span>Receber o pedido no endereço informado.</span>
        </div>
      </label>

      <label class="checkout-opcao ${checkoutDados.tipoRecebimento === "retirada" ? "ativo" : ""}">
        <input type="radio" name="tipoRecebimento" value="retirada" ${checkoutDados.tipoRecebimento === "retirada" ? "checked" : ""}>
        <div>
          <strong>Retirar no balcão</strong>
          <span>O cliente busca o pedido no estabelecimento.</span>
        </div>
      </label>
    </div>
  `;
}

function renderizarEtapaEndereco() {
  if (checkoutDados.tipoRecebimento === "retirada") {
    return `
      <div class="checkout-card">
        <h3>Retirada selecionada</h3>
        <p>Como o pedido será retirado no balcão, não é necessário informar endereço.</p>
      </div>

      <div class="checkout-grid">
        <div class="checkout-campo">
          <label>Nome</label>
          <input id="checkoutNomeCliente" type="text" value="${checkoutEscaparHTML(checkoutDados.nomeCliente)}" placeholder="Nome do cliente">
        </div>

        <div class="checkout-campo">
          <label>WhatsApp</label>
          <input id="checkoutTelefoneCliente" type="tel" value="${checkoutEscaparHTML(checkoutDados.telefoneCliente)}" placeholder="(27) 99999-9999">
        </div>

        <div class="checkout-campo checkout-campo-full">
          <label>Observação geral</label>
          <textarea id="checkoutObservacaoPedido" placeholder="Ex: retirar às 20h">${checkoutEscaparHTML(checkoutDados.observacaoPedido)}</textarea>
        </div>
      </div>
    `;
  }

  return `
    <div class="checkout-card">
      <h3>Endereço de entrega</h3>
      <p>Informe os dados para o restaurante preparar a entrega.</p>
    </div>

    <div class="checkout-grid">
      <div class="checkout-campo">
        <label>Nome</label>
        <input id="checkoutNomeCliente" type="text" value="${checkoutEscaparHTML(checkoutDados.nomeCliente)}" placeholder="Nome do cliente">
      </div>

      <div class="checkout-campo">
        <label>WhatsApp</label>
        <input id="checkoutTelefoneCliente" type="tel" value="${checkoutEscaparHTML(checkoutDados.telefoneCliente)}" placeholder="(27) 99999-9999">
      </div>

      <div class="checkout-campo">
        <label>CEP</label>
        <input id="checkoutCep" type="text" value="${checkoutEscaparHTML(checkoutDados.cep)}" placeholder="00000-000">
      </div>

      <div class="checkout-campo">
        <label>Bairro</label>
        <input id="checkoutBairro" type="text" value="${checkoutEscaparHTML(checkoutDados.bairro)}" placeholder="Bairro">
      </div>

      <div class="checkout-campo checkout-campo-full">
        <label>Rua</label>
        <input id="checkoutRua" type="text" value="${checkoutEscaparHTML(checkoutDados.rua)}" placeholder="Rua / Avenida">
      </div>

      <div class="checkout-campo">
        <label>Número</label>
        <input id="checkoutNumero" type="text" value="${checkoutEscaparHTML(checkoutDados.numero)}" placeholder="Número">
      </div>

      <div class="checkout-campo">
        <label>Complemento</label>
        <input id="checkoutComplemento" type="text" value="${checkoutEscaparHTML(checkoutDados.complemento)}" placeholder="Apto, bloco, casa...">
      </div>

      <div class="checkout-campo">
        <label>Cidade</label>
        <input id="checkoutCidade" type="text" value="${checkoutEscaparHTML(checkoutDados.cidade)}" placeholder="Cidade">
      </div>

      <div class="checkout-campo">
        <label>Referência</label>
        <input id="checkoutReferencia" type="text" value="${checkoutEscaparHTML(checkoutDados.referencia)}" placeholder="Ponto de referência">
      </div>

      <div class="checkout-campo checkout-campo-full">
        <label>Observação geral</label>
        <textarea id="checkoutObservacaoPedido" placeholder="Ex: interfone não funciona">${checkoutEscaparHTML(checkoutDados.observacaoPedido)}</textarea>
      </div>
    </div>
  `;
}

function renderizarEtapaPagamento() {
  return `
    <div class="checkout-card">
      <h3>Forma de pagamento</h3>
      <p>Escolha como deseja pagar o pedido.</p>
    </div>

    <div class="checkout-opcoes">
      ${criarOpcaoPagamento("pix", "PIX", "Pagamento via chave PIX da loja.")}
      ${criarOpcaoPagamento("dinheiro", "Dinheiro", "Informe o troco, se necessário.")}
      ${criarOpcaoPagamento("cartao_entrega", "Cartão na entrega", "Débito ou crédito na maquininha.")}
      ${criarOpcaoPagamento("outro", "Combinar com a loja", "A loja confirma o pagamento pelo WhatsApp.")}
    </div>

    <div id="checkoutTrocoBox" class="checkout-card" style="display: ${checkoutDados.pagamento === "dinheiro" ? "block" : "none"};">
      <div class="checkout-campo">
        <label>Troco para quanto?</label>
        <input id="checkoutTrocoPara" type="number" step="0.01" value="${checkoutEscaparHTML(checkoutDados.trocoPara)}" placeholder="Ex: 100,00">
      </div>
    </div>
  `;
}

function criarOpcaoPagamento(valor, titulo, descricao) {
  return `
    <label class="checkout-opcao ${checkoutDados.pagamento === valor ? "ativo" : ""}">
      <input type="radio" name="checkoutPagamento" value="${valor}" ${checkoutDados.pagamento === valor ? "checked" : ""}>
      <div>
        <strong>${titulo}</strong>
        <span>${descricao}</span>
      </div>
    </label>
  `;
}

function renderizarEtapaConfirmacao() {
  const endereco = checkoutDados.tipoRecebimento === "retirada"
    ? "Retirada no balcão"
    : `${checkoutDados.rua}, ${checkoutDados.numero} - ${checkoutDados.bairro}${checkoutDados.complemento ? `, ${checkoutDados.complemento}` : ""}`;

  const pagamentoTexto = {
    pix: "PIX",
    dinheiro: checkoutDados.trocoPara ? `Dinheiro - troco para ${checkoutMoeda(checkoutDados.trocoPara)}` : "Dinheiro",
    cartao_entrega: "Cartão na entrega",
    outro: "Combinar com a loja"
  }[checkoutDados.pagamento] || "Não informado";

  return `
    <div class="checkout-card">
      <h3>Confirme os dados</h3>
      <p>Confira tudo antes de enviar o pedido para a loja.</p>
    </div>

    <div class="checkout-card checkout-confirmacao">
      <div class="checkout-confirmacao-linha">
        <span>Cliente</span>
        <strong>${checkoutEscaparHTML(checkoutDados.nomeCliente || "Não informado")}</strong>
      </div>

      <div class="checkout-confirmacao-linha">
        <span>WhatsApp</span>
        <strong>${checkoutEscaparHTML(checkoutDados.telefoneCliente || "Não informado")}</strong>
      </div>

      <div class="checkout-confirmacao-linha">
        <span>Recebimento</span>
        <strong>${checkoutDados.tipoRecebimento === "delivery" ? "Delivery" : "Retirada"}</strong>
      </div>

      <div class="checkout-confirmacao-linha">
        <span>Endereço</span>
        <strong>${checkoutEscaparHTML(endereco)}</strong>
      </div>

      <div class="checkout-confirmacao-linha">
        <span>Pagamento</span>
        <strong>${checkoutEscaparHTML(pagamentoTexto)}</strong>
      </div>

      ${checkoutDados.observacaoPedido ? `
        <div class="checkout-confirmacao-linha">
          <span>Observação</span>
          <strong>${checkoutEscaparHTML(checkoutDados.observacaoPedido)}</strong>
        </div>
      ` : ""}
    </div>

    <div class="checkout-alerta">
      Ao confirmar, o pedido será enviado para o WhatsApp da loja.
    </div>
  `;
}

function preencherEventosEtapa() {
  document.querySelectorAll('input[name="tipoRecebimento"]').forEach((input) => {
    input.addEventListener("change", () => {
      checkoutDados.tipoRecebimento = input.value;
      salvarDadosCheckout();
      renderizarCheckout();
    });
  });

  document.querySelectorAll('input[name="checkoutPagamento"]').forEach((input) => {
    input.addEventListener("change", () => {
      checkoutDados.pagamento = input.value;
      salvarDadosCheckout();
      renderizarCheckout();
    });
  });

  const campos = {
    checkoutNomeCliente: "nomeCliente",
    checkoutTelefoneCliente: "telefoneCliente",
    checkoutCep: "cep",
    checkoutRua: "rua",
    checkoutNumero: "numero",
    checkoutComplemento: "complemento",
    checkoutBairro: "bairro",
    checkoutCidade: "cidade",
    checkoutReferencia: "referencia",
    checkoutTrocoPara: "trocoPara",
    checkoutObservacaoPedido: "observacaoPedido"
  };

  Object.entries(campos).forEach(([id, campo]) => {
    const elemento = document.getElementById(id);

    if (!elemento) return;

    elemento.addEventListener("input", () => {
      checkoutDados[campo] = elemento.value;
      salvarDadosCheckout();
      renderizarResumoCheckout();
    });
  });
}

function renderizarResumoCheckout() {
  const itensContainer = document.getElementById("checkoutResumoItens");
  const totaisContainer = document.getElementById("checkoutTotais");

  if (!itensContainer || !totaisContainer) return;

  const itens = obterItensCheckout();
  const subtotal = calcularSubtotalCheckout();
  const entrega = obterTaxaEntregaCheckout();
  const total = subtotal + entrega;

  itensContainer.innerHTML = itens.map((item) => {
    const adicionais = (item.adicionais || []).map((adicional) => `+ ${checkoutEscaparHTML(adicional.nome)}`).join("<br>");

    return `
      <div class="checkout-resumo-item">
        <div class="checkout-resumo-item-topo">
          <span>${Number(item.quantidade || 1)}x ${checkoutEscaparHTML(item.nome)}</span>
          <strong>${checkoutMoeda(calcularSubtotalItemCheckout(item))}</strong>
        </div>
        ${adicionais ? `<small>${adicionais}</small>` : ""}
      </div>
    `;
  }).join("");

  totaisContainer.innerHTML = `
    <div class="checkout-total-linha">
      <span>Subtotal</span>
      <strong>${checkoutMoeda(subtotal)}</strong>
    </div>

    <div class="checkout-total-linha">
      <span>Entrega</span>
      <strong>${checkoutDados.tipoRecebimento === "retirada" ? "Retirada" : entrega > 0 ? checkoutMoeda(entrega) : "A combinar"}</strong>
    </div>

    <div class="checkout-total-linha final">
      <span>Total</span>
      <strong>${checkoutMoeda(total)}</strong>
    </div>
  `;
}

function atualizarBotoesCheckout() {
  const voltar = document.getElementById("checkoutVoltar");
  const continuar = document.getElementById("checkoutContinuar");

  if (!voltar || !continuar) return;

  voltar.style.visibility = checkoutEtapaAtual === 1 ? "hidden" : "visible";
  continuar.innerText = checkoutEtapaAtual === 5 ? "Confirmar pedido" : "Continuar";
}

function salvarCamposVisiveis() {
  const campos = {
    checkoutNomeCliente: "nomeCliente",
    checkoutTelefoneCliente: "telefoneCliente",
    checkoutCep: "cep",
    checkoutRua: "rua",
    checkoutNumero: "numero",
    checkoutComplemento: "complemento",
    checkoutBairro: "bairro",
    checkoutCidade: "cidade",
    checkoutReferencia: "referencia",
    checkoutTrocoPara: "trocoPara",
    checkoutObservacaoPedido: "observacaoPedido"
  };

  Object.entries(campos).forEach(([id, campo]) => {
    const elemento = document.getElementById(id);

    if (elemento) {
      checkoutDados[campo] = elemento.value.trim();
    }
  });

  salvarDadosCheckout();
}

function validarEtapaAtual() {
  salvarCamposVisiveis();

  if (checkoutEtapaAtual === 3) {
    if (!checkoutDados.nomeCliente.trim()) {
      alert("Informe o nome do cliente.");
      return false;
    }

    if (!checkoutDados.telefoneCliente.trim()) {
      alert("Informe o WhatsApp do cliente.");
      return false;
    }

    if (checkoutDados.tipoRecebimento === "delivery") {
      if (!checkoutDados.rua.trim()) {
        alert("Informe a rua da entrega.");
        return false;
      }

      if (!checkoutDados.numero.trim()) {
        alert("Informe o número da entrega.");
        return false;
      }

      if (!checkoutDados.bairro.trim()) {
        alert("Informe o bairro da entrega.");
        return false;
      }
    }
  }

  if (checkoutEtapaAtual === 4) {
    if (!checkoutDados.pagamento) {
      alert("Escolha a forma de pagamento.");
      return false;
    }
  }

  return true;
}

function continuarCheckout() {
  if (!validarEtapaAtual()) return;

  if (checkoutEtapaAtual === 5) {
    confirmarPedidoCheckout();
    return;
  }

  if (checkoutEtapaAtual === 2 && checkoutDados.tipoRecebimento === "retirada") {
    checkoutEtapaAtual = 3;
  } else {
    checkoutEtapaAtual++;
  }

  renderizarCheckout();
}

function voltarCheckout() {
  salvarCamposVisiveis();

  if (checkoutEtapaAtual <= 1) return;

  checkoutEtapaAtual--;
  renderizarCheckout();
}

function normalizarWhatsappCheckout(numero) {
  return String(numero || "").replace(/\D/g, "");
}

function montarMensagemCheckout() {
  const loja = window.DeliveryOSLojaAtual || {};
  const itens = obterItensCheckout();
  const subtotal = calcularSubtotalCheckout();
  const entrega = obterTaxaEntregaCheckout();
  const total = subtotal + entrega;

  const pagamentoTexto = {
    pix: "PIX",
    dinheiro: checkoutDados.trocoPara ? `Dinheiro - troco para ${checkoutMoeda(checkoutDados.trocoPara)}` : "Dinheiro",
    cartao_entrega: "Cartão na entrega",
    outro: "Combinar com a loja"
  }[checkoutDados.pagamento] || "Não informado";

  let mensagem = `Olá! Quero fazer um pedido${loja.nome ? ` na ${loja.nome}` : ""}:\n\n`;

  mensagem += `*Cliente:* ${checkoutDados.nomeCliente}\n`;
  mensagem += `*WhatsApp:* ${checkoutDados.telefoneCliente}\n`;
  mensagem += `*Recebimento:* ${checkoutDados.tipoRecebimento === "delivery" ? "Delivery" : "Retirada no balcão"}\n\n`;

  if (checkoutDados.tipoRecebimento === "delivery") {
    mensagem += `*Endereço:*\n`;
    mensagem += `${checkoutDados.rua}, ${checkoutDados.numero}\n`;
    mensagem += `${checkoutDados.bairro}${checkoutDados.cidade ? ` - ${checkoutDados.cidade}` : ""}\n`;

    if (checkoutDados.complemento) {
      mensagem += `Complemento: ${checkoutDados.complemento}\n`;
    }

    if (checkoutDados.referencia) {
      mensagem += `Referência: ${checkoutDados.referencia}\n`;
    }

    mensagem += "\n";
  }

  mensagem += `*Itens:*\n`;

  itens.forEach((item, index) => {
    mensagem += `\n*${index + 1}. ${item.nome}*\n`;
    mensagem += `Quantidade: ${item.quantidade}\n`;
    mensagem += `Valor: ${checkoutMoeda(calcularSubtotalItemCheckout(item))}\n`;

    if ((item.adicionais || []).length) {
      mensagem += `Adicionais:\n`;

      item.adicionais.forEach((adicional) => {
        mensagem += `+ ${adicional.nome} - ${checkoutMoeda(adicional.preco)}\n`;
      });
    }

    if (item.observacao) {
      mensagem += `Obs: ${item.observacao}\n`;
    }
  });

  if (checkoutDados.observacaoPedido) {
    mensagem += `\n*Observação geral:* ${checkoutDados.observacaoPedido}\n`;
  }

  mensagem += `\n*Pagamento:* ${pagamentoTexto}\n`;
  mensagem += `Subtotal: ${checkoutMoeda(subtotal)}\n`;
  mensagem += `Entrega: ${checkoutDados.tipoRecebimento === "retirada" ? "Retirada" : entrega > 0 ? checkoutMoeda(entrega) : "A combinar"}\n`;
  mensagem += `*Total: ${checkoutMoeda(total)}*`;

  return mensagem;
}

async function tentarSalvarPedidoNoBanco() {
  if (!window.supabaseClient) return;

  const loja = window.DeliveryOSLojaAtual || {};
  const itens = obterItensCheckout();

  if (!loja.id || !itens.length) return;

  try {
    await supabaseClient.from("pedidos").insert({
      loja_id: loja.id,
      cliente_nome: checkoutDados.nomeCliente,
      cliente_whatsapp: checkoutDados.telefoneCliente,
      tipo_recebimento: checkoutDados.tipoRecebimento,
      endereco: checkoutDados.tipoRecebimento === "delivery" ? {
        cep: checkoutDados.cep,
        rua: checkoutDados.rua,
        numero: checkoutDados.numero,
        complemento: checkoutDados.complemento,
        bairro: checkoutDados.bairro,
        cidade: checkoutDados.cidade,
        referencia: checkoutDados.referencia
      } : null,
      pagamento: checkoutDados.pagamento,
      troco_para: checkoutDados.trocoPara ? Number(checkoutDados.trocoPara) : null,
      observacao: checkoutDados.observacaoPedido,
      itens,
      subtotal: calcularSubtotalCheckout(),
      taxa_entrega: obterTaxaEntregaCheckout(),
      total: calcularTotalCheckout(),
      status: "novo"
    });
  } catch (error) {
    console.warn("Pedido não foi salvo no banco. O envio por WhatsApp continuará funcionando.", error);
  }
}

async function confirmarPedidoCheckout() {
  if (!validarEtapaAtual()) return;

  const loja = window.DeliveryOSLojaAtual || {};
  const numeroWhatsApp = normalizarWhatsappCheckout(loja.whatsapp || loja.telefone || "");

  if (!numeroWhatsApp) {
    alert("WhatsApp da loja não configurado. Cadastre o WhatsApp em Configurações.");
    return;
  }

  await tentarSalvarPedidoNoBanco();

  const numeroFinal = `55${numeroWhatsApp.replace(/^55/, "")}`;
  const mensagem = encodeURIComponent(montarMensagemCheckout());
  const link = `https://wa.me/${numeroFinal}?text=${mensagem}`;

  window.open(link, "_blank");

  if (window.DeliveryOSCarrinho && typeof window.DeliveryOSCarrinho.limpar === "function") {
    window.DeliveryOSCarrinho.limpar();
  }

  fecharCheckout();
}

window.DeliveryOSCheckout = {
  abrir: abrirCheckout,
  fechar: fecharCheckout,
  dados: () => checkoutDados,
  total: calcularTotalCheckout
};

instalarCheckout();
