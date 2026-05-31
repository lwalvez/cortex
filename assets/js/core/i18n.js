/* =========================================================
   CORTEX · I18N · tradução PT ↔ EN
   - Dicionário PT → EN (chave = string PT exata, valor = EN)
   - translateNode/translateDOM percorre text nodes + atributos
   - MutationObserver re-traduz conteúdo inserido dinamicamente
   - Quando idioma volta pra PT, renderAll() injeta PT de novo
   ========================================================= */

const TRANSLATIONS_EN = {
  /* ── Sidebar / Nav ─────────────────────────────────────── */
  'Profissional': 'Professional',
  'Pessoal': 'Personal',
  'CORTEX': 'CORTEX',
  'Calendário': 'Calendar',
  'Tarefas': 'Tasks',
  'Kanban': 'Kanban',
  'Projetos': 'Projects',
  'Triggers': 'Triggers',
  'Hábitos': 'Habits',
  'Trackers': 'Trackers',
  'Dashboard': 'Dashboard',
  'Mentalidade': 'Mindset',
  'Notas': 'Notes',
  'Rascunhos': 'Drafts',
  'Informações': 'Information',
  'Premium Neon': 'Premium Neon',
  'sessões hoje': 'sessions today',
  'sessões': 'sessions',
  'min': 'min',

  /* ── Page headers/titles ───────────────────────────────── */
  'Informações Pessoais 🪪': 'Personal Information 🪪',
  'Calendário 📅': 'Calendar 📅',
  'Mentalidade 🧘': 'Mindset 🧘',
  'Rascunhos ✏️': 'Drafts ✏️',
  'Trackers 📊': 'Trackers 📊',
  'Projetos 🚀': 'Projects 🚀',
  'Hábitos ✨': 'Habits ✨',
  'Tarefas ✅': 'Tasks ✅',
  'Triggers ⚡': 'Triggers ⚡',
  'Kanban Pessoal 🗂️': 'Personal Kanban 🗂️',
  'Kanban Profissional 💼': 'Professional Kanban 💼',
  'Dashboard Financeiro': 'Financial Dashboard',
  'CORTEX — Premium Dashboard': 'CORTEX — Premium Dashboard',

  /* ── Page subtitles ────────────────────────────────────── */
  'Seus dados ficam salvos automaticamente': 'Your data is saved automatically',
  'Resumo do mês atual': 'Current month summary',
  'Visualize e organize seus eventos': 'View and organize your events',
  'Post-it rápido ou vault estratégico estilo Obsidian': 'Quick post-it or Obsidian-style strategic vault',
  'Mindset · princípios, crenças e lembretes mentais': 'Mindset · principles, beliefs and mental reminders',
  'Mantras · afirmações e frases de poder': 'Mantras · affirmations and power phrases',
  'Capture pensamentos rápidos · auto-save · zero atrito': 'Capture quick thoughts · auto-save · zero friction',
  'Acompanhe e tire insights de tudo na sua vida': 'Track and gain insights into everything in your life',
  'Organize iniciativas com prazos, tarefas e progresso': 'Organize initiatives with deadlines, tasks and progress',
  'Construa rotinas que mudam sua vida · heatmap, streaks e categorias': 'Build life-changing routines · heatmap, streaks and categories',
  'Gerencie tudo que precisa ser feito · prioridades, prazos e progresso': 'Manage everything that needs to be done · priorities, deadlines and progress',
  'Atalhos clicáveis · adicione o link de um site e crie um botão para acessá-lo rapidamente': 'Clickable shortcuts · add a site link and create a button to access it quickly',
  'Organize tarefas da sua vida pessoal': 'Organize tasks of your personal life',
  'Organize tarefas do seu trabalho': 'Organize tasks from your work',

  /* ── Section titles & subs ─────────────────────────────── */
  'Identidade': 'Identity',
  'Dados pessoais e perfil': 'Personal data and profile',
  'Documentos': 'Documents',
  'Identificação oficial': 'Official identification',
  'Endereço': 'Address',
  'Onde você mora': 'Where you live',
  'Saúde': 'Health',
  'Informações médicas críticas': 'Critical medical information',
  'Contatos de Emergência': 'Emergency Contacts',
  'Quem acionar em caso de necessidade': 'Who to call in case of need',
  'Prints Estratégicos': 'Strategic Screenshots',
  'Documentos, comprovantes, recibos · acesso rápido': 'Documents, receipts, proofs · quick access',
  'Receitas vs Despesas': 'Income vs Expenses',
  'Comparativo dos últimos 6 meses': 'Last 6 months comparison',
  'Gastos por Categoria': 'Spending by Category',
  'Distribuição do mês atual': 'Current month distribution',
  'Distribuição do mês': 'Month distribution',
  'Transações Recentes': 'Recent Transactions',
  'Últimos lançamentos': 'Latest entries',
  'Todas as Transações': 'All Transactions',
  'Histórico completo · adicione, edite ou exclua lançamentos': 'Full history · add, edit or delete entries',
  'Contas do mês': 'Month bills',
  'Marque pagas · clique para editar': 'Mark as paid · click to edit',
  'Por categoria': 'By category',
  'Todas as contas cadastradas': 'All registered bills',
  'Recorrentes aparecem todo mês · únicas só no mês de cadastro': 'Recurring appear every month · one-time only in registered month',
  'Progresso do mês': 'Month progress',
  'Para Hoje': 'For Today',
  '⚡ Para Hoje': '⚡ For Today',
  'Clique no card para marcar como feito': 'Click the card to mark as done',
  'Todos os Hábitos': 'All Habits',
  '📊 Todos os Hábitos': '📊 All Habits',
  'Histórico dos últimos 30 dias · streak atual e maior streak': 'Last 30 days history · current streak and longest streak',
  'Lista de Compras': 'Shopping List',
  '🛒 Lista de Compras': '🛒 Shopping List',
  'Adicione itens · valor opcional · total calculado automaticamente': 'Add items · optional value · total calculated automatically',
  'Notas': 'Notes',
  'Todas as notas': 'All notes',
  'Pastas (PARA)': 'Folders (PARA)',
  'Tags': 'Tags',
  'Rótulos': 'Labels',
  'Órfãs': 'Orphans',
  'Sem notas no vault': 'No notes in vault',
  'Receitas do Mês': 'Month Income',
  'Despesas do Mês': 'Month Expenses',
  'Saldo do Mês': 'Month Balance',
  'Receitas − Despesas': 'Income − Expenses',
  'Total do mês': 'Month total',
  'Já pago': 'Already paid',
  'A pagar': 'To pay',
  'Vencidas': 'Overdue',

  /* ── Buttons / actions ─────────────────────────────────── */
  'Salvar': 'Save',
  'Cancelar': 'Cancel',
  'Excluir': 'Delete',
  'Fechar': 'Close',
  'Editar': 'Edit',
  'Adicionar': 'Add',
  'Novo': 'New',
  'Hoje': 'Today',
  'Mês atual': 'Current month',
  '+ Nova Transação': '+ New Transaction',
  '+ Adicionar transação': '+ Add transaction',
  '+ Nova conta': '+ New bill',
  '+ Adicionar Cartão': '+ Add Card',
  '+ Novo Evento': '+ New Event',
  '+ Nova Nota': '+ New Note',
  '+ Novo Mindset': '+ New Mindset',
  '+ Novo Mantra': '+ New Mantra',
  '+ Novo rascunho': '+ New draft',
  '+ Novo Projeto': '+ New Project',
  '+ Novo Hábito': '+ New Habit',
  '+ Novo Trigger': '+ New Trigger',
  '+ Nova': '+ New',
  '+ Adicionar contato': '+ Add contact',
  '+ Adicionar print': '+ Add screenshot',
  '+ Adicionar exercício': '+ Add exercise',
  '📥 Exportar': '📥 Export',
  '📥 Baixar backup': '📥 Download backup',
  '📤 Carregar arquivo': '📤 Load file',
  '🔄 Começar do zero': '🔄 Start fresh',
  '🗑️ Limpar tudo': '🗑️ Clear all',
  '🗑️ Remover foto': '🗑️ Remove photo',
  '🔗 Conectar arquivo': '🔗 Connect file',
  '🔗 Reconectar': '🔗 Reconnect',
  '🔄 Reconectar': '🔄 Reconnect',
  '💾 Salvar agora': '💾 Save now',
  'Desconectar': 'Disconnect',
  '↺ Restaurar ordem padrão': '↺ Restore default order',
  '↺ Restaurar atalhos padrão': '↺ Restore default shortcuts',
  '⊟ Recolher todos': '⊟ Collapse all',
  '⊞ Expandir todos': '⊞ Expand all',

  /* ── Form labels ───────────────────────────────────────── */
  'Descrição': 'Description',
  'Categoria': 'Category',
  'Categoria ': 'Category ',
  'Valor': 'Value',
  'Valor (R$)': 'Value (R$)',
  'Data': 'Date',
  'Tipo': 'Type',
  'Ações': 'Actions',
  'Receita': 'Income',
  'Despesa': 'Expense',
  'Nome': 'Name',
  'Nome Completo': 'Full Name',
  'Nome do Treino': 'Workout Name',
  'Nome do hábito': 'Habit name',
  'Título': 'Title',
  'Título de Eleitor': 'Voter ID',
  'Prazo': 'Deadline',
  'Prazo (opcional)': 'Deadline (optional)',
  'Prioridade': 'Priority',
  'Status': 'Status',
  'Cor': 'Color',
  'Ícone': 'Icon',
  'Emoji': 'Emoji',
  'URL do site': 'Site URL',
  'Cidade': 'City',
  'Estado': 'State',
  'Endereço Completo': 'Full Address',
  'CPF': 'CPF',
  'RG': 'RG',
  'Passaporte': 'Passport',
  'Data de Nascimento': 'Date of Birth',
  'Horário de Nascimento': 'Time of Birth',
  'Idade': 'Age',
  'MBTI': 'MBTI',
  'Signo Solar': 'Sun Sign',
  'Ascendente': 'Rising Sign',
  'Tipo Sanguíneo': 'Blood Type',
  'Plano de Saúde': 'Health Plan',
  'Médico de Confiança': 'Trusted Doctor',
  'Alergias': 'Allergies',
  'Medicamentos em Uso': 'Current Medications',
  'Restrições Médicas': 'Medical Restrictions',
  'Não definido': 'Not set',
  'Início': 'Start',
  'Fim': 'End',
  'Dia inteiro': 'All day',
  'Recorrente (todo mês)': 'Recurring (monthly)',
  'Observações': 'Notes',
  'Vencimento (dia do mês)': 'Due date (day of month)',
  'Data de Início': 'Start Date',
  'Duração (minutos)': 'Duration (minutes)',
  'Como se sentiu': 'How you felt',
  'Exercícios': 'Exercises',
  'Séries': 'Sets',
  'Reps': 'Reps',
  'Peso(kg)': 'Weight(kg)',
  'Horário ideal': 'Ideal time',
  'Frequência': 'Frequency',
  'Vezes por semana': 'Times per week',
  'Motivação / Notas (opcional)': 'Motivation / Notes (optional)',
  'Escolha um ícone': 'Choose an icon',

  /* ── Selects (options) ─────────────────────────────────── */
  'Baixa': 'Low',
  'Média': 'Medium',
  'Alta': 'High',
  'Musculação': 'Weight Training',
  'Cardio': 'Cardio',
  'HIIT': 'HIIT',
  'Yoga': 'Yoga',
  'Funcional': 'Functional',
  'Calistenia': 'Calisthenics',
  'Esporte': 'Sport',
  'Ótimo': 'Great',
  'Bom': 'Good',
  'Ok': 'Ok',
  'Cansado': 'Tired',
  'Ruim': 'Bad',
  'Qualquer hora': 'Any time',
  'Manhã': 'Morning',
  'Tarde': 'Afternoon',
  'Noite': 'Night',
  'Diário (todo dia)': 'Daily (every day)',
  'Semanal (X vezes/semana)': 'Weekly (X times/week)',
  'Mês': 'Month',
  'Semana': 'Week',
  'Dia': 'Day',
  'Mindset': 'Mindset',
  'Mantras': 'Mantras',
  'Post-it': 'Post-it',
  'Vault': 'Vault',
  'Visualização': 'Visualization',
  'Resumo': 'Summary',
  'Contas a Pagar': 'Bills to Pay',
  'Cartões Dinâmicos': 'Dynamic Cards',
  'Todos os status': 'All statuses',
  '⚙ Em andamento': '⚙ In progress',
  '⏳ Pendente': '⏳ Pending',
  '✓ Concluído': '✓ Done',
  '! Urgente': '! Urgent',
  '↕ Ordem manual': '↕ Manual order',
  '⚡ Prioridade': '⚡ Priority',
  '📅 Data': '📅 Date',
  '🆕 Criação': '🆕 Created',
  '🔤 Título': '🔤 Title',
  '📋 Planejamento': '📋 Planning',
  '🚀 Ativo': '🚀 Active',
  '⏸ Pausado': '⏸ Paused',
  '✕ Cancelado': '✕ Cancelled',

  /* ── Categorias signos ─────────────────────────────────── */
  'Áries': 'Aries', 'Touro': 'Taurus', 'Gêmeos': 'Gemini', 'Câncer': 'Cancer',
  'Leão': 'Leo', 'Virgem': 'Virgo', 'Libra': 'Libra', 'Escorpião': 'Scorpio',
  'Sagitário': 'Sagittarius', 'Capricórnio': 'Capricorn', 'Aquário': 'Aquarius', 'Peixes': 'Pisces',

  /* ── Categorias hábitos ────────────────────────────────── */
  'Foco': 'Focus',
  'Aprendizado': 'Learning',
  'Espiritualidade': 'Spirituality',
  'Relacionamentos': 'Relationships',
  'Trabalho': 'Work',
  'Criatividade': 'Creativity',
  'Físico': 'Physical',

  /* ── Modal titles & subs ───────────────────────────────── */
  'Nova Transação': 'New Transaction',
  'Preencha os detalhes do lançamento': 'Fill in the entry details',
  'Novo Treino': 'New Workout',
  'Registre sua sessão e exercícios': 'Record your session and exercises',
  'Novo Cartão': 'New Card',
  'Adicione detalhes da tarefa': 'Add task details',
  'Novo Evento': 'New Event',
  'Preencha os detalhes do evento': 'Fill in the event details',
  'Novo Projeto': 'New Project',
  'Defina os parâmetros do projeto': 'Define the project parameters',
  'Novo Hábito': 'New Habit',
  'Defina o hábito que você quer construir': 'Define the habit you want to build',
  'Comece a rastrear hoje': 'Start tracking today',
  'Novo Trigger': 'New Trigger',
  'Crie um atalho clicável para um site': 'Create a clickable shortcut to a site',
  'Nova Conta': 'New Bill',
  'Conta mensal recorrente ou pontual': 'Monthly recurring or one-time bill',
  'Nova Refeição': 'New Meal',
  'Editar Refeição': 'Edit Meal',
  'Registre sua refeição e alimentos': 'Record your meal and foods',
  '+ Nova Refeição': '+ New Meal',
  'Nome da Refeição': 'Meal Name',
  'Ex: Almoço pós-treino': 'Ex: Post-workout lunch',
  'Café da Manhã': 'Breakfast',
  'Almoço': 'Lunch',
  'Jantar': 'Dinner',
  'Lanche': 'Snack',
  'Ceia': 'Supper',
  '☕ Café da Manhã': '☕ Breakfast',
  '🍽️ Almoço': '🍽️ Lunch',
  '🌙 Jantar': '🌙 Dinner',
  '🥪 Lanche': '🥪 Snack',
  '🍵 Ceia': '🍵 Supper',
  'Água (copos)': 'Water (glasses)',
  'Alimentos': 'Foods',
  'Qtd': 'Qty',
  'kcal': 'kcal',
  'Pesado': 'Heavy',
  '😓 Pesado': '😓 Heavy',
  '+ Adicionar alimento': '+ Add food',
  'Ex: Arroz': 'Ex: Rice',
  'Nenhum alimento registrado.': 'No food recorded.',
  'Nenhum registro de dieta. Comece hoje.': 'No diet records. Start today.',
  '🍴 Plano de Hoje': '🍴 Today\'s Plan',
  'Plano de Hoje': 'Today\'s Plan',
  'Nada planejado': 'Nothing planned',
  '+ Adicionar item...': '+ Add item...',
  'Limpar plano de hoje': 'Clear today\'s plan',
  'Limpar o plano de hoje?': 'Clear today\'s plan?',
  'Histórico de Refeições': 'Meals History',
  'Refeições registradas com detalhes': 'Recorded meals with details',
  'Lista': 'List',
  'Hábitos Ativos': 'Active Habits',
  'Concluídos Hoje': 'Done Today',
  'Taxa Média 30d': '30d Avg Rate',
  'Streak Médio': 'Avg Streak',
  'Dia completo 🎉': 'Day complete 🎉',
  'em andamento': 'in progress',
  '📅 Últimos 7 dias': '📅 Last 7 days',
  'Conclusões totais por dia': 'Total completions per day',
  '🏷️ Por categoria': '🏷️ By category',
  'Distribuição dos hábitos ativos': 'Distribution of active habits',
  '🔥 Top 5 Streaks': '🔥 Top 5 Streaks',
  'Suas melhores sequências atuais': 'Your best current streaks',
  '⏰ Por horário ideal': '⏰ By ideal time',
  'Quando seus hábitos acontecem': 'When your habits happen',
  '🗓️ Heatmap consolidado · 12 semanas': '🗓️ Consolidated heatmap · 12 weeks',
  'Intensidade = quantos hábitos foram feitos no dia': 'Intensity = how many habits were done that day',
  '⚠️ Hábitos em risco': '⚠️ Habits at risk',
  'Taxa de conclusão abaixo de 50% nos últimos 30 dias': 'Completion rate below 50% in the last 30 days',
  '🎉 Todos os hábitos estão em dia (acima de 50%)!': '🎉 All habits are on track (above 50%)!',
  'Menos': 'Less',
  'Mais': 'More',
  'Sem categoria': 'No category',
  'Manhã': 'Morning',
  'Tarde': 'Afternoon',
  'Noite': 'Night',
  'Qualquer': 'Any',
  'Médio': 'Avg',
  'conclusões': 'completions',
  'hábito': 'habit',
  'hábitos': 'habits',
  'Remover': 'Remove',
  'item comido': 'item eaten',
  'itens comidos': 'items eaten',
  'Refeições Hoje': 'Meals Today',
  'Calorias Hoje': 'Calories Today',
  'Água Hoje': 'Water Today',
  'Streak Água': 'Water Streak',
  'Meta: 8': 'Goal: 8',
  'Acima de 8 copos': 'Above 8 glasses',
  'item': 'item',
  'itens': 'items',
  'copos': 'glasses',
  '⚙️ Configurações': '⚙️ Settings',
  'Personalize sua experiência no CORTEX': 'Customize your CORTEX experience',

  /* ── Settings sections & rows ──────────────────────────── */
  '🎨 Aparência': '🎨 Appearance',
  '🧭 Ordem da Sidebar': '🧭 Sidebar Order',
  '📅 Calendário': '📅 Calendar',
  '🍅 Pomodoro': '🍅 Pomodoro',
  '💰 Finanças': '💰 Finance',
  '⌨️ Atalhos de teclado': '⌨️ Keyboard shortcuts',
  '📊 Estatísticas': '📊 Statistics',
  '💾 Dados & Backup': '💾 Data & Backup',
  '🔄 Sincronização com Arquivo': '🔄 File Sync',
  'ℹ️ Sobre': 'ℹ️ About',
  'Cor de acento': 'Accent color',
  'Densidade': 'Density',
  'Tamanho dos cards e espaçamento': 'Card size and spacing',
  'Animações': 'Animations',
  'Transições e efeitos visuais': 'Transitions and visual effects',
  'Idioma': 'Language',
  'Language · escolha o idioma da interface': 'Language · choose the interface language',
  'Relógio minimalista': 'Minimal clock',
  'Mostra data e hora no canto superior direito': 'Shows date and time in the top right corner',
  'Barra lateral recolhida': 'Collapsed sidebar',
  'Mostra só os ícones na sidebar (clique no chevron na lateral também alterna)': 'Shows only icons in sidebar (click chevron on side also toggles)',
  'Tamanho da esfera': 'Sphere size',
  'Modelo da esfera': 'Sphere model',
  'Forma das partículas no CORTEX': 'Particle shape in CORTEX',
  'Escolha o estilo das partículas · transição suave no CORTEX': 'Choose the particle style · smooth transition in CORTEX',
  'Clássica': 'Classic',
  'Wireframe': 'Wireframe',
  'Nebulosa': 'Nebula',
  'Hélice': 'Helix',
  '🌌 Clássica': '🌌 Classic',
  '🕸️ Wireframe': '🕸️ Wireframe',
  '🌫️ Nebulosa': '🌫️ Nebula',
  '🧬 Hélice': '🧬 Helix',
  'Pontos uniformes': 'Uniform points',
  'Malha lat/long': 'Lat/long mesh',
  'Clusters de densidade': 'Density clusters',
  'Bobinas polo-a-polo': 'Pole-to-pole coils',
  'Copiar conteúdo': 'Copy content',
  'Copiar': 'Copy',
  '✓ Rascunho copiado': '✓ Draft copied',
  'Rascunho vazio': 'Empty draft',
  'Escala visual da esfera no CORTEX · responsivo a qualquer tela': 'Sphere visual scale in CORTEX · responsive to any screen',
  'Foto de perfil': 'Profile photo',
  'Substitui o "C" no canto superior · clique no logo pra trocar': 'Replaces the "C" in the top corner · click logo to change',
  'Nenhuma definida': 'None set',
  'Compacto': 'Compact',
  'Confortável': 'Comfortable',
  'Espaçoso': 'Spacious',
  'Primeiro dia da semana': 'First day of week',
  'Afeta o calendário': 'Affects the calendar',
  'Domingo': 'Sunday',
  'Segunda': 'Monday',
  'Tempo de foco': 'Focus time',
  'Duração de cada sessão de trabalho': 'Duration of each work session',
  'Pausa curta': 'Short break',
  'Após cada sessão de foco': 'After each focus session',
  'Pausa longa': 'Long break',
  'Pausa estendida após várias sessões': 'Extended break after several sessions',
  'Ciclo até pausa longa': 'Cycle until long break',
  'Após quantas sessões de foco': 'After how many focus sessions',
  'Moeda': 'Currency',
  'Símbolo usado em valores': 'Symbol used in values',
  'Itens totais': 'Total items',
  'KB usados': 'KB used',
  'Bytes': 'Bytes',
  'Transações': 'Transactions',
  'Notas/Mind/Mantras': 'Notes/Mind/Mantras',
  'Eventos': 'Events',
  'Treinos': 'Workouts',
  'Livros': 'Books',
  'Metas': 'Goals',
  'Filmes': 'Movies',
  'Skills': 'Skills',
  'Exportar': 'Export',
  'Baixe um JSON com todos os seus dados': 'Download a JSON with all your data',
  'Importar': 'Import',
  'Restaurar de um JSON exportado': 'Restore from an exported JSON',
  'Zerar interface': 'Reset interface',
  'Zona de perigo': 'Danger zone',
  'CORTEX': 'CORTEX',
  'Dashboard pessoal · v1.0 · Local-first': 'Personal dashboard · v1.0 · Local-first',
  'Forçar gravação': 'Force write',
  'Salvar imediatamente no arquivo': 'Save immediately to file',
  'Reconectar': 'Reconnect',
  'Pedir permissão novamente (se o navegador perdeu acesso)': 'Request permission again (if browser lost access)',
  'Desconectar arquivo': 'Disconnect file',
  'Para de gravar no arquivo. Dados continuam no navegador.': 'Stops writing to file. Data remains in browser.',
  'Reconectar arquivo': 'Reconnect file',
  'Restaurar acesso de gravação': 'Restore write access',
  'Esquecer arquivo': 'Forget file',
  'Cancelar a sincronização': 'Cancel synchronization',
  'Conectar arquivo local': 'Connect local file',
  'Cria ou abre um .json no seu disco': 'Creates or opens a .json on your disk',
  'Use ▲ ▼ para reordenar dentro da seção · use ⇄ para mover um item entre': 'Use ▲ ▼ to reorder within section · use ⇄ to move an item between',

  /* ── Pomodoro widget ───────────────────────────────────── */
  'Pomodoro': 'Pomodoro',
  'Foco': 'Focus',
  'Pausa curta': 'Short break',
  'Pausa longa': 'Long break',

  /* ── Greetings ─────────────────────────────────────────── */
  'Bom dia, Mestre.': 'Good morning, Master.',
  'Boa tarde, Mestre.': 'Good afternoon, Master.',
  'Boa noite, Mestre.': 'Good evening, Master.',
  'Bom dia': 'Good morning',
  'Boa tarde': 'Good afternoon',
  'Boa noite': 'Good evening',
  'Pergunte algo ao CORTEX...': 'Ask CORTEX something...',
  'Pergunte ao CORTEX': 'Ask CORTEX',
  '📅 Hoje': '📅 Today',
  '⏭️ Amanhã': '⏭️ Tomorrow',
  '🗓️ Semana': '🗓️ Week',
  '✅ Tarefas': '✅ Tasks',
  '🎯 Metas': '🎯 Goals',
  '✨ Hábitos': '✨ Habits',
  '💰 Finanças': '💰 Finance',
  '🚀 Projetos': '🚀 Projects',
  '🚫 Vícios': '🚫 Bad Habits',
  '📚 Livros': '📚 Books',
  '🏋️ Treinos': '🏋️ Workouts',
  '📊 Tudo': '📊 All',

  /* ── Notes & toasts (curtas) ──────────────────────────── */
  'salvo': 'saved',
  '0 transações': '0 transactions',
  '0 contas': '0 bills',
  '0 quitadas': '0 settled',
  '0 pendentes': '0 pending',
  '0 atrasadas': '0 overdue',
  '0% pago': '0% paid',
  '— nós · — conexões': '— nodes · — connections',
  '— nós': '— nodes',
  'sem atalho': 'no shortcut',

  /* ── Titles (atributos) ────────────────────────────────── */
  'Anterior': 'Previous',
  'Próximo': 'Next',
  'Mês anterior': 'Previous month',
  'Próximo mês': 'Next month',
  'Configurações': 'Settings',
  'Sair · desconecta arquivo e recarrega': 'Logout · disconnect file and reload',
  'Sair': 'Logout',
  'Sair da sessão?\n\nSeus dados ficam salvos no navegador. Se você usa sincronização com arquivo, ele será desconectado.': 'Log out?\n\nYour data stays saved in the browser. If you use file sync, it will be disconnected.',
  'Recolher / expandir barra lateral': 'Collapse / expand sidebar',
  'Recolher barra lateral': 'Collapse sidebar',
  'Expandir barra lateral': 'Expand sidebar',
  'Recolher / expandir todos': 'Collapse / expand all',
  'Clique para trocar a foto de perfil': 'Click to change profile photo',
  'Configurações ': 'Settings ',
  'Liga/desliga a esfera de partículas': 'Toggles the particle sphere',
  'Limpar conversa': 'Clear conversation',
  'Opções rápidas': 'Quick actions',
  'Esfera': 'Sphere',
  'Microfone': 'Microphone',
  'Apagar conversa': 'Clear chat',
  'Voz (Jarvis)': 'Voice (Jarvis)',
  '🔊 Voz ativada · CORTEX vai responder em áudio': '🔊 Voice activated · CORTEX will respond in audio',
  '🔇 Voz desativada': '🔇 Voice off',
  'Voz ativada, senhor.': 'Voice activated, sir.',
  '👏👏 Panorama do dia': '👏👏 Day overview',
  '🔇 Silenciado': '🔇 Muted',
  '🤖 Inteligência Artificial': '🤖 Artificial Intelligence',
  '🌗 Tema': '🌗 Theme',
  'Modo': 'Mode',
  'Dark, Light ou Auto (sol/lua por horário)': 'Dark, Light or Auto (sun/moon by time)',
  '🌙 Dark': '🌙 Dark',
  '☀️ Light': '☀️ Light',
  '🌗 Auto': '🌗 Auto',
  'Horário Light': 'Light time',
  'Horário Dark': 'Dark time',
  'Hora local pra dark→light (manhã)': 'Local hour for dark→light (morning)',
  'Hora local pra light→dark (noite)': 'Local hour for light→dark (night)',
  'Paleta customizável': 'Custom palette',
  'Override de cores · qualquer mudança aplica em tempo real': 'Color overrides · live preview',
  '↺ Resetar tudo': '↺ Reset all',
  'Fundo principal': 'Main background',
  'Superfície (cards)': 'Surface (cards)',
  'Superfície 2': 'Surface 2',
  'Sidebar': 'Sidebar',
  'Texto': 'Text',
  'Texto secundário': 'Secondary text',
  'Neon (acento)': 'Neon (accent)',
  'Neon 2 (escuro)': 'Neon 2 (dark)',
  'Neon 3 (claro)': 'Neon 3 (light)',
  'Sucesso (verde)': 'Success (green)',
  'Aviso (laranja)': 'Warning (orange)',
  'Perigo (vermelho)': 'Danger (red)',
  '⌨️ Atalhos de teclado': '⌨️ Keyboard shortcuts',
  'Personalizar': 'Customize',
  'Pressione': 'Press',
  'a qualquer momento pra abrir essa lista': 'anytime to open this list',
  'Mostrar atalhos (esta tela)': 'Show shortcuts (this screen)',
  'Próximo item (lista/sidebar)': 'Next item (list/sidebar)',
  'Item anterior (lista/sidebar)': 'Previous item (list/sidebar)',
  'Foco no input do CORTEX': 'Focus CORTEX input',
  'Alternar layout Clássico/Bento': 'Toggle Classic/Bento layout',
  'Layout Bento ativo · clique pra clássico': 'Bento active · click for classic',
  'Layout Clássico · clique pra Bento': 'Classic active · click for Bento',
  'Menu': 'Menu',
  'Provedor': 'Provider',
  'API Key': 'API Key',
  'Modelo': 'Model',
  'Status': 'Status',
  '✓ Pronto': '✓ Ready',
  '⚠ Aguardando chave': '⚠ Waiting for key',
  '(padrão)': '(default)',
  'on': 'on',
  'off': 'off',
  'Reagir ao microfone': 'React to microphone',
  'Microfone ativo · clique pra desligar': 'Microphone active · click to turn off',
  '🎤 Microfone desligado': '🎤 Microphone off',
  '🎤 Esfera reativa ao seu microfone': '🎤 Sphere reactive to your microphone',
  'Permissão de microfone negada': 'Microphone permission denied',
  'Esfera desligada — ative primeiro': 'Sphere is off — turn it on first',
  'Esfera + ditado ativos · fale e o texto vai pro chat': 'Sphere + dictation active · speak and text goes to chat',
  'Esfera reativa ao mic (ditado não suportado neste navegador)': 'Sphere reactive to mic (dictation not supported in this browser)',
  '🎤 Fale — vou escrever no chat': '🎤 Speak — I\'ll write in the chat',
  '🎤 Esfera reativa (ditado indisponível)': '🎤 Sphere reactive (dictation unavailable)',
  'Ouvindo… fale com o CORTEX': 'Listening… speak to CORTEX',
  "Diga 'CORTEX' para começar…": "Say 'CORTEX' to start…",
  'Ouvindo o comando…': 'Listening to command…',
  '⚡ CORTEX ouvindo…': '⚡ CORTEX listening…',
  "🎤 Diga 'CORTEX' pra começar a falar": "🎤 Say 'CORTEX' to start speaking",
  'Enviar (Enter)': 'Send (Enter)',
  'Enviar': 'Send',
  'ENVIAR': 'SEND',
  'Copiar dados do card': 'Copy card data',
  'Copiar contatos': 'Copy contacts',
  'Copiar lista de prints': 'Copy screenshots list',
  'Salvar print do card': 'Save card screenshot',
  'Baixar': 'Download',
  'Baixar todos como .txt': 'Download all as .txt',
  'Iniciar/Pausar': 'Start/Pause',
  'Clique para iniciar/pausar': 'Click to start/pause',
  'Reiniciar ciclo': 'Restart cycle',
  'Pular para próxima fase': 'Skip to next phase',
  'Zoom in': 'Zoom in',
  'Zoom out': 'Zoom out',
  'Centralizar / reset': 'Center / reset',
  'Pausar simulação': 'Pause simulation',
  'Resetar 100%': 'Reset to 100%',
  'Subir': 'Move up',
  'Descer': 'Move down',
  'Mover para a outra seção': 'Move to the other section',
  'Gravar novo atalho': 'Record new shortcut',
  'Remover atalho': 'Remove shortcut',
  'Novo rascunho (Ctrl+Alt+N)': 'New draft (Ctrl+Alt+N)',
  'Mês': 'Month',
  'Semana': 'Week',
  'Dia': 'Day',
  '🔍 Buscar no vault...': '🔍 Search vault...',
  '🔍 Buscar nos rascunhos...': '🔍 Search drafts...',
  'Pesquisar título, descrição ou tag...': 'Search title, description or tag...',
  'Seu nome completo': 'Your full name',
  'Operadora · nº carteirinha': 'Provider · card number',
  'Nome · especialidade · telefone': 'Name · specialty · phone',
  'Alimentos, medicamentos, ambiente...': 'Food, medications, environment...',
  'Nome, dosagem, frequência...': 'Name, dosage, frequency...',
  'Condições crônicas, cirurgias, restrições...': 'Chronic conditions, surgeries, restrictions...',
  'Rua, número, complemento': 'Street, number, complement',
  'UF ou nome do estado': 'State abbreviation or full name',
  'Cidade': 'City',
  'Ex: Mercado, Salário...': 'Ex: Grocery, Salary...',
  'Ex: Peito e Tríceps': 'Ex: Chest and Triceps',
  'Ex: Site CORTEX, Aprender Python...': 'Ex: CORTEX Site, Learn Python...',
  'O que precisa ser feito?': 'What needs to be done?',
  'O que é esse projeto? Por que importa?': 'What is this project? Why does it matter?',
  'Detalhes opcionais...': 'Optional details...',
  'Notas adicionais (opcional)...': 'Additional notes (optional)...',
  'Detalhes, link de pagamento, código de barras...': 'Details, payment link, barcode...',
  'Aluguel, Netflix, Internet...': 'Rent, Netflix, Internet...',
  'Reunião, consulta, treino...': 'Meeting, appointment, workout...',
  'Ex: Beber 2L de água, Meditar, Treinar...': 'Ex: Drink 2L of water, Meditate, Train...',
  'Ex: Fumar, Beber, Redes sociais...': 'Ex: Smoking, Drinking, Social media...',
  'Ex: GitHub, Notion, ChatGPT...': 'Ex: GitHub, Notion, ChatGPT...',
  'Ex: Saúde, Foco...': 'Ex: Health, Focus...',
  'Por que esse hábito é importante para você? O que você ganha praticando?': 'Why is this habit important to you? What do you gain by practicing it?',

  /* ── Bills categories ──────────────────────────────────── */
  '🏠 Moradia': '🏠 Housing',
  '💡 Contas (luz, água, gás)': '💡 Utilities (electricity, water, gas)',
  '📡 Internet/Telefone': '📡 Internet/Phone',
  '📺 Assinaturas': '📺 Subscriptions',
  '💳 Cartão': '💳 Card',
  '🚗 Transporte': '🚗 Transport',
  '💚 Saúde': '💚 Health',
  '📚 Educação': '📚 Education',
  '🍔 Alimentação': '🍔 Food',
  '📎 Outros': '📎 Other',

  /* ── Misc ──────────────────────────────────────────────── */
  'salvo': 'saved',
  'salvando…': 'saving…',
  'Carregando...': 'Loading...',
  'Sem dados': 'No data',
  'Mês anterior': 'Previous month',
  'Próximo mês': 'Next month',
  'Bom dia, ': 'Good morning, ',
  'Boa tarde, ': 'Good afternoon, ',
  'Boa noite, ': 'Good evening, ',
  ', Mestre.': ', Master.',
  '0 sessões hoje': '0 sessions today',
};

/* Tradução reversa: usada quando precisamos voltar EN → PT.
   Como o template é gerado em PT, a estratégia preferida é re-render.
   Mas para texto inserido manualmente no DOM (sem template),
   preservamos via texto original em data-i18n-orig. */

function _trim(s){ return typeof s === 'string' ? s.trim() : s; }

function t(text){
  if(!text || typeof text !== 'string') return text;
  if(state?.settings?.language !== 'en') return text;
  return TRANSLATIONS_EN[_trim(text)] || text;
}

const I18N_ATTRS = ['placeholder', 'title', 'aria-label', 'aria-placeholder', 'alt'];

function translateElementAttrs(el){
  if(!el || el.nodeType !== 1) return;
  I18N_ATTRS.forEach(attr => {
    if(el.hasAttribute(attr)){
      const v = el.getAttribute(attr);
      const trimmed = _trim(v);
      const trans = TRANSLATIONS_EN[trimmed];
      if(trans && trans !== trimmed){
        // Guarda o original na 1ª tradução pra possibilitar reversão
        const origAttr = '__orig_' + attr.replace(/-/g,'_');
        if(!el.dataset[origAttr]) el.dataset[origAttr] = v;
        el.setAttribute(attr, v.replace(trimmed, trans));
      }
    }
  });
}

function translateTextNode(node){
  const original = node.textContent;
  const trimmed = _trim(original);
  if(!trimmed) return;
  const trans = TRANSLATIONS_EN[trimmed];
  if(trans && trans !== trimmed){
    // Guarda o original (apenas 1ª vez) pra reverter pra PT
    if(!node.__i18nOrig) node.__i18nOrig = original;
    node.textContent = original.replace(trimmed, trans);
  }
}

function translateNode(node){
  if(!node) return;
  if(state?.settings?.language !== 'en') return;
  if(node.nodeType === 3){ // TEXT_NODE
    translateTextNode(node);
    return;
  }
  if(node.nodeType !== 1) return; // ELEMENT_NODE
  // Skip scripts/styles/etc
  const tag = node.tagName;
  if(tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CANVAS' || tag === 'NOSCRIPT') return;
  // Skip elementos marcados pra não traduzir
  if(node.dataset && node.dataset.i18nSkip === 'true') return;
  translateElementAttrs(node);
  // Recurse children
  const kids = node.childNodes;
  for(let i = 0; i < kids.length; i++){
    translateNode(kids[i]);
  }
}

function translateDOM(root){
  root = root || document.body;
  if(state?.settings?.language !== 'en') return;
  translateNode(root);
}

/* Restaura textos/atributos PT originais (usado ao voltar EN → PT) */
function restoreNode(node){
  if(!node) return;
  if(node.nodeType === 3){
    if(node.__i18nOrig != null){
      node.textContent = node.__i18nOrig;
      delete node.__i18nOrig;
    }
    return;
  }
  if(node.nodeType !== 1) return;
  const tag = node.tagName;
  if(tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CANVAS' || tag === 'NOSCRIPT') return;
  // Restaura atributos
  if(node.dataset){
    I18N_ATTRS.forEach(attr => {
      const key = '__orig_' + attr.replace(/-/g,'_');
      if(node.dataset[key] != null){
        node.setAttribute(attr, node.dataset[key]);
        delete node.dataset[key];
      }
    });
  }
  const kids = node.childNodes;
  for(let i = 0; i < kids.length; i++){
    restoreNode(kids[i]);
  }
}

function restoreDOM(root){
  root = root || document.body;
  restoreNode(root);
}

/* ── Observer pra conteúdo dinâmico ──────────────────────── */
let _i18nObserver = null;
function startI18nObserver(){
  if(_i18nObserver) return;
  if(typeof MutationObserver === 'undefined') return;
  _i18nObserver = new MutationObserver(mutations => {
    if(state?.settings?.language !== 'en') return;
    for(const m of mutations){
      if(m.type === 'childList'){
        m.addedNodes.forEach(n => translateNode(n));
      } else if(m.type === 'characterData'){
        translateTextNode(m.target);
      }
    }
  });
  _i18nObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false
  });
}

/* Exposto globalmente */
window.t = t;
window.translateDOM = translateDOM;
window.restoreDOM = restoreDOM;
window.startI18nObserver = startI18nObserver;
window.TRANSLATIONS_EN = TRANSLATIONS_EN;
