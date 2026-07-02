# DeliveryOS Design System v0.2 — Componentes CSS

Esta sprint cria os componentes visuais reutilizáveis do DeliveryOS, mantendo a identidade atual do sistema.

## Arquivos criados

```text
assets/css/components/dos-layout.css
assets/css/components/dos-card.css
assets/css/components/dos-button.css
assets/css/components/dos-form.css
assets/css/components/dos-badge.css
assets/css/components/dos-table.css
assets/css/components/dos-modal.css
assets/css/components/dos-empty.css
```

## Arquivo alterado

```text
assets/css/deliveryos-design-system.css
```

Ele agora importa os componentes oficiais.

## Importante

Esta etapa **não migra as telas ainda**. Ela apenas cria o kit oficial de componentes para as próximas sprints.

Nenhum HTML ou JavaScript foi alterado.

## Componentes disponíveis

### Layout

```html
<header class="dos-page-header">
  <div>
    <h1 class="dos-page-title">Produtos</h1>
    <p class="dos-page-subtitle">Gerencie o cardápio da sua loja.</p>
  </div>
  <div class="dos-page-actions">...</div>
</header>
```

### Cards

```html
<div class="dos-card">
  <div class="dos-card-header">
    <div>
      <h2 class="dos-card-title">Resumo</h2>
      <p class="dos-card-subtitle">Dados principais da loja</p>
    </div>
  </div>
</div>
```

### Botões

```html
<button class="dos-btn dos-btn-primary">Salvar</button>
<button class="dos-btn dos-btn-secondary">Cancelar</button>
<button class="dos-btn dos-btn-danger">Excluir</button>
```

### Formulários

```html
<label class="dos-field">
  <span class="dos-label">Nome do produto</span>
  <input class="dos-input" placeholder="Ex: X-Bacon" />
</label>
```

### Badges

```html
<span class="dos-badge dos-badge-success">Ativo</span>
<span class="dos-badge dos-badge-danger">Pausado</span>
```

### Tabelas

```html
<div class="dos-table-wrap">
  <table class="dos-table">...</table>
</div>
```

## Como testar

Como esta sprint só adiciona CSS reutilizável, teste apenas:

- Dashboard abre normalmente.
- Produtos abre normalmente.
- Configurações abre normalmente.
- O visual não mudou de forma estranha.

## Próxima sprint

Migrar uma tela por vez para usar os componentes oficiais, começando pelo Dashboard ou Produtos.
