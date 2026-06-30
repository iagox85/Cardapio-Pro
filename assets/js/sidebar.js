function carregarSidebar(paginaAtiva) {
  const sidebar = document.getElementById("sidebar");

  sidebar.innerHTML = `
    <h2>DeliveryOS</h2>

    <nav>
      <a href="admin.html" class="${paginaAtiva === "dashboard" ? "active" : ""}">📊 Dashboard</a>
      <a href="pedidos.html" class="${paginaAtiva === "pedidos" ? "active" : ""}">📦 Pedidos</a>
      <a href="produtos.html" class="${paginaAtiva === "produtos" ? "active" : ""}">🍔 Produtos</a>
      <a href="categorias.html" class="${paginaAtiva === "categorias" ? "active" : ""}">📂 Categorias</a>
      <a href="grupos-adicionais.html" class="${paginaAtiva === "grupos" ? "active" : ""}">📋 Grupos</a>
      <a href="adicionais.html" class="${paginaAtiva === "adicionais" ? "active" : ""}">🧀 Adicionais</a>
      <a href="relatorios.html" class="${paginaAtiva === "relatorios" ? "active" : ""}">📈 Relatórios</a>
      <a href="configuracoes.html" class="${paginaAtiva === "configuracoes" ? "active" : ""}">⚙️ Configurações</a>
    </nav>
  `;
}
