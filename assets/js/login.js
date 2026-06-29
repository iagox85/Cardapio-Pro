const formLogin = document.getElementById("formLogin");
const mensagemLogin = document.getElementById("mensagemLogin");

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  mensagemLogin.innerText = "Entrando...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    mensagemLogin.innerText = "E-mail ou senha inválidos.";
    return;
  }

  window.location.href = "admin.html";
});
