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

function escaparHTML(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function obterImagemProduto(produto) {
  return produto?.imagem_url || produto?.imagem || produto?.foto_url || produto?.foto || "";
}

function garantirImagemModalProduto() {
  let containerImagem = document.getElementById("modalProdutoImagemBox");

  if (containerImagem) return containerImagem;

  const conteudoModal = modalProduto?.querySelector(".modal-produto-content");

  if (!conteudoModal || !modalProdutoNome) return null;

  containerImagem = document.createElement("div");
  containerImagem.id = "modalProdutoImagemBox";
  containerImagem.className = "modal-produto-imagem";

  conteudoModal.insertBefore(containerImagem, modalProdutoNome);

  return containerImagem;
}

function aplicarTemaDaLoja(loja) {
  const corPrimaria = loja?.cor_primaria || loja?.cor_principal || loja?.tema_cor || "";

  if (!corPrimaria) return;

  document.documentElement.style.setProperty("--primary", corPrimaria);
}

async function carregarLoja() {
  const { data, error } = await supabaseClient
    .from("lojas")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    nomeLoja.innerText = "Erro ao carregar loja";
    produtosLoja.innerHTML = `
      <div class="estado-vazio-cardapio">
        Não foi possível carregar o cardápio agora.
      </div>
    `;
    return;
  }

  lojaAtual = data;
  window.DeliveryOSLojaAtual = data;

  aplicarTemaDaLoja(data);

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
      <div class="estado-vazio-cardapio">
        Erro ao carregar produtos.
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

  botao.classList.add("active");
  renderizarProdutos();
}

function montarImagemProdutoHTML(produto) {
  const imagem = obterImagemProduto(produto);

  if (imagem) {
    return `
      <div class="produto-card-imagem">
        <img src="${escaparHTML(imagem)}" alt="${escaparHTML(produto.nome)}" loading="lazy">
      </div>
    `;
  }

  return `
    <div class="produto-card-imagem produto-card-sem-imagem">
      <span>Sem foto</span>
    </div>
  `;
}

function renderizarProdutos() {
  let produtos = produtosCache;

  if (categoriaSelecionada !== "todas") {
    produtos = produtos.filter((produto) => produto.categoria_id === categoriaSelecionada);
  }

  if (!produtos.length) {
    produtosLoja.innerHTML = `
      <div class="estado-vazio-cardapio">
        Nenhum produto encontrado nessa categoria.
      </div>
    `;
    return;
  }

  produtosLoja.innerHTML = produtos.map((produto) => {
    const indisponivel = produto.indisponivel;
    const descricao = produto.descricao || "";

    return `
      <div class="produto-card ${indisponivel ? "produto-indisponivel" : ""}">
        ${montarImagemProdutoHTML(produto)}

        <div class="produto-card-conteudo">
          <h3>${escaparHTML(produto.nome)}</h3>
          <p>${descricao ? escaparHTML(descricao) : ""}</p>
          <strong>${formatarMoeda(produto.preco)}</strong>

          <button
            ${indisponivel ? "disabled" : ""}
            onclick="abrirProduto('${produto.id}')"
          >
            ${indisponivel ? "Indisponível" : "+ Adicionar"}
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function abrirProduto(produtoId) {
  const produto = produtosCache.find((item) => item.id === produtoId);

  if (!produto) return;

  produtoAtual = produto;
  quantidadeAtual = 1;

  const imagem = obterImagemProduto(produto);
  const containerImagem = garantirImagemModalProduto();

  if (containerImagem) {
    if (imagem) {
      containerImagem.classList.add("ativo");
      containerImagem.innerHTML = `
        <img src="${escaparHTML(imagem)}" alt="${escaparHTML(produto.nome)}">
      `;
    } else {
      containerImagem.classList.remove("ativo");
      containerImagem.innerHTML = "";
    }
  }

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
        <h3>${escaparHTML(grupo.nome)}</h3>
        <small>
          ${grupo.minimo > 0 ? `Escolha pelo menos ${grupo.minimo}` : "Opcional"}
          ${grupo.maximo > 0 ? ` • máximo ${grupo.maximo}` : ""}
        </small>

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
              ${escaparHTML(adicional.nome)}
            </div>

            <span>
              + ${formatarMoeda(adicional.preco)}
            </span>
          </label>
        `).join("")}
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

fecharModalProduto.addEventListener("click", () => {
  modalProduto.classList.add("oculto");
});

modalProduto.addEventListener("click", (e) => {
  if (e.target === modalProduto) {
    modalProduto.classList.add("oculto");
  }
});

diminuirQuantidade.addEventListener("click", () => {
  if (quantidadeAtual > 1) {
    quantidadeAtual--;
    quantidadeProduto.innerText = quantidadeAtual;
    atualizarTotalProduto();
  }
});

aumentarQuantidade.addEventListener("click", () => {
  quantidadeAtual++;
  quantidadeProduto.innerText = quantidadeAtual;
  atualizarTotalProduto();
});

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
  modalProduto.classList.add("oculto");
});

carregarLoja();
