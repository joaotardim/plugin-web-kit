---
name: novo-componente
description: Cria um componente UI reutilizável com CSS Module no padrão csc-web-kit (variants, sizes, paleta padrão, sem !important). Use ao criar um novo componente em src/components/ui.
---

# /novo-componente

Cria um novo componente UI reutilizável em `src/components/ui/`, seguindo os padrões do projeto.

## Contexto do projeto

- Componentes UI em `src/components/ui/`
- Cada componente tem: `NomeComponente.tsx` + `NomeComponente.module.css`
- Exportado via `src/components/ui/index.ts`
- **Sem Tailwind** — CSS Modules para estilos do componente, `style={{}}` inline apenas no consumidor
- Paleta de cores do projeto:
  - Azul primário: `#0f62fe` (hover: `#0353e9`)
  - Cinza secundário: `#e8e8e8` (hover: `#d1d1d1`)
  - Vermelho danger: `#da1e28` (hover: `#ba1b23`)
  - Texto: `#1a1a2e`
  - Borda: `#e0e0e0`
  - Background claro: `#f4f4f4`
- Transições: `0.15s ease`
- Border-radius padrão: `6px`
- Font padrão: `inherit` (system font stack definida no global)

## O que criar

$ARGUMENTS

---

## Passos

### PASSO 1 — Leia os componentes de referência

Leia pelo menos 2 dos componentes existentes para seguir o padrão:
- `src/components/ui/Button.tsx` + `Button.module.css`
- `src/components/ui/Input.tsx` + `Input.module.css`
- `src/components/ui/Card.tsx` + `Card.module.css`

### PASSO 2 — Planeje

1. Nome do componente (PascalCase)
2. Props necessárias (com tipos TypeScript explícitos)
3. Variantes ou estados visuais (ex: `variant`, `size`, `disabled`)
4. Se precisa encaminhar refs (`React.forwardRef`)
5. Se estende props HTML nativas (`HTMLAttributes`, `ButtonHTMLAttributes`, etc.)

### PASSO 3 — Crie `src/components/ui/NomeComponente.tsx`

Padrões obrigatórios:
- Named export: `export function NomeComponente(...)`
- Props com interface explícita
- Estender props HTML nativas quando aplicável para aceitar `className`, `style`, event handlers, etc.
- `disabled` deve ter visual feedback (opacity ou cursor)

```tsx
import styles from './NomeComponente.module.css'

interface NomeComponenteProps extends React.HTMLAttributes<HTMLDivElement> {
  // props específicas do componente
  variant?: 'primary' | 'secondary'
  // ...
}

export function NomeComponente({ variant = 'primary', className, ...props }: NomeComponenteProps) {
  return (
    <div
      className={[styles.base, styles[variant], className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
```

### PASSO 4 — Crie `src/components/ui/NomeComponente.module.css`

- Classe base + classes de variante separadas
- Use variáveis CSS inline ou valores diretos da paleta do projeto
- Sem `!important`
- Acessibilidade: `cursor: pointer` em elementos clicáveis, `cursor: not-allowed` + `opacity: 0.5` quando disabled

```css
.base {
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

.primary {
  background: #0f62fe;
  color: #fff;
}
.primary:hover:not(:disabled) {
  background: #0353e9;
}
```

### PASSO 5 — Exporte em `src/components/ui/index.ts`

Adicione a linha de export no arquivo existente:
```typescript
export { NomeComponente } from './NomeComponente'
```

### Checklist

- [ ] Named export em `.tsx`
- [ ] CSS Module criado com as mesmas classes referenciadas no `.tsx`
- [ ] Exportado em `index.ts`
- [ ] Props estende tipo HTML nativo quando faz sentido
- [ ] Sem `any`
- [ ] Acessibilidade: estados disabled, focus visible, cursor correto
