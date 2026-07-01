// ============================================================
// DELIVERYOS - TOAST GLOBAL
// ------------------------------------------------------------
// Notificações visuais reutilizáveis para todo o painel.
// Uso:
// showToast("Produto salvo", "success");
// DeliveryOS.showToast("Erro ao salvar", "error");
// ============================================================

(function () {
  "use strict";

  if (window.DeliveryOSToast) return;

  function obterContainer() {
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

  function dados(tipo) {
    const mapa = {
      success: { icone: "✓", titulo: "Sucesso" },
      error: { icone: "!", titulo: "Erro" },
      warning: { icone: "!", titulo: "Atenção" },
      info: { icone: "i", titulo: "Aviso" },
      loading: { icone: "•", titulo: "Aguarde" }
    };

    return mapa[tipo] || mapa.info;
  }

  function remover(toast) {
    if (!toast || toast.classList.contains("saindo")) return;
    toast.classList.add("saindo");
    setTimeout(() => toast.remove(), 260);
  }

  function show(mensagem, tipo = "success", opcoes = {}) {
    const container = obterContainer();
    const info = dados(tipo);
    const duracao = Number(opcoes.duracao ?? opcoes.duration ?? 3500);
    const titulo = opcoes.titulo || info.titulo;

    const toast = document.createElement("div");
    toast.className = `deliveryos-toast ${tipo}`;
    toast.innerHTML = `
      <div class="deliveryos-toast-icon">${info.icone}</div>
      <div class="deliveryos-toast-content">
        <strong>${titulo}</strong>
        <span>${mensagem}</span>
      </div>
      <button type="button" class="deliveryos-toast-close" aria-label="Fechar aviso">×</button>
    `;

    toast.querySelector(".deliveryos-toast-close")?.addEventListener("click", () => remover(toast));
    container.appendChild(toast);

    if (duracao > 0) {
      setTimeout(() => remover(toast), duracao);
    }

    return toast;
  }

  const Toast = { show, remover };

  window.DeliveryOSToast = Toast;
  window.DeliveryOS?.registrarModulo?.("toast", Toast);
})();
