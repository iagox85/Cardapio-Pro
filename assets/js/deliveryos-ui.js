(function () {
  function obterContainerToast() {
    let container = document.getElementById("deliveryosToastContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "deliveryosToastContainer";
      container.className = "deliveryos-toast-container";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "true");
      document.body.appendChild(container);
    }

    return container;
  }

  function dadosToast(tipo) {
    const mapa = {
      success: { icone: "✓", titulo: "Sucesso" },
      error: { icone: "!", titulo: "Erro" },
      warning: { icone: "!", titulo: "Atenção" },
      info: { icone: "i", titulo: "Aviso" },
      loading: { icone: "•", titulo: "Aguarde" }
    };

    return mapa[tipo] || mapa.info;
  }

  function removerToast(toast) {
    if (!toast || toast.classList.contains("saindo")) return;

    toast.classList.add("saindo");
    setTimeout(() => toast.remove(), 260);
  }

  window.showToast = function showToast(mensagem, tipo = "success", opcoes = {}) {
    const container = obterContainerToast();
    const dados = dadosToast(tipo);
    const duracao = Number(opcoes.duracao ?? opcoes.duration ?? 3500);
    const titulo = opcoes.titulo || dados.titulo;

    const toast = document.createElement("div");
    toast.className = `deliveryos-toast ${tipo}`;
    toast.innerHTML = `
      <div class="deliveryos-toast-icon">${dados.icone}</div>
      <div class="deliveryos-toast-content">
        <strong>${titulo}</strong>
        <span>${mensagem}</span>
      </div>
      <button type="button" class="deliveryos-toast-close" aria-label="Fechar aviso">×</button>
    `;

    const botaoFechar = toast.querySelector(".deliveryos-toast-close");
    botaoFechar.addEventListener("click", () => removerToast(toast));

    container.appendChild(toast);

    if (duracao > 0) {
      setTimeout(() => removerToast(toast), duracao);
    }

    return toast;
  };

  window.setButtonLoading = function setButtonLoading(botao, carregando, textoCarregando = "Salvando...", textoFinal = null) {
    if (!botao) return;

    if (carregando) {
      if (!botao.dataset.textoOriginal) {
        botao.dataset.textoOriginal = botao.innerHTML;
      }

      botao.classList.add("salvando");
      botao.disabled = true;
      botao.innerHTML = textoCarregando;
      return;
    }

    botao.classList.remove("salvando");
    botao.disabled = false;

    if (textoFinal) {
      botao.innerHTML = textoFinal;
      setTimeout(() => {
        botao.innerHTML = botao.dataset.textoOriginal || "Salvar alterações";
      }, 1600);
      return;
    }

    botao.innerHTML = botao.dataset.textoOriginal || botao.innerHTML;
  };
})();
