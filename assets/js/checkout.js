<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cardápio Online</title>
  <link rel="stylesheet" href="assets/css/loja.css">
</head>
<body>

<header class="loja-header">
  <div class="loja-banner" id="lojaBanner">
    <div class="loja-banner-overlay"></div>

    <div class="loja-header-content">
      <div class="loja-avatar" id="lojaLogo">D</div>

      <div class="loja-info">
        <div class="loja-status-line">
          <span id="statusLoja" class="status-loja aberto">Aberta</span>
          <span id="tempoEntrega">Carregando...</span>
        </div>

        <h1 id="nomeLoja">Carregando...</h1>
        <p id="descricaoLoja"></p>

        <div class="loja-meta">
          <span id="pedidoMinimoLoja">Pedido mínimo: R$ 0,00</span>
          <span id="taxaEntregaLoja">Entrega a combinar</span>
        </div>
      </div>
    </div>
  </div>
</header>

<main class="loja-container">
  <section class="busca-cardapio">
    <div class="campo-busca">
      <span>🔎</span>
      <input type="text" id="buscarProdutoLoja" placeholder="Buscar produto no cardápio...">
    </div>
  </section>

  <section class="categorias-wrapper">
    <div class="categorias-loja" id="categoriasLoja"></div>
  </section>

  <section class="produtos-loja" id="produtosLoja">
    <div class="skeleton-grid">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
  </section>
</main>

<div id="modalProduto" class="modal-produto oculto">
  <div class="modal-produto-content modal-produto-app">
    <button id="fecharModalProduto" class="fechar-modal">×</button>

    <div class="modal-produto-imagem" id="modalProdutoImagem"></div>

    <div class="modal-produto-body">
      <div class="modal-produto-titulo">
        <div>
          <h2 id="modalProdutoNome"></h2>
          <p id="modalProdutoDescricao"></p>
        </div>

        <strong id="modalProdutoPreco"></strong>
      </div>

      <div id="modalProdutoGrupos"></div>

      <div class="observacao-box">
        <label for="observacaoProduto">Observação</label>
        <textarea id="observacaoProduto" placeholder="Ex: sem cebola, molho separado..."></textarea>
      </div>
    </div>

    <div class="modal-produto-footer">
      <div class="quantidade-box">
        <button id="diminuirQuantidade" type="button">-</button>
        <span id="quantidadeProduto">1</span>
        <button id="aumentarQuantidade" type="button">+</button>
      </div>

      <button id="adicionarCarrinho" class="btn-adicionar-carrinho">
        <span>Adicionar</span>
        <strong id="totalProdutoModal">R$ 0,00</strong>
      </button>
    </div>
  </div>
</div>

<div id="modalCarrinho" class="modal-produto oculto">
  <div class="modal-produto-content modal-carrinho-content">
    <button id="fecharCarrinho" class="fechar-modal">×</button>

    <h2>Seu carrinho</h2>

    <div id="itensCarrinho" class="itens-carrinho"></div>

    <div class="total-carrinho">
      <span>Total</span>
      <strong id="totalCarrinhoModal">R$ 0,00</strong>
    </div>

    <button id="finalizarPedido" class="btn-adicionar-carrinho">
      Finalizar pedido
    </button>
  </div>
</div>

<div id="carrinhoResumo" class="carrinho-resumo oculto">
  <div class="carrinho-resumo-info">
    <strong id="carrinhoQuantidade">0 itens</strong>
    <span id="carrinhoTotal">R$ 0,00</span>
  </div>

  <button id="abrirCarrinho">
    Ver carrinho
  </button>
</div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/config.js"></script>
<script src="assets/js/supabase.js"></script>
<script src="assets/js/loja.js"></script>
<script src="assets/js/carrinho.js"></script>
<script src="assets/js/checkout.js"></script>

</body>
</html>
