/* =========================================================
   CORTEX TOOLS · ações executáveis pelo LLM
   - LLM emite <action>{"tool":"X","args":{...}}</action>
   - Parser extrai, executor roda função programática
   - Retorna { ok, label, error } pra exibir confirmação
   ========================================================= */

const CORTEX_TOOLS = {
  add_event: {
    label: 'Evento',
    desc: 'Cria evento no calendário. args: title (str), date (YYYY-MM-DD), start? (HH:MM), end? (HH:MM), category? (str), color? (#hex), description? (str)',
    run: (a) => {
      if(!a?.title || !a?.date) throw new Error('title e date obrigatórios');
      state.events = state.events || [];
      const ev = {
        id: uid(),
        title: String(a.title).trim(),
        date: String(a.date),
        start: a.start || '',
        end: a.end || '',
        allDay: !a.start,
        category: a.category || '',
        color: a.color || '#b061ff',
        desc: a.description || a.desc || ''
      };
      state.events.push(ev);
      save();
      if(typeof renderCalendar === 'function') renderCalendar();
      return `evento "${ev.title}" em ${ev.date}${ev.start?` às ${ev.start}`:''}`;
    }
  },

  add_task: {
    label: 'Tarefa',
    desc: 'Adiciona tarefa. args: text (str), due? (YYYY-MM-DD), priority? (baixa|media|alta)',
    run: (a) => {
      if(!a?.text) throw new Error('text obrigatório');
      state.trackers = state.trackers || {};
      state.trackers.todos = state.trackers.todos || [];
      const t = {
        id: uid(),
        text: String(a.text).trim(),
        done: false,
        due: a.due || '',
        priority: a.priority || 'media',
        createdAt: new Date().toISOString()
      };
      state.trackers.todos.push(t);
      save();
      if(typeof renderTasks === 'function') renderTasks();
      if(typeof renderTrackersPage === 'function') renderTrackersPage();
      return `tarefa "${t.text}"${t.due?` para ${t.due}`:''}`;
    }
  },

  add_transaction: {
    label: 'Transação',
    desc: 'Lança receita/despesa. args: desc (str), value (num), type (receita|despesa), category? (str), date? (YYYY-MM-DD)',
    run: (a) => {
      if(!a?.desc || a?.value == null || !a?.type) throw new Error('desc, value e type obrigatórios');
      state.transactions = state.transactions || [];
      const tx = {
        id: uid(),
        desc: String(a.desc).trim(),
        value: Number(a.value),
        date: a.date || todayStr(),
        type: a.type === 'receita' ? 'receita' : 'despesa',
        category: a.category || 'outros'
      };
      state.transactions.unshift(tx);
      save();
      if(typeof renderDashboard === 'function') renderDashboard();
      if(typeof renderTransactions === 'function') renderTransactions();
      return `${tx.type} "${tx.desc}" R$ ${tx.value.toFixed(2)}`;
    }
  },

  add_note: {
    label: 'Nota',
    desc: 'Cria nota post-it. args: text (str), kind? (notes|mindset|mantras)',
    run: (a) => {
      if(!a?.text) throw new Error('text obrigatório');
      const kind = ['notes','mindset','mantras'].includes(a.kind) ? a.kind : 'notes';
      state[kind] = state[kind] || [];
      const n = { id: uid(), text: String(a.text).trim(), createdAt: new Date().toISOString(), color: '#b061ff' };
      state[kind].push(n);
      save();
      if(typeof renderNotes === 'function') renderNotes(kind);
      return `nota em ${kind === 'notes' ? 'Notas' : kind === 'mindset' ? 'Mindset' : 'Mantras'}`;
    }
  },

  add_draft: {
    label: 'Rascunho',
    desc: 'Cria rascunho. args: title? (str), content (str)',
    run: (a) => {
      if(!a?.content) throw new Error('content obrigatório');
      state.drafts = state.drafts || [];
      const d = {
        id: uid(),
        title: (a.title || '').trim(),
        content: String(a.content),
        pinned: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };
      state.drafts.unshift(d);
      save();
      if(typeof renderDrafts === 'function') renderDrafts();
      return `rascunho "${d.title || 'sem título'}"`;
    }
  },

  add_habit: {
    label: 'Hábito',
    desc: 'Cria hábito novo. args: name (str), emoji? (str), category? (str), targetTime? (manhã|tarde|noite|qualquer), type? (daily|weekly), frequency? (1-7)',
    run: (a) => {
      if(!a?.name) throw new Error('name obrigatório');
      state.habitsList = state.habitsList || [];
      const h = {
        id: uid(),
        name: String(a.name).trim(),
        emoji: a.emoji || '✨',
        category: a.category || '',
        targetTime: a.targetTime || 'qualquer',
        type: a.type === 'weekly' ? 'weekly' : 'daily',
        frequency: Number(a.frequency) || 7,
        color: '#b061ff',
        notes: '',
        log: {},
        archived: false,
        createdAt: new Date().toISOString()
      };
      state.habitsList.push(h);
      save();
      if(typeof renderHabitsPage === 'function') renderHabitsPage();
      return `hábito "${h.name}"`;
    }
  },

  log_habit: {
    label: 'Hábito feito',
    desc: 'Marca hábito como feito. args: name (str, busca por nome), date? (YYYY-MM-DD, default hoje)',
    run: (a) => {
      if(!a?.name) throw new Error('name obrigatório');
      const q = String(a.name).toLowerCase();
      const h = (state.habitsList || []).find(x => x.name.toLowerCase().includes(q));
      if(!h) throw new Error(`hábito "${a.name}" não encontrado`);
      h.log = h.log || {};
      const d = a.date || todayStr();
      h.log[d] = true;
      save();
      if(typeof renderHabitsPage === 'function') renderHabitsPage();
      return `"${h.name}" marcado em ${d}`;
    }
  },

  add_project: {
    label: 'Projeto',
    desc: 'Cria projeto. args: name (str), description? (str), deadline? (YYYY-MM-DD), priority? (baixa|media|alta)',
    run: (a) => {
      if(!a?.name) throw new Error('name obrigatório');
      state.projects = state.projects || [];
      const p = {
        id: uid(),
        name: String(a.name).trim(),
        desc: a.description || a.desc || '',
        startDate: todayStr(),
        deadline: a.deadline || '',
        status: 'ativo',
        priority: a.priority || 'media',
        color: '#b061ff',
        tasks: [],
        createdAt: new Date().toISOString()
      };
      state.projects.push(p);
      save();
      if(typeof renderProjects === 'function') renderProjects();
      return `projeto "${p.name}"`;
    }
  },

  add_trigger: {
    label: 'Trigger',
    desc: 'Cria atalho clicável pra site. args: name (str), url (str), icon? (str)',
    run: (a) => {
      if(!a?.name || !a?.url) throw new Error('name e url obrigatórios');
      state.triggers = state.triggers || [];
      const t = {
        id: uid(),
        name: String(a.name).trim(),
        url: String(a.url).trim(),
        icon: a.icon || '⚡',
        color: '#b061ff'
      };
      state.triggers.push(t);
      save();
      if(typeof renderTriggers === 'function') renderTriggers();
      return `trigger "${t.name}"`;
    }
  },

  add_bill: {
    label: 'Conta',
    desc: 'Cria conta a pagar. args: title (str), amount (num), dueDay (1-31), category? (str), recurring? (bool, default true)',
    run: (a) => {
      if(!a?.title || a?.amount == null || !a?.dueDay) throw new Error('title, amount e dueDay obrigatórios');
      state.bills = state.bills || [];
      const b = {
        id: uid(),
        title: String(a.title).trim(),
        amount: Number(a.amount),
        dueDay: Number(a.dueDay),
        category: a.category || 'outros',
        recurring: a.recurring !== false,
        notes: a.notes || '',
        paid: {}
      };
      state.bills.push(b);
      save();
      if(typeof renderBills === 'function') renderBills();
      return `conta "${b.title}" R$ ${b.amount.toFixed(2)} (dia ${b.dueDay})`;
    }
  },

  add_diet_plan_item: {
    label: 'Plano dieta',
    desc: 'Adiciona item ao plano de refeição do dia. args: meal (cafe|almoco|jantar|lanche|ceia), name (str), date? (YYYY-MM-DD)',
    run: (a) => {
      if(!a?.meal || !a?.name) throw new Error('meal e name obrigatórios');
      const date = a.date || todayStr();
      state.trackers = state.trackers || {};
      state.trackers.dietPlan = state.trackers.dietPlan || {};
      state.trackers.dietPlan[date] = state.trackers.dietPlan[date] || {};
      state.trackers.dietPlan[date][a.meal] = state.trackers.dietPlan[date][a.meal] || [];
      state.trackers.dietPlan[date][a.meal].push({ id: uid(), name: String(a.name).trim(), done: false });
      save();
      if(typeof renderCurrentTracker === 'function') renderCurrentTracker();
      return `"${a.name}" no ${a.meal} de ${date}`;
    }
  },

  add_goal: {
    label: 'Meta',
    desc: 'Cria meta. args: text (str), target? (str)',
    run: (a) => {
      if(!a?.text) throw new Error('text obrigatório');
      state.trackers = state.trackers || {};
      state.trackers.goals = state.trackers.goals || [];
      state.trackers.goals.push({
        id: uid(),
        text: String(a.text).trim(),
        target: a.target || '',
        done: false,
        createdAt: new Date().toISOString()
      });
      save();
      if(typeof renderCurrentTracker === 'function') renderCurrentTracker();
      return `meta "${a.text}"`;
    }
  },

  add_shopping_item: {
    label: 'Compras',
    desc: 'Adiciona item à lista de compras. args: name (str), value? (num)',
    run: (a) => {
      if(!a?.name) throw new Error('name obrigatório');
      state.shopping = state.shopping || [];
      state.shopping.push({
        id: uid(),
        name: String(a.name).trim(),
        value: Number(a.value) || 0,
        done: false
      });
      save();
      if(typeof renderTasks === 'function') renderTasks();
      return `"${a.name}" na lista de compras`;
    }
  },

  open_site: {
    label: 'Abrir site',
    desc: 'Abre site em nova aba. args: name (str — nome popular tipo "youtube"/"gmail" OU URL completa OU nome de Trigger salvo)',
    run: (a) => {
      if(!a?.name) throw new Error('name obrigatório');
      const raw = String(a.name).trim();
      let url;
      if(/^https?:\/\//i.test(raw)){
        url = raw;
      } else {
        // 1. Procura nos triggers salvos do usuário (match parcial case-insensitive)
        const q = raw.toLowerCase();
        const trig = (state.triggers || []).find(t => (t.name||'').toLowerCase().includes(q));
        if(trig){
          url = trig.url;
        } else {
          // 2. Mapa de sites populares
          const key = q.replace(/\s+/g,'');
          const POPULAR = {
            youtube:'https://youtube.com', yt:'https://youtube.com',
            google:'https://google.com', gmail:'https://mail.google.com',
            chatgpt:'https://chat.openai.com', gpt:'https://chat.openai.com',
            claude:'https://claude.ai', anthropic:'https://claude.ai',
            github:'https://github.com',
            whatsapp:'https://web.whatsapp.com', wa:'https://web.whatsapp.com',
            instagram:'https://instagram.com', ig:'https://instagram.com',
            twitter:'https://twitter.com', x:'https://x.com',
            facebook:'https://facebook.com', fb:'https://facebook.com',
            linkedin:'https://linkedin.com',
            netflix:'https://netflix.com',
            spotify:'https://open.spotify.com',
            notion:'https://notion.so',
            drive:'https://drive.google.com', googledrive:'https://drive.google.com',
            maps:'https://maps.google.com', googlemaps:'https://maps.google.com',
            calendar:'https://calendar.google.com', googlecalendar:'https://calendar.google.com',
            tiktok:'https://tiktok.com',
            twitch:'https://twitch.tv',
            reddit:'https://reddit.com',
            amazon:'https://amazon.com.br',
            mercadolivre:'https://mercadolivre.com.br', ml:'https://mercadolivre.com.br',
            nubank:'https://app.nubank.com.br',
            itau:'https://itau.com.br', bradesco:'https://banco.bradesco',
            ifood:'https://ifood.com.br',
            uber:'https://uber.com', 'ubereats':'https://ubereats.com',
            figma:'https://figma.com',
            discord:'https://discord.com', slack:'https://slack.com',
            zoom:'https://zoom.us', meet:'https://meet.google.com',
            stackoverflow:'https://stackoverflow.com', so:'https://stackoverflow.com',
            wikipedia:'https://wikipedia.org', wiki:'https://wikipedia.org',
            translate:'https://translate.google.com', tradutor:'https://translate.google.com',
            duckduckgo:'https://duckduckgo.com', ddg:'https://duckduckgo.com',
            perplexity:'https://perplexity.ai',
          };
          url = POPULAR[key];
          if(!url){
            // 3. Heurística — contém ponto = domínio direto; senão Google search
            if(/[a-z0-9-]+\.[a-z]{2,}/i.test(raw)){
              url = 'https://' + raw.replace(/^\/+/, '');
            } else {
              url = 'https://www.google.com/search?q=' + encodeURIComponent(raw);
            }
          }
        }
      }
      // 1 única tentativa de window.open. Se bloqueado, user clica o botão no chat (UI sempre renderiza link).
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch(_){}
      return `__OPEN_URL__${url}`;
    }
  },

  add_memory: {
    label: 'Memória',
    desc: 'Adiciona fato pinado pra IA sempre lembrar. args: fact (str)',
    run: (a) => {
      if(!a?.fact) throw new Error('fact obrigatório');
      state.cortex = state.cortex || { messages:[], memory:[] };
      state.cortex.memory = state.cortex.memory || [];
      const f = String(a.fact).trim();
      if(!state.cortex.memory.includes(f)) state.cortex.memory.push(f);
      save();
      return `"${f}"`;
    }
  },

  navigate: {
    label: 'Navegar',
    desc: 'Vai pra outra aba. args: page (cortex|calendar|tasks|kanban|projects|triggers|habits|trackers|dashboard|mentalidade|notes|drafts|info)',
    run: (a) => {
      if(!a?.page) throw new Error('page obrigatório');
      document.querySelectorAll('.page').forEach(s => s.classList.toggle('active', s.dataset.page === a.page));
      document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === a.page));
      return `aba ${a.page}`;
    }
  },

  clear_chat: {
    label: 'Limpar chat',
    desc: 'Limpa o histórico do CORTEX',
    run: () => {
      if(typeof clearCortexChat === 'function'){ clearCortexChat(); return 'chat limpo'; }
      throw new Error('clearCortexChat indisponível');
    }
  }
};

/* Lista compacta pro prompt (mostra apenas tool name + desc) */
function cortexToolsDescription(){
  return Object.entries(CORTEX_TOOLS)
    .map(([k,v]) => `- ${k}: ${v.desc}`)
    .join('\n');
}

/* Extrai <action>{...}</action> da resposta do LLM.
   Retorna { actions: [{tool, args, raw}], cleaned: text sem os blocks } */
function cortexParseActions(text){
  const actions = [];
  const cleaned = String(text || '').replace(/<action>\s*([\s\S]*?)\s*<\/action>/gi, (_, json) => {
    try {
      const obj = JSON.parse(json);
      if(obj && obj.tool) actions.push({ tool: obj.tool, args: obj.args || {}, raw: json });
    } catch(e){
      console.warn('action JSON inválido:', json, e);
    }
    return '';   // remove o block do texto
  }).trim();
  return { actions, cleaned };
}

/* Executa lista de actions. Retorna [{tool, label, ok, result, error}] */
function cortexExecuteActions(actions){
  const results = [];
  for(const a of actions){
    const tool = CORTEX_TOOLS[a.tool];
    if(!tool){
      results.push({ tool: a.tool, ok: false, error: 'tool desconhecida' });
      continue;
    }
    try {
      const r = tool.run(a.args || {});
      results.push({ tool: a.tool, label: tool.label, ok: true, result: r });
    } catch(err){
      results.push({ tool: a.tool, label: tool.label, ok: false, error: String(err.message || err) });
    }
  }
  return results;
}

/* HTML pra exibir confirmações das ações executadas */
function cortexRenderActionResults(results){
  if(!results.length) return '';
  return `<div class="cortex-actions-receipt">${
    results.map(r => {
      if(!r.ok){
        return `<div class="car-row err"><span class="car-ico">✕</span><span class="car-label">${escapeHtml(r.label||r.tool)}</span><span class="car-detail">${escapeHtml(r.error||'')}</span></div>`;
      }
      // open_site retorna "__OPEN_URL__<url>" → renderiza botão grande clicável
      if(typeof r.result === 'string' && r.result.startsWith('__OPEN_URL__')){
        const url = r.result.slice('__OPEN_URL__'.length);
        const host = (() => { try { return new URL(url).hostname.replace(/^www\./,''); } catch(_){ return url; } })();
        return `
          <div class="car-row ok">
            <span class="car-ico">✓</span>
            <span class="car-label">${escapeHtml(r.label||r.tool)}</span>
            <a class="car-open-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">
              <span class="col-ico">↗</span>
              <span class="col-host">${escapeHtml(host)}</span>
              <span class="col-hint">abrir</span>
            </a>
          </div>`;
      }
      return `<div class="car-row ok"><span class="car-ico">✓</span><span class="car-label">${escapeHtml(r.label||r.tool)}</span><span class="car-detail">${escapeHtml(r.result||'')}</span></div>`;
    }).join('')
  }</div>`;
}

window.CORTEX_TOOLS = CORTEX_TOOLS;
window.cortexToolsDescription = cortexToolsDescription;
window.cortexParseActions = cortexParseActions;
window.cortexExecuteActions = cortexExecuteActions;
window.cortexRenderActionResults = cortexRenderActionResults;
