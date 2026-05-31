/* =========================================================
   CORTEX AI · backend LLM (OpenAI, Anthropic, Groq)
   - API key local em state.settings.cortexAI.apiKey
   - Browser → API direto (CORS aceito pelos 3 providers)
   - System prompt inclui snapshot do state pro LLM responder
     com base nos dados reais do usuário
   ========================================================= */

const CORTEX_AI_DEFAULTS = {
  openai:    { model:'gpt-4o-mini',                endpoint:'https://api.openai.com/v1/chat/completions' },
  anthropic: { model:'claude-3-5-haiku-latest',    endpoint:'https://api.anthropic.com/v1/messages' },
  groq:      { model:'llama-3.3-70b-versatile',    endpoint:'https://api.groq.com/openai/v1/chat/completions' },
};

function cortexAICfg(){
  const c = state.settings?.cortexAI || {};
  const provider = c.provider || 'none';
  if(provider === 'none') return null;
  if(!c.apiKey || !c.apiKey.trim()) return null;
  const def = CORTEX_AI_DEFAULTS[provider];
  if(!def) return null;
  return {
    provider,
    apiKey: c.apiKey.trim(),
    model: (c.model || '').trim() || def.model,
    endpoint: def.endpoint
  };
}

function cortexAIAvailable(){ return !!cortexAICfg(); }

/* Snapshot compacto do estado · ~600 tokens · enviado como contexto */
function buildCortexContext(){
  const today = todayStr();
  const todayDate = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const lines = [];
  lines.push(`Data atual: ${todayDate} (${today}).`);

  const info = state.info || {};
  if(info.name) lines.push(`Usuário: ${info.name}.`);
  if(info.birthDate) lines.push(`Nasc: ${info.birthDate}.`);

  // Tarefas
  const todos = state.trackers?.todos || [];
  const todoOpen = todos.filter(t => !t.done).slice(0,8);
  if(todoOpen.length){
    lines.push(`Tarefas abertas (${todoOpen.length}): ${todoOpen.map(t => `"${t.text||t.name||'?'}"${t.due?` (até ${t.due})`:''}`).join('; ')}.`);
  }

  // Eventos próximos (7 dias)
  const events = state.events || [];
  const soon = events
    .filter(e => e.date >= today)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0,6);
  if(soon.length){
    lines.push(`Eventos próximos: ${soon.map(e => `"${e.title}" em ${e.date}${e.start?` ${e.start}`:''}`).join('; ')}.`);
  }

  // Hábitos do dia
  const habits = (state.habitsList || []).filter(h => !h.archived);
  if(habits.length){
    const doneToday = habits.filter(h => (h.log||{})[today]);
    lines.push(`Hábitos: ${doneToday.length}/${habits.length} feitos hoje. Lista: ${habits.slice(0,8).map(h => h.name).join(', ')}.`);
  }

  // Finanças do mês
  const tm = thisMonth();
  const txs = (state.transactions || []).filter(t => monthKey(t.date) === tm);
  if(txs.length){
    const rec = txs.filter(t => t.type==='receita').reduce((s,t)=>s+Number(t.value||0),0);
    const des = txs.filter(t => t.type==='despesa').reduce((s,t)=>s+Number(t.value||0),0);
    lines.push(`Finanças do mês: receita R$${rec.toFixed(2)}, despesa R$${des.toFixed(2)}, saldo R$${(rec-des).toFixed(2)}.`);
  }

  // Projetos ativos
  const projects = (state.projects || []).filter(p => p.status === 'ativo').slice(0,5);
  if(projects.length){
    lines.push(`Projetos ativos: ${projects.map(p => p.name).join(', ')}.`);
  }

  // Metas/Trackers chave
  const goals = (state.trackers?.goals || []).filter(g => !g.done).slice(0,5);
  if(goals.length){
    lines.push(`Metas em andamento: ${goals.map(g => g.text||g.name||'?').join(', ')}.`);
  }

  // Notas recentes (3 últimas)
  const notes = (state.notes || []).slice(-3);
  if(notes.length){
    lines.push(`Notas recentes: ${notes.map(n => `"${(n.text||n.content||'').slice(0,80)}"`).join('; ')}.`);
  }

  return lines.join('\n');
}

function cortexAISystemPrompt(){
  const lang = state.settings?.language === 'en' ? 'en' : 'pt';
  const ctx = buildCortexContext();
  const tools = (typeof cortexToolsDescription === 'function') ? cortexToolsDescription() : '';
  const todayISO = todayStr();
  const memory = (state.cortex?.memory || []).filter(x => x && x.trim());
  const memoryBlock = memory.length
    ? (lang === 'en'
      ? `\n\n## USER MEMORY (pinned facts the user wants you to always know)\n${memory.map(m => `- ${m}`).join('\n')}`
      : `\n\n## MEMÓRIA DO USUÁRIO (fatos fixados que você deve sempre lembrar)\n${memory.map(m => `- ${m}`).join('\n')}`)
    : '';

  if(lang === 'en'){
    return `You are CORTEX, a personal assistant integrated into a local-first dashboard. You have access to the user's data (snapshot below) AND you can EXECUTE actions in the app by emitting JSON action blocks.

## ACTION PROTOCOL
When the user asks you to CREATE, ADD, SCHEDULE, REGISTER, LOG, or LAUNCH anything, emit one or more blocks like this, then write a short natural confirmation after them:

<action>{"tool":"tool_name","args":{"arg1":"value"}}</action>

Available tools:
${tools}

RULES:
- Today is ${todayISO}. Convert relative dates ("amanhã", "tomorrow", "next monday") to YYYY-MM-DD.
- Multiple actions in one reply are OK (emit sequential blocks).
- Don't emit actions when the user only asks/queries — answer normally then.
- Don't invent ambiguous data; if missing critical info (date/value/etc), ask the user.
- After the action block(s), write 1 short sentence confirming what was done. Don't repeat the JSON.
- For "open/launch X" (youtube, gmail, github, etc), use open_site with the name (e.g. "youtube") or full URL. User's saved triggers are consulted first.

## CONTEXT
${ctx}${memoryBlock}`;
  }

  return `Você é o CORTEX, assistente pessoal integrado ao dashboard local. Você tem acesso aos dados do usuário (snapshot abaixo) E pode EXECUTAR ações no app emitindo blocos JSON.

## PROTOCOLO DE AÇÃO
Quando o usuário pedir pra CRIAR, ADICIONAR, AGENDAR, REGISTRAR, MARCAR, ou ABRIR algo, emita um ou mais blocos assim, e depois escreva uma confirmação curta:

<action>{"tool":"nome_da_tool","args":{"arg1":"valor"}}</action>

Tools disponíveis:
${tools}

REGRAS:
- Hoje é ${todayISO}. Converta datas relativas ("amanhã", "sexta", "semana que vem") pra YYYY-MM-DD.
- Pode emitir várias actions na mesma resposta (blocos em sequência).
- NÃO emita action quando o usuário só pergunta/consulta — responda normalmente.
- Não invente dados ambíguos; se faltar info crítica (data/valor/etc), pergunte ao usuário.
- Depois do(s) action block(s), escreva 1 frase curta confirmando o que foi feito. Não repita o JSON.
- Seja conciso, caloroso e formal (estilo Jarvis pro Tony Stark). Responda no idioma do usuário.
- Pra "abrir/abre/acessa X" (youtube, gmail, github, etc), use open_site com o nome (ex: "youtube") ou URL completa. Os triggers salvos do usuário são consultados primeiro.

## CONTEXTO
${ctx}${memoryBlock}`;
}

/* Histórico recente (últimas 8 trocas) formatado pro provider */
function _cortexHistoryMessages(){
  const msgs = (cortexMessages || []).filter(m => m.role && (m.text || (m.html && !m.html.includes('cortex-typing'))));
  // Últimas 8 mensagens
  const recent = msgs.slice(-8);
  return recent.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.text || _cortexStripForTTS(m.html || '')
  })).filter(m => m.content && m.content.trim());
}

async function askLLM(question, opts){
  const cfg = cortexAICfg();
  if(!cfg) throw new Error('no-ai-config');
  const system = cortexAISystemPrompt();
  const history = _cortexHistoryMessages();
  const signal = opts?.signal;
  const onDelta = opts?.onDelta;   // callback (chunk) → habilita streaming

  if(cfg.provider === 'anthropic'){
    return _askAnthropic(cfg, system, history, question, signal, onDelta);
  } else {
    return _askOpenAICompatible(cfg, system, history, question, signal, onDelta);
  }
}

/* Lê SSE line-by-line de um Response stream.
   Chama onChunk(jsonString) pra cada linha "data: ..." */
async function _consumeSSE(res, signal, onChunk){
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while(true){
    if(signal?.aborted) { try{ reader.cancel(); }catch(_){} throw new DOMException('Aborted', 'AbortError'); }
    const { value, done } = await reader.read();
    if(done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for(const line of lines){
      const trimmed = line.trim();
      if(!trimmed || !trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if(payload === '[DONE]') return;
      try { onChunk(payload); } catch(e){ console.warn('SSE parse:', e, payload.slice(0,100)); }
    }
  }
}

async function _askOpenAICompatible(cfg, system, history, question, signal, onDelta){
  const messages = [
    { role:'system', content: system },
    ...history,
    { role:'user', content: question }
  ];
  const streaming = typeof onDelta === 'function';
  const res = await fetch(cfg.endpoint, {
    method:'POST',
    signal,
    headers:{
      'Content-Type':'application/json',
      'Authorization':`Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.7,
      max_tokens: 900,
      stream: streaming
    })
  });
  if(!res.ok){
    const errText = await res.text().catch(()=>'');
    throw new Error(`HTTP ${res.status} — ${errText.slice(0,200)}`);
  }
  if(!streaming){
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    if(!text) throw new Error('Resposta vazia');
    return text.trim();
  }
  // Stream
  let full = '';
  await _consumeSSE(res, signal, (payload) => {
    const json = JSON.parse(payload);
    const delta = json?.choices?.[0]?.delta?.content;
    if(delta){ full += delta; onDelta(delta, full); }
  });
  return full.trim();
}

async function _askAnthropic(cfg, system, history, question, signal, onDelta){
  const messages = [
    ...history,
    { role:'user', content: question }
  ];
  const streaming = typeof onDelta === 'function';
  const res = await fetch(cfg.endpoint, {
    method:'POST',
    signal,
    headers:{
      'Content-Type':'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: cfg.model,
      system,
      messages,
      max_tokens: 900,
      temperature: 0.7,
      stream: streaming
    })
  });
  if(!res.ok){
    const errText = await res.text().catch(()=>'');
    throw new Error(`HTTP ${res.status} — ${errText.slice(0,200)}`);
  }
  if(!streaming){
    const data = await res.json();
    const text = (data?.content?.[0]?.text) || '';
    if(!text) throw new Error('Resposta vazia');
    return text.trim();
  }
  // Anthropic SSE: events content_block_delta com {delta:{type:'text_delta',text:'...'}}
  let full = '';
  await _consumeSSE(res, signal, (payload) => {
    const json = JSON.parse(payload);
    if(json.type === 'content_block_delta'){
      const t = json?.delta?.text;
      if(t){ full += t; onDelta(t, full); }
    }
  });
  return full.trim();
}

/* Formata markdown-ish do LLM em HTML simples pra renderizar no chat */
function cortexAIFormat(text){
  let s = String(text || '').trim();
  // escape HTML primeiro
  s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // code blocks ```
  s = s.replace(/```([\s\S]*?)```/g, (_,c) => `<pre><code>${c.trim()}</code></pre>`);
  // inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold **
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic *
  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  // bullets - / *
  s = s.replace(/(^|\n)([-*])\s+(.+)/g, '$1• $3');
  // quebras de linha → <br>
  s = s.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
  return s;
}

/* Expor pra cortex.js */
window.cortexAIAvailable = cortexAIAvailable;
window.askLLM = askLLM;
window.cortexAIFormat = cortexAIFormat;
window.CORTEX_AI_DEFAULTS = CORTEX_AI_DEFAULTS;
