async function protegerPaginaAdmin() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }
}

protegerPaginaAdmin();

const botaoSair = document.getElementById("sair");

if (botaoSair) {
  botaoSair.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  });
}
