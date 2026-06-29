const formProduto = document.getElementById("formProduto");
const listaProdutos = document.getElementById("listaProdutos");
const btnNovoProduto = document.getElementById("btnNovoProduto");

let lojaAtual = null;

btnNovoProduto.addEventListener("click", () => {
  formProduto.classList.toggle("oculto");
});

async function carregarLojaDoUsuario() {
  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    window.location.href = "login.html";
    return;
  }

  const { data, error } = await supabaseClient
    .from("usuarios_loja")
    .select("loja_id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    alert("Nenhuma loja vinculada a este usuário.");
    console.error(error);
    return;
  }

  lojaAtual = data.loja_id;
  carregarProdutos();
}

async function carregarProdutos() {
  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .eq("loja_id", lojaAtual)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    listaProdutos.innerHTML = "<p>Erro ao carregar produtos.</p>";
    return;
  }

  if (!data || data.length === 0) {
    listaProdutos.innerHTML = "<p>Nenhum produto cadastrado ainda.</p>";
    return;
  }

  listaProdutos.innerHTML = data.map(produto => `
    <div class="produto-admin-item">
      <div>
        <strong>${produto.nome}</strong>
        <p>${produto.descricao || ""}</p>
        <span>R$ ${Number(produto.preco).toFixed(2)}</span>
      </div>

      <div>
        ${produto.indisponivel ? "🔴 Indisponível" : "🟢 Disponível"}
      </div>
    </div>
  `).join("");
}

formProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!lojaAtual) {
    alert("Loja ainda não carregada.");
    return;
  }

  const nome = document.getElementById("produtoNome").value.trim();
  const descricao = document.getElementById("produtoDescricao").value.trim();
  const preco = Number(document.getElementById("produtoPreco").value);

  const { error } = await supabaseClient
    .from("produtos")
    .insert({
      loja_id: lojaAtual,
      nome,
      descricao,
      preco,
      ativo: true,
      indisponivel: false
    });

  if (error) {
    console.error(error);
    alert("Erro ao salvar produto.");
    return;
  }

  formProduto.reset();
  formProduto.classList.add("oculto");
  carregarProdutos();
});

carregarLojaDoUsuario();
