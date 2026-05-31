/* =========================================================
   CORTEX ASSISTANT · chat local que analisa seus dados
   ========================================================= */
let cortexMessages = [];

function renderCortex(){
  cortexMessages = (state.cortex && state.cortex.messages) || [];
  if(!cortexMessages.length){
    cortexMessages.push({id:uid(),role:'assistant',html:welcomeMessage(),time:Date.now()});
    persistCortexChat();
  }
  renderCortexChat();
  updateCortexGreeting();
}
function renderCortexChat(){
  const chat = document.getElementById('cortexChat');
  if(!chat) return;
  chat.innerHTML = cortexMessages.map(m=>{
    const content = m.role === 'user' ? escapeHtml(m.text||m.html||'') : (m.html||escapeHtml(m.text||''));
    return `
      <div class="cortex-msg ${m.role}">
        ${m.role==='assistant' ? `<div class="msg-avatar assistant">🧠</div>` : ''}
        <div class="msg-bubble ${m.role}">${content}</div>
        ${m.role==='user' ? `<div class="msg-avatar user">👤</div>` : ''}
      </div>
    `;
  }).join('');
  chat.scrollTop = chat.scrollHeight;
}
function persistCortexChat(){
  if(cortexMessages.length > 100) cortexMessages = cortexMessages.slice(-100);
  state.cortex = { messages: cortexMessages };
  save();
}
function sendCortex(){
  const input = document.getElementById('cortexInput');
  const text = (input.value || '').trim();
  if(!text) return;
  input.value = '';
  updateCortexSendState(input);
  askCortex(text);
}
let _cortexBusy = false;
let _cortexAbort = null;
let _cortexBusyTypingId = null;

function setCortexBusy(busy){
  _cortexBusy = !!busy;
  const btn = document.getElementById('cortexSendBtn');
  if(btn){
    btn.classList.toggle('is-busy', _cortexBusy);
    btn.title = _cortexBusy ? 'Parar geração' : 'Enviar (Enter)';
    btn.setAttribute('aria-label', _cortexBusy ? 'Parar' : 'Enviar');
    btn.disabled = false;  // sempre clicável quando busy
  }
  updateCortexSendState(document.getElementById('cortexInput'));
}

function cortexSendOrCancel(){
  if(_cortexBusy){ cancelCortexGeneration(); return; }
  sendCortex();
}

function cancelCortexGeneration(){
  // Aborta fetch em curso
  if(_cortexAbort){ try{ _cortexAbort.abort(); }catch(_){} _cortexAbort = null; }
  // Cancela TTS
  if(typeof cortexStopSpeak === 'function') cortexStopSpeak();
  // Remove indicador typing se ainda presente
  if(_cortexBusyTypingId){
    const idx = cortexMessages.findIndex(m => m.id === _cortexBusyTypingId);
    if(idx >= 0){
      // Substitui por aviso curto em vez de remover (preserva contexto)
      cortexMessages[idx] = {
        id: _cortexBusyTypingId, role:'assistant',
        html: '<div style="color:var(--text-mute);font-size:11.5px;font-style:italic">— interrompido —</div>',
        time: Date.now()
      };
    }
    _cortexBusyTypingId = null;
  }
  persistCortexChat();
  renderCortexChat();
  if(typeof setCortexReactive === 'function') setCortexReactive(false);
  setCortexBusy(false);
}

function updateCortexSendState(input){
  const btn = document.getElementById('cortexSendBtn');
  if(!btn) return;
  if(_cortexBusy){
    btn.disabled = false;
    btn.classList.remove('is-ready');
    return;
  }
  const has = !!(input && (input.value||'').trim());
  btn.disabled = !has;
  btn.classList.toggle('is-ready', has);
}
/* =========================================================
   TTS · voz tipo Jarvis (Web Speech Synthesis)
   - Prefere voz masculina British grave; fallback PT-BR masc
   - Pitch 0.78 + rate 0.96 = gravitas
   - Pausa ditado durante fala (anti-loop)
   ========================================================= */
let _cortexTTSVoice = null;
let _cortexTTSReady = false;
let _cortexSpeechWasOn = false;

// Nomes conhecidos por gênero — usados pra forçar voz masculina e filtrar femininas
const _MALE_PT = /\b(daniel|ant[oô]nio|donato|j[uú]lio|f[aá]bio|felipe|paulo|ricardo|jo[aã]o|jorge|rodrigo|leandro|c[eé]sar|valerio|nicolau|humberto)\b/i;
const _FEMALE_PT = /\b(maria|francisca|luciana|raquel|camila|let[ií]cia|brenda|joana|yara|thalita|adriana|monique|jacira|val[eé]ria|elsa|helena|giovanna|ana|patr[ií]cia)\b/i;
const _MALE_EN = /\b(daniel|alex|george|guy|ryan|brian|tony|aaron|david|james|mark|paul|jacob|john|christopher|eric|michael|matthew|andrew|adam|liam|noah|oliver|william|benjamin|lucas|henry|theodore)\b/i;
const _FEMALE_EN = /\b(samantha|karen|moira|tessa|veena|allison|ava|susan|victoria|catherine|kate|kathy|kim|amelia|aria|jenny|nancy|jane|emma|emily|amy|olivia|sophia|isabella|mia|charlotte|abigail|elizabeth|sofia|ella|grace|chloe|lily|zoe|stella|aurora|hazel|natalie|hannah|leah|lucy)\b/i;

function _voiceLabel(v){ return (v.name || '') + ' ' + (v.lang || ''); }
function _isMaleVoice(v, lang){
  const label = _voiceLabel(v);
  // Hint explícito do browser (raro mas existe)
  if(v.voiceURI && /male/i.test(v.voiceURI) && !/female/i.test(v.voiceURI)) return true;
  if(/\bmale\b/i.test(label) && !/female/i.test(label)) return true;
  const M = lang === 'en' ? _MALE_EN : _MALE_PT;
  return M.test(label);
}
function _isFemaleVoice(v, lang){
  const label = _voiceLabel(v);
  if(/female/i.test(label)) return true;
  const F = lang === 'en' ? _FEMALE_EN : _FEMALE_PT;
  return F.test(label);
}

function pickCortexVoice(){
  if(!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if(!voices.length) return null;
  const lang = state.settings?.language === 'en' ? 'en' : 'pt';

  // Pool 1: voz do idioma certo, masculina confirmada, e neural
  const langVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(lang));
  const maleNeural = langVoices.filter(v => _isMaleVoice(v, lang) && /natural|online|wavenet|enhanced|premium|neural/i.test(_voiceLabel(v)));
  if(maleNeural.length) return maleNeural[0];

  // Pool 2: masculina (qualquer qualidade)
  const male = langVoices.filter(v => _isMaleVoice(v, lang));
  if(male.length) return male[0];

  // Pool 3: voz neutra/desconhecida (não-feminina) do idioma
  const nonFemale = langVoices.filter(v => !_isFemaleVoice(v, lang));
  if(nonFemale.length){
    // prefere neural
    const neutral = nonFemale.find(v => /natural|online|wavenet|enhanced|premium|neural/i.test(_voiceLabel(v)));
    return neutral || nonFemale[0];
  }

  // Pool 4: qualquer voz do idioma (último recurso, pode ser feminina)
  if(langVoices.length) return langVoices[0];

  // Pool 5: fallback global masculino
  const anyMale = voices.filter(v => _isMaleVoice(v, lang));
  if(anyMale.length) return anyMale[0];

  return voices[0];
}
function initCortexTTS(){
  if(!window.speechSynthesis) return;
  const refresh = () => { _cortexTTSVoice = pickCortexVoice(); _cortexTTSReady = !!_cortexTTSVoice; };
  refresh();
  // Chrome carrega voices async
  if(typeof window.speechSynthesis.onvoiceschanged !== 'undefined'){
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
  }
  // Keepalive: Chrome corta fala longa após ~15s. pause/resume cíclico mantém viva.
  setInterval(() => {
    if(window.speechSynthesis.speaking && !window.speechSynthesis.paused){
      try { window.speechSynthesis.pause(); window.speechSynthesis.resume(); } catch(_){}
    }
  }, 10000);
}
function _cortexStripForTTS(text){
  let s = String(text || '')
    .replace(/<br\s*\/?>/gi, '. ')
    .replace(/<\/?(p|div|h\d|li|tr)>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[*_`~#>|]/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');  // markdown links/img → label
  // Strip emojis + pictographs + variation selectors + ZWJ + regional flags
  try {
    s = s.replace(/\p{Extended_Pictographic}/gu, '');
    s = s.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '');   // bandeiras (regional indicators)
    s = s.replace(/[\u{FE00}-\u{FE0F}\u{200D}]/gu, ''); // VS + ZWJ
  } catch(_){
    // fallback simples se browser não suportar \p{...}
    s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')   // surrogate pairs (emoji ranges)
         .replace(/[☀-➿]/g, '')                  // simbolos misc + dingbats
         .replace(/[⌀-⏿]/g, '');                 // misc technical
  }
  return s
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\.+/g, '. ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}
/* Quebra texto em frases preservando pontuação — pra prosódia natural */
function _cortexSplitSentences(text){
  // Split em . ! ? ; mantendo o delimitador
  const parts = text.match(/[^.!?;]+[.!?;]+|[^.!?;]+$/g) || [text];
  // Junta frases muito curtas com a próxima (evita micro-pausas exageradas)
  const out = [];
  let buf = '';
  for(const p of parts){
    const t = p.trim();
    if(!t) continue;
    if((buf + ' ' + t).trim().length < 35){
      buf = (buf ? buf + ' ' : '') + t;
    } else {
      if(buf) out.push(buf);
      buf = t;
    }
  }
  if(buf) out.push(buf);
  return out;
}

function cortexSpeak(text){
  if(!window.speechSynthesis) return;
  if(!state.settings?.cortexVoice) return;
  const clean = _cortexStripForTTS(text);
  if(!clean) return;
  try { window.speechSynthesis.cancel(); } catch(_){}
  if(!_cortexTTSVoice) _cortexTTSVoice = pickCortexVoice();
  const sentences = _cortexSplitSentences(clean);
  if(!sentences.length) return;

  // Mantém speech rec ativo durante TTS pra captar "para/stop".
  // AEC (echoCancellation no getUserMedia) cancela eco da própria voz.
  if(typeof setCortexReactive === 'function') setCortexReactive(true);

  // Detecta voz neural — vozes Online/Natural toleram pitch sem soar robótico
  const voiceName = (_cortexTTSVoice?.name || '').toLowerCase();
  const isNeural  = /natural|online|wavenet|enhanced|google/.test(voiceName);

  // Base — neural = parâmetros default (já soa humano); offline = grave/Jarvis
  const baseRate  = isNeural ? 1.0  : 0.97;
  const basePitch = isNeural ? 0.98 : 0.86;

  sentences.forEach((sentence, i) => {
    const u = new SpeechSynthesisUtterance(sentence);
    if(_cortexTTSVoice) u.voice = _cortexTTSVoice;
    u.lang   = _cortexTTSVoice?.lang || (state.settings?.language === 'en' ? 'en-GB' : 'pt-BR');
    // Jitter por frase — humanos não falam plano
    const jitterRate  = (Math.random() - 0.5) * 0.06;
    const jitterPitch = (Math.random() - 0.5) * 0.08;
    // Frases curtas tendem a ser mais ágeis; frases longas levemente mais lentas
    const lenAdj = sentence.length > 90 ? -0.03 : (sentence.length < 25 ? 0.04 : 0);
    u.rate   = Math.max(0.7, Math.min(1.25, baseRate + jitterRate + lenAdj));
    u.pitch  = Math.max(0.6, Math.min(1.3,  basePitch + jitterPitch));
    u.volume = 0.95;

    // Primeira frase ativa estado busy (UI mostra stop button)
    if(i === 0){
      u.onstart = () => { if(typeof setCortexBusy === 'function') setCortexBusy(true); };
    }
    // Última frase: handler final restaura mic + esfera + clear busy
    if(i === sentences.length - 1){
      u.onend = () => {
        if(typeof setCortexReactive === 'function') setTimeout(()=>setCortexReactive(false), 400);
        if(typeof setCortexBusy === 'function') setCortexBusy(false);
      };
      u.onerror = u.onend;
    }
    window.speechSynthesis.speak(u);
  });
}
function cortexStopSpeak(){
  try { window.speechSynthesis?.cancel(); } catch(_){}
}
function toggleCortexVoice(){
  state.settings.cortexVoice = !state.settings.cortexVoice;
  save();
  // força repick pra pegar voz masculina atualizada
  _cortexTTSVoice = null;
  if(!state.settings.cortexVoice) cortexStopSpeak();
  if(typeof _cortexMenuSyncState === 'function') _cortexMenuSyncState();
}
function cortexMenuToggleVoice(){ toggleCortexVoice(); }

/* Fast-path local · comandos óbvios viram action direto sem LLM */
function _cortexLocalCommand(q){
  const t = String(q || '').trim();
  // "abra/abre/acessa/abrir/acessar X" (com ou sem "cortex" antes — já tirado pelo wake)
  const openRe = /^\s*(?:cortex\s+)?(?:por\s+favor\s+)?(?:abra|abre|abrir|acessa|acessar|launch|open)\s+(?:o\s+|a\s+|meu\s+|minha\s+|the\s+|my\s+)?(.+?)\s*[.!?]*\s*$/i;
  const m = t.match(openRe);
  if(m && m[1]){
    const target = m[1].trim();
    if(target.length < 60){
      return { tool:'open_site', args:{ name: target } };
    }
  }
  return null;
}

async function askCortex(question){
  // ── FAST PATH local · executa comandos óbvios sem LLM ──
  const local = _cortexLocalCommand(question);
  if(local && typeof CORTEX_TOOLS !== 'undefined' && CORTEX_TOOLS[local.tool]){
    cortexMessages.push({id:uid(),role:'user',text:question,time:Date.now()});
    const results = cortexExecuteActions([local]);
    const ok = results[0]?.ok;
    // Extrai URL/host limpo se vier marker __OPEN_URL__ (open_site)
    let confirmText;
    if(ok && typeof results[0].result === 'string' && results[0].result.startsWith('__OPEN_URL__')){
      const url = results[0].result.slice('__OPEN_URL__'.length);
      let host = url;
      try { host = new URL(url).hostname.replace(/^www\./,''); } catch(_){}
      confirmText = `Abrindo ${host}. Se não abrir, clique no link acima — o navegador pode ter bloqueado popups.`;
    } else if(ok){
      confirmText = `Pronto. ${results[0].result || ''}`.trim();
    } else {
      confirmText = `Não consegui executar: ${results[0]?.error || 'erro desconhecido'}.`;
    }
    cortexMessages.push({
      id: uid(), role:'assistant',
      html: cortexRenderActionResults(results) + `<div style="margin-top:6px;font-size:12.5px;color:var(--text-dim)">${escapeHtml(confirmText)}</div>`,
      time: Date.now()
    });
    persistCortexChat();
    renderCortexChat();
    if(typeof cortexSpeak === 'function') cortexSpeak(confirmText);
    return;
  }

  cortexMessages.push({id:uid(),role:'user',text:question,time:Date.now()});
  // mostra typing indicator
  const typingId = uid();
  _cortexBusyTypingId = typingId;
  cortexMessages.push({id:typingId,role:'assistant',html:`<div class="cortex-typing"><span></span><span></span><span></span></div>`,time:Date.now()});
  renderCortexChat();
  setCortexReactive(true); // partículas se agitam
  setCortexBusy(true);

  const finish = (html, textForTTS) => {
    const idx = cortexMessages.findIndex(m => m.id === typingId);
    if(idx >= 0) cortexMessages[idx] = { id:typingId, role:'assistant', html, time:Date.now() };
    _cortexBusyTypingId = null;
    persistCortexChat();
    renderCortexChat();
    setTimeout(()=>setCortexReactive(false), 900);
    setCortexBusy(false);
    if(typeof cortexSpeak === 'function') cortexSpeak(textForTTS || html);
  };

  // Tenta IA real primeiro se configurada
  if(typeof cortexAIAvailable === 'function' && cortexAIAvailable()){
    _cortexAbort = new AbortController();
    try {
      // Streaming progressivo — substitui typing por texto crescente em tempo real
      let streamedHTML = '';
      const renderProgress = (fullSoFar) => {
        // Não renderiza actions parciais — só o texto cru por enquanto
        const fmt = (typeof cortexAIFormat === 'function') ? cortexAIFormat(fullSoFar) : fullSoFar;
        const idx = cortexMessages.findIndex(m => m.id === typingId);
        if(idx >= 0){
          cortexMessages[idx] = {
            id: typingId, role:'assistant',
            html: fmt + '<span class="cortex-cursor">▍</span>',
            time: Date.now()
          };
          renderCortexChat();
        }
      };
      const raw = await askLLM(question, {
        signal: _cortexAbort.signal,
        onDelta: (chunk, full) => { streamedHTML = full; renderProgress(full); }
      });
      // Pós-stream: extrai actions, executa, render final
      let actionsHTML = '';
      let cleaned = raw;
      if(typeof cortexParseActions === 'function'){
        const parsed = cortexParseActions(raw);
        cleaned = parsed.cleaned || raw;
        if(parsed.actions.length){
          const results = cortexExecuteActions(parsed.actions);
          actionsHTML = cortexRenderActionResults(results);
        }
      }
      const textHTML = cleaned ? ((typeof cortexAIFormat === 'function') ? cortexAIFormat(cleaned) : cleaned) : '';
      finish(actionsHTML + textHTML, cleaned);
      return;
    } catch(err){
      // Abort silencioso — cancelCortexGeneration já cuidou da UI
      if(err && (err.name === 'AbortError' || /aborted/i.test(String(err.message||'')))){
        _cortexAbort = null;
        return;
      }
      console.warn('CORTEX AI falhou, fallback rule-based:', err);
      const errNote = `<div style="color:var(--warn);font-size:11px;margin-bottom:6px;opacity:0.75">⚠ IA indisponível (${escapeHtml(String(err.message||err).slice(0,80))}) · usando resposta local</div>`;
      const local = processQuestion(question);
      finish(errNote + local, processQuestion(question).replace(/<[^>]+>/g,' '));
      return;
    } finally {
      _cortexAbort = null;
    }
  }

  // Sem IA — fallback rule-based clássico
  setTimeout(() => {
    const response = processQuestion(question);
    finish(response, response);
  }, 320);
}
function clearCortexChat(){
  cortexMessages = [];
  state.cortex = { messages: [] };
  save();
  renderCortex();
}

function welcomeMessage(){
  const name = (state.info?.name || '').split(' ')[0];
  const greet = name ? `Olá, ${escapeHtml(name)}!` : 'Olá!';
  return `
    <div class="cortex-heading">🧠 ${greet}</div>
    <div>Sou seu assistente do CORTEX. Posso te ajudar com:</div>
    <ul class="cortex-list">
      <li><span>📅 <strong>Agenda</strong> · "hoje", "amanhã", "esta semana"</span></li>
      <li><span>✅ <strong>Tarefas</strong> · pendentes, atrasadas, prioridades</span></li>
      <li><span>💰 <strong>Finanças</strong> · saldo, gastos do mês, categorias</span></li>
      <li><span>🎯 <strong>Metas e projetos</strong> · progresso e prazos</span></li>
      <li><span>✨ <strong>Hábitos</strong> · streaks, status de hoje</span></li>
      <li><span>🚫 <strong>Hábitos ruins</strong> · tempo sem recair</span></li>
      <li><span>📚 <strong>Livros, filmes, skills</strong></span></li>
    </ul>
    <div style="margin-top:10px;font-size:12px;color:var(--text-mute)">Use os atalhos acima ou digite uma pergunta livre.</div>
  `;
}
function helpMessage(){ return welcomeMessage(); }
function fallbackResponse(q){
  return `
    <div class="cortex-heading">🤔 Hmm, não entendi</div>
    <div>Não consegui interpretar <em>"${escapeHtml(q)}"</em>.</div>
    <div style="margin-top:8px;font-size:12.5px;color:var(--text-dim)">Tente algo como:</div>
    <ul class="cortex-list">
      <li><span>"resumo de hoje"</span></li>
      <li><span>"tarefas atrasadas"</span></li>
      <li><span>"agenda da semana"</span></li>
      <li><span>"saldo do mês"</span></li>
      <li><span>"minhas metas"</span></li>
      <li><span>"hábitos hoje"</span></li>
    </ul>
  `;
}

function processQuestion(text){
  const q = text.toLowerCase().trim();
  if(!q) return fallbackResponse(text);
  if(/^(ol[áa]|oi|hey|hello|hi|opa|bom dia|boa tarde|boa noite)\b/.test(q)) return welcomeMessage();
  if(/ajuda|help|comando|o que voc[êe] faz|o que voce sabe/.test(q)) return helpMessage();
  if(/resumo.*(geral|tudo|completo)|panorama|vis[ãa]o geral/.test(q)) return generalSummary();
  if(/\bamanh[ãa]\b/.test(q)) return summaryTomorrow();
  if(/\bhoje\b|\bagora\b/.test(q)) return summaryToday();
  if(/\bsemana\b|pr[óo]ximos.*7|7 dias/.test(q)) return summaryWeek();
  if(/\bm[êe]s\b|mensal/.test(q)) return summaryMonth();
  if(/agenda|evento|calend[áa]rio|pr[óo]xim/.test(q)) return upcomingEvents();
  if(/tarefa|to[\s-]?do|pendente|atrasad/.test(q)) return tasksSummary();
  if(/\bmeta|objetivo/.test(q)) return goalsSummary();
  if(/h[áa]bito.*(ruim|mau|negat)|v[íi]cio|reca[íi]/.test(q)) return badHabitsSummary();
  if(/\bstreak\b|h[áa]bito/.test(q)) return habitsSummary();
  if(/projeto/.test(q)) return projectsSummary();
  if(/dinheiro|finan[çc]a|saldo|gast|receit|despes|economi/.test(q)) return financeSummary();
  if(/livro|lendo|leitura/.test(q)) return booksSummary();
  if(/treino|exerc[íi]cio|academia|musc/.test(q)) return workoutsSummary();
  if(/skill|habilidade/.test(q)) return skillsSummary();
  if(/sonho/.test(q)) return dreamsSummary();
  if(/filme/.test(q)) return moviesSummary();
  if(/rotina/.test(q)) return routinesSummary();
  if(/desafio|challenge/.test(q)) return challengesSummary();
  if(/pomodoro|foco|sess[ãa]o/.test(q)) return pomodoroSummary();
  if(/bucket|antes de morrer|sonho.*de vida/.test(q)) return bucketSummary();
  if(/an[áa]lise|medo|fraqueza|ponto forte/.test(q)) return analysisSummary();
  return fallbackResponse(text);
}

/* ---------- summaries ---------- */
function _statChip(icon, value, label, cls=''){
  return `<div class="cortex-stat ${cls}">${icon} <strong>${value}</strong> ${label}</div>`;
}
function _emptyCard(msg){
  return `<div style="margin-top:8px;font-size:12.5px;color:var(--text-mute)">${msg}</div>`;
}

function summaryToday(){
  const today = todayStr();
  const events = (state.events||[]).filter(e=>e.date===today)
    .sort((a,b)=>(a.allDay?'00':a.startTime||'').localeCompare(b.allDay?'00':b.startTime||''));
  const todos = state.trackers?.todos || [];
  const overdue = todos.filter(t=>!t.done && t.dueDate && t.dueDate < today);
  const dueToday = todos.filter(t=>!t.done && t.dueDate === today);
  const phabits = state.trackers?.pHabits || [];
  const hToday = phabits.filter(h=>(h.log||{})[today]).length;
  const routines = state.trackers?.routines || [];
  const rToday = routines.filter(r=>(r.log||{})[today]).length;
  const tm = thisMonth();
  const mTxs = (state.transactions||[]).filter(t=>t.date.startsWith(tm));
  const rec = mTxs.filter(t=>t.type==='receita').reduce((s,t)=>s+Number(t.value),0);
  const des = mTxs.filter(t=>t.type==='despesa').reduce((s,t)=>s+Number(t.value),0);
  const dateLbl = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});

  let h = `<div class="cortex-heading">📅 Resumo de Hoje</div>`;
  h += `<div class="cortex-sub">${dateLbl}</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('📅', events.length, 'evento(s)');
  h += _statChip('⚠️', overdue.length, 'atrasadas', overdue.length?'bad':'');
  h += _statChip('📋', dueToday.length, 'p/ hoje');
  h += _statChip('✨', `${hToday}/${phabits.length}`, 'hábitos', hToday>=phabits.length && phabits.length?'good':'');
  h += _statChip('🔄', `${rToday}/${routines.length}`, 'rotinas');
  h += _statChip('🍅', pomo.totalToday, 'pomodoros');
  h += `</div>`;

  if(events.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">🗓️ Agenda do dia</div><ul class="cortex-list">`;
    events.forEach(e=>{
      const t = e.allDay ? 'Dia inteiro' : (e.startTime + (e.endTime?`–${e.endTime}`:''));
      h += `<li><span><strong>${t}</strong> · ${escapeHtml(e.title)}</span></li>`;
    });
    h += `</ul></div>`;
  }
  if(overdue.length){
    h += `<div class="cortex-card bad"><div class="cortex-card-title">⚠️ Tarefas atrasadas</div><ul class="cortex-list">`;
    overdue.slice(0,5).forEach(t=>{
      const d = Math.floor((Date.now()-new Date(t.dueDate).getTime())/86400000);
      h += `<li><span>${escapeHtml(t.title)} <span class="overdue-tag">(${d} dia${d!==1?'s':''} atrasada)</span></span></li>`;
    });
    if(overdue.length>5) h += `<li style="color:var(--text-mute)"><span>…e mais ${overdue.length-5}</span></li>`;
    h += `</ul></div>`;
  }
  if(dueToday.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">📋 Para fazer hoje</div><ul class="cortex-list">`;
    dueToday.forEach(t=>h += `<li><span>${escapeHtml(t.title)}</span></li>`);
    h += `</ul></div>`;
  }
  h += `<div class="cortex-card"><div class="cortex-card-title">💰 Mês atual</div>`;
  h += `<div style="font-size:13px;line-height:1.7">Receitas: <strong style="color:var(--good)">${fmt(rec)}</strong> · Despesas: <strong style="color:var(--bad)">${fmt(des)}</strong><br>Saldo: <strong style="color:${rec-des>=0?'var(--good)':'var(--bad)'}">${fmt(rec-des)}</strong></div></div>`;
  if(!events.length && !overdue.length && !dueToday.length){
    h += _emptyCard('✨ Dia tranquilo! Nenhum evento ou tarefa pendente para hoje.');
  }
  return h;
}

function summaryTomorrow(){
  const d = new Date(); d.setDate(d.getDate()+1);
  const k = toDateStr(d);
  const events = (state.events||[]).filter(e=>e.date===k)
    .sort((a,b)=>(a.allDay?'00':a.startTime||'').localeCompare(b.allDay?'00':b.startTime||''));
  const todos = (state.trackers?.todos||[]).filter(t=>!t.done && t.dueDate===k);
  const dateLbl = d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
  let h = `<div class="cortex-heading">⏭️ Amanhã</div>`;
  h += `<div class="cortex-sub">${dateLbl}</div>`;
  h += `<div class="cortex-stats">${_statChip('📅', events.length, 'evento(s)')}${_statChip('📋', todos.length, 'tarefa(s)')}</div>`;
  if(events.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">🗓️ Eventos</div><ul class="cortex-list">`;
    events.forEach(e=>{
      const t = e.allDay ? 'Dia inteiro' : (e.startTime + (e.endTime?`–${e.endTime}`:''));
      h += `<li><span><strong>${t}</strong> · ${escapeHtml(e.title)}</span></li>`;
    });
    h += `</ul></div>`;
  }
  if(todos.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">📋 Tarefas com prazo amanhã</div><ul class="cortex-list">`;
    todos.forEach(t=>h += `<li><span>${escapeHtml(t.title)}</span></li>`);
    h += `</ul></div>`;
  }
  if(!events.length && !todos.length) h += _emptyCard('Nada agendado para amanhã.');
  return h;
}

function summaryWeek(){
  const now = new Date();
  const ws = state.settings?.weekStart || 0;
  const offset = (now.getDay() - ws + 7) % 7;
  const start = new Date(now); start.setDate(now.getDate()-offset); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(start.getDate()+6);
  const ks = toDateStr(start), ke = toDateStr(end);
  const events = (state.events||[]).filter(e=>e.date>=ks && e.date<=ke)
    .sort((a,b)=>a.date.localeCompare(b.date)||(a.startTime||'').localeCompare(b.startTime||''));
  const todos = (state.trackers?.todos||[]).filter(t=>!t.done && t.dueDate && t.dueDate>=ks && t.dueDate<=ke);

  let h = `<div class="cortex-heading">🗓️ Esta Semana</div>`;
  h += `<div class="cortex-sub">${formatDate(ks)} → ${formatDate(ke)}</div>`;
  h += `<div class="cortex-stats">${_statChip('📅', events.length, 'evento(s)')}${_statChip('📋', todos.length, 'tarefa(s) c/ prazo')}</div>`;
  if(events.length){
    const byDay = {};
    events.forEach(e=>{ (byDay[e.date]=byDay[e.date]||[]).push(e); });
    h += `<div class="cortex-card"><div class="cortex-card-title">🗓️ Agenda da semana</div>`;
    Object.keys(byDay).sort().forEach(date=>{
      const d = new Date(date+'T00:00:00');
      const lbl = d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'short'}).replace('.','');
      h += `<div class="cortex-day-head">${lbl}</div>`;
      byDay[date].forEach(e=>{
        const t = e.allDay ? '(dia todo)' : (e.startTime||'');
        h += `<div style="font-size:12.5px;color:var(--text-dim);padding:2px 0">${t} · ${escapeHtml(e.title)}</div>`;
      });
    });
    h += `</div>`;
  }
  if(todos.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">📋 Tarefas com prazo</div><ul class="cortex-list">`;
    todos.sort((a,b)=>(a.dueDate||'').localeCompare(b.dueDate||'')).forEach(t=>{
      h += `<li><span>${escapeHtml(t.title)} <span style="color:var(--text-mute)">— ${formatDate(t.dueDate)}</span></span></li>`;
    });
    h += `</ul></div>`;
  }
  if(!events.length && !todos.length) h += _emptyCard('Semana sem compromissos agendados.');
  return h;
}

function summaryMonth(){
  const tm = thisMonth();
  const mTxs = (state.transactions||[]).filter(t=>t.date.startsWith(tm));
  const rec = mTxs.filter(t=>t.type==='receita').reduce((s,t)=>s+Number(t.value),0);
  const des = mTxs.filter(t=>t.type==='despesa').reduce((s,t)=>s+Number(t.value),0);
  const events = (state.events||[]).filter(e=>e.date.startsWith(tm)).length;
  const monthLbl = new Date(tm+'-01').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});

  // top categorias
  const cats = {};
  mTxs.filter(t=>t.type==='despesa').forEach(t=>cats[t.category]=(cats[t.category]||0)+Number(t.value));
  const top = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5);

  let h = `<div class="cortex-heading">📊 ${monthLbl}</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('💰', fmt(rec-des), 'saldo', rec-des>=0?'good':'bad');
  h += _statChip('↑', fmt(rec), 'receitas', 'good');
  h += _statChip('↓', fmt(des), 'despesas', 'bad');
  h += _statChip('📅', events, 'eventos');
  h += _statChip('💳', mTxs.length, 'transações');
  h += `</div>`;
  if(top.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">🏷️ Top categorias de gasto</div><ul class="cortex-list">`;
    top.forEach(([k,v])=>{
      const pct = des ? Math.round(v/des*100) : 0;
      h += `<li><span><strong style="text-transform:capitalize">${escapeHtml(k)}</strong> — ${fmt(v)} <span style="color:var(--neon)">(${pct}%)</span></span></li>`;
    });
    h += `</ul></div>`;
  }
  return h;
}

function upcomingEvents(){
  const today = todayStr();
  const list = (state.events||[]).filter(e=>e.date>=today)
    .sort((a,b)=>a.date.localeCompare(b.date)||(a.startTime||'').localeCompare(b.startTime||''))
    .slice(0,10);
  let h = `<div class="cortex-heading">🗓️ Próximos eventos</div>`;
  h += `<div class="cortex-stats">${_statChip('📅', list.length, 'próximos eventos')}</div>`;
  if(!list.length) return h + _emptyCard('Nenhum evento agendado.');
  h += `<div class="cortex-card"><ul class="cortex-list">`;
  list.forEach(e=>{
    const days = daysUntil(e.date);
    const dlbl = days===0?'hoje':days===1?'amanhã':`em ${days} dias`;
    const t = e.allDay ? 'Dia todo' : e.startTime;
    h += `<li><span><strong>${formatDate(e.date)}</strong> (${dlbl}) · ${t} · ${escapeHtml(e.title)}</span></li>`;
  });
  h += `</ul></div>`;
  return h;
}

function tasksSummary(){
  const today = todayStr();
  const all = state.trackers?.todos || [];
  const overdue = all.filter(t=>!t.done && t.dueDate && t.dueDate < today);
  const dueToday = all.filter(t=>!t.done && t.dueDate === today);
  const pending = all.filter(t=>!t.done);
  const high = pending.filter(t=>t.priority==='high');
  let h = `<div class="cortex-heading">✅ Tarefas</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('⚠️', overdue.length, 'atrasadas', overdue.length?'bad':'');
  h += _statChip('📅', dueToday.length, 'hoje');
  h += _statChip('🔥', high.length, 'prioridade alta', high.length?'warn':'');
  h += _statChip('📋', pending.length, 'pendentes');
  h += `</div>`;
  if(overdue.length){
    h += `<div class="cortex-card bad"><div class="cortex-card-title">⚠️ Atrasadas</div><ul class="cortex-list">`;
    overdue.slice(0,8).forEach(t=>{
      const d = Math.floor((Date.now()-new Date(t.dueDate).getTime())/86400000);
      h += `<li><span>${escapeHtml(t.title)} <span class="overdue-tag">(${d}d)</span></span></li>`;
    });
    h += `</ul></div>`;
  }
  if(high.length){
    h += `<div class="cortex-card warn"><div class="cortex-card-title">🔥 Prioridade alta</div><ul class="cortex-list">`;
    high.slice(0,8).forEach(t=>{
      const due = t.dueDate ? ` <span style="color:var(--text-mute)">— ${formatDate(t.dueDate)}</span>` : '';
      h += `<li><span>${escapeHtml(t.title)}${due}</span></li>`;
    });
    h += `</ul></div>`;
  }
  if(!pending.length) h += _emptyCard('🎉 Tudo em dia! Nenhuma tarefa pendente.');
  return h;
}

function goalsSummary(){
  const list = state.trackers?.goals || [];
  const active = list.filter(g=>g.status==='active');
  const done = list.filter(g=>g.status==='done');
  const avg = active.length ? Math.round(active.reduce((s,g)=>s+(Number(g.progress)||0),0)/active.length) : 0;
  let h = `<div class="cortex-heading">🎯 Metas</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('🚀', active.length, 'ativas');
  h += _statChip('✓', done.length, 'concluídas', 'good');
  h += _statChip('📊', avg+'%', 'progresso médio');
  h += `</div>`;
  if(active.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">🎯 Metas em andamento</div><ul class="cortex-list">`;
    active.sort((a,b)=>(b.progress||0)-(a.progress||0)).forEach(g=>{
      const dl = g.deadline ? ` · prazo ${formatDate(g.deadline)}` : '';
      h += `<li><span><strong>${escapeHtml(g.title)}</strong> — <span style="color:var(--neon)">${g.progress||0}%</span>${dl}</span></li>`;
    });
    h += `</ul></div>`;
  } else h += _emptyCard('Nenhuma meta ativa. Que tal definir uma?');
  return h;
}

function habitsSummary(){
  const list = state.trackers?.pHabits || [];
  const today = todayStr();
  const doneToday = list.filter(h=>(h.log||{})[today]).length;
  function streak(h){
    let s=0; for(let i=0;i<365;i++){
      const d=new Date(); d.setDate(d.getDate()-i);
      if((h.log||{})[toDateStr(d)]) s++; else if(i>0) break;
    } return s;
  }
  const streaks = list.map(streak);
  const maxS = streaks.length ? Math.max(...streaks) : 0;
  let h = `<div class="cortex-heading">✨ Hábitos</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('✓', `${doneToday}/${list.length}`, 'hoje', doneToday>=list.length && list.length?'good':'');
  h += _statChip('🔥', maxS, 'maior streak');
  h += `</div>`;
  if(list.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">✨ Status hoje</div><ul class="cortex-list">`;
    list.forEach((it,i)=>{
      const done = (it.log||{})[today];
      h += `<li><span>${it.emoji||'✨'} <strong>${escapeHtml(it.name)}</strong> ${done?'<span style="color:var(--good)">✓ feito</span>':'<span style="color:var(--text-mute)">⌛ pendente</span>'} · streak ${streaks[i]} dias</span></li>`;
    });
    h += `</ul></div>`;
  } else h += _emptyCard('Nenhum hábito configurado.');
  return h;
}

function badHabitsSummary(){
  const list = state.habits || [];
  let h = `<div class="cortex-heading">🚫 Hábitos Ruins</div>`;
  h += `<div class="cortex-stats">${_statChip('📊', list.length, 'rastreados')}</div>`;
  if(!list.length) return h + _emptyCard('Nenhum hábito ruim rastreado.');
  h += `<div class="cortex-card"><div class="cortex-card-title">Tempo desde última recaída</div><ul class="cortex-list">`;
  list.forEach(it=>{
    const diff = Date.now() - it.since;
    const d = Math.floor(diff/86400000);
    const hr = Math.floor((diff%86400000)/3600000);
    const status = d<1?'<span style="color:var(--bad)">Recente</span>':d<7?'<span style="color:var(--warn)">Construindo</span>':d<30?'<span style="color:var(--neon-4)">Firme</span>':'<span style="color:var(--good)">Sólido</span>';
    h += `<li><span>${it.emoji||'🚫'} <strong>${escapeHtml(it.name)}</strong> — ${d}d ${hr}h · ${status}</span></li>`;
  });
  h += `</ul></div>`;
  return h;
}

function projectsSummary(){
  const list = state.projects || [];
  const active = list.filter(p=>p.status==='ativo');
  const done = list.filter(p=>p.status==='concluido');
  const overdue = active.filter(p=>p.deadline && p.deadline < todayStr());
  let h = `<div class="cortex-heading">🚀 Projetos</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('🚀', active.length, 'ativos');
  h += _statChip('✓', done.length, 'concluídos', 'good');
  h += _statChip('⚠️', overdue.length, 'atrasados', overdue.length?'bad':'');
  h += `</div>`;
  if(active.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">🚀 Em andamento</div><ul class="cortex-list">`;
    active.forEach(p=>{
      const pct = projectProgress(p);
      const days = p.deadline ? daysUntil(p.deadline) : null;
      const dlbl = days===null?'':days<0?` <span class="overdue-tag">(${-days}d atrasado)</span>`:` · ${days}d restantes`;
      h += `<li><span><strong>${escapeHtml(p.name)}</strong> — <span style="color:var(--neon)">${pct}%</span>${dlbl}</span></li>`;
    });
    h += `</ul></div>`;
  } else h += _emptyCard('Nenhum projeto ativo.');
  return h;
}

function financeSummary(){
  const tm = thisMonth();
  const mTxs = (state.transactions||[]).filter(t=>t.date.startsWith(tm));
  const rec = mTxs.filter(t=>t.type==='receita').reduce((s,t)=>s+Number(t.value),0);
  const des = mTxs.filter(t=>t.type==='despesa').reduce((s,t)=>s+Number(t.value),0);
  const saldo = rec - des;
  const today = todayStr();
  const todayTxs = (state.transactions||[]).filter(t=>t.date===today);
  const todayDes = todayTxs.filter(t=>t.type==='despesa').reduce((s,t)=>s+Number(t.value),0);

  let h = `<div class="cortex-heading">💰 Finanças</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('💵', fmt(saldo), 'saldo do mês', saldo>=0?'good':'bad');
  h += _statChip('↑', fmt(rec), 'receitas', 'good');
  h += _statChip('↓', fmt(des), 'despesas', 'bad');
  h += _statChip('📆', fmt(todayDes), 'gasto hoje');
  h += `</div>`;
  const cats = {};
  mTxs.filter(t=>t.type==='despesa').forEach(t=>cats[t.category]=(cats[t.category]||0)+Number(t.value));
  const top = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(top.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">🏷️ Onde foi seu dinheiro</div><ul class="cortex-list">`;
    top.forEach(([k,v])=>{
      const pct = des ? Math.round(v/des*100) : 0;
      h += `<li><span style="text-transform:capitalize"><strong>${escapeHtml(k)}</strong> — ${fmt(v)} <span style="color:var(--neon)">(${pct}%)</span></span></li>`;
    });
    h += `</ul></div>`;
  }
  const recent = [...mTxs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  if(recent.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">📋 Últimas transações</div><ul class="cortex-list">`;
    recent.forEach(t=>{
      const sign = t.type==='despesa'?'−':'+';
      const col = t.type==='despesa'?'var(--bad)':'var(--good)';
      h += `<li><span>${formatDate(t.date)} · ${escapeHtml(t.desc)} — <strong style="color:${col}">${sign} ${fmt(t.value)}</strong></span></li>`;
    });
    h += `</ul></div>`;
  }
  return h;
}

function booksSummary(){
  const list = state.trackers?.books || [];
  const reading = list.filter(b=>b.status==='lendo');
  const finished = list.filter(b=>b.status==='lido');
  const queue = list.filter(b=>b.status==='quero');
  let h = `<div class="cortex-heading">📚 Livros</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('📖', reading.length, 'lendo agora');
  h += _statChip('✓', finished.length, 'lidos', 'good');
  h += _statChip('📋', queue.length, 'na fila');
  h += `</div>`;
  if(reading.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">📖 Lendo</div><ul class="cortex-list">`;
    reading.forEach(b=>{
      const pct = b.pages ? Math.round((Number(b.currentPage)||0)/Number(b.pages)*100) : 0;
      h += `<li><span><strong>${escapeHtml(b.title)}</strong>${b.author?` — ${escapeHtml(b.author)}`:''} · pg ${b.currentPage||0}/${b.pages||'?'} (${pct}%)</span></li>`;
    });
    h += `</ul></div>`;
  }
  return h;
}

function workoutsSummary(){
  const list = [...(state.workouts||[])].sort((a,b)=>b.date.localeCompare(a.date));
  const week = list.filter(w=>{
    const days = (Date.now()-new Date(w.date).getTime())/86400000;
    return days <= 7;
  });
  const totalMin = list.reduce((s,w)=>s+(Number(w.duration)||0),0);
  let h = `<div class="cortex-heading">🏋️ Treinos</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('💪', week.length, 'nos últimos 7 dias', week.length>=4?'good':'');
  h += _statChip('📊', list.length, 'total registrados');
  h += _statChip('⏱️', totalMin+' min', 'tempo total');
  h += `</div>`;
  if(list.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">🏋️ Treinos recentes</div><ul class="cortex-list">`;
    list.slice(0,5).forEach(w=>{
      h += `<li><span><strong>${escapeHtml(w.name)}</strong> · ${formatDate(w.date)} · ${w.duration}min · ${escapeHtml(w.type)}</span></li>`;
    });
    h += `</ul></div>`;
  } else h += _emptyCard('Nenhum treino registrado.');
  return h;
}

function skillsSummary(){
  const list = state.trackers?.skills || [];
  const totalH = list.reduce((s,k)=>s+(Number(k.hours)||0),0);
  const inProgress = list.filter(k=>(Number(k.currentLevel)||0)<(Number(k.targetLevel)||0));
  let h = `<div class="cortex-heading">🧩 Skills</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('🎓', list.length, 'total');
  h += _statChip('📈', inProgress.length, 'em desenvolvimento');
  h += _statChip('⏱️', totalH+' h', 'investidas');
  h += `</div>`;
  if(list.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">🧩 Nível atual</div><ul class="cortex-list">`;
    list.forEach(k=>{
      h += `<li><span><strong>${escapeHtml(k.name)}</strong> · ${k.currentLevel||0}/10 → meta ${k.targetLevel||10} · ${k.hours||0}h</span></li>`;
    });
    h += `</ul></div>`;
  }
  return h;
}

function dreamsSummary(){
  const list = state.trackers?.dreams || [];
  const tm = thisMonth();
  const mo = list.filter(d=>(d.date||'').startsWith(tm)).length;
  const lucid = list.filter(d=>d.lucid).length;
  let h = `<div class="cortex-heading">💭 Sonhos</div>`;
  h += `<div class="cortex-stats">${_statChip('📊', list.length, 'total')}${_statChip('📆', mo, 'este mês')}${_statChip('✨', lucid, 'lúcidos')}</div>`;
  return h;
}

function moviesSummary(){
  const list = state.trackers?.movies || [];
  const watched = list.filter(m=>m.status==='visto');
  const queue = list.filter(m=>m.status==='quero');
  let h = `<div class="cortex-heading">🎬 Filmes</div>`;
  h += `<div class="cortex-stats">${_statChip('✓', watched.length, 'vistos', 'good')}${_statChip('📋', queue.length, 'watchlist')}</div>`;
  if(queue.length){
    h += `<div class="cortex-card"><div class="cortex-card-title">📋 Próximos a assistir</div><ul class="cortex-list">`;
    queue.slice(0,5).forEach(m=>h += `<li><span>${escapeHtml(m.title)}${m.year?` (${m.year})`:''}</span></li>`);
    h += `</ul></div>`;
  }
  return h;
}

function routinesSummary(){
  const list = state.trackers?.routines || [];
  const today = todayStr();
  const doneToday = list.filter(r=>(r.log||{})[today]).length;
  let h = `<div class="cortex-heading">🔄 Rotinas</div>`;
  h += `<div class="cortex-stats">${_statChip('✓', `${doneToday}/${list.length}`, 'feitas hoje')}</div>`;
  if(list.length){
    h += `<div class="cortex-card"><ul class="cortex-list">`;
    list.forEach(r=>{
      const done = (r.log||{})[today];
      h += `<li><span><strong>${escapeHtml(r.name)}</strong> · ${r.time} ${done?'<span style="color:var(--good)">✓</span>':'<span style="color:var(--text-mute)">⌛</span>'}</span></li>`;
    });
    h += `</ul></div>`;
  }
  return h;
}

function challengesSummary(){
  const list = state.trackers?.challenges || [];
  let h = `<div class="cortex-heading">🏆 Desafios</div>`;
  h += `<div class="cortex-stats">${_statChip('🏁', list.length, 'desafios')}</div>`;
  if(list.length){
    h += `<div class="cortex-card"><ul class="cortex-list">`;
    list.forEach(c=>{
      const completed = (c.completedDays||[]).length;
      const pct = c.days ? Math.round(completed/c.days*100) : 0;
      h += `<li><span><strong>${escapeHtml(c.title)}</strong> — ${completed}/${c.days} (${pct}%)</span></li>`;
    });
    h += `</ul></div>`;
  }
  return h;
}

function pomodoroSummary(){
  let h = `<div class="cortex-heading">🍅 Pomodoro</div>`;
  h += `<div class="cortex-stats">${_statChip('🍅', pomo.totalToday, 'sessões hoje')}${_statChip('🔥', pomo.sessionsInCycle, 'no ciclo atual')}</div>`;
  h += _emptyCard(`Modo atual: <strong>${pomo.mode==='idle'?'parado':pomo.mode==='work'?'foco':pomo.mode==='shortBreak'?'pausa curta':'pausa longa'}</strong>`);
  return h;
}

function bucketSummary(){
  const list = state.trackers?.bucket || [];
  const done = list.filter(b=>b.done);
  let h = `<div class="cortex-heading">⭐ Bucket List</div>`;
  h += `<div class="cortex-stats">${_statChip('🎯', list.length, 'sonhos')}${_statChip('✓', done.length, 'realizados', 'good')}${_statChip('📊', list.length?Math.round(done.length/list.length*100)+'%':'0%', 'progresso de vida')}</div>`;
  return h;
}

function analysisSummary(){
  const a = state.trackers?.analysis || {fears:[],weaknesses:[],strengths:[]};
  let h = `<div class="cortex-heading">🔍 Autoconhecimento</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('😨', a.fears.length, 'medos', 'bad');
  h += _statChip('⚠️', a.weaknesses.length, 'fraquezas', 'warn');
  h += _statChip('💪', a.strengths.length, 'pontos fortes', 'good');
  h += `</div>`;
  return h;
}

function generalSummary(){
  const today = todayStr();
  const events = (state.events||[]).filter(e=>e.date===today).length;
  const overdue = (state.trackers?.todos||[]).filter(t=>!t.done && t.dueDate && t.dueDate<today).length;
  const phabits = state.trackers?.pHabits || [];
  const hToday = phabits.filter(h=>(h.log||{})[today]).length;
  const tm = thisMonth();
  const mTxs = (state.transactions||[]).filter(t=>t.date.startsWith(tm));
  const rec = mTxs.filter(t=>t.type==='receita').reduce((s,t)=>s+Number(t.value),0);
  const des = mTxs.filter(t=>t.type==='despesa').reduce((s,t)=>s+Number(t.value),0);
  const active = (state.projects||[]).filter(p=>p.status==='ativo').length;
  const actGoals = (state.trackers?.goals||[]).filter(g=>g.status==='active').length;

  let h = `<div class="cortex-heading">📊 Panorama Geral</div>`;
  h += `<div class="cortex-sub">${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>`;
  h += `<div class="cortex-stats">`;
  h += _statChip('📅', events, 'eventos hoje');
  h += _statChip('⚠️', overdue, 'atrasadas', overdue?'bad':'');
  h += _statChip('✨', `${hToday}/${phabits.length}`, 'hábitos hoje');
  h += _statChip('💵', fmt(rec-des), 'saldo mês', rec-des>=0?'good':'bad');
  h += _statChip('🚀', active, 'projetos ativos');
  h += _statChip('🎯', actGoals, 'metas ativas');
  h += _statChip('🍅', pomo.totalToday, 'pomodoros');
  h += `</div>`;
  h += `<div style="margin-top:10px;font-size:12px;color:var(--text-mute)">💡 Dica: peça mais detalhes sobre qualquer uma dessas áreas (ex: "tarefas", "finanças", "projetos").</div>`;
  return h;
}

/* =========================================================
   CORTEX SPHERE · liga/desliga o efeito de partículas
   ========================================================= */
function toggleCortexSphere(value){
  if(typeof value === 'boolean'){
    state.settings.cortexSphereEnabled = value;
  } else {
    state.settings.cortexSphereEnabled = state.settings.cortexSphereEnabled === false;
  }
  save();
  applyCortexSphere();
}
function applyCortexSphere(){
  const enabled = state.settings.cortexSphereEnabled !== false;
  const wrap = document.getElementById('cortexCanvasWrap');
  if(wrap) wrap.style.display = enabled ? 'grid' : 'none';

  if(enabled){
    if(!cortexParticles) initCortexHero();
    else if(!cortexParticles.running){
      cortexParticles.running = true;
      requestAnimationFrame(cortexParticles.animate);
    }
  } else {
    if(cortexParticles) cortexParticles.stop();
  }
  // sphere control: emoji button
  const ctrl = document.getElementById('cortexSphereControl');
  const icon = document.getElementById('sphereToggleIcon');
  if(ctrl){
    ctrl.classList.toggle('is-on', enabled);
    ctrl.classList.toggle('is-off', !enabled);
    ctrl.title = enabled ? 'Esfera ligada · clique para desligar' : 'Esfera desligada · clique para ligar';
  }
  if(icon) icon.textContent = enabled ? '🌌' : '⚪';
}

/* =========================================================
   CORTEX HERO · partículas reativas + saudação dinâmica
   ========================================================= */
let cortexParticles = null;

class ParticleSphere {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.reactive = false;
    this.intensity = 0;       // 0 = idle, 1 = respondendo
    this.rotation = 0;
    this.running = true;
    this.morphAmt = 0;        // 0 = sem morph, 1 = morphing
    this.morphFrames = 0;
    this.radius = 1200;
    this.count = 8000;
    // Mic-reactive state
    this.micOn = false;
    this.micStream = null;
    this.audioCtx = null;
    this.analyser = null;
    this.micData = null;
    this.micLevel = 0;        // 0..1 amplitude suavizada
    // Constellations
    this.constellations = []; // pares de índices [i, j]
    // Ripples
    this.ripples = [];
    this.intensitySpike = 0;  // boost momentâneo do ripple
    this._bindClick();
    this.init();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }
  _bindClick(){
    // listener no wrap (canvas tem aspect cover, evento via wrap preserva coords)
    const wrap = document.getElementById('cortexCanvasWrap') || this.canvas;
    this._clickHandler = (e) => {
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const cw = this.canvas.width, ch = this.canvas.height;
      // mapeia coord do click pro canvas (cover scaling)
      const sx = cw / rect.width, sy = ch / rect.height;
      const cx = (e.clientX - rect.left) * sx;
      const cy = (e.clientY - rect.top) * sy;
      this.ripples.push({ x:cx, y:cy, age:0, life:60 });
      // spike de intensidade pra reação tátil
      this.intensitySpike = Math.min(1, this.intensitySpike + 0.55);
    };
    wrap.addEventListener('click', this._clickHandler);
    this._wrapEl = wrap;
  }
  init(){
    this.particles = [];
    for(let i = 0; i < this.count; i++){
      this.particles.push({
        x:0, y:0, z:0,            // posição atual (lerp target)
        tx:0, ty:0, tz:0,         // posição alvo (modelo selecionado)
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.0015 + Math.random() * 0.003,
        size: 1.6 + Math.random() * 3.6,
        opacity: 0.4 + Math.random() * 0.6
      });
    }
    this._applyModel(state.settings?.sphereModel || 'classic', /*snap*/ true);
  }
  _applyModel(model, snap){
    const radius = this.radius;
    const fn = ({
      classic:   this._cfgClassic,
      wireframe: this._cfgWireframe,
      nebula:    this._cfgNebula,
      helix:     this._cfgHelix,
    })[model] || this._cfgClassic;
    fn.call(this, radius);
    if(snap){
      for(let i = 0; i < this.particles.length; i++){
        const p = this.particles[i];
        p.x = p.tx; p.y = p.ty; p.z = p.tz;
      }
    }
    this._buildConstellations();
  }
  /* Pré-computa pares de vizinhos (target xyz) pra desenhar linhas idle.
     Amostra ~200 partículas; pra cada uma acha 1 vizinho mais próximo. */
  _buildConstellations(){
    const N = this.particles.length;
    const sampleN = 200;
    const stride = Math.max(1, Math.floor(N / sampleN));
    const sample = [];
    for(let i = 0; i < N; i += stride) sample.push(i);
    const maxDistSq = (this.radius * 0.35) ** 2;  // só conecta vizinhos próximos
    const pairs = [];
    for(let a = 0; a < sample.length; a++){
      const ia = sample[a]; const pa = this.particles[ia];
      let best = -1, bestD = Infinity;
      for(let b = 0; b < sample.length; b++){
        if(b === a) continue;
        const ib = sample[b]; const pb = this.particles[ib];
        const dx = pa.tx - pb.tx, dy = pa.ty - pb.ty, dz = pa.tz - pb.tz;
        const d = dx*dx + dy*dy + dz*dz;
        if(d < bestD){ bestD = d; best = ib; }
      }
      if(best >= 0 && bestD < maxDistSq){
        // dedup direcional simples
        const key = ia < best ? `${ia}_${best}` : `${best}_${ia}`;
        if(!pairs.some(p => p.key === key)) pairs.push({ key, i:ia, j:best });
      }
    }
    this.constellations = pairs;
  }
  /* Mic reactive · pede getUserMedia, conecta AnalyserNode.
     Retorna Promise — caller trata erro de permissão. */
  async setMicReactive(on){
    if(on){
      if(this.micOn) return;
      // AEC + NS + AGC pra cancelar eco da própria voz da IA quando playback estiver ativo
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new Ctx();
      const src = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.55;
      this.micData = new Uint8Array(this.analyser.frequencyBinCount);
      src.connect(this.analyser);
      this.micStream = stream;
      this.micOn = true;
    } else {
      this.micOn = false;
      if(this.micStream){ this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null; }
      if(this.audioCtx){ try{ this.audioCtx.close(); }catch(_){} this.audioCtx = null; }
      this.analyser = null;
      this.micData = null;
      this.micLevel = 0;
    }
  }
  /* CLASSIC · esfera uniforme (Marsaglia) */
  _cfgClassic(radius){
    for(let i = 0; i < this.particles.length; i++){
      const p = this.particles[i];
      const theta = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const phi = Math.acos(u);
      const r = radius * (0.86 + Math.random() * 0.18);
      const sx = Math.sin(phi);
      p.tx = r * sx * Math.cos(theta);
      p.ty = r * Math.cos(phi);
      p.tz = r * sx * Math.sin(theta);
    }
  }
  /* WIREFRAME · esfera com malha de paralelos + meridianos */
  _cfgWireframe(radius){
    const lats = 14, lngs = 28;
    const r = radius * 0.96;
    for(let i = 0; i < this.particles.length; i++){
      const p = this.particles[i];
      let theta, phi;
      if(i % 2 === 0){
        // paralelo: phi fixo, theta varia
        const latIdx = (Math.floor(i / 2)) % lats;
        phi = Math.PI * (latIdx + 1) / (lats + 1);
        theta = Math.random() * Math.PI * 2;
      } else {
        // meridiano: theta fixo, phi varia
        const lngIdx = (Math.floor(i / 2)) % lngs;
        theta = (lngIdx / lngs) * Math.PI * 2;
        phi = Math.random() * Math.PI;
      }
      const sx = Math.sin(phi);
      const rr = r * (0.985 + Math.random() * 0.025);
      p.tx = rr * sx * Math.cos(theta);
      p.ty = rr * Math.cos(phi);
      p.tz = rr * sx * Math.sin(theta);
    }
  }
  /* NEBULA · esfera com clusters de densidade ao redor de 6 hot spots */
  _cfgNebula(radius){
    const hots = [];
    for(let h = 0; h < 6; h++){
      const u = Math.random() * 2 - 1;
      const phi = Math.acos(u);
      const theta = Math.random() * Math.PI * 2;
      const sx = Math.sin(phi);
      hots.push({
        hx: sx * Math.cos(theta),
        hy: Math.cos(phi),
        hz: sx * Math.sin(theta)
      });
    }
    for(let i = 0; i < this.particles.length; i++){
      const p = this.particles[i];
      const theta = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const phi = Math.acos(u);
      const sx = Math.sin(phi);
      const nx = sx * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = sx * Math.sin(theta);
      // ponto mais alinhado com algum hot spot → empurra pra fora (cluster denso)
      let maxAlign = -1;
      for(let j = 0; j < hots.length; j++){
        const h = hots[j];
        const dot = nx*h.hx + ny*h.hy + nz*h.hz;
        if(dot > maxAlign) maxAlign = dot;
      }
      const cluster = (maxAlign + 1) / 2;              // 0..1
      const noise = Math.random() * 0.12;
      const r = radius * (0.74 + cluster * 0.32 + noise);
      p.tx = nx * r;
      p.ty = ny * r;
      p.tz = nz * r;
    }
  }
  /* HELIX · bobinas espirais polo-a-polo na superfície da esfera */
  _cfgHelix(radius){
    const coils = 5;
    const turns = 5;
    const r = radius * 0.95;
    const N = this.particles.length;
    const per = Math.floor(N / coils);
    for(let i = 0; i < N; i++){
      const p = this.particles[i];
      const coil = Math.floor(i / per) % coils;
      const t = (i % per) / per;                       // 0..1 ao longo da bobina
      const phi = t * Math.PI;                         // polo norte → polo sul
      const theta = (coil / coils) * Math.PI * 2 + t * turns * Math.PI * 2;
      const jitter = (Math.random() - 0.5) * 0.03;
      const sx = Math.sin(phi);
      const rr = r * (1 + jitter);
      p.tx = rr * sx * Math.cos(theta);
      p.ty = rr * Math.cos(phi);
      p.tz = rr * sx * Math.sin(theta);
    }
  }
  morphTo(model){
    this._applyModel(model, /*snap*/ false);
    this.morphAmt = 1;
    this.morphFrames = 60;
  }
  setReactive(active){
    this.reactive = active;
  }
  stop(){
    this.running = false;
    try{ this.setMicReactive(false); }catch(_){}
    if(this._wrapEl && this._clickHandler){
      this._wrapEl.removeEventListener('click', this._clickHandler);
    }
  }
  animate(){
    if(!this.running) return;

    // Target de intensity combina: reactive flag, mic level, spike do ripple
    let target = this.reactive ? 1 : 0;
    if(this.micOn && this.analyser){
      this.analyser.getByteFrequencyData(this.micData);
      let sum = 0;
      for(let i = 0; i < this.micData.length; i++) sum += this.micData[i];
      const avg = sum / this.micData.length / 255;       // 0..1
      this.micLevel = avg;
      target = Math.max(target, Math.min(1, avg * 2.4)); // amplifica fala
    }
    target = Math.min(1, target + this.intensitySpike);
    this.intensitySpike *= 0.92;                          // decai exponencial
    this.intensity += (target - this.intensity) * 0.12;

    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    const cx = w / 2, cy = h / 2;

    // Fade frames anteriores (destination-out evita pintar quadrado)
    ctx.globalCompositeOperation = 'destination-out';
    const fadeBoost = this.morphAmt > 0 ? 0.06 : 0;
    ctx.fillStyle = `rgba(0,0,0,${0.18 - this.intensity * 0.05 + fadeBoost})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    this.rotation += 0.0018 + this.intensity * 0.009;
    const t = performance.now();
    const pulseAmp = 0.04 + this.intensity * 0.12;

    const root = getComputedStyle(document.documentElement);
    const neon = root.getPropertyValue('--neon').trim() || '#b061ff';
    const [nr, ng, nb] = this._hexToRgb(neon);

    const cosR = Math.cos(this.rotation);
    const sinR = Math.sin(this.rotation);
    const morphLerp = this.morphAmt > 0 ? 0.085 : 0;

    // Arrays paralelos (indexados por partícula) — preservam ordem pra constellations
    const N = this.particles.length;
    const sxArr = new Float32Array(N);
    const syArr = new Float32Array(N);
    const szArr = new Float32Array(N);
    const sizeArr = new Float32Array(N);
    const opArr = new Float32Array(N);

    for(let i = 0; i < N; i++){
      const p = this.particles[i];
      if(morphLerp){
        p.x += (p.tx - p.x) * morphLerp;
        p.y += (p.ty - p.y) * morphLerp;
        p.z += (p.tz - p.z) * morphLerp;
      }
      const pulse = 1 + Math.sin(t * p.wobbleSpeed + p.wobble) * pulseAmp;
      const x0 = p.x * pulse;
      const y0 = p.y * pulse;
      const z0 = p.z * pulse;
      const x = x0 * cosR - z0 * sinR;
      const z = x0 * sinR + z0 * cosR;
      const fov = 1800;
      const scale = fov / (fov + z + 1400);
      sxArr[i] = cx + x * scale;
      syArr[i] = cy + y0 * scale;
      szArr[i] = z;
      sizeArr[i] = p.size * scale * (0.9 + this.intensity * 0.6);
      opArr[i] = p.opacity * (0.45 + scale * 0.55);
    }

    if(this.morphFrames > 0){
      this.morphFrames--;
      if(this.morphFrames === 0) this.morphAmt = 0;
    }

    // ── Constellations (idle only) ───────────────────────
    // Fade conforme intensity sobe — mapa estelar só quando calmo
    const constAlpha = (1 - this.intensity) * 0.32;
    if(constAlpha > 0.02 && this.constellations && this.constellations.length){
      ctx.strokeStyle = `rgba(${nr},${ng},${nb},${constAlpha})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for(let k = 0; k < this.constellations.length; k++){
        const c = this.constellations[k];
        // só desenha se ambos endpoints estão "à frente" da câmera
        if(szArr[c.i] > 600 || szArr[c.j] > 600) continue;
        ctx.moveTo(sxArr[c.i], syArr[c.i]);
        ctx.lineTo(sxArr[c.j], syArr[c.j]);
      }
      ctx.stroke();
    }

    // ── Partículas (sorted por z pra ordem correta) ──────
    const order = new Uint16Array(N);
    for(let i = 0; i < N; i++) order[i] = i;
    // sort indireto via Array.from (Uint16Array não tem sort com comparator estável p/ valores externos)
    const orderArr = Array.from(order).sort((a, b) => szArr[a] - szArr[b]);

    for(let k = 0; k < orderArr.length; k++){
      const i = orderArr[k];
      const idle = 1 - this.intensity;
      const r = Math.round(220 * idle + nr * this.intensity);
      const g = Math.round(210 * idle + ng * this.intensity);
      const b = Math.round(245 * idle + nb * this.intensity);
      const alpha = Math.min(1, opArr[i] * (0.55 + this.intensity * 0.45));
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.arc(sxArr[i], syArr[i], Math.max(0.3, sizeArr[i]), 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Ripples ──────────────────────────────────────────
    if(this.ripples.length){
      for(let i = 0; i < this.ripples.length; i++){
        const rp = this.ripples[i];
        rp.age++;
        const tt = rp.age / rp.life;
        const eased = 1 - Math.pow(1 - tt, 3);            // ease-out cubic
        const radius = 60 + eased * 1400;
        const alpha = (1 - tt) * 0.65;
        // Anel principal
        ctx.strokeStyle = `rgba(${nr},${ng},${nb},${alpha})`;
        ctx.lineWidth = 7 * (1 - tt) + 1;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        // Anel interno mais sutil
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
        ctx.lineWidth = 2 * (1 - tt);
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, radius * 0.78, 0, Math.PI * 2);
        ctx.stroke();
      }
      this.ripples = this.ripples.filter(r => r.age < r.life);
    }

    requestAnimationFrame(this.animate);
  }
  _hexToRgb(hex){
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if(!m) return [176, 97, 255];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
}

/* =========================================================
   SPEECH-TO-TEXT · fala vira texto no input do CORTEX
   - Web Speech API (Chrome/Edge)
   - Interim results aparecem em real-time
   - 1.6s de silêncio com texto final → auto-send
   ========================================================= */
let _cortexSpeech = null;
let _cortexSpeechFinal = '';
let _cortexSpeechSilenceTimer = null;
let _cortexSpeechActive = false;
let _cortexSpeechState = 'idle';
let _cortexLastSpeechAt = 0;   // ms timestamp da última detecção de fala — bloqueia clap   // 'idle' (esperando wake word) | 'armed' (gravando comando)
const CORTEX_WAKE_PATTERN = /\b(cortex|córtex|cortez|c[óo]rtix)\b/i;
const CORTEX_STOP_PATTERN = /\b(cortex\s+(para|pare|stop|silêncio|silencio|cala|chega|quieto)|para\s+cortex|pare\s+cortex|cortex\s+cala|cala\s+(a\s+)?boca|chega\s+cortex|stop\s+cortex|^\s*pare\s*$|^\s*para\s*$|^\s*stop\s*$|^\s*silêncio\s*$|^\s*silencio\s*$)/i;
const CORTEX_PH_IDLE  = "Diga 'CORTEX' para começar…";
const CORTEX_PH_ARMED = 'Ouvindo o comando…';

function _cortexSpeechSetArmed(armed){
  _cortexSpeechState = armed ? 'armed' : 'idle';
  const bar = document.getElementById('cortexInputBar');
  if(bar) bar.classList.toggle('is-armed', armed);
  const inp = document.getElementById('cortexInput');
  if(inp) inp.placeholder = armed ? CORTEX_PH_ARMED : CORTEX_PH_IDLE;
}

function startCortexSpeech(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    console.warn('[CORTEX] SpeechRecognition indisponível neste navegador (use Chrome/Edge/Safari).');
    return false;
  }
  if(location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1'){
    console.warn('[CORTEX] SpeechRecognition exige HTTPS. Origem atual:', location.origin);
    return false;
  }
  try{
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = (state.settings?.language === 'en' ? 'en-US' : 'pt-BR');
    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for(let i = e.resultIndex; i < e.results.length; i++){
        const r = e.results[i];
        if(r.isFinal) final += r[0].transcript;
        else           interim += r[0].transcript;
      }
      // Marca timestamp pra bloquear clap detector (voz cria 2 picos = falso clap)
      if((final + interim).trim()) _cortexLastSpeechAt = performance.now();
      const input = document.getElementById('cortexInput');

      // ── STOP COMMAND · interrompe TTS se estiver falando OU pendente ──
      // (cobre gap entre frases chunked + pending utterances na fila)
      const ttsActive = !!(window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending));
      const combined = (final + ' ' + interim).trim();
      if(ttsActive && combined && CORTEX_STOP_PATTERN.test(combined)){
        cortexStopSpeak();
        // limpa transcript pra não vazar pro próximo turno
        _cortexSpeechFinal = '';
        if(input){ input.value = ''; if(typeof updateCortexSendState === 'function') updateCortexSendState(input); }
        return;
      }

      // ── IDLE: procura wake word "cortex" ────────────────
      if(_cortexSpeechState === 'idle'){
        const combined = (final + ' ' + interim).trim();
        const m = combined.match(CORTEX_WAKE_PATTERN);
        if(!m) return; // ignora qualquer fala antes do wake
        // arma + pega o que veio DEPOIS da palavra como início do comando
        const after = combined.slice(m.index + m[0].length).replace(/^[\s,.\-:;!?]+/, '');
        _cortexSpeechFinal = after;
        _cortexSpeechSetArmed(true);
        if(input){
          input.value = after;
          if(typeof updateCortexSendState === 'function') updateCortexSendState(input);
        }
        // boost visual da esfera + feedback
        if(cortexParticles) cortexParticles.intensitySpike = Math.min(1, (cortexParticles.intensitySpike||0) + 0.5);
      }
      // ── ARMED: acumula comando ──────────────────────────
      else {
        if(final) _cortexSpeechFinal += ' ' + final;
        if(input){
          input.value = (_cortexSpeechFinal + ' ' + interim).replace(/\s+/g,' ').trim();
          if(typeof updateCortexSendState === 'function') updateCortexSendState(input);
        }
      }

      // silence timeout só dispara quando armed E tem texto
      clearTimeout(_cortexSpeechSilenceTimer);
      if(_cortexSpeechState === 'armed' && _cortexSpeechFinal.trim()){
        _cortexSpeechSilenceTimer = setTimeout(() => {
          const txt = _cortexSpeechFinal.trim();
          _cortexSpeechFinal = '';
          _cortexSpeechSetArmed(false);
          if(input){ input.value = ''; if(typeof updateCortexSendState === 'function') updateCortexSendState(input); }
          if(txt) askCortex(txt);
        }, 1600);
      }
    };
    rec.onerror = (e) => {
      if(e.error === 'no-speech' || e.error === 'aborted') return; // silêncio/normal
      console.warn('[CORTEX] speech error:', e.error, e.message || '');
      // Marca input com erro visual + reabilita restart loop
      const bar = document.getElementById('cortexInputBar');
      if(bar){
        bar.classList.add('speech-error');
        setTimeout(()=>bar?.classList.remove('speech-error'), 2400);
      }
      const inp = document.getElementById('cortexInput');
      if(inp){
        const msgMap = {
          'not-allowed':  'Permissão de microfone negada — clique no cadeado da URL e permita',
          'service-not-allowed': 'Serviço de voz bloqueado pelo navegador',
          'audio-capture': 'Sem microfone disponível',
          'network':       'Erro de rede no reconhecimento de voz',
        };
        inp.placeholder = msgMap[e.error] || `Erro de ditado: ${e.error}`;
      }
    };
    rec.onend = () => {
      // Browser para sozinho às vezes — reinicia se ainda ativo
      if(_cortexSpeechActive){
        try{ rec.start(); }catch(_){}
      }
    };
    rec.start();
    _cortexSpeech = rec;
    _cortexSpeechActive = true;
    _cortexSpeechFinal = '';
    _cortexSpeechState = 'idle';
    document.getElementById('cortexInputBar')?.classList.add('is-listening');
    document.getElementById('cortexInputBar')?.classList.remove('is-armed');
    const inp = document.getElementById('cortexInput');
    if(inp){
      inp.dataset._oldPlaceholder = inp.placeholder;
      inp.placeholder = CORTEX_PH_IDLE;
    }
    return true;
  }catch(_){
    return false;
  }
}

function stopCortexSpeech(){
  _cortexSpeechActive = false;
  clearTimeout(_cortexSpeechSilenceTimer);
  if(_cortexSpeech){
    try{ _cortexSpeech.stop(); }catch(_){}
    _cortexSpeech = null;
  }
  _cortexSpeechFinal = '';
  _cortexSpeechState = 'idle';
  const bar = document.getElementById('cortexInputBar');
  bar?.classList.remove('is-listening');
  bar?.classList.remove('is-armed');
  const inp = document.getElementById('cortexInput');
  if(inp && inp.dataset._oldPlaceholder){
    inp.placeholder = inp.dataset._oldPlaceholder;
    delete inp.dataset._oldPlaceholder;
  }
}

/* =========================================================
   CORTEX ACTIONS MENU · popover com 3 ações rápidas
   - Trigger: ✦ à esquerda do input
   - Itens: Esfera (toggle), Microfone (toggle+ditado), Apagar conversa
   ========================================================= */
function _cortexMenuSyncState(){
  const sphereOn = state.settings?.cortexSphereEnabled !== false;
  const micOn = !!(cortexParticles && cortexParticles.micOn);
  const voiceOn = !!state.settings?.cortexVoice;
  const sSphere = document.getElementById('camStateSphere');
  const sMic    = document.getElementById('camStateMic');
  const sVoice  = document.getElementById('camStateVoice');
  if(sSphere){ sSphere.textContent = sphereOn ? 'on' : 'off'; sSphere.classList.toggle('is-on', sphereOn); }
  if(sMic){ sMic.textContent = micOn ? 'on' : 'off'; sMic.classList.toggle('is-on', micOn); }
  if(sVoice){ sVoice.textContent = voiceOn ? 'on' : 'off'; sVoice.classList.toggle('is-on', voiceOn); }
  document.getElementById('cortexActionsTrigger')?.classList.toggle('has-active', sphereOn || micOn || voiceOn);
}
function openCortexActionsMenu(){
  const menu = document.getElementById('cortexActionsMenu');
  const trig = document.getElementById('cortexActionsTrigger');
  if(!menu) return;
  _cortexMenuSyncState();
  menu.classList.add('is-open');
  menu.setAttribute('aria-hidden','false');
  trig?.classList.add('is-open');
  // fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener('click', _cortexMenuOutside, { capture:true });
    document.addEventListener('keydown', _cortexMenuKey);
  }, 0);
}
function closeCortexActionsMenu(){
  const menu = document.getElementById('cortexActionsMenu');
  const trig = document.getElementById('cortexActionsTrigger');
  if(!menu) return;
  menu.classList.remove('is-open');
  menu.setAttribute('aria-hidden','true');
  trig?.classList.remove('is-open');
  document.removeEventListener('click', _cortexMenuOutside, { capture:true });
  document.removeEventListener('keydown', _cortexMenuKey);
}
function toggleCortexActionsMenu(e){
  e?.stopPropagation();
  const menu = document.getElementById('cortexActionsMenu');
  if(menu && menu.classList.contains('is-open')) closeCortexActionsMenu();
  else openCortexActionsMenu();
}
function _cortexMenuOutside(e){
  const menu = document.getElementById('cortexActionsMenu');
  const trig = document.getElementById('cortexActionsTrigger');
  if(menu?.contains(e.target) || trig?.contains(e.target)) return;
  closeCortexActionsMenu();
}
function _cortexMenuKey(e){
  if(e.key === 'Escape') closeCortexActionsMenu();
}
function cortexMenuToggleSphere(){
  toggleCortexSphere();
  _cortexMenuSyncState();
}
async function cortexMenuToggleMic(){
  await toggleCortexMic();
  _cortexMenuSyncState();
}
function cortexMenuClearChat(){
  clearCortexChat();
  closeCortexActionsMenu();
}

async function toggleCortexMic(){
  if(!cortexParticles){
    console.warn('[CORTEX] Esfera não inicializada — ligue ela antes (✦ → Esfera).');
    const inp = document.getElementById('cortexInput');
    if(inp) inp.placeholder = 'Ligue a esfera primeiro (✦ → Esfera)';
    return;
  }
  const btn = document.getElementById('cortexMicBtn');
  if(cortexParticles.micOn){
    await cortexParticles.setMicReactive(false);
    stopCortexSpeech();
    if(btn){ btn.classList.remove('is-on'); btn.title = 'Reagir ao microfone'; }
    return;
  }
  try{
    await cortexParticles.setMicReactive(true);
    const speechOk = startCortexSpeech();
    if(btn){
      btn.classList.add('is-on');
      btn.title = speechOk
        ? 'Esfera + ditado ativos · fale e o texto vai pro chat'
        : 'Esfera reativa ao mic (ditado não suportado neste navegador)';
    }
  }catch(err){
    console.warn('[CORTEX] mic permission denied:', err);
    const inp = document.getElementById('cortexInput');
    if(inp) inp.placeholder = 'Permissão de microfone negada — verifique o cadeado da URL';
  }
}

function applySphereModel(){
  if(state.settings?.cortexSphereEnabled === false) return;
  const canvas = document.getElementById('cortexCanvas');
  if(!canvas) return;
  const model = state.settings?.sphereModel || 'classic';
  if(cortexParticles && typeof cortexParticles.morphTo === 'function'){
    // morph suave entre modelos (UX premium)
    cortexParticles.morphTo(model);
  } else {
    if(cortexParticles) cortexParticles.stop();
    cortexParticles = new ParticleSphere(canvas);
  }
}

function initCortexHero(){
  if(state.settings?.cortexSphereEnabled === false){
    updateCortexGreeting();
    return;
  }
  const canvas = document.getElementById('cortexCanvas');
  if(!canvas) return;
  if(cortexParticles){ cortexParticles.stop(); }
  cortexParticles = new ParticleSphere(canvas);
  updateCortexGreeting();
}
function updateCortexGreeting(){
  const el = document.getElementById('cortexGreeting');
  if(!el) return;
  const hour = new Date().getHours();
  let salu = 'Bom dia';
  if(hour >= 12 && hour < 18) salu = 'Boa tarde';
  else if(hour >= 18 || hour < 5) salu = 'Boa noite';
  const name = (state.info?.name || '').split(' ')[0];
  const treat = name ? name : 'Mestre';
  el.textContent = `${salu}, ${treat}. O que faremos hoje?`;
}
function setCortexReactive(active){
  if(cortexParticles) cortexParticles.setReactive(active);
  const wrap = document.getElementById('cortexCanvasWrap');
  if(wrap) wrap.classList.toggle('reactive', active);
}

