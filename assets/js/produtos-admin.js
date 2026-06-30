const modalProduto = document.getElementById("modalProduto");
const fecharModalProduto = document.getElementById("fecharModalProduto");
const formProduto = document.getElementById("formProduto");
const listaProdutos = document.getElementById("listaProdutos");
const btnNovoProduto = document.getElementById("btnNovoProduto");
const buscarProduto = document.getElementById("buscarProduto");
const produtoCategoria = document.getElementById("produtoCategoria");

const modalTitulo = document.querySelector(".modal-header h2");

let lojaAtual = null;
let produtosCache = [];
let categoriasCache = [];
let produtoEditandoId = null;

btnNovoProduto.addEventListener("click", () => {
  produtoEditandoId = null;
  modalTitulo.innerText = "Novo Produto";
  formProduto.reset();
  modalProduto.classList.remove("oculto");
});

fecharModalProduto.addEventListener("click", fecharModal);

modalProduto.addEventListener("click", (e) => {
  if (e.target === modalProduto) fecharModal();
});

buscarProduto.addEventListener("input", renderizarProdutos);

function fecharModal() {
  produtoEditandoId = null;
  formProduto.reset();
  modalProduto.classList.add("oculto");
}

async function carregarLoja() {
  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data, error } = await supabaseClient
    .from("usuarios_loja")
    .select("loja_id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    alert("Usuário sem loja vinculada.");
    console.error(error);
    return;
  }

  lojaAtual = data.loja_id;

  await carregarCategorias();
  await carregarProdutos();
}

async function carregarCategorias() {
  const { data, error } = await supabaseClient
    .from("categorias")
    .select("*")
    .eq("loja_id", lojaAtual)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  categoriasCache = data || [];

  produtoCategoria.innerHTML = `
    <option value="">Selecione uma categoria</option>
  `;

  categoriasCache.forEach((categoria) => {
    produtoCategoria.innerHTML += `
      <option value="${categoria.id}">
        ${categoria.nome}
      </option>
    `;
  });
}

async function carregarProdutos() {
  const { data, error } = await supabaseClient
    .from("produtos")
    .select(`
      *,
      categorias (
        nome
      )
    `)
    .eq("loja_id", lojaAtual)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    listaProdutos.innerHTML = "<p>Erro ao carregar produtos.</p>";
    return;
  }

  produtosCache = data || [];
  renderizarProdutos();
}

function renderizarProdutos() {
  const termo = buscarProduto.value.toLowerCase().trim();

  const produtosFiltrados = produtosCache.filter((produto) => {
    const nome = produto.nome?.toLowerCase() || "";
    const descricao = produto.descricao?.toLowerCase() || "";
    const categoria = produto.categorias?.nome?.toLowerCase() || "";

    return (
      nome.includes(termo) ||
      descricao.includes(termo) ||
      categoria.includes(termo)
    );
  });

  if (!produtosFiltrados.length) {
    listaProdutos.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }

  listaProdutos.innerHTML = produtosFiltrados.map((produto) => {
    const categoriaNome = produto.categorias?.nome || "Sem categoria";

    return `
      <div class="produto-admin-item">
        <div>
          <strong>${produto.nome}</strong>
          <p>${produto.descricao || ""}</p>
          <p><small>Categoria: ${categoriaNome}</small></p>
          <span>R$ ${Number(produto.preco).toFixed(2)}</span>
        </div>

        <div class="produto-acoes">
          <span>${produto.indisponivel ? "🔴 Indisponível" : "🟢 Disponível"}</span>

          <button onclick="editarProduto('${produto.id}')">
            Editar
          </button>

          <button onclick="alternarDisponibilidade('${produto.id}', ${produto.indisponivel})">
            ${produto.indisponivel ? "Ativar" : "Pausar"}
          </button>

          <button class="btn-excluir" onclick="excluirProduto('${produto.id}')">
            Excluir
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function editarProduto(id) {
  const produto = produtosCache.find((item) => item.id === id);

  if (!produto) return;

  produtoEditandoId = id;
  modalTitulo.innerText = "Editar Produto";

  document.getElementById("produtoNome").value = produto.nome;
  document.getElementById("produtoDescricao").value = produto.descricao || "";
  document.getElementById("produtoPreco").value = produto.preco;
  produtoCategoria.value = produto.categoria_id || "";

  modalProduto.classList.remove("oculto");
}

formProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("produtoNome").value.trim();
  const descricao = document.getElementById("produtoDescricao").value.trim();
  const preco = Number(document.getElementById("produtoPreco").value);
  const categoriaId = produtoCategoria.value || null;

  let error;

  if (produtoEditandoId) {
    const resposta = await supabaseClient
      .from("produtos")
      .update({
        nome,
        descricao,
        preco,
        categoria_id: categoriaId
      })
      .eq("id", produtoEditandoId)
      .eq("loja_id", lojaAtual);

    error = resposta.error;
  } else {
    const resposta = await supabaseClient
      .from("produtos")
      .insert({
        loja_id: lojaAtual,
        categoria_id: categoriaId,
        nome,
        descricao,
        preco,
        ativo: true,
        indisponivel: false
      });

    error = resposta.error;
  }

  if (error) {
    alert("Erro ao salvar produto.");
    console.error(error);
    return;
  }

  fecharModal();
  carregarProdutos();
});

async function alternarDisponibilidade(id, indisponivelAtual) {
  const { error } = await supabaseClient
    .from("produtos")
    .update({ indisponivel: !indisponivelAtual })
    .eq("id", id)
    .eq("loja_id", lojaAtual);

  if (error) {
    alert("Erro ao alterar disponibilidade.");
    console.error(error);
    return;
  }

  carregarProdutos();
}

async function excluirProduto(id) {
  if (!confirm("Deseja excluir este produto?")) return;

  const { error } = await supabaseClient
    .from("produtos")
    .delete()
    .eq("id", id)
    .eq("loja_id", lojaAtual);

  if (error) {
    alert("Erro ao excluir produto.");
    console.error(error);
    return;
  }

  carregarProdutos();
}

carregarLoja();
