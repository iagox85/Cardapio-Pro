// ============================================================
// DELIVERYOS - CORE DO PAINEL
// ------------------------------------------------------------
// Bootstrap global do painel administrativo.
// ============================================================

(function () {
  "use strict";

  const VERSION = "20260701-core-clean-v1";

  if (window.DeliveryOS && window.DeliveryOS.__version === VERSION) {
    return;
  }

  const paginaAtual = (location.pathname.split("/").pop() || "admin.html").toLowerCase();

  const DeliveryOS = {
    __version: VERSION,
    pagina: paginaAtual,
    scriptsCarregados: new Set(),
    modulos: {},
    config: {
      paginasPublicas: new Set(["login.html", "cadastro.html", "loja.html", "index.html", "print.html"])
    }
  };

  function log(...args) {
    console.log("[DeliveryOS Core]", ...args);
  }

  function erro(...args) {
    console.error("[DeliveryOS Core]", ...args);
  }

  DeliveryOS.carregarScript = function carregarScript(src, id = null) {
    return new Promise((resolve, reject) => {
      if (!src) return resolve(false);

      const chave = id || src;

      if (DeliveryOS.scriptsCarregados.has(chave)) return resolve(true);
      if (id && document.getElementById(id)) {
        DeliveryOS.scriptsCarregados.add(chave);
        return resolve(true);
      }

      const script = document.createElement("script");
      script.src = src;
      if (id) script.id = id;
      script.defer = true;

      script.onload = () => {
        DeliveryOS.scriptsCarregados.add(chave);
        resolve(true);
      };

      script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
      document.body.appendChild(script);
    });
  };

  DeliveryOS.registrarModulo = function registrarModulo(nome, modulo) {
    if (!nome || !modulo) return;
    DeliveryOS.modulos[nome] = modulo;
  };

  DeliveryOS.obterModulo = function obterModulo(nome) {
    return DeliveryOS.modulos[nome] || null;
  };

  DeliveryOS.ehPainel = function ehPainel() {
    return !DeliveryOS.config.paginasPublicas.has(DeliveryOS.pagina);
  };

  DeliveryOS.showToast = function showToast(mensagem, tipo = "success", opcoes = {}) {
    if (window.DeliveryOSToast?.show) {
      return window.DeliveryOSToast.show(mensagem, tipo, opcoes);
    }

    console.log(`[${tipo}] ${mensagem}`);
    return null;
  };

  DeliveryOS.setButtonLoading = function setButtonLoading(botao, carregando, textoCarregando = "Salvando...", textoFinal = null) {
    if (window.DeliveryOSLoading?.setButton) {
      return window.DeliveryOSLoading.setButton(botao, carregando, textoCarregando, textoFinal);
    }

    if (!botao) return;
    botao.disabled = Boolean(carregando);
    if (carregando) botao.innerHTML = textoCarregando;
    if (!carregando && textoFinal) botao.innerHTML = textoFinal;
  };

  async function carregarModulosBase() {
    const versao = "20260701clean1";
    const modulos = [
      [`assets/js/core/deliveryos-storage.js?v=${versao}`, "deliveryos-storage-script"],
      [`assets/js/components/deliveryos-toast.js?v=${versao}`, "deliveryos-toast-script"],
      [`assets/js/components/deliveryos-loading.js?v=${versao}`, "deliveryos-loading-script"]
    ];

    for (const [src, id] of modulos) {
      try {
        await DeliveryOS.carregarScript(src, id);
      } catch (e) {
        erro(e);
      }
    }
  }

  async function iniciarModulos() {
    if (!DeliveryOS.ehPainel()) return;

    // Etapa 1: notificações globais ficam desativadas enquanto limpamos
    // a implementação antiga. O módulo novo será ligado na próxima etapa.
  }

  DeliveryOS.init = async function init() {
    window.DeliveryOS = DeliveryOS;
    window.showToast = DeliveryOS.showToast;
    window.setButtonLoading = DeliveryOS.setButtonLoading;

    await carregarModulosBase();

    window.showToast = DeliveryOS.showToast;
    window.setButtonLoading = DeliveryOS.setButtonLoading;

    await iniciarModulos();

    log("Core iniciado", {
      pagina: DeliveryOS.pagina,
      version: DeliveryOS.__version,
      painel: DeliveryOS.ehPainel()
    });
  };

  window.DeliveryOS = DeliveryOS;
  window.showToast = DeliveryOS.showToast;
  window.setButtonLoading = DeliveryOS.setButtonLoading;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => DeliveryOS.init());
  } else {
    DeliveryOS.init();
  }
})();
