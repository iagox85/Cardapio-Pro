const nomeLoja = document.getElementById("nomeLoja");
const descricaoLoja = document.getElementById("descricaoLoja");
const tempoEntrega = document.getElementById("tempoEntrega");
const categoriasLoja = document.getElementById("categoriasLoja");
const produtosLoja = document.getElementById("produtosLoja");

const modalProduto = document.getElementById("modalProduto");
const fecharModalProduto = document.getElementById("fecharModalProduto");
const modalProdutoNome = document.getElementById("modalProdutoNome");
const modalProdutoDescricao = document.getElementById("modalProdutoDescricao");
const modalProdutoPreco = document.getElementById("modalProdutoPreco");
const modalProdutoGrupos = document.getElementById("modalProdutoGrupos");
const observacaoProduto = document.getElementById("observacaoProduto");
const quantidadeProduto = document.getElementById("quantidadeProduto");
const diminuirQuantidade = document.getElementById("diminuirQuantidade");
const aumentarQuantidade = document.getElementById("aumentarQuantidade");
const adicionarCarrinho = document.getElementById("adicionarCarrinho");
const totalProdutoModal = document.getElementById("totalProdutoModal");

let lojaAtual = null;
let categoriasCache = [];
let produtosCache = [];
let categoriaSelecionada = "todas";

let produtoAtual = null;
let quantidadeAtual = 1;

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function escaparHTML(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function obterImagemProduto(produto) {
  return (
    produto?.imagem_url ||
    produto?.imagem ||
    produto?.foto_url ||
    produto?.foto ||
    ""
  );
}

function renderizarImagemProduto(produto, classe = "produto-imagem") {
  const imagem = obterImagemProduto(produto);
  const nome = escaparHTML(produto?.nome || "Produto");

  if (imagem) {
    return `
      <div class="${classe}">
        <img src="${escaparHTML(imagem)}" alt="${nome}" loading="lazy">
      </div>
    `;
  }

  return `
    <div class="${classe} produto-sem-foto">
      <span>Sem foto</span>
    </div>
  `;
}

function mostrarSkeletonProdutos() {
  if (!produtosLoja) return;

  produtosLoja.innerHTML = Array.from({ length: 8 }).map(() => `
    <div class="produto-card skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-price"></div>
      <div class="skeleton skeleton-button"></div>
    </div>
  `).join("");
}

async function carregarLoja() {
  mostrarSkeletonProdutos();

  const { data, error } = await supabaseClient
    .from("lojas")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    nomeLoja.innerText = "Erro ao carregar loja";
    produtosLoja.innerHTML = `
      <div class="estado-vazio">
        <h2>Não foi possível carregar o cardápio</h2>
        <p>Tente atualizar a página em alguns segundos.</p>
      </div>
    `;
    return;
  }

  lojaAtual = data;
  window.DeliveryOSLojaAtual = data;

  nomeLoja.innerText = data.nome || "Minha Loja";
  descricaoLoja.innerText = data.descricao || "";
  tempoEntrega.innerText = `${data.tempo_entrega_min || 30} min`;

  await carregarCategorias();
  await carregarProdutos();
}

async function carregarCategorias() {
  const { data, error } = await supabaseClient
    .from("categorias")
    .select("*")
    .eq("loja_id", lojaAtual.id)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  categoriasCache = data || [];

  categoriasLoja.innerHTML = `
    <button class="active" onclick="selecionarCategoria('todas', this)">
      Todos
    </button>
  `;

  categoriasCache.forEach((categoria) => {
    categoriasLoja.innerHTML += `
      <button onclick="selecionarCategoria('${categoria.id}', this)">
        ${escaparHTML(categoria.nome)}
      </button>
    `;
  });
}

async function carregarProdutos() {
  mostrarSkeletonProdutos();

  const { data, error } = await supabaseClient
    .from("produtos")
    .select(`
      *,
      produtos_grupos_adicionais (
        grupo_id,
        grupos_adicionais (
          id,
          nome,
          descricao,
          minimo,
          maximo,
          adicionais (
            id,
            nome,
            descricao,
            preco,
            ativo,
            indisponivel
          )
        )
      )
    `)
    .eq("loja_id", lojaAtual.id)
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    produtosLoja.innerHTML = `
      <div class="estado-vazio">
        <h2>Erro ao carregar produtos</h2>
        <p>Atualize a página e tente novamente.</p>
      </div>
    `;
    return;
  }

  produtosCache = data || [];
  renderizarProdutos();
}

function selecionarCategoria(categoriaId, botao) {
  categoriaSelecionada = categoriaId;

  document.querySelectorAll(".categorias-loja button").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (botao) {
    botao.classList.add("active");
  }

  renderizarProdutos();
}

function renderizarProdutos() {
  let produtos = produtosCache;

  if (categoriaSelecionada !== "todas") {
    produtos = produtos.filter((produto) => produto.categoria_id === categoriaSelecionada);
  }

  if (!produtos.length) {
    produtosLoja.innerHTML = `
      <div class="estado-vazio">
        <h2>Nenhum produto encontrado</h2>
        <p>Escolha outra categoria ou volte mais tarde.</p>
      </div>
    `;
    return;
  }

  produtosLoja.innerHTML = produtos.map((produto) => {
    const indisponivel = produto.indisponivel;
    const descricao = produto.descricao || "";

    return `
      <article class="produto-card ${indisponivel ? "produto-indisponivel" : ""}">
        ${renderizarImagemProduto(produto)}

        <div class="produto-card-body">
          <div class="produto-card-info">
            <h3>${escaparHTML(produto.nome)}</h3>
            ${descricao ? `<p>${escaparHTML(descricao)}</p>` : `<p class="produto-sem-descricao">Produto disponível no cardápio.</p>`}
          </div>

          <div class="produto-card-footer">
            <strong>${formatarMoeda(produto.preco)}</strong>

            <button
              type="button"
              ${indisponivel ? "disabled" : ""}
              onclick="abrirProduto('${produto.id}')"
            >
              ${indisponivel ? "Indisponível" : "+ Adicionar"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function garantirImagemNoModal(produto) {
  const conteudoModal = modalProduto?.querySelector(".modal-produto-content");
  if (!conteudoModal) return;

  let areaImagem = document.getElementById("modalProdutoImagemArea");

  if (!areaImagem) {
    areaImagem = document.createElement("div");
    areaImagem.id = "modalProdutoImagemArea";
    areaImagem.className = "modal-produto-imagem-area";
    conteudoModal.insertBefore(areaImagem, modalProdutoNome);
  }

  areaImagem.innerHTML = renderizarImagemProduto(produto, "modal-produto-imagem");
}

function abrirProduto(produtoId) {
  const produto = produtosCache.find((item) => item.id === produtoId);

  if (!produto) return;

  produtoAtual = produto;
  quantidadeAtual = 1;

  garantirImagemNoModal(produto);

  modalProdutoNome.innerText = produto.nome;
  modalProdutoDescricao.innerText = produto.descricao || "";
  modalProdutoPreco.innerText = formatarMoeda(produto.preco);
  quantidadeProduto.innerText = quantidadeAtual;
  observacaoProduto.value = "";

  renderizarGruposDoProduto(produto);
  atualizarTotalProduto();

  modalProduto.classList.remove("oculto");
}

function renderizarGruposDoProduto(produto) {
  const grupos = produto.produtos_grupos_adicionais || [];

  if (!grupos.length) {
    modalProdutoGrupos.innerHTML = "";
    return;
  }

  modalProdutoGrupos.innerHTML = grupos.map((item) => {
    const grupo = item.grupos_adicionais;

    if (!grupo) return "";

    const adicionais = (grupo.adicionais || []).filter((adicional) => {
      return adicional.ativo && !adicional.indisponivel;
    });

    if (!adicionais.length) return "";

    return `
      <div class="grupo-modal" data-grupo-id="${grupo.id}" data-minimo="${grupo.minimo}" data-maximo="${grupo.maximo}">
        <div class="grupo-modal-header">
          <div>
            <h3>${escaparHTML(grupo.nome)}</h3>
            <small>
              ${grupo.minimo > 0 ? `Escolha pelo menos ${grupo.minimo}` : "Opcional"}
              ${grupo.maximo > 0 ? ` • máximo ${grupo.maximo}` : ""}
            </small>
          </div>
        </div>

        <div class="lista-adicionais-modal">
          ${adicionais.map((adicional) => `
            <label class="adicional-opcao">
              <div>
                <input
                  type="${grupo.maximo === 1 ? "radio" : "checkbox"}"
                  name="grupo-${grupo.id}"
                  value="${adicional.id}"
                  data-nome="${escaparHTML(adicional.nome)}"
                  data-preco="${adicional.preco}"
                  onchange="aoSelecionarAdicional('${grupo.id}', ${grupo.maximo}, this)"
                >
                <span>${escaparHTML(adicional.nome)}</span>
              </div>

              <strong>
                + ${formatarMoeda(adicional.preco)}
              </strong>
            </label>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");
}

function aoSelecionarAdicional(grupoId, maximo, inputAtual) {
  validarLimiteGrupo(grupoId, maximo, inputAtual);
  atualizarTotalProduto();
}

function validarLimiteGrupo(grupoId, maximo, inputAtual) {
  if (!maximo || maximo <= 0) return;

  const selecionados = document.querySelectorAll(
    `input[name="grupo-${grupoId}"]:checked`
  );

  if (selecionados.length > maximo) {
    inputAtual.checked = false;
    alert(`Você pode escolher no máximo ${maximo} opção(ões) nesse grupo.`);
  }
}

function calcularAdicionaisSelecionados() {
  const selecionados = document.querySelectorAll(
    "#modalProdutoGrupos input:checked"
  );

  let totalAdicionais = 0;

  selecionados.forEach((input) => {
    totalAdicionais += Number(input.dataset.preco || 0);
  });

  return totalAdicionais;
}

function atualizarTotalProduto() {
  if (!produtoAtual) return;

  const precoProduto = Number(produtoAtual.preco || 0);
  const totalAdicionais = calcularAdicionaisSelecionados();
  const total = (precoProduto + totalAdicionais) * quantidadeAtual;

  totalProdutoModal.innerText = formatarMoeda(total);
}

function validarMinimosAntesDeAdicionar() {
  const grupos = document.querySelectorAll(".grupo-modal");

  for (const grupo of grupos) {
    const grupoId = grupo.dataset.grupoId;
    const minimo = Number(grupo.dataset.minimo || 0);

    if (minimo <= 0) continue;

    const selecionados = document.querySelectorAll(
      `input[name="grupo-${grupoId}"]:checked`
    );

    const nomeGrupo = grupo.querySelector("h3")?.innerText || "grupo";

    if (selecionados.length < minimo) {
      alert(`Escolha pelo menos ${minimo} opção(ões) em "${nomeGrupo}".`);
      return false;
    }
  }

  return true;
}

function animarCarrinhoResumo() {
  const carrinhoResumo = document.getElementById("carrinhoResumo");
  if (!carrinhoResumo) return;

  carrinhoResumo.classList.remove("carrinho-pulse");

  setTimeout(() => {
    carrinhoResumo.classList.add("carrinho-pulse");
  }, 20);
}

if (fecharModalProduto) {
  fecharModalProduto.addEventListener("click", () => {
    modalProduto.classList.add("oculto");
  });
}

if (modalProduto) {
  modalProduto.addEventListener("click", (e) => {
    if (e.target === modalProduto) {
      modalProduto.classList.add("oculto");
    }
  });
}

if (diminuirQuantidade) {
  diminuirQuantidade.addEventListener("click", () => {
    if (quantidadeAtual > 1) {
      quantidadeAtual--;
      quantidadeProduto.innerText = quantidadeAtual;
      atualizarTotalProduto();
    }
  });
}

if (aumentarQuantidade) {
  aumentarQuantidade.addEventListener("click", () => {
    quantidadeAtual++;
    quantidadeProduto.innerText = quantidadeAtual;
    atualizarTotalProduto();
  });
}

if (adicionarCarrinho) {
  adicionarCarrinho.addEventListener("click", () => {
    if (!produtoAtual) return;
    if (!validarMinimosAntesDeAdicionar()) return;

    if (!window.DeliveryOSCarrinho) {
      alert("Carrinho ainda não carregou. Recarregue a página e tente novamente.");
      return;
    }

    const adicionaisSelecionados = Array.from(
      document.querySelectorAll("#modalProdutoGrupos input:checked")
    ).map((input) => ({
      id: input.value,
      nome: input.dataset.nome || "Adicional",
      preco: Number(input.dataset.preco || 0),
      grupo_id: input.name.replace("grupo-", "")
    }));

    const precoProduto = Number(produtoAtual.preco || 0);
    const totalAdicionais = adicionaisSelecionados.reduce((total, adicional) => {
      return total + Number(adicional.preco || 0);
    }, 0);

    const itemCarrinho = {
      produto_id: produtoAtual.id,
      loja_id: produtoAtual.loja_id,
      nome: produtoAtual.nome,
      descricao: produtoAtual.descricao || "",
      imagem_url: obterImagemProduto(produtoAtual),
      preco_unitario: precoProduto,
      quantidade: quantidadeAtual,
      adicionais: adicionaisSelecionados,
      observacao: observacaoProduto.value.trim(),
      subtotal: (precoProduto + totalAdicionais) * quantidadeAtual
    };

    window.DeliveryOSCarrinho.adicionar(itemCarrinho);
    animarCarrinhoResumo();
    modalProduto.classList.add("oculto");
  });
}

carregarLoja();
