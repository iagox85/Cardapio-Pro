const formConfiguracoes = document.getElementById("formConfiguracoes");
const mensagemConfiguracoes = document.getElementById("mensagemConfiguracoes");
const linkPublicoTexto = document.getElementById("linkPublicoTexto");
const btnCopiarLinkLoja = document.getElementById("btnCopiarLinkLoja");

let lojaAtual = null;
let lojaSlugAtual = "";
let linkPublicoAtual = "";

async function carregarLojaDoUsuario() {
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
    mensagemConfiguracoes.innerText = "Usuário sem loja vinculada.";
    console.error(error);
    return;
  }

  lojaAtual = data.loja_id;

  carregarConfiguracoes();
}

function montarLinkPublico(slug) {
  if (!slug) return "";

  const urlAtual = new URL(window.location.href);
  const caminhoBase = urlAtual.pathname.substring(0, urlAtual.pathname.lastIndexOf("/") + 1);

  return `${urlAtual.origin}${caminhoBase}loja.html?loja=${encodeURIComponent(slug)}`;
}

function atualizarLinkPublico(slug) {
  lojaSlugAtual = slug || "";
  linkPublicoAtual = montarLinkPublico(lojaSlugAtual);

  if (!linkPublicoTexto) return;

  if (!linkPublicoAtual) {
    linkPublicoTexto.innerText = "Link indisponível. Esta loja ainda não possui slug.";
    return;
  }

  linkPublicoTexto.innerText = linkPublicoAtual;
}

async function copiarLinkPublico() {
  if (!linkPublicoAtual) {
    mensagemConfiguracoes.innerText = "Link público indisponível.";
    return;
  }

  try {
    await navigator.clipboard.writeText(linkPublicoAtual);
    mensagemConfiguracoes.innerText = "Link copiado com sucesso!";
  } catch (error) {
    console.error(error);
    mensagemConfiguracoes.innerText = "Não foi possível copiar automaticamente. Selecione e copie o link manualmente.";
  }
}

async function carregarConfiguracoes() {
  const { data, error } = await supabaseClient
    .from("lojas")
    .select("*")
    .eq("id", lojaAtual)
    .single();

  if (error) {
    mensagemConfiguracoes.innerText = "Erro ao carregar configurações.";
    console.error(error);
    return;
  }

  document.getElementById("lojaNome").value = data.nome || "";
  document.getElementById("lojaDescricao").value = data.descricao || "";
  document.getElementById("lojaWhatsapp").value = data.whatsapp || "";
  document.getElementById("lojaTelefone").value = data.telefone || "";
  document.getElementById("lojaPix").value = data.pix_chave || "";
  document.getElementById("lojaPedidoMinimo").value = data.pedido_minimo || 0;
  document.getElementById("lojaTempoEntrega").value = data.tempo_entrega_min || 30;

  atualizarLinkPublico(data.slug);
}

formConfiguracoes.addEventListener("submit", async (e) => {
  e.preventDefault();

  mensagemConfiguracoes.innerText = "Salvando...";

  const nome = document.getElementById("lojaNome").value.trim();
  const descricao = document.getElementById("lojaDescricao").value.trim();
  const whatsapp = document.getElementById("lojaWhatsapp").value.trim();
  const telefone = document.getElementById("lojaTelefone").value.trim();
  const pix_chave = document.getElementById("lojaPix").value.trim();
  const pedido_minimo = Number(document.getElementById("lojaPedidoMinimo").value || 0);
  const tempo_entrega_min = Number(document.getElementById("lojaTempoEntrega").value || 30);

  const { error } = await supabaseClient
    .from("lojas")
    .update({
      nome,
      descricao,
      whatsapp,
      telefone,
      pix_chave,
      pedido_minimo,
      tempo_entrega_min
    })
    .eq("id", lojaAtual);

  if (error) {
    mensagemConfiguracoes.innerText = "Erro ao salvar configurações.";
    console.error(error);
    return;
  }

  mensagemConfiguracoes.innerText = "Configurações salvas com sucesso!";
});

if (btnCopiarLinkLoja) {
  btnCopiarLinkLoja.addEventListener("click", copiarLinkPublico);
}

carregarLojaDoUsuario();
