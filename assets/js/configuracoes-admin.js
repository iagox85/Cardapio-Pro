const formConfiguracoes = document.getElementById("formConfiguracoes");
const mensagemConfiguracoes = document.getElementById("mensagemConfiguracoes");
const linkPublicoTexto = document.getElementById("linkPublicoTexto");
const btnAbrirCardapio = document.getElementById("btnAbrirCardapio");
const linkPublicoReal = document.getElementById("linkPublicoReal");
const btnCopiarLinkLoja = document.getElementById("btnCopiarLinkLoja");
const btnCompartilharLinkLoja = document.getElementById("btnCompartilharLinkLoja");
const btnBaixarQrCode = document.getElementById("btnBaixarQrCode");
const btnBaixarQrCodeModal = document.getElementById("btnBaixarQrCodeModal");
const qrCodeImagem = document.getElementById("qrCodeImagem");
const qrCodeModal = document.getElementById("qrCodeModal");
const qrCodeModalImagem = document.getElementById("qrCodeModalImagem");
const btnFecharQrModal = document.getElementById("btnFecharQrModal");
const pedidosHojeResumo = document.getElementById("pedidosHojeResumo");
const ultimoPedidoResumo = document.getElementById("ultimoPedidoResumo");
const lojaBannerArquivo = document.getElementById("lojaBannerArquivo");
const lojaLogoArquivo = document.getElementById("lojaLogoArquivo");
const previewBannerLoja = document.getElementById("previewBannerLoja");
const previewLogoLoja = document.getElementById("previewLogoLoja");


const botoesAbasConfiguracoes = document.querySelectorAll(".config-tab-btn");
const paineisAbasConfiguracoes = document.querySelectorAll(".config-tab-pane");

function ativarAbaConfiguracoes(nomeAba) {
  botoesAbasConfiguracoes.forEach((botao) => {
    botao.classList.toggle("ativo", botao.dataset.tab === nomeAba);
  });

  paineisAbasConfiguracoes.forEach((painel) => {
    painel.classList.toggle("ativo", painel.dataset.tabContent === nomeAba);
  });
}

botoesAbasConfiguracoes.forEach((botao) => {
  botao.addEventListener("click", () => {
    ativarAbaConfiguracoes(botao.dataset.tab);
  });
});

let lojaAtual = null;
let lojaSlugAtual = "";
let linkPublicoAtual = "";
let linkQrCodeAtual = "";

function campoValor(id, fallback = "") {
  const elemento = document.getElementById(id);
  return elemento ? elemento.value.trim() : fallback;
}

function definirCampo(id, valor = "") {
  const elemento = document.getElementById(id);
  if (elemento) elemento.value = valor || "";
}

function formatarTextoComIniciaisMaiusculas(texto) {
  return String(texto || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s,./ºª-])([\p{L}])/gu, (match, separador, letra) => {
      return `${separador}${letra.toLocaleUpperCase("pt-BR")}`;
    });
}

function normalizarExtensaoImagem(nomeArquivo, tipoArquivo) {
  const nome = String(nomeArquivo || "").toLowerCase();

  if (nome.endsWith(".png")) return "png";
  if (nome.endsWith(".webp")) return "webp";
  if (nome.endsWith(".jpg") || nome.endsWith(".jpeg")) return "jpg";

  if (tipoArquivo === "image/png") return "png";
  if (tipoArquivo === "image/webp") return "webp";

  return "jpg";
}

function validarImagemLoja(arquivo, tipoImagem) {
  if (!arquivo) return true;

  const limiteBytes = 1024 * 1024;
  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

  if (!tiposPermitidos.includes(arquivo.type)) {
    mostrarMensagemConfiguracoes(`${tipoImagem}: envie uma imagem JPG, PNG ou WEBP.`, "erro");
    return false;
  }

  if (arquivo.size > limiteBytes) {
    mostrarMensagemConfiguracoes(`${tipoImagem}: a imagem precisa ter no máximo 1MB.`, "erro");
    return false;
  }

  return true;
}

function atualizarPreviewImagem(elemento, url, textoVazio) {
  if (!elemento) return;

  if (!url) {
    elemento.innerHTML = textoVazio;
    return;
  }

  elemento.innerHTML = `<img src="${url}" alt="Prévia da imagem">`;
}

function prepararPreviewArquivo(input, preview, textoVazio, tipoImagem) {
  if (!input) return;

  input.addEventListener("change", () => {
    const arquivo = input.files && input.files[0];

    if (!arquivo) {
      atualizarPreviewImagem(preview, "", textoVazio);
      return;
    }

    if (!validarImagemLoja(arquivo, tipoImagem)) {
      input.value = "";
      return;
    }

    const urlTemporaria = URL.createObjectURL(arquivo);
    atualizarPreviewImagem(preview, urlTemporaria, textoVazio);
  });
}

async function enviarImagemLoja(input, tipoImagem) {
  const arquivo = input?.files?.[0];

  if (!arquivo) return "";

  if (!validarImagemLoja(arquivo, tipoImagem === "banner" ? "Banner" : "Logo")) {
    throw new Error("Imagem inválida");
  }

  const extensao = normalizarExtensaoImagem(arquivo.name, arquivo.type);
  const caminho = `${lojaAtual}/${tipoImagem}.${extensao}`;

  const { error } = await supabaseClient.storage
    .from("lojas")
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: true,
      contentType: arquivo.type
    });

  if (error) {
    console.error(error);
    throw new Error(`Erro ao enviar ${tipoImagem === "banner" ? "banner" : "logo"}.`);
  }

  const { data } = supabaseClient.storage
    .from("lojas")
    .getPublicUrl(caminho);

  return `${data.publicUrl}?v=${Date.now()}`;
}

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

function montarLinkBonito(slug) {
  if (!slug) return "";
  return `deliveryos.com/${slug}`;
}

function montarUrlQrCode(texto, tamanho = 320) {
  if (!texto) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${tamanho}x${tamanho}&margin=12&data=${encodeURIComponent(texto)}`;
}

function formatarDataPedido(dataISO) {
  if (!dataISO) return "Nenhum pedido";

  const data = new Date(dataISO);

  if (Number.isNaN(data.getTime())) {
    return "Data indisponível";
  }

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function mostrarMensagemConfiguracoes(texto, tipo = "sucesso") {
  mensagemConfiguracoes.innerText = texto;
  mensagemConfiguracoes.style.color = tipo === "erro" ? "#dc2626" : "#047857";
}

function atualizarLinkPublico(slug) {
  lojaSlugAtual = slug || "";
  linkPublicoAtual = montarLinkPublico(lojaSlugAtual);
  linkQrCodeAtual = montarUrlQrCode(linkPublicoAtual, 420);

  if (!linkPublicoTexto) return;

  if (!linkPublicoAtual) {
    linkPublicoTexto.innerText = "Link indisponível";
    linkPublicoTexto.removeAttribute("href");

    if (linkPublicoReal) {
      linkPublicoReal.innerText = "Esta loja ainda não possui slug.";
    }

    if (btnAbrirCardapio) {
      btnAbrirCardapio.href = "#";
      btnAbrirCardapio.classList.add("desativado");
    }

    limparQrCode();
    return;
  }

  linkPublicoTexto.innerText = montarLinkBonito(lojaSlugAtual);
  linkPublicoTexto.href = linkPublicoAtual;

  if (linkPublicoReal) {
    linkPublicoReal.innerText = linkPublicoAtual;
  }

  if (btnAbrirCardapio) {
    btnAbrirCardapio.href = linkPublicoAtual;
    btnAbrirCardapio.classList.remove("desativado");
  }

  gerarQrCode(linkPublicoAtual);
}

async function copiarLinkPublico() {
  if (!linkPublicoAtual) {
    mostrarMensagemConfiguracoes("Link público indisponível.", "erro");
    return;
  }

  try {
    await navigator.clipboard.writeText(linkPublicoAtual);
    mostrarMensagemConfiguracoes("Link copiado com sucesso!");
  } catch (error) {
    console.error(error);
    mostrarMensagemConfiguracoes("Não foi possível copiar automaticamente. Selecione e copie o link manualmente.", "erro");
  }
}

function limparQrCode() {
  if (qrCodeImagem) qrCodeImagem.removeAttribute("src");
  if (qrCodeModalImagem) qrCodeModalImagem.removeAttribute("src");
}

function gerarQrCode(texto) {
  if (!texto) return;

  linkQrCodeAtual = montarUrlQrCode(texto, 420);

  if (qrCodeImagem) {
    qrCodeImagem.src = montarUrlQrCode(texto, 240);
  }

  if (qrCodeModalImagem) {
    qrCodeModalImagem.src = linkQrCodeAtual;
  }
}

function abrirModalQrCode() {
  if (!qrCodeModal || !linkPublicoAtual) return;
  qrCodeModal.classList.add("ativo");
}

function fecharModalQrCode() {
  if (!qrCodeModal) return;
  qrCodeModal.classList.remove("ativo");
}

async function carregarResumoPedidosLoja() {
  if (!lojaAtual) return;

  try {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("id, created_at")
      .eq("loja_id", lojaAtual)
      .gte("created_at", inicioHoje.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("Não foi possível carregar o resumo de pedidos.", error);
      return;
    }

    if (pedidosHojeResumo) {
      pedidosHojeResumo.innerText = String(data?.length || 0);
    }

    if (ultimoPedidoResumo) {
      ultimoPedidoResumo.innerText = data && data.length > 0
        ? formatarDataPedido(data[0].created_at)
        : "Nenhum hoje";
    }
  } catch (error) {
    console.warn("Erro ao carregar resumo de pedidos.", error);
  }
}

function baixarQrCode() {
  if (!linkPublicoAtual) {
    mostrarMensagemConfiguracoes("QR Code indisponível.", "erro");
    return;
  }

  const nomeArquivo = lojaSlugAtual ? `qrcode-${lojaSlugAtual}.png` : "qrcode-cardapio.png";
  const urlDownload = montarUrlQrCode(linkPublicoAtual, 800);

  const linkDownload = document.createElement("a");
  linkDownload.href = urlDownload;
  linkDownload.download = nomeArquivo;
  linkDownload.target = "_blank";
  linkDownload.rel = "noopener";
  document.body.appendChild(linkDownload);
  linkDownload.click();
  linkDownload.remove();

  mostrarMensagemConfiguracoes("QR Code aberto para download.");
}

async function compartilharLinkPublico() {
  if (!linkPublicoAtual) {
    mostrarMensagemConfiguracoes("Link público indisponível.", "erro");
    return;
  }

  const textoCompartilhar = `Acesse nosso cardápio online: ${linkPublicoAtual}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Cardápio online",
        text: textoCompartilhar,
        url: linkPublicoAtual
      });
      mostrarMensagemConfiguracoes("Link compartilhado com sucesso!");
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error(error);
    }
  }

  try {
    await navigator.clipboard.writeText(textoCompartilhar);
    mostrarMensagemConfiguracoes("Texto de compartilhamento copiado com sucesso!");
  } catch (error) {
    console.error(error);
    mostrarMensagemConfiguracoes("Não foi possível compartilhar automaticamente.", "erro");
  }
}

async function carregarConfiguracoes() {
  const { data, error } = await supabaseClient
    .from("lojas")
    .select("*")
    .eq("id", lojaAtual)
    .single();

  if (error) {
    mostrarMensagemConfiguracoes("Erro ao carregar configurações.", "erro");
    console.error(error);
    return;
  }

  definirCampo("lojaNome", data.nome || "");
  definirCampo("lojaDescricao", data.descricao || "");
  definirCampo("lojaWhatsapp", data.whatsapp || "");
  definirCampo("lojaTelefone", data.telefone || "");
  definirCampo("lojaPix", data.pix_chave || "");
  definirCampo("lojaPedidoMinimo", data.pedido_minimo || 0);
  definirCampo("lojaTempoEntrega", data.tempo_entrega_min || 30);
  definirCampo("lojaEndereco", data.endereco || data.rua || "");
  definirCampo("lojaBairro", data.bairro || "");
  definirCampo("lojaCidade", data.cidade || "");
  definirCampo("lojaHorario", data.horario_atendimento || data.horario || "");
  definirCampo("lojaInstagram", data.instagram || data.instagram_url || "");
  definirCampo("lojaBannerUrl", data.banner_url || data.banner || "");
  definirCampo("lojaLogoUrl", data.logo_url || data.logo || "");
  atualizarPreviewImagem(previewBannerLoja, data.banner_url || data.banner || "", "Nenhum banner enviado");
  atualizarPreviewImagem(previewLogoLoja, data.logo_url || data.logo || "", "Sem logo");
  definirCampo("lojaFormasPagamento", data.formas_pagamento || data.pagamentos || "PIX, Dinheiro, Cartão");

  atualizarLinkPublico(data.slug);
  carregarResumoPedidosLoja();
}

formConfiguracoes.addEventListener("submit", async (e) => {
  e.preventDefault();

  mostrarMensagemConfiguracoes("Salvando...");

  const nome = campoValor("lojaNome");
  const descricao = campoValor("lojaDescricao");
  const whatsapp = campoValor("lojaWhatsapp");
  const telefone = campoValor("lojaTelefone");
  const pix_chave = campoValor("lojaPix");
  const pedido_minimo = Number(campoValor("lojaPedidoMinimo", "0") || 0);
  const tempo_entrega_min = Number(campoValor("lojaTempoEntrega", "30") || 30);
  const endereco = formatarTextoComIniciaisMaiusculas(campoValor("lojaEndereco"));
  const bairro = formatarTextoComIniciaisMaiusculas(campoValor("lojaBairro"));
  const cidade = formatarTextoComIniciaisMaiusculas(campoValor("lojaCidade"));
  const horario_atendimento = formatarTextoComIniciaisMaiusculas(campoValor("lojaHorario"));
  const instagram = campoValor("lojaInstagram");
  const instagram_url = instagram;
  let banner_url = campoValor("lojaBannerUrl");
  let logo_url = campoValor("lojaLogoUrl");
  const formas_pagamento = campoValor("lojaFormasPagamento");

  try {
    const novoBannerUrl = await enviarImagemLoja(lojaBannerArquivo, "banner");
    const novaLogoUrl = await enviarImagemLoja(lojaLogoArquivo, "logo");

    if (novoBannerUrl) banner_url = novoBannerUrl;
    if (novaLogoUrl) logo_url = novaLogoUrl;
  } catch (errorUpload) {
    mostrarMensagemConfiguracoes(errorUpload.message || "Erro ao enviar imagem.", "erro");
    return;
  }

  const { error } = await supabaseClient
    .from("lojas")
    .update({
      nome,
      descricao,
      whatsapp,
      telefone,
      pix_chave,
      pedido_minimo,
      tempo_entrega_min,
      endereco,
      bairro,
      cidade,
      horario_atendimento,
      instagram,
      instagram_url,
      banner_url,
      logo_url,
      formas_pagamento
    })
    .eq("id", lojaAtual);

  if (error) {
    mostrarMensagemConfiguracoes("Erro ao salvar configurações.", "erro");
    console.error(error);
    return;
  }

  definirCampo("lojaBannerUrl", banner_url);
  definirCampo("lojaLogoUrl", logo_url);
  atualizarPreviewImagem(previewBannerLoja, banner_url, "Nenhum banner enviado");
  atualizarPreviewImagem(previewLogoLoja, logo_url, "Sem logo");

  if (lojaBannerArquivo) lojaBannerArquivo.value = "";
  if (lojaLogoArquivo) lojaLogoArquivo.value = "";

  mostrarMensagemConfiguracoes("Configurações salvas com sucesso!");
});

if (btnCopiarLinkLoja) {
  btnCopiarLinkLoja.addEventListener("click", copiarLinkPublico);
}

if (btnBaixarQrCode) {
  btnBaixarQrCode.addEventListener("click", baixarQrCode);
}


if (btnCompartilharLinkLoja) {
  btnCompartilharLinkLoja.addEventListener("click", compartilharLinkPublico);
}

if (qrCodeImagem) {
  qrCodeImagem.addEventListener("click", abrirModalQrCode);
}

if (btnFecharQrModal) {
  btnFecharQrModal.addEventListener("click", fecharModalQrCode);
}

if (btnBaixarQrCodeModal) {
  btnBaixarQrCodeModal.addEventListener("click", baixarQrCode);
}

if (qrCodeModal) {
  qrCodeModal.addEventListener("click", (event) => {
    if (event.target === qrCodeModal) {
      fecharModalQrCode();
    }
  });
}

prepararPreviewArquivo(lojaBannerArquivo, previewBannerLoja, "Nenhum banner enviado", "Banner");
prepararPreviewArquivo(lojaLogoArquivo, previewLogoLoja, "Sem logo", "Logo");

carregarLojaDoUsuario();
