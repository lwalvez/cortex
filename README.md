# CORTEX — Premium Dashboard

Aplicação web local de produtividade pessoal: assistente, calendário, kanban,
projetos, trackers, dashboard financeiro, hábitos, notas, rascunhos,
pomodoro e muito mais.

## 🏛️ Arquitetura modular

O projeto foi reorganizado em **arquitetura por responsabilidades**, com
separação clara entre:

- **Base**       — variáveis CSS, layout fundamental, reset, responsividade.
- **Components** — primitivos reutilizáveis (botões, formulários, cards, modais, toast).
- **Features**   — cada seção do app é um módulo independente (CSS + JS).
- **Core**       — estado, persistência, utilidades, sincronização com arquivo.
- **UI**         — primitives de interface (router, modais).

```
cortex/
├── index.html                    Orquestrador — só HTML e <script>/<link>
├── assets/
│   ├── css/
│   │   ├── main.css              @import de toda a cascata em ordem
│   │   ├── base/
│   │   │   ├── variables.css     CSS custom properties (tema neon)
│   │   │   ├── layout.css        body, .main, .page, .sidebar (layout)
│   │   │   └── responsive.css    media queries (sempre por último)
│   │   ├── components/
│   │   │   ├── buttons.css       .btn, .btn-primary, .btn-icon...
│   │   │   ├── cards.css         .card genérico
│   │   │   ├── modals.css        .modal-backdrop, .modal, .form-*
│   │   │   └── toast.css         file sync notification
│   │   └── features/
│   │       ├── sidebar.css       sidebar + brand + nav-section + settings-gear
│   │       ├── cortex.css        hero, chat, esfera, sphere-toggle
│   │       ├── dashboard.css     summary cards, gráfico, recent, tabela txs
│   │       ├── calendar.css      mês, semana, dia, eventos
│   │       ├── kanban.css        boards, colunas, cartões, drag/drop
│   │       ├── projects.css      cards de projetos com prazo/progresso
│   │       ├── triggers.css      cards-link clicáveis
│   │       ├── notes.css         post-its (notes/mindset/mantras)
│   │       ├── drafts.css        notepad pessoal
│   │       ├── workouts.css      sessões de treino
│   │       ├── habits.css        hábitos positivos com heatmap
│   │       ├── bad-habits.css    cronômetro de hábitos ruins
│   │       ├── info.css          página de dados pessoais
│   │       ├── trackers.css      framework de trackers (pills, stat-row)
│   │       ├── settings.css      modal de configurações + sidebar order
│   │       └── pomodoro.css      widget timer da sidebar
│   └── js/
│       ├── main.js               renderAll() + boot da aplicação
│       ├── core/
│       │   ├── state.js          state, defaults, load(), save(), seed
│       │   ├── utils.js          escapeHtml, formatDate, escapeAttr
│       │   └── file-sync.js      File System Access API + IndexedDB
│       ├── ui/
│       │   └── router.js         event delegation da nav + open/closeModal
│       └── features/
│           ├── cortex.js         ParticleSphere + chat + sphere toggle
│           ├── dashboard.js      renderDashboard + renderTransactions
│           ├── calendar.js       3 views (mês/semana/dia) + event modal
│           ├── kanban.js         boards Pessoal/Profissional + DnD
│           ├── projects.js       projetos com tarefas e progresso
│           ├── triggers.js       atalhos clicáveis para sites
│           ├── notes.js          notes/mindset/mantras + drafts + toggles
│           ├── workouts.js       sessões de treino + exercícios
│           ├── habits.js         hábitos positivos (novo sistema)
│           ├── bad-habits.js     cronômetro ao vivo
│           ├── info.js           formulário de dados pessoais
│           ├── trackers.js       framework + 11 sub-trackers + tarefas
│           ├── settings.js       accent, density, sidebar order, etc
│           └── pomodoro.js       timer com ciclos e estatísticas
└── README.md
```

## 🔌 Ordem de carregamento

O `index.html` carrega os scripts numa ordem de dependência bem definida:

```
1.  Chart.js (CDN externa)
2.  core/state.js      ← declara state global + load/save
3.  core/utils.js      ← helpers genéricos
4.  core/file-sync.js  ← persistência em arquivo (depende de state)
5.  ui/router.js       ← event delegation da nav
6.  features/*.js      ← cada feature
7.  features/cortex.js ← (precisa de muitos outros)
8.  main.js            ← ÚLTIMO: chama renderAll() + boot
```

## 🌐 Estado global

Para manter o estilo onclick="..." em todo o HTML, funções são declaradas
no escopo global (sem ES modules). Cada módulo é um arquivo independente
mas opera sobre o `state` compartilhado.

## 💾 Persistência

- **localStorage** (chave `cortex_v1`): sempre ativa, salva tudo a cada alteração.
- **File System Access API** (Chrome/Edge): se configurada nas opções, grava
  os dados em um arquivo `.json` real escolhido pelo usuário.

## 🚀 Como rodar

Abra `index.html` no navegador. Se você usa Chrome ou Edge, todas as
features funcionam (incluindo sincronização com arquivo). Em Firefox e
Safari, o app funciona mas a sincronização com arquivo cai para
exportar/importar manual.
