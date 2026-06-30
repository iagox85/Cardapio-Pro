function carregarTopbar(titulo, subtitulo) {
  const topbar = document.getElementById("topbar");

  topbar.innerHTML = `
    <div>
      <h1>${titulo}</h1>
      <p>${subtitulo}</p>
    </div>

    <div class="topbar-actions">
      <button class="notification">🔔</button>
      <button id="sair">Sair</button>
    </div>
  `;
}
