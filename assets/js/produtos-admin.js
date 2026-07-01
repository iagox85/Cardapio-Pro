const modalProduto = document.getElementById("modalProduto");
const fecharModalProduto = document.getElementById("fecharModalProduto");
const formProduto = document.getElementById("formProduto");
const listaProdutos = document.getElementById("listaProdutos");
const btnNovoProduto = document.getElementById("btnNovoProduto");
const buscarProduto = document.getElementById("buscarProduto");
const produtoCategoria = document.getElementById("produtoCategoria");
const listaGruposProduto = document.getElementById("listaGruposProduto");
const produtoImagem = document.getElementById("produtoImagem");
const produtoImagemPreview = document.getElementById("produtoImagemPreview");
const produtoImagemUrl = document.getElementById("produtoImagemUrl");
const btnRemoverImagem = document.getElementById("btnRemoverImagem");

const modalTitulo = document.querySelector(".modal-header h2");
const BUCKET_IMAGENS_PRODUTOS = "produtos";

let lojaAtual = null;
let produtosCache = [];
let categoriasCache = [];
let gruposCache = [];
let produtoEditandoId = null;
let imagemMarcadaParaRemover = false;

btnNovoProduto.addEventListener("click", () => {
  produtoEditandoId = null;
  imagemMarcadaParaRemover = false;
  modalTitulo.innerText = "Novo Produto";
  formProduto.reset();
  produtoImagemUrl.value = "";
  atualizarPreviewImagem("");
  renderizarGruposProduto([]);
  modalProduto.classList.remove("oculto");
});

fecharModalProduto.addEventListener("click", fecharModal);

modalProduto.addEventListener("click", (e) => {
  if (e.target === modalProduto) fecharModal();
});

buscarProduto.addEventListener("input", renderizarProdutos);

if (produtoImagem) {
  produtoImagem.addEventListener("change", () => {
    const arquivo = produtoImagem.files?.[0];

    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione apenas arquivos de imagem.");
      produtoImagem.value = "";
      return;
    }

    if (arquivo.size > 2 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 2MB.");
      produtoImagem.value = "";
      return;
    }

    imagemMarcadaParaRemover = false;
    atualizarPreviewImagem(URL.createObjectURL(arquivo));
  });
}

if (btnRemoverImagem) {
  btnRemoverImagem.addEventListener("click", () => {
    produtoImagem.value = "";
    produtoImagemUrl.value = "";
    imagemMarcadaParaRemover = true;
    atualizarPreviewImagem("");
  });
}

function instalarEstilosProdutosAdmin() {
  if (document.getElementById("deliveryos-produtos-admin-estilos")) return;

  const style = document.createElement("style");
  style.id = "deliveryos-produtos-admin-estilos";
  style.innerHTML = `
    .produto-admin-item {
      gap: 16px;
    }

    .produto-admin-info {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .produto-admin-thumb {
      width: 72px;
      height: 72px;
      border-radius: 14px;
      overflow: hidden;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 12px;
      text-align: center;
    }

    .produto-admin-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .produto-admin-texto {
      min-width: 0;
    }

    .campo-imagem-produto {
      display: grid;
      gap: 10px;
    }

    .campo-imagem-produto > label,
    .campo-grupos > label {
      font-weight: 800;
      color: #111827;
    }

    .preview-produto-imagem {
      width: 160px;
      height: 110px;
      border: 1px dashed #d1d5db;
      border-radius: 14px;
      background: #f9fafb;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      color: #9ca3af;
      font-size: 13px;
    }

    .preview-produto-imagem img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .imagem-produto-acoes {
      display: flex;
      gap: 8px;
    }

    .btn-secundario {
      background: #f3f4f6 !important;
      color: #374151 !important;
      padding: 10px 12px !important;
      border-radius: 10px !important;
      width: fit-content;
    }

    .ajuda-campo {
      color: #6b7280;
      font-size: 12px;
    }

    @media (max-width: 760px) {
      .produto-admin-item,
      .produto-admin-info,
      .produto-acoes {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `;

  document.head.appendChild(style);
}

function escaparHTML(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fecharModal() {
  produtoEditandoId = null;
  imagemMarcadaParaRemover = false;
  formProduto.reset();
  produtoImagemUrl.value = "";
  atualizarPreviewImagem("");
  modalProduto.classList.add("oculto");
}

function atualizarPreviewImagem(url) {
  if (!produtoImagemPreview) return;

  if (url) {
    produtoImagemPreview.innerHTML = `
      <img src="${escaparHTML(url)}" alt="Prévia da imagem do produto">
    `;
    return;
  }

  produtoImagemPreview.innerHTML = `<span>Sem imagem</span>`;
}

function obterImagemProduto(produto) {
  return produto?.imagem_url || produto?.imagem || produto?.foto_url || produto?.foto || "";
}

function gerarCaminhoImagem(produtoId, arquivo) {
  const extensaoOriginal = arquivo.name.split(".").pop() || "jpg";
  const extensao = extensaoOriginal.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `${lojaAtual}/${produtoId}/${Date.now()}.${extensao}`;
}

async function enviarImagemProduto(produtoId) {
  const arquivo = produtoImagem?.files?.[0];

  if (!arquivo) {
    return produtoImagemUrl.value || "";
  }

  const caminho = gerarCaminhoImagem(produtoId, arquivo);

  const { error: erroUpload } = await supabaseClient.storage
    .from(BUCKET_IMAGENS_PRODUTOS)
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: true
    });

  if (erroUpload) {
    console.error(erroUpload);
    alert("Produto salvo, mas houve erro ao enviar a imagem. Verifique se o bucket 'produtos' existe no Supabase Storage.");
    return produtoImagemUrl.value || "";
  }

  const { data } = supabaseClient.storage
    .from(BUCKET_IMAGENS_PRODUTOS)
    .getPublicUrl(caminho);

  return data?.publicUrl || "";
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
  await carregarGrupos();
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

  produtoCategoria.innerHTML = `<option value="">Selecione uma categoria</option>`;

  categoriasCache.forEach((categoria) => {
    produtoCategoria.innerHTML += `
      <option value="${categoria.id}">
        ${categoria.nome}
      </option>
    `;
  });
}

async function carregarGrupos() {
  const { data, error } = await supabaseClient
    .from("grupos_adicionais")
    .select("*")
    .eq("loja_id", lojaAtual)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  gruposCache = data || [];
}

function renderizarGruposProduto(gruposSelecionados = []) {
  if (!gruposCache.length) {
    listaGruposProduto.innerHTML = "<p>Nenhum grupo cadastrado.</p>";
    return;
  }

  listaGruposProduto.innerHTML = gruposCache.map((grupo) => {
    const checked = gruposSelecionados.includes(grupo.id) ? "checked" : "";

    return `
      <label>
        <input type="checkbox" value="${grupo.id}" ${checked}>
        ${grupo.nome}
      </label>
    `;
  }).join("");
}

async function carregarProdutos() {
  const { data, error } = await supabaseClient
    .from("produtos")
    .select(`
      *,
      categorias (
        nome
      ),
      produtos_grupos_adicionais (
        grupo_id,
        grupos_adicionais (
          nome
        )
      )
    `)
    .eq("loja_id", lojaAtual)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    listaProdutos.innerHTML = "<p>Erro ao carregar produtos. Verifique se a coluna imagem_url existe na tabela produtos.</p>";
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
    const imagem = obterImagemProduto(produto);

    const grupos = produto.produtos_grupos_adicionais || [];

    const nomesGrupos = grupos
      .map((item) => item.grupos_adicionais?.nome)
      .filter(Boolean)
      .join(", ");

    const imagemHTML = imagem
      ? `<img src="${escaparHTML(imagem)}" alt="${escaparHTML(produto.nome)}">`
      : `<span>Sem<br>foto</span>`;

    return `
      <div class="produto-admin-item">
        <div class="produto-admin-info">
          <div class="produto-admin-thumb">
            ${imagemHTML}
          </div>

          <div class="produto-admin-texto">
            <strong>${escaparHTML(produto.nome)}</strong>
            <p>${escaparHTML(produto.descricao || "")}</p>
            <p><small>Categoria: ${escaparHTML(categoriaNome)}</small></p>
            <p><small>Grupos: ${escaparHTML(nomesGrupos || "Nenhum grupo")}</small></p>
            <span>R$ ${Number(produto.preco).toFixed(2)}</span>
          </div>
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
  imagemMarcadaParaRemover = false;
  modalTitulo.innerText = "Editar Produto";

  document.getElementById("produtoNome").value = produto.nome;
  document.getElementById("produtoDescricao").value = produto.descricao || "";
  document.getElementById("produtoPreco").value = produto.preco;
  produtoCategoria.value = produto.categoria_id || "";

  const imagem = obterImagemProduto(produto);
  produtoImagem.value = "";
  produtoImagemUrl.value = imagem;
  atualizarPreviewImagem(imagem);

  const gruposSelecionados = (produto.produtos_grupos_adicionais || [])
    .map((item) => item.grupo_id);

  renderizarGruposProduto(gruposSelecionados);

  modalProduto.classList.remove("oculto");
}

function pegarGruposSelecionados() {
  const checkboxes = listaGruposProduto.querySelectorAll("input[type='checkbox']:checked");

  return Array.from(checkboxes).map((checkbox) => checkbox.value);
}

async function salvarGruposDoProduto(produtoId, gruposSelecionados) {
  await supabaseClient
    .from("produtos_grupos_adicionais")
    .delete()
    .eq("produto_id", produtoId)
    .eq("loja_id", lojaAtual);

  if (!gruposSelecionados.length) return;

  const registros = gruposSelecionados.map((grupoId) => ({
    loja_id: lojaAtual,
    produto_id: produtoId,
    grupo_id: grupoId
  }));

  const { error } = await supabaseClient
    .from("produtos_grupos_adicionais")
    .insert(registros);

  if (error) {
    console.error(error);
    alert("Produto salvo, mas houve erro ao vincular grupos.");
  }
}

formProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("produtoNome").value.trim();
  const descricao = document.getElementById("produtoDescricao").value.trim();
  const preco = Number(document.getElementById("produtoPreco").value);
  const categoriaId = produtoCategoria.value || null;
  const gruposSelecionados = pegarGruposSelecionados();

  let error;
  let produtoId = produtoEditandoId;

  if (produtoEditandoId) {
    const resposta = await supabaseClient
      .from("produtos")
      .update({
        nome,
        descricao,
        preco,
        categoria_id: categoriaId,
        imagem_url: imagemMarcadaParaRemover ? null : (produtoImagemUrl.value || null)
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
        imagem_url: null,
        ativo: true,
        indisponivel: false
      })
      .select("id")
      .single();

    error = resposta.error;

    if (resposta.data) {
      produtoId = resposta.data.id;
    }
  }

  if (error) {
    alert("Erro ao salvar produto. Se aparecer erro da coluna imagem_url, rode o SQL de atualização no Supabase.");
    console.error(error);
    return;
  }

  if (produtoId) {
    const imagemFinal = imagemMarcadaParaRemover ? null : await enviarImagemProduto(produtoId);

    if (imagemFinal !== (produtoImagemUrl.value || "") || imagemMarcadaParaRemover) {
      const { error: erroImagem } = await supabaseClient
        .from("produtos")
        .update({ imagem_url: imagemFinal || null })
        .eq("id", produtoId)
        .eq("loja_id", lojaAtual);

      if (erroImagem) {
        console.error(erroImagem);
        alert("Produto salvo, mas houve erro ao gravar a URL da imagem.");
      }
    }

    await salvarGruposDoProduto(produtoId, gruposSelecionados);
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

instalarEstilosProdutosAdmin();
carregarLoja();
