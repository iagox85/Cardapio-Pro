const nomeLoja = document.getElementById("nomeLoja");
const descricaoLoja = document.getElementById("descricaoLoja");
const tempoEntrega = document.getElementById("tempoEntrega");
const categoriasLoja = document.getElementById("categoriasLoja");
const produtosLoja = document.getElementById("produtosLoja");
const buscarProdutoLoja = document.getElementById("buscarProdutoLoja");
const statusLoja = document.getElementById("statusLoja");
const pedidoMinimoLoja = document.getElementById("pedidoMinimoLoja");
const taxaEntregaLoja = document.getElementById("taxaEntregaLoja");
const lojaLogo = document.getElementById("lojaLogo");
const lojaBanner = document.getElementById("lojaBanner");
const tipoAtendimentoLoja = document.getElementById("tipoAtendimentoLoja");
const enderecoLojaTopo = document.getElementById("enderecoLojaTopo");
const telefoneLojaTopo = document.getElementById("telefoneLojaTopo");
const horarioLojaTopo = document.getElementById("horarioLojaTopo");
const nomeLojaRodape = document.getElementById("nomeLojaRodape");
const descricaoLojaRodape = document.getElementById("descricaoLojaRodape");
const enderecoLojaRodape = document.getElementById("enderecoLojaRodape");
const telefoneLojaRodape = document.getElementById("telefoneLojaRodape");
const horarioLojaRodape = document.getElementById("horarioLojaRodape");
const copyrightLoja = document.getElementById("copyrightLoja");
const formasPagamentoRodape = document.getElementById("formasPagamentoRodape");
const instagramTopo = document.getElementById("instagramTopo");
const whatsappTopo = document.getElementById("whatsappTopo");
const instagramRodape = document.getElementById("instagramRodape");
const whatsappRodape = document.getElementById("whatsappRodape");
const abrirInfoLoja = document.getElementById("abrirInfoLoja");
const fecharInfoLoja = document.getElementById("fecharInfoLoja");
const modalInfoLoja = document.getElementById("modalInfoLoja");
const enderecoInfoLoja = document.getElementById("enderecoInfoLoja");
const pedidoMinimoInfoLoja = document.getElementById("pedidoMinimoInfoLoja");
const taxaEntregaInfoLoja = document.getElementById("taxaEntregaInfoLoja");
const instagramInfoLoja = document.getElementById("instagramInfoLoja");
const whatsappInfoLoja = document.getElementById("whatsappInfoLoja");

const modalProduto = document.getElementById("modalProduto");
const fecharModalProduto = document.getElementById("fecharModalProduto");
const modalProdutoImagem = document.getElementById("modalProdutoImagem");
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
let buscaAtual = "";

let produtoAtual = null;
let quantidadeAtual = 1;

function formatarMoedaLoja(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function obterImagemProduto(produto) {
  return (
    produto?.imagem_url ||
    produto?.imagem ||
    produto?.foto_url ||
    produto?.foto ||
    produto?.image_url ||
    ""
  );
}

function obterBannerLoja(loja) {
  return (
    loja?.banner_url ||
    loja?.banner ||
    loja?.imagem_banner ||
    ""
  );
}

function obterLogoLoja(loja) {
  return (
    loja?.logo_url ||
    loja?.logo ||
    loja?.imagem_logo ||
    ""
  );
}


function formatarTextoComIniciaisMaiusculas(texto) {
  return String(texto || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s,./ºª-])([\p{L}])/gu, (match, separador, letra) => {
      return `${separador}${letra.toLocaleUpperCase("pt-BR")}`;
    });
}

function obterCampoLoja(loja, campos, fallback = "") {
  for (const campo of campos) {
    const valor = loja?.[campo];

    if (valor !== null && valor !== undefined && String(valor).trim() !== "") {
      return String(valor).trim();
    }
  }

  return fallback;
}

function normalizarTelefone(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function removerEstadoDoEndereco(texto) {
  return String(texto || "")
    .replace(/\s*[-•,]\s*(Espírito Santo|Espirito Santo|ES|Bahia|BA|Rio de Janeiro|RJ|São Paulo|Sao Paulo|SP|Minas Gerais|MG)\s*$/i, "")
    .replace(/\s*[-•,]\s*[A-Z]{2}\s*$/i, "")
    .trim();
}

function montarEnderecoLoja(loja) {
  const enderecoCompleto = obterCampoLoja(loja, ["endereco_completo", "endereco", "rua", "logradouro"]);
  const numero = obterCampoLoja(loja, ["numero", "numero_endereco"]);
  const bairro = obterCampoLoja(loja, ["bairro"]);
  const cidade = obterCampoLoja(loja, ["cidade"]);

  const primeiraParte = [enderecoCompleto, numero].filter(Boolean).join(", ");
  const segundaParte = [bairro, cidade].filter(Boolean).join(" • ");
  const endereco = [primeiraParte, segundaParte].filter(Boolean).join(" • ");

  return endereco ? formatarTextoComIniciaisMaiusculas(endereco) : "Endereço não informado";
}

function montarHorarioLoja(loja) {
  const horario = obterCampoLoja(loja, ["horario_atendimento", "horario", "funcionamento", "horario_funcionamento"]);
  return horario ? formatarTextoComIniciaisMaiusculas(horario) : "Atendimento online";
}

function montarLinkRede(url, tipo = "instagram") {
  const valor = String(url || "").trim();

  if (!valor) return "";
  if (valor.startsWith("http://") || valor.startsWith("https://")) return valor;

  if (tipo === "instagram") {
    return `https://instagram.com/${valor.replace("@", "")}`;
  }

  return `https://${valor}`;
}

function atualizarLinkSocial(elemento, url) {
  if (!elemento) return;

  if (!url) {
    elemento.classList.add("oculto");
    elemento.removeAttribute("href");
    return;
  }

  elemento.href = url;
  elemento.classList.remove("oculto");
}

function montarLinkWhatsapp(numero) {
  const telefone = normalizarTelefone(numero);
  if (!telefone) return "";

  const telefoneComPais = telefone.startsWith("55") ? telefone : `55${telefone}`;
  return `https://wa.me/${telefoneComPais}`;
}

function renderizarPagamentosLoja(loja) {
  if (!formasPagamentoRodape) return;

  const pagamentosTexto = obterCampoLoja(loja, ["formas_pagamento", "pagamentos", "meios_pagamento"]);
  const pagamentos = pagamentosTexto
    ? pagamentosTexto.split(/[;,]/).map((item) => item.trim()).filter(Boolean)
    : ["PIX", "Dinheiro", "Cartão"];

  formasPagamentoRodape.innerHTML = pagamentos
    .map((pagamento) => `<span>${pagamento}</span>`)
    .join("");
}

function limitarTexto(texto, limite = 90) {
  const valor = String(texto || "").trim();

  if (valor.length <= limite) {
    return valor;
  }

  return `${valor.slice(0, limite).trim()}...`;
}

function mostrarSkeleton() {
  if (!produtosLoja) return;

  produtosLoja.innerHTML = `
    <div class="skeleton-grid">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
  `;
}

function obterSlugLojaDaUrl() {
  const params = new URLSearchParams(window.location.search);
  const slugQuery = params.get("loja") || params.get("slug");

  if (slugQuery && slugQuery.trim()) {
    return slugQuery.trim().toLowerCase();
  }

  const partesCaminho = window.location.pathname
    .split("/")
    .map((parte) => parte.trim())
    .filter(Boolean);

  const ultimaParte = partesCaminho[partesCaminho.length - 1] || "";

  if (ultimaParte && !ultimaParte.includes(".") && ultimaParte !== "loja") {
    return ultimaParte.toLowerCase();
  }

  return "";
}

function mostrarErroCarregarLoja(titulo = "Não foi possível carregar o cardápio.", mensagem = "Tente atualizar a página em alguns segundos.") {
  if (nomeLoja) {
    nomeLoja.innerText = "Erro ao carregar loja";
  }

  if (produtosLoja) {
    produtosLoja.innerHTML = `
      <div class="estado-vazio">
        <h3>${titulo}</h3>
        <p>${mensagem}</p>
      </div>
    `;
  }
}

async function buscarLojaPorSlug(slug) {
  const { data, error } = await supabaseClient
    .from("lojas")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return { data, error };
}

async function buscarPrimeiraLojaDisponivel() {
  const { data, error } = await supabaseClient
    .from("lojas")
    .select("*")
    .limit(1)
    .maybeSingle();

  return { data, error };
}

async function carregarLoja() {
  mostrarSkeleton();

  const slug = obterSlugLojaDaUrl();
  let resultado = null;

  if (slug) {
    resultado = await buscarLojaPorSlug(slug);
  } else {
    resultado = await buscarPrimeiraLojaDisponivel();
  }

  const { data, error } = resultado || {};

  if (error || !data) {
    console.error(error);

    if (slug) {
      mostrarErroCarregarLoja(
        "Loja não encontrada.",
        "Confira se o link do cardápio está correto."
      );
      return;
    }

    mostrarErroCarregarLoja();
    return;
  }

  lojaAtual = data;
  window.DeliveryOSLojaAtual = data;
  window.DeliveryOSLojaSlug = data.slug || slug || "";

  aplicarDadosDaLoja(data);

  await carregarCategorias();
  await carregarProdutos();
}

function aplicarDadosDaLoja(loja) {
  const nome = loja.nome || "Minha Loja";
  const descricao = loja.descricao || "Cardápio online";
  const tempo = loja.tempo_entrega_min || loja.tempo_entrega || 30;
  const pedidoMinimo = loja.pedido_minimo || loja.valor_minimo || 0;
  const taxaEntrega = loja.taxa_entrega || loja.entrega_taxa || 0;
  const aberta = loja.aberta !== false && loja.status !== "fechada";
  const logo = obterLogoLoja(loja);
  const banner = obterBannerLoja(loja);
  const endereco = montarEnderecoLoja(loja);
  const horario = montarHorarioLoja(loja);
  const whatsapp = obterCampoLoja(loja, ["whatsapp", "telefone_whatsapp", "celular"]);
  const telefone = obterCampoLoja(loja, ["telefone", "whatsapp", "celular"], "Telefone não informado");
  const instagram = montarLinkRede(obterCampoLoja(loja, ["instagram", "instagram_url", "link_instagram"]), "instagram");
  const whatsappLink = montarLinkWhatsapp(whatsapp || telefone);
  const tipoAtendimento = obterCampoLoja(loja, ["tipo_atendimento", "atendimento"], "Entrega ou retirada");

  document.title = `${nome} | Cardápio Online`;

  nomeLoja.innerText = nome;
  descricaoLoja.innerText = descricao;
  tempoEntrega.innerText = `⏱️ ${tempo} min`;

  if (tipoAtendimentoLoja) {
    tipoAtendimentoLoja.innerText = tipoAtendimento;
  }

  if (pedidoMinimoLoja) {
    pedidoMinimoLoja.innerText = `Pedido mínimo: ${formatarMoedaLoja(pedidoMinimo)}`;
  }

  if (taxaEntregaLoja) {
    taxaEntregaLoja.innerText = Number(taxaEntrega) > 0
      ? `Entrega: ${formatarMoedaLoja(taxaEntrega)}`
      : "Entrega a combinar";
  }

  if (pedidoMinimoInfoLoja) {
    pedidoMinimoInfoLoja.innerText = `🧾 Pedido mínimo: ${formatarMoedaLoja(pedidoMinimo)}`;
  }

  if (taxaEntregaInfoLoja) {
    taxaEntregaInfoLoja.innerText = Number(taxaEntrega) > 0
      ? `🛵 Entrega: ${formatarMoedaLoja(taxaEntrega)}`
      : "🛵 Entrega a combinar";
  }

  if (statusLoja) {
    statusLoja.innerText = aberta ? "Aberta agora" : "Fechada";
    statusLoja.classList.toggle("aberto", aberta);
    statusLoja.classList.toggle("fechado", !aberta);
  }

  if (lojaLogo) {
    if (logo) {
      lojaLogo.innerHTML = `<img src="${logo}" alt="${nome}">`;
    } else {
      lojaLogo.innerText = nome.charAt(0).toUpperCase();
    }
  }

  if (lojaBanner && banner) {
    lojaBanner.style.backgroundImage = `url("${banner}")`;
  }

  if (enderecoLojaTopo) enderecoLojaTopo.innerText = `📍 ${endereco}`;
  if (enderecoInfoLoja) enderecoInfoLoja.innerText = `📍 ${endereco}`;
  if (telefoneLojaTopo) telefoneLojaTopo.innerText = `☎ ${telefone}`;
  if (horarioLojaTopo) horarioLojaTopo.innerText = `🕒 ${horario}`;

  if (nomeLojaRodape) nomeLojaRodape.innerText = nome;
  if (descricaoLojaRodape) descricaoLojaRodape.innerText = descricao || "Cardápio online seguro, rápido e fácil de usar.";
  if (enderecoLojaRodape) enderecoLojaRodape.innerText = `📍 ${endereco}`;
  if (telefoneLojaRodape) telefoneLojaRodape.innerText = `☎ ${telefone}`;
  if (horarioLojaRodape) horarioLojaRodape.innerText = `🕒 ${horario}`;
  if (copyrightLoja) copyrightLoja.innerText = `© 2026 ${nome}. Todos os direitos reservados.`;

  atualizarLinkSocial(instagramTopo, instagram);
  atualizarLinkSocial(instagramRodape, instagram);
  atualizarLinkSocial(instagramInfoLoja, instagram);
  atualizarLinkSocial(whatsappTopo, whatsappLink);
  atualizarLinkSocial(whatsappRodape, whatsappLink);
  atualizarLinkSocial(whatsappInfoLoja, whatsappLink);
  renderizarPagamentosLoja(loja);
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
  renderizarCategorias();
}

function renderizarCategorias() {
  if (!categoriasLoja) return;

  categoriasLoja.innerHTML = `
    <button class="active" onclick="selecionarCategoria('todas', this)">
      Todos
    </button>
  `;

  categoriasCache.forEach((categoria) => {
    categoriasLoja.innerHTML += `
      <button onclick="selecionarCategoria('${categoria.id}', this)">
        ${categoria.nome}
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
      <div class="estado-vazio">
        <h3>Erro ao carregar produtos.</h3>
        <p>Verifique a conexão e tente novamente.</p>
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

  if (botao) {
    botao.classList.add("active");
    botao.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  }

  renderizarProdutos();
}

function filtrarProdutos() {
  let produtos = [...produtosCache];

  if (categoriaSelecionada !== "todas") {
    produtos = produtos.filter((produto) => produto.categoria_id === categoriaSelecionada);
  }

  if (buscaAtual.trim()) {
    const termo = buscaAtual.trim().toLowerCase();

    produtos = produtos.filter((produto) => {
      const nome = String(produto.nome || "").toLowerCase();
      const descricao = String(produto.descricao || "").toLowerCase();

      return nome.includes(termo) || descricao.includes(termo);
    });
  }

  return produtos;
}

function renderizarProdutos() {
  const produtos = filtrarProdutos();

  if (!produtos.length) {
    produtosLoja.innerHTML = `
      <div class="estado-vazio">
        <h3>Nenhum produto encontrado.</h3>
        <p>Tente buscar por outro nome ou escolha outra categoria.</p>
      </div>
    `;
    return;
  }

  produtosLoja.innerHTML = produtos.map((produto) => criarCardProduto(produto)).join("");
}

function criarCardProduto(produto) {
  const indisponivel = produto.indisponivel;
  const imagem = obterImagemProduto(produto);
  const descricao = limitarTexto(produto.descricao || "", 95);
  const precoPromocional = produto.preco_promocional || produto.promocional || null;
  const temPromocao = precoPromocional && Number(precoPromocional) > 0 && Number(precoPromocional) < Number(produto.preco);
  const precoAtual = temPromocao ? precoPromocional : produto.preco;

  return `
    <article class="produto-card ${indisponivel ? "produto-indisponivel" : ""}">
      <div class="produto-imagem">
        ${
          imagem
            ? `<img src="${imagem}" alt="${produto.nome}" loading="lazy">`
            : `<div class="produto-sem-foto">🍽️</div>`
        }

        ${temPromocao ? `<span class="badge-promocao">Promoção</span>` : ""}
      </div>

      <div class="produto-conteudo">
        <div class="produto-topo">
          <h3>${produto.nome}</h3>
        </div>

        <p>${descricao || "Produto disponível no cardápio."}</p>

        <div class="produto-rodape">
          <div class="produto-precos">
            ${
              temPromocao
                ? `<small>${formatarMoedaLoja(produto.preco)}</small>`
                : ""
            }
            <strong>${formatarMoedaLoja(precoAtual)}</strong>
          </div>

          <button
            type="button"
            ${indisponivel ? "disabled" : ""}
            onclick="abrirProduto('${produto.id}', this)"
          >
            ${indisponivel ? "Indisponível" : "+ Adicionar"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function abrirProduto(produtoId, botao) {
  const produto = produtosCache.find((item) => item.id === produtoId);

  if (!produto) return;

  if (botao) {
    botao.classList.add("btn-click");
    setTimeout(() => botao.classList.remove("btn-click"), 220);
  }

  produtoAtual = produto;
  quantidadeAtual = 1;

  const imagem = obterImagemProduto(produto);
  const precoPromocional = produto.preco_promocional || produto.promocional || null;
  const temPromocao = precoPromocional && Number(precoPromocional) > 0 && Number(precoPromocional) < Number(produto.preco);
  const precoAtual = temPromocao ? precoPromocional : produto.preco;

  modalProdutoNome.innerText = produto.nome;
  modalProdutoDescricao.innerText = produto.descricao || "";
  modalProdutoPreco.innerText = formatarMoedaLoja(precoAtual);
  quantidadeProduto.innerText = quantidadeAtual;
  observacaoProduto.value = "";

  if (modalProdutoImagem) {
    modalProdutoImagem.innerHTML = imagem
      ? `<img src="${imagem}" alt="${produto.nome}">`
      : `<div class="modal-sem-foto">🍽️</div>`;
  }

  renderizarGruposDoProduto(produto);
  atualizarTotalProduto();

  modalProduto.classList.remove("oculto");
  document.body.classList.add("modal-aberto");
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

    const minimo = Number(grupo.minimo || 0);
    const maximo = Number(grupo.maximo || 0);

    return `
      <div class="grupo-modal" data-grupo-id="${grupo.id}" data-minimo="${minimo}" data-maximo="${maximo}">
        <div class="grupo-modal-header">
          <div>
            <h3>${grupo.nome}</h3>
            <small>
              ${minimo > 0 ? `Escolha pelo menos ${minimo}` : "Opcional"}
              ${maximo > 0 ? ` • máximo ${maximo}` : ""}
            </small>
          </div>

          ${minimo > 0 ? `<span class="badge-obrigatorio">Obrigatório</span>` : `<span class="badge-opcional">Opcional</span>`}
        </div>

        <div class="adicionais-lista">
          ${adicionais.map((adicional) => `
            <label class="adicional-opcao">
              <div>
                <input
                  type="${maximo === 1 ? "radio" : "checkbox"}"
                  name="grupo-${grupo.id}"
                  value="${adicional.id}"
                  data-nome="${adicional.nome}"
                  data-preco="${adicional.preco}"
                  onchange="aoSelecionarAdicional('${grupo.id}', ${maximo}, this)"
                >
                <span>${adicional.nome}</span>
              </div>

              <strong>
                + ${formatarMoedaLoja(adicional.preco)}
              </strong>
            </label>
          `).join("")}
        </div>
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

function obterPrecoAtualProduto(produto) {
  const precoPromocional = produto?.preco_promocional || produto?.promocional || null;

  if (precoPromocional && Number(precoPromocional) > 0 && Number(precoPromocional) < Number(produto.preco)) {
    return Number(precoPromocional);
  }

  return Number(produto?.preco || 0);
}

function atualizarTotalProduto() {
  if (!produtoAtual) return;

  const precoProduto = obterPrecoAtualProduto(produtoAtual);
  const totalAdicionais = calcularAdicionaisSelecionados();
  const total = (precoProduto + totalAdicionais) * quantidadeAtual;

  totalProdutoModal.innerText = formatarMoedaLoja(total);
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

function fecharProduto() {
  modalProduto.classList.add("oculto");
  document.body.classList.remove("modal-aberto");
}

if (fecharModalProduto) {
  fecharModalProduto.addEventListener("click", fecharProduto);
}

if (modalProduto) {
  modalProduto.addEventListener("click", (e) => {
    if (e.target === modalProduto) {
      fecharProduto();
    }
  });
}

if (diminuirQuantidade) {
  diminuirQuantidade.addEventListener("click", () => {
    if (quantidadeAtual > 1) {
      quantidadeAtual--;
      quantidadeProduto.innerText = quantidadeAtual;
      atualizarTotalProduto();
    }
  });
}

if (aumentarQuantidade) {
  aumentarQuantidade.addEventListener("click", () => {
    quantidadeAtual++;
    quantidadeProduto.innerText = quantidadeAtual;
    atualizarTotalProduto();
  });
}

if (adicionarCarrinho) {
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

    const precoProduto = obterPrecoAtualProduto(produtoAtual);
    const totalAdicionais = adicionaisSelecionados.reduce((total, adicional) => {
      return total + Number(adicional.preco || 0);
    }, 0);

    const itemCarrinho = {
      produto_id: produtoAtual.id,
      loja_id: produtoAtual.loja_id,
      nome: produtoAtual.nome,
      descricao: produtoAtual.descricao || "",
      imagem: obterImagemProduto(produtoAtual),
      preco_unitario: precoProduto,
      quantidade: quantidadeAtual,
      adicionais: adicionaisSelecionados,
      observacao: observacaoProduto.value.trim(),
      subtotal: (precoProduto + totalAdicionais) * quantidadeAtual
    };

    window.DeliveryOSCarrinho.adicionar(itemCarrinho);

    const resumo = document.getElementById("carrinhoResumo");
    if (resumo) {
      resumo.classList.add("pulse-carrinho");
      setTimeout(() => resumo.classList.remove("pulse-carrinho"), 450);
    }

    fecharProduto();
  });
}

if (buscarProdutoLoja) {
  buscarProdutoLoja.addEventListener("input", (event) => {
    buscaAtual = event.target.value || "";
    renderizarProdutos();
  });
}

carregarLoja();


if (abrirInfoLoja && modalInfoLoja) {
  abrirInfoLoja.addEventListener("click", () => {
    modalInfoLoja.classList.remove("oculto");
    document.body.classList.add("modal-aberto");
  });
}

if (fecharInfoLoja && modalInfoLoja) {
  fecharInfoLoja.addEventListener("click", () => {
    modalInfoLoja.classList.add("oculto");
    document.body.classList.remove("modal-aberto");
  });
}

if (modalInfoLoja) {
  modalInfoLoja.addEventListener("click", (evento) => {
    if (evento.target === modalInfoLoja) {
      modalInfoLoja.classList.add("oculto");
      document.body.classList.remove("modal-aberto");
    }
  });
}
