const formConfiguracoes = document.getElementById("formConfiguracoes");
const mensagemConfiguracoes = document.getElementById("mensagemConfiguracoes");

let lojaAtual = null;

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
  document.getElementById("lojaTelefone").value = data.telefone || "";
  document.getElementById("lojaWhatsapp").value = data.whatsapp || "";
  document.getElementById("lojaPix").value = data.pix_chave || "";
  document.getElementById("lojaEndereco").value = data.endereco || "";
  document.getElementById("lojaCidade").value = data.cidade || "";
  document.getElementById("lojaCep").value = data.cep || "";
  document.getElementById("lojaTaxaEntrega").value = data.taxa_entrega || 0;
  document.getElementById("lojaPedidoMinimo").value = data.pedido_minimo || 0;
  document.getElementById("lojaTempoEntrega").value = data.tempo_entrega_min || 30;
  document.getElementById("lojaDescricao").value = data.descricao || "";
}

formConfiguracoes.addEventListener("submit", async (e) => {
  e.preventDefault();

  mensagemConfiguracoes.innerText = "Salvando...";

  const nome = document.getElementById("lojaNome").value.trim();
  const telefone = document.getElementById("lojaTelefone").value.trim();
  const whatsapp = document.getElementById("lojaWhatsapp").value.trim();
  const pix_chave = document.getElementById("lojaPix").value.trim();
  const endereco = document.getElementById("lojaEndereco").value.trim();
  const cidade = document.getElementById("lojaCidade").value.trim();
  const cep = document.getElementById("lojaCep").value.trim();
  const taxa_entrega = Number(document.getElementById("lojaTaxaEntrega").value || 0);
  const pedido_minimo = Number(document.getElementById("lojaPedidoMinimo").value || 0);
  const tempo_entrega_min = Number(document.getElementById("lojaTempoEntrega").value || 30);
  const descricao = document.getElementById("lojaDescricao").value.trim();

  const { error } = await supabaseClient
    .from("lojas")
    .update({
      nome,
      telefone,
      whatsapp,
      pix_chave,
      endereco,
      cidade,
      cep,
      taxa_entrega,
      pedido_minimo,
      tempo_entrega_min,
      descricao
    })
    .eq("id", lojaAtual);

  if (error) {
    mensagemConfiguracoes.innerText = "Erro ao salvar configurações.";
    console.error(error);
    return;
  }

  mensagemConfiguracoes.innerText = "Configurações salvas com sucesso!";
});

carregarLojaDoUsuario();
