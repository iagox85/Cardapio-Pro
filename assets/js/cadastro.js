const formCadastro = document.getElementById("formCadastro");
const mensagemCadastro = document.getElementById("mensagemCadastro");
const botaoCadastro = document.getElementById("botaoCadastro");

function mostrarMensagemCadastro(texto, tipo = "neutra") {
  mensagemCadastro.innerText = texto;
  mensagemCadastro.className = tipo;
}

function gerarSlug(texto) {
  return texto
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 60);
}

function limparTelefone(telefone) {
  return telefone.replace(/\D/g, "");
}

async function gerarSlugUnico(nomeLoja) {
  const slugBase = gerarSlug(nomeLoja) || "minha-loja";
  let slugFinal = slugBase;

  for (let tentativa = 1; tentativa <= 20; tentativa++) {
    const { data, error } = await supabaseClient
      .from("lojas")
      .select("id")
      .eq("slug", slugFinal)
      .maybeSingle();

    if (error) {
      console.error(error);
      throw new Error("Não foi possível validar o link da loja.");
    }

    if (!data) {
      return slugFinal;
    }

    slugFinal = `${slugBase}-${tentativa + 1}`;
  }

  return `${slugBase}-${Date.now()}`;
}

async function usuarioJaPossuiLoja(userId) {
  const { data, error } = await supabaseClient
    .from("usuarios_loja")
    .select("loja_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

async function criarLojaEVinculo({ userId, nomeLoja, nomeResponsavel, whatsapp }) {
  const lojaExistente = await usuarioJaPossuiLoja(userId);

  if (lojaExistente?.loja_id) {
    return lojaExistente.loja_id;
  }

  const slug = await gerarSlugUnico(nomeLoja);
  const telefoneLimpo = limparTelefone(whatsapp);

  const { data: lojaCriada, error: erroLoja } = await supabaseClient
    .from("lojas")
    .insert({
      nome: nomeLoja,
      slug,
      whatsapp: telefoneLimpo,
      telefone: telefoneLimpo,
      descricao: "",
      status: "ativo",
      dono_user_id: userId
    })
    .select("id")
    .single();

  if (erroLoja) {
    console.error(erroLoja);
    throw new Error("Erro ao criar a loja. Verifique se o SQL da etapa de cadastro foi executado no Supabase.");
  }

  const { error: erroVinculo } = await supabaseClient
    .from("usuarios_loja")
    .insert({
      user_id: userId,
      loja_id: lojaCriada.id,
      papel: "dono",
      nome: nomeResponsavel
    });

  if (erroVinculo) {
    console.error(erroVinculo);
    throw new Error("A loja foi criada, mas não foi possível vincular o usuário à loja.");
  }

  return lojaCriada.id;
}

async function redirecionarSeJaEstiverLogado() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {
    window.location.href = "admin.html";
  }
}

formCadastro.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nomeLoja = document.getElementById("nomeLojaCadastro").value.trim();
  const nomeResponsavel = document.getElementById("nomeResponsavelCadastro").value.trim();
  const whatsapp = document.getElementById("whatsappCadastro").value.trim();
  const email = document.getElementById("emailCadastro").value.trim().toLowerCase();
  const senha = document.getElementById("senhaCadastro").value.trim();
  const confirmarSenha = document.getElementById("confirmarSenhaCadastro").value.trim();

  if (!nomeLoja || !nomeResponsavel || !whatsapp || !email || !senha) {
    mostrarMensagemCadastro("Preencha todos os campos.", "erro");
    return;
  }

  if (senha.length < 6) {
    mostrarMensagemCadastro("A senha precisa ter pelo menos 6 caracteres.", "erro");
    return;
  }

  if (senha !== confirmarSenha) {
    mostrarMensagemCadastro("As senhas não conferem.", "erro");
    return;
  }

  botaoCadastro.disabled = true;
  botaoCadastro.innerText = "Criando loja...";
  mostrarMensagemCadastro("Criando sua conta no DeliveryOS...", "neutra");

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome_responsavel: nomeResponsavel,
          nome_loja: nomeLoja,
          whatsapp: limparTelefone(whatsapp)
        }
      }
    });

    if (error) {
      console.error(error);
      mostrarMensagemCadastro(error.message || "Erro ao criar conta.", "erro");
      return;
    }

    if (!data?.user) {
      mostrarMensagemCadastro("Conta criada, mas não foi possível identificar o usuário.", "erro");
      return;
    }

    if (!data.session) {
      mostrarMensagemCadastro("Conta criada. Confirme seu e-mail e depois entre pelo login para finalizar o acesso.", "sucesso");
      return;
    }

    mostrarMensagemCadastro("Conta criada. Preparando sua loja...", "neutra");

    await criarLojaEVinculo({
      userId: data.user.id,
      nomeLoja,
      nomeResponsavel,
      whatsapp
    });

    mostrarMensagemCadastro("Loja criada com sucesso. Redirecionando...", "sucesso");

    setTimeout(() => {
      window.location.href = "admin.html";
    }, 800);
  } catch (erro) {
    console.error(erro);
    mostrarMensagemCadastro(erro.message || "Erro inesperado ao criar sua loja.", "erro");
  } finally {
    botaoCadastro.disabled = false;
    botaoCadastro.innerText = "Criar minha loja";
  }
});

redirecionarSeJaEstiverLogado();
