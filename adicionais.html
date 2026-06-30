const btnNovoAdicional = document.getElementById("btnNovoAdicional");
const formAdicional = document.getElementById("formAdicional");
const listaAdicionais = document.getElementById("listaAdicionais");

let lojaAtual = null;
let adicionaisCache = [];
let adicionalEditandoId = null;

btnNovoAdicional.addEventListener("click", () => {
  adicionalEditandoId = null;
  formAdicional.reset();
  formAdicional.classList.toggle("oculto");
});

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
  carregarAdicionais();
}

async function carregarAdicionais() {
  const { data, error } = await supabaseClient
    .from("adicionais")
    .select("*")
    .eq("loja_id", lojaAtual)
    .order("created_at", { ascending: false });

  if (error) {
    listaAdicionais.innerHTML = "<p>Erro ao carregar adicionais.</p>";
    console.error(error);
    return;
  }

  adicionaisCache = data || [];
  renderizarAdicionais();
}

function renderizarAdicionais() {
  if (!adicionaisCache.length) {
    listaAdicionais.innerHTML = "<p>Nenhum adicional cadastrado ainda.</p>";
    return;
  }

  listaAdicionais.innerHTML = adicionaisCache.map((adicional) => `
    <div class="produto-admin-item">
      <div>
        <strong>${adicional.nome}</strong>
        <p>${adicional.descricao || ""}</p>
        <span>R$ ${Number(adicional.preco).toFixed(2)}</span>
      </div>

      <div class="produto-acoes">
        <span>${adicional.ativo ? "🟢 Ativo" : "🔴 Pausado"}</span>

        <button onclick="editarAdicional('${adicional.id}')">
          Editar
        </button>

        <button onclick="alternarAdicional('${adicional.id}', ${adicional.ativo})">
          ${adicional.ativo ? "Pausar" : "Ativar"}
        </button>

        <button class="btn-excluir" onclick="excluirAdicional('${adicional.id}')">
          Excluir
        </button>
      </div>
    </div>
  `).join("");
}

function editarAdicional(id) {
  const adicional = adicionaisCache.find((item) => item.id === id);

  if (!adicional) return;

  adicionalEditandoId = id;

  document.getElementById("adicionalNome").value = adicional.nome;
  document.getElementById("adicionalDescricao").value = adicional.descricao || "";
  document.getElementById("adicionalPreco").value = adicional.preco;

  formAdicional.classList.remove("oculto");
}

formAdicional.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("adicionalNome").value.trim();
  const descricao = document.getElementById("adicionalDescricao").value.trim();
  const preco = Number(document.getElementById("adicionalPreco").value);

  let error;

  if (adicionalEditandoId) {
    const resposta = await supabaseClient
      .from("adicionais")
      .update({
        nome,
        descricao,
        preco
      })
      .eq("id", adicionalEditandoId)
      .eq("loja_id", lojaAtual);

    error = resposta.error;
  } else {
    const resposta = await supabaseClient
      .from("adicionais")
      .insert({
        loja_id: lojaAtual,
        nome,
        descricao,
        preco,
        ativo: true
      });

    error = resposta.error;
  }

  if (error) {
    alert("Erro ao salvar adicional.");
    console.error(error);
    return;
  }

  adicionalEditandoId = null;
  formAdicional.reset();
  formAdicional.classList.add("oculto");
  carregarAdicionais();
});

async function alternarAdicional(id, ativoAtual) {
  const { error } = await supabaseClient
    .from("adicionais")
    .update({ ativo: !ativoAtual })
    .eq("id", id)
    .eq("loja_id", lojaAtual);

  if (error) {
    alert("Erro ao alterar adicional.");
    console.error(error);
    return;
  }

  carregarAdicionais();
}

async function excluirAdicional(id) {
  if (!confirm("Deseja excluir este adicional?")) return;

  const { error } = await supabaseClient
    .from("adicionais")
    .delete()
    .eq("id", id)
    .eq("loja_id", lojaAtual);

  if (error) {
    alert("Erro ao excluir adicional.");
    console.error(error);
    return;
  }

  carregarAdicionais();
}

carregarLoja();
