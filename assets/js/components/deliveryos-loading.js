// ============================================================
// DELIVERYOS - LOADING DE BOTÕES
// ------------------------------------------------------------
// Padroniza estados de carregamento em botões do painel.
// ============================================================

(function () {
  "use strict";

  if (window.DeliveryOSLoading) return;

  function setButton(botao, carregando, textoCarregando = "Salvando...", textoFinal = null) {
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
  }

  const Loading = { setButton };

  window.DeliveryOSLoading = Loading;
  window.DeliveryOS?.registrarModulo?.("loading", Loading);
})();
