// ===============================
// ADICIONAR AO CARRINHO
// ===============================

function adicionarCarrinho(id){

    const produto = produtos.find(p => p.id === id);

    const existe = carrinho.find(item => item.id === id);

    if(existe){

        existe.quantidade++;

    }else{

        carrinho.push({

            ...produto,

            quantidade:1

        });

    }

    atualizarCarrinho();

}

// ===============================
// DIMINUIR QUANTIDADE
// ===============================

function diminuirQuantidade(id){

    const item = carrinho.find(produto => produto.id === id);

    if(!item) return;

    item.quantidade--;

    if(item.quantidade <= 0){

        carrinho = carrinho.filter(produto => produto.id !== id);

    }

    atualizarCarrinho();

}

// ===============================
// AUMENTAR QUANTIDADE
// ===============================

function aumentarQuantidade(id){

    const item = carrinho.find(produto => produto.id === id);

    if(item){

        item.quantidade++;

    }

    atualizarCarrinho();

}

// ===============================
// REMOVER PRODUTO
// ===============================

function removerProduto(id){

    carrinho = carrinho.filter(produto => produto.id !== id);

    atualizarCarrinho();

}

// ===============================
// ATUALIZAR CARRINHO
// ===============================

function atualizarCarrinho(){

    itensCarrinho.innerHTML = "";

    if(carrinho.length === 0){

        itensCarrinho.innerHTML = `

        <p class="vazio">

            Seu carrinho está vazio.

        </p>

        `;

        subtotalElemento.innerHTML = dinheiro(0);

        entregaElemento.innerHTML = dinheiro(TAXA_ENTREGA);

        totalElemento.innerHTML = dinheiro(TAXA_ENTREGA);

        return;

    }

    let subtotal = 0;

    carrinho.forEach(item=>{

        const totalItem = item.preco * item.quantidade;

        subtotal += totalItem;

        itensCarrinho.innerHTML += `

        <div class="item-carrinho">

            <div>

                <strong>${item.nome}</strong>

                <br>

                ${dinheiro(item.preco)}

            </div>

            <div class="controle">

                <button onclick="diminuirQuantidade(${item.id})">−</button>

                <span>${item.quantidade}</span>

                <button onclick="aumentarQuantidade(${item.id})">+</button>

            </div>

        </div>

        `;

    });

    subtotalElemento.innerHTML = dinheiro(subtotal);

    entregaElemento.innerHTML = dinheiro(TAXA_ENTREGA);

    totalElemento.innerHTML = dinheiro(subtotal + TAXA_ENTREGA);

}
