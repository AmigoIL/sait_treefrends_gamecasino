(() => {
  let deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function updateButtons() {
    const installed = isStandalone();

    document.querySelectorAll("[data-install-trigger]").forEach((button) => {
      if (installed || !deferredPrompt) {
        button.hidden = true;
        return;
      }

      button.hidden = false;
      button.textContent = "Установить приложение";
    });
  }

  async function handleInstallClick() {
    if (!deferredPrompt || isStandalone()) {
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    updateButtons();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch(() => {});
      });
    }

    document.querySelectorAll("[data-install-trigger]").forEach((button) => {
      button.addEventListener("click", handleInstallClick);
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      updateButtons();
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      updateButtons();
    });

    updateButtons();
  });
})();
