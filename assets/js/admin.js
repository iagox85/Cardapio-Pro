async function protegerAdmin() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }
}

protegerAdmin();

const botaoSair = document.getElementById("sair");

if (botaoSair) {
  botaoSair.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  });
}
