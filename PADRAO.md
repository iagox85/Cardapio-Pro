# Padrões do DeliveryOS

## Regras gerais

- O sistema será multi-loja desde o início.
- Toda tabela operacional deve possuir `loja_id`.
- Cada loja só pode acessar os próprios dados.
- Dados importantes não ficam fixos no código.
- Configurações da loja ficam no banco.

## Produtos

- Produto não deve ser apagado definitivamente se já foi vendido.
- Para tirar do cardápio, usar `ativo = false` ou `indisponivel = true`.
- O preço do pedido deve ser salvo no momento da compra.

## Pedidos

- Pedido criado não deve ter seus valores alterados.
- Mudança de status deve ser registrada em histórico.
- Status permitidos:
  - novo
  - aceito
  - preparando
  - pronto
  - saiu_entrega
  - finalizado
  - cancelado

## Código

- Um arquivo JavaScript deve ter uma responsabilidade.
- `cardapio.js` cuida do cardápio.
- `carrinho.js` cuida do carrinho.
- `checkout.js` cuida da finalização.
- `admin.js` cuida da estrutura geral do painel.
- `produtos-admin.js` cuida de produtos no painel.
- `pedidos-admin.js` cuida de pedidos no painel.
- `relatorios.js` cuida dos relatórios.
- `print.js` cuida da impressão.

## Banco de dados

- Usar UUID como chave primária.
- Usar RLS no Supabase.
- Não misturar dados entre lojas.
- Relatórios devem usar os valores gravados nos pedidos, não os preços atuais dos produtos.
