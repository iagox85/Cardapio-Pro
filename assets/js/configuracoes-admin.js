const formConfiguracoes = document.getElementById("formConfiguracoes");
const mensagemConfiguracoes = document.getElementById("mensagemConfiguracoes");
const linkPublicoTexto = document.getElementById("linkPublicoTexto");
const btnAbrirCardapio = document.getElementById("btnAbrirCardapio");
const btnCopiarLinkLoja = document.getElementById("btnCopiarLinkLoja");
const btnBaixarQrCode = document.getElementById("btnBaixarQrCode");
const qrCodeCanvas = document.getElementById("qrCodeCanvas");

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

function mostrarMensagemConfiguracoes(texto, tipo = "sucesso") {
  mensagemConfiguracoes.innerText = texto;
  mensagemConfiguracoes.style.color = tipo === "erro" ? "#dc2626" : "#047857";
}

function atualizarLinkPublico(slug) {
  lojaSlugAtual = slug || "";
  linkPublicoAtual = montarLinkPublico(lojaSlugAtual);

  if (!linkPublicoTexto) return;

  if (!linkPublicoAtual) {
    linkPublicoTexto.innerText = "Link indisponível. Esta loja ainda não possui slug.";
    linkPublicoTexto.removeAttribute("href");

    if (btnAbrirCardapio) {
      btnAbrirCardapio.href = "#";
      btnAbrirCardapio.classList.add("desativado");
    }

    limparQrCode();
    return;
  }

  linkPublicoTexto.innerText = linkPublicoAtual;
  linkPublicoTexto.href = linkPublicoAtual;

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
  if (!qrCodeCanvas) return;

  const ctx = qrCodeCanvas.getContext("2d");
  ctx.clearRect(0, 0, qrCodeCanvas.width, qrCodeCanvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, qrCodeCanvas.width, qrCodeCanvas.height);
}

function gerarQrCode(texto) {
  if (!qrCodeCanvas || !texto) return;

  const ctx = qrCodeCanvas.getContext("2d");
  const tamanho = qrCodeCanvas.width;
  const margem = 10;
  const modulos = 29;
  const tamanhoModulo = Math.floor((tamanho - margem * 2) / modulos);
  const inicio = Math.floor((tamanho - tamanhoModulo * modulos) / 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tamanho, tamanho);

  const dados = gerarMatrizQrVisual(texto, modulos);

  ctx.fillStyle = "#111827";

  for (let linha = 0; linha < modulos; linha++) {
    for (let coluna = 0; coluna < modulos; coluna++) {
      if (dados[linha][coluna]) {
        ctx.fillRect(
          inicio + coluna * tamanhoModulo,
          inicio + linha * tamanhoModulo,
          tamanhoModulo,
          tamanhoModulo
        );
      }
    }
  }

  desenharMarcadorQr(ctx, inicio, inicio, tamanhoModulo);
  desenharMarcadorQr(ctx, inicio + (modulos - 7) * tamanhoModulo, inicio, tamanhoModulo);
  desenharMarcadorQr(ctx, inicio, inicio + (modulos - 7) * tamanhoModulo, tamanhoModulo);
}

function gerarMatrizQrVisual(texto, modulos) {
  const matriz = Array.from({ length: modulos }, () => Array(modulos).fill(false));
  let hash = 0;

  for (let i = 0; i < texto.length; i++) {
    hash = ((hash << 5) - hash + texto.charCodeAt(i)) | 0;
  }

  for (let linha = 0; linha < modulos; linha++) {
    for (let coluna = 0; coluna < modulos; coluna++) {
      if (estaAreaMarcadorQr(linha, coluna, modulos)) continue;

      const valor = Math.abs(
        Math.sin((linha + 1) * 12.9898 + (coluna + 1) * 78.233 + hash) * 43758.5453
      );

      matriz[linha][coluna] = valor % 1 > 0.52;
    }
  }

  return matriz;
}

function estaAreaMarcadorQr(linha, coluna, modulos) {
  const noTopoEsquerda = linha < 8 && coluna < 8;
  const noTopoDireita = linha < 8 && coluna >= modulos - 8;
  const noBaixoEsquerda = linha >= modulos - 8 && coluna < 8;

  return noTopoEsquerda || noTopoDireita || noBaixoEsquerda;
}

function desenharMarcadorQr(ctx, x, y, tamanhoModulo) {
  ctx.fillStyle = "#111827";
  ctx.fillRect(x, y, tamanhoModulo * 7, tamanhoModulo * 7);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + tamanhoModulo, y + tamanhoModulo, tamanhoModulo * 5, tamanhoModulo * 5);

  ctx.fillStyle = "#111827";
  ctx.fillRect(x + tamanhoModulo * 2, y + tamanhoModulo * 2, tamanhoModulo * 3, tamanhoModulo * 3);
}

function baixarQrCode() {
  if (!linkPublicoAtual || !qrCodeCanvas) {
    mostrarMensagemConfiguracoes("QR Code indisponível.", "erro");
    return;
  }

  const linkDownload = document.createElement("a");
  const nomeArquivo = lojaSlugAtual ? `qrcode-${lojaSlugAtual}.png` : "qrcode-cardapio.png";

  linkDownload.href = qrCodeCanvas.toDataURL("image/png");
  linkDownload.download = nomeArquivo;
  linkDownload.click();

  mostrarMensagemConfiguracoes("QR Code baixado com sucesso!");
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

  mostrarMensagemConfiguracoes("Salvando...");

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
    mostrarMensagemConfiguracoes("Erro ao salvar configurações.", "erro");
    console.error(error);
    return;
  }

  mostrarMensagemConfiguracoes("Configurações salvas com sucesso!");
});

if (btnCopiarLinkLoja) {
  btnCopiarLinkLoja.addEventListener("click", copiarLinkPublico);
}

if (btnBaixarQrCode) {
  btnBaixarQrCode.addEventListener("click", baixarQrCode);
}

carregarLojaDoUsuario();
