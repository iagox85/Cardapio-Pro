<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>XS Delivery</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
body{background:#f6f6f6;color:#222}
header{background:#d62828;color:white;padding:18px 7%;display:flex;justify-content:space-between;gap:15px;align-items:center;position:sticky;top:0;z-index:10;box-shadow:0 4px 15px #0002}
.logo{font-size:28px;font-weight:bold}
header input{padding:12px;border:0;border-radius:10px;width:320px;max-width:100%}
.banner{background:linear-gradient(#0008,#0008),url("https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600");background-size:cover;background-position:center;color:white;padding:70px 7%}
.banner h1{font-size:42px;margin-bottom:10px}
.categorias{display:flex;gap:10px;overflow:auto;padding:22px 7%}
.categorias button{border:0;background:white;padding:12px 18px;border-radius:30px;font-weight:bold;cursor:pointer;white-space:nowrap}
.categorias button.ativo{background:#d62828;color:white}
main{display:grid;grid-template-columns:1fr 380px;gap:25px;padding:15px 7%;align-items:start}
#produtos{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:20px}
.card{background:white;border-radius:16px;overflow:hidden;box-shadow:0 5px 18px #0001}
.card img{width:100%;height:160px;object-fit:cover}
.card .info{padding:15px}
.card h3{margin-bottom:7px}
.card p{color:#666;font-size:14px;margin-bottom:12px}
.preco{color:#d62828;font-size:22px;font-weight:bold;margin-bottom:12px}
.card button,#enviar{width:100%;border:0;border-radius:10px;padding:13px;cursor:pointer;font-weight:bold}
.card button{background:#d62828;color:white}
.carrinho{background:white;border-radius:16px;padding:20px;box-shadow:0 5px 18px #0001;position:sticky;top:90px}
.carrinho h2,.carrinho h3{margin-bottom:15px}
.vazio{text-align:center;color:#777;padding:20px}
.item{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #eee;padding:12px 0}
.qtd{display:flex;align-items:center;gap:8px}
.qtd button{width:28px;height:28px;border:0;border-radius:50%;background:#d62828;color:white;cursor:pointer}
.totais{margin:15px 0}
.totais div{display:flex;justify-content:space-between;margin:8px 0}
.total{font-size:22px;color:#d62828;font-weight:bold}
input,textarea,select{width:100%;padding:12px;border:1px solid #ddd;border-radius:10px;margin-bottom:10px;outline:none}
textarea{resize:none;height:70px}
#enviar{background:#25D366;color:white;font-size:17px;margin-top:5px}
footer{text-align:center;padding:30px;color:#777}
@media(max-width:900px){main{grid-template-columns:1fr}.carrinho{position:static}header{flex-direction:column}.banner h1{font-size:32px}}
</style>
</head>
<body>
<header>
  <div class="logo">🍔 XS Delivery</div>
  <input id="pesquisa" placeholder="Pesquisar produto...">
</header>

<section class="banner">
  <h1>Peça seu lanche agora!</h1>
  <p>Monte seu pedido e envie direto pelo WhatsApp.</p>
</section>

<section class="categorias" id="categorias"></section>

<main>
  <section id="produtos"></section>

  <aside class="carrinho">
    <h2>🛒 Carrinho</h2>
    <div id="itens"><p class="vazio">Seu carrinho está vazio.</p></div>

    <div class="totais">
      <div><span>Subtotal</span><strong id="subtotal">R$ 0,00</strong></div>
      <div><span>Entrega</span><strong id="entrega">R$ 5,00</strong></div>
      <div class="total"><span>Total</span><strong id="total">R$ 5,00</strong></div>
    </div>

    <h3>Dados para entrega</h3>
    <input id="nome" placeholder="Nome">
    <input id="telefone" placeholder="Telefone">
    <input id="rua" placeholder="Rua">
    <input id="numero" placeholder="Número">
    <input id="bairro" placeholder="Bairro">
    <input id="complemento" placeholder="Complemento">
    <textarea id="referencia" placeholder="Ponto de referência"></textarea>

    <select id="pagamento">
      <option>PIX</option>
      <option>Dinheiro</option>
      <option>Cartão de Crédito</option>
      <option>Cartão de Débito</option>
    </select>
    <input id="troco" type="number" placeholder="Troco para quanto? (se dinheiro)">
    <button id="enviar">Enviar pedido no WhatsApp</button>
  </aside>
</main>

<footer>© 2026 XS Delivery</footer>

<script>
const WHATSAPP = "5527999999999"; // troque pelo número da lanchonete com 55 + DDD
const TAXA_ENTREGA = 5;

const produtos = [
  {id:1,nome:"X-Burguer",categoria:"Hambúrgueres",descricao:"Pão, carne, queijo e molho especial.",preco:29.90,imagem:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600"},
  {id:2,nome:"X-Salada",categoria:"Hambúrgueres",descricao:"Carne, queijo, alface, tomate e maionese.",preco:33.90,imagem:"https://images.unsplash.com/photo-1550547660-d9450f859349?w=600"},
  {id:3,nome:"X-Bacon",categoria:"Hambúrgueres",descricao:"Hambúrguer com bacon crocante.",preco:36.90,imagem:"https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600"},
  {id:4,nome:"Batata Frita",categoria:"Porções",descricao:"Batata frita crocante 400g.",preco:22.00,imagem:"https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600"},
  {id:5,nome:"Onion Rings",categoria:"Porções",descricao:"Anéis de cebola empanados.",preco:24.90,imagem:"https://images.unsplash.com/photo-1639024471283-03518883512d?w=600"},
  {id:6,nome:"Coca-Cola Lata",categoria:"Bebidas",descricao:"350ml gelada.",preco:7.00,imagem:"https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=600"},
  {id:7,nome:"Guaraná Lata",categoria:"Bebidas",descricao:"350ml gelado.",preco:6.50,imagem:"https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=600"},
  {id:8,nome:"Milk Shake",categoria:"Sobremesas",descricao:"Chocolate 500ml.",preco:18.90,imagem:"https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600"}
];

let carrinho = [];
let categoriaAtual = "Todos";

const dinheiro = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const elProdutos = document.getElementById("produtos");
const elCategorias = document.getElementById("categorias");
const elItens = document.getElementById("itens");

function criarCategorias(){
  const cats = ["Todos", ...new Set(produtos.map(p=>p.categoria))];
  elCategorias.innerHTML = cats.map(c=>`<button class="${c==="Todos"?"ativo":""}" onclick="filtrarCategoria('${c}', this)">${c}</button>`).join("");
}

function filtrarCategoria(cat, btn){
  categoriaAtual = cat;
  document.querySelectorAll(".categorias button").forEach(b=>b.classList.remove("ativo"));
  btn.classList.add("ativo");
  renderProdutos();
}

function renderProdutos(){
  const termo = document.getElementById("pesquisa").value.toLowerCase();
  const lista = produtos.filter(p =>
    (categoriaAtual==="Todos" || p.categoria===categoriaAtual) &&
    p.nome.toLowerCase().includes(termo)
  );

  elProdutos.innerHTML = lista.map(p=>`
    <div class="card">
      <img src="${p.imagem}" alt="${p.nome}">
      <div class="info">
        <h3>${p.nome}</h3>
        <p>${p.descricao}</p>
        <div class="preco">${dinheiro(p.preco)}</div>
        <button onclick="adicionar(${p.id})">Adicionar</button>
      </div>
    </div>
  `).join("");
}

function adicionar(id){
  const produto = produtos.find(p=>p.id===id);
  const item = carrinho.find(i=>i.id===id);
  if(item) item.qtd++;
  else carrinho.push({...produto,qtd:1});
  renderCarrinho();
}

function alterarQtd(id, delta){
  const item = carrinho.find(i=>i.id===id);
  if(!item) return;
  item.qtd += delta;
  if(item.qtd <= 0) carrinho = carrinho.filter(i=>i.id!==id);
  renderCarrinho();
}

function renderCarrinho(){
  if(carrinho.length===0){
    elItens.innerHTML = `<p class="vazio">Seu carrinho está vazio.</p>`;
  }else{
    elItens.innerHTML = carrinho.map(i=>`
      <div class="item">
        <div>
          <strong>${i.nome}</strong><br>
          <small>${dinheiro(i.preco)} cada</small>
        </div>
        <div class="qtd">
          <button onclick="alterarQtd(${i.id},-1)">−</button>
          <span>${i.qtd}</span>
          <button onclick="alterarQtd(${i.id},1)">+</button>
        </div>
      </div>
    `).join("");
  }
  const subtotal = carrinho.reduce((s,i)=>s+i.preco*i.qtd,0);
  document.getElementById("subtotal").innerText = dinheiro(subtotal);
  document.getElementById("entrega").innerText = dinheiro(TAXA_ENTREGA);
  document.getElementById("total").innerText = dinheiro(subtotal + TAXA_ENTREGA);
}

function finalizar(){
  if(carrinho.length===0) return alert("Adicione pelo menos um produto.");

  const nome = document.getElementById("nome").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const rua = document.getElementById("rua").value.trim();
  const numero = document.getElementById("numero").value.trim();
  const bairro = document.getElementById("bairro").value.trim();
  const complemento = document.getElementById("complemento").value.trim();
  const referencia = document.getElementById("referencia").value.trim();
  const pagamento = document.getElementById("pagamento").value;
  const troco = document.getElementById("troco").value.trim();

  if(!nome || !telefone || !rua || !numero || !bairro){
    return alert("Preencha nome, telefone, rua, número e bairro.");
  }

  const subtotal = carrinho.reduce((s,i)=>s+i.preco*i.qtd,0);
  const total = subtotal + TAXA_ENTREGA;
  const itens = carrinho.map(i=>`• ${i.qtd}x ${i.nome} - ${dinheiro(i.preco*i.qtd)}`).join("\\n");
  const infoTroco = pagamento==="Dinheiro" ? `\\n💵 Troco para: ${troco ? dinheiro(Number(troco)) : "não informado"}` : "";

  const mensagem = `🍔 *NOVO PEDIDO*\\n\\n👤 *Cliente:* ${nome}\\n📞 *Telefone:* ${telefone}\\n\\n📍 *Endereço:*\\n${rua}, Nº ${numero}\\nBairro: ${bairro}\\nComplemento: ${complemento || "Não informado"}\\nReferência: ${referencia || "Não informado"}\\n\\n🛒 *Pedido:*\\n${itens}\\n\\n💰 *Subtotal:* ${dinheiro(subtotal)}\\n🚚 *Entrega:* ${dinheiro(TAXA_ENTREGA)}\\n✅ *Total:* ${dinheiro(total)}\\n\\n💳 *Pagamento:* ${pagamento}${infoTroco}`;

  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`,"_blank");
}

document.getElementById("pesquisa").addEventListener("input", renderProdutos);
document.getElementById("enviar").addEventListener("click", finalizar);

criarCategorias();
renderProdutos();
renderCarrinho();
</script>
</body>
</html>
