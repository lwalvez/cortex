/* =========================================================
   SETTINGS · personalização e dados
   ========================================================= */
const SIDEBAR_ITEMS = {
  'cortex':       {label:'CORTEX',       icon:'🧠'},
  'calendar':     {label:'Calendário',   icon:'📅'},
  'tasks':        {label:'Tarefas',      icon:'✅'},
  'kanban':       {label:'Kanban',       icon:'🗂️'},
  'projects':     {label:'Projetos',     icon:'🚀'},
  'triggers':     {label:'Triggers',     icon:'⚡'},
  'habits':       {label:'Hábitos',      icon:'✨'},
  'trackers':     {label:'Trackers',     icon:'📊'},
  'dashboard':    {label:'Dashboard',    icon:'💰'},
  'mentalidade':  {label:'Mentalidade',  icon:'🧘'},
  'notes':        {label:'Notas',        icon:'📝'},
  'drafts':       {label:'Rascunhos',    icon:'✏️'},
  'info':         {label:'Informações',  icon:'🪪'},
};
const DEFAULT_SIDEBAR_SECTIONS = [
  { id:'professional', label:'Profissional', items:['cortex','calendar','tasks','kanban','projects','triggers'] },
  { id:'personal',     label:'Pessoal',      items:['habits','trackers','dashboard','mentalidade','notes','drafts','info'] }
];
function getSidebarSections(){
  const stored = state.settings?.sidebarSections;
  if(Array.isArray(stored) && stored.length){
    // garante que todos os itens existem e remove inválidos
    return stored.map(s => ({
      ...s,
      items: (s.items||[]).filter(id => SIDEBAR_ITEMS[id])
    }));
  }
  return JSON.parse(JSON.stringify(DEFAULT_SIDEBAR_SECTIONS));
}
function getAllSidebarItems(){
  return getSidebarSections().flatMap(s => s.items);
}
function applySidebarStructure(){
  const nav = document.querySelector('.nav');
  if(!nav) return;
  const sections = getSidebarSections();
  const activeBtn = nav.querySelector('.nav-item.active');
  const activePage = activeBtn ? activeBtn.dataset.page : (document.querySelector('.page.active')?.dataset.page || 'cortex');
  nav.innerHTML = sections.map(sec => `
    <div class="nav-section" data-section="${sec.id}">
      <div class="nav-section-label">${escapeHtml(sec.label)}</div>
      ${sec.items.map(id => {
        const it = SIDEBAR_ITEMS[id];
        if(!it) return '';
        const active = id === activePage ? 'active' : '';
        return `<button class="nav-item ${active}" data-page="${id}" data-label="${escapeAttr(it.label)}"><span class="icon">${it.icon}</span><span>${escapeHtml(it.label)}</span></button>`;
      }).join('')}
    </div>
  `).join('');
}
// Mantém compatibilidade com o nome antigo
function applySidebarOrder(){ applySidebarStructure(); }
function moveSidebarItem(sectionId, page, direction){
  const sections = getSidebarSections();
  const sec = sections.find(s => s.id === sectionId);
  if(!sec) return;
  const idx = sec.items.indexOf(page);
  if(idx < 0) return;
  const newIdx = idx + direction;
  if(newIdx < 0 || newIdx >= sec.items.length) return;
  [sec.items[idx], sec.items[newIdx]] = [sec.items[newIdx], sec.items[idx]];
  state.settings.sidebarSections = sections;
  save(); applySidebarStructure(); renderSettings();
}
function moveItemBetweenSections(fromSectionId, page){
  const sections = getSidebarSections();
  const from = sections.find(s => s.id === fromSectionId);
  const to = sections.find(s => s.id !== fromSectionId);
  if(!from || !to) return;
  from.items = from.items.filter(id => id !== page);
  to.items.push(page);
  state.settings.sidebarSections = sections;
  save(); applySidebarStructure(); renderSettings();
}
function resetSidebarOrder(){
  state.settings.sidebarSections = JSON.parse(JSON.stringify(DEFAULT_SIDEBAR_SECTIONS));
  save(); applySidebarStructure(); renderSettings();
  flashStatus('Ordem padrão restaurada');
}
function getSidebarOrder(){ return getAllSidebarItems(); }
let sidebarDragId = null;
function bindSidebarDrag(){
  document.querySelectorAll('.sidebar-order-item').forEach(item => {
    item.addEventListener('dragstart', () => {
      sidebarDragId = item.dataset.page;
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      document.querySelectorAll('.sidebar-order-item').forEach(i => i.classList.remove('drag-over'));
      sidebarDragId = null;
    });
    item.addEventListener('dragover', e => {
      if(!sidebarDragId || sidebarDragId === item.dataset.page) return;
      e.preventDefault();
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', e => {
      if(item.contains(e.relatedTarget)) return;
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if(!sidebarDragId || sidebarDragId === item.dataset.page) return;
      const order = getSidebarOrder();
      const fromIdx = order.indexOf(sidebarDragId);
      const toIdx = order.indexOf(item.dataset.page);
      if(fromIdx < 0 || toIdx < 0) return;
      const [moved] = order.splice(fromIdx, 1);
      order.splice(toIdx, 0, moved);
      state.settings.sidebarOrder = order;
      save(); applySidebarOrder(); renderSettings();
    });
  });
}

const ACCENT_PRESETS = {
  purple: {neon:'#b061ff', neon2:'#7a2bff', neon3:'#e26bff', rgb:'176,97,255', label:'Roxo Neon'},
  cyan:   {neon:'#39d4ff', neon2:'#0ea5e9', neon3:'#5cffb1', rgb:'57,212,255', label:'Ciano Elétrico'},
  pink:   {neon:'#ec4899', neon2:'#be185d', neon3:'#f472b6', rgb:'236,72,153', label:'Rosa Vibrante'},
  green:  {neon:'#10b981', neon2:'#059669', neon3:'#5cffb1', rgb:'16,185,129', label:'Esmeralda'},
  red:    {neon:'#ff1744', neon2:'#c50f2c', neon3:'#ff6b8b', rgb:'255,23,68',  label:'Vermelho Premium'},
  hacker: {neon:'#00ff41', neon2:'#00b32a', neon3:'#7cff96', rgb:'0,255,65',   label:'Verde Hacker'},
  gold:   {neon:'#ffd700', neon2:'#d4a017', neon3:'#fff176', rgb:'255,215,0',  label:'Amarelo Dourado'},
};

/* Card grid premium pro picker de modelo da esfera.
   Cada opção tem SVG schematic ilustrando a topologia das partículas. */
const SPHERE_MODELS = [
  { key:'classic',   emoji:'🌌', name:'Clássica',  desc:'Pontos uniformes' },
  { key:'wireframe', emoji:'🕸️', name:'Wireframe', desc:'Malha lat/long' },
  { key:'nebula',    emoji:'🌫️', name:'Nebulosa',  desc:'Clusters de densidade' },
  { key:'helix',     emoji:'🧬', name:'Hélice',    desc:'Bobinas polo-a-polo' },
];
function sphereModelSvg(key){
  switch(key){
    case 'wireframe':
      return `
        <svg viewBox="0 0 60 60" class="sphere-svg" aria-hidden="true">
          <defs><radialGradient id="wfg" cx="35%" cy="35%"><stop offset="0%" stop-color="currentColor" stop-opacity="0.25"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>
          <circle cx="30" cy="30" r="22" fill="url(#wfg)"/>
          <circle cx="30" cy="30" r="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.9"/>
          <ellipse cx="30" cy="30" rx="22" ry="6" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
          <ellipse cx="30" cy="30" rx="22" ry="14" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
          <ellipse cx="30" cy="30" rx="6" ry="22" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
          <ellipse cx="30" cy="30" rx="14" ry="22" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
        </svg>`;
    case 'nebula':
      return `
        <svg viewBox="0 0 60 60" class="sphere-svg" aria-hidden="true">
          <defs><radialGradient id="nbg" cx="50%" cy="50%"><stop offset="0%" stop-color="currentColor" stop-opacity="0.5"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>
          <circle cx="30" cy="30" r="22" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.35" stroke-dasharray="2 3"/>
          <circle cx="22" cy="22" r="6" fill="url(#nbg)" opacity="0.95"/>
          <circle cx="40" cy="24" r="5" fill="url(#nbg)" opacity="0.85"/>
          <circle cx="38" cy="40" r="7" fill="url(#nbg)" opacity="0.9"/>
          <circle cx="22" cy="38" r="4" fill="url(#nbg)" opacity="0.7"/>
          <circle cx="30" cy="14" r="3" fill="currentColor" opacity="0.7"/>
          <circle cx="14" cy="30" r="2.5" fill="currentColor" opacity="0.55"/>
          <circle cx="46" cy="32" r="2" fill="currentColor" opacity="0.55"/>
          <circle cx="30" cy="48" r="2" fill="currentColor" opacity="0.55"/>
        </svg>`;
    case 'helix':
      return `
        <svg viewBox="0 0 60 60" class="sphere-svg" aria-hidden="true">
          <defs><radialGradient id="hxg" cx="35%" cy="35%"><stop offset="0%" stop-color="currentColor" stop-opacity="0.2"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>
          <circle cx="30" cy="30" r="22" fill="url(#hxg)"/>
          <circle cx="30" cy="30" r="22" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.3"/>
          <path d="M30 8 C44 14, 44 22, 30 30 C16 38, 16 46, 30 52" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.95" stroke-linecap="round"/>
          <path d="M30 8 C16 14, 16 22, 30 30 C44 38, 44 46, 30 52" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.6" stroke-linecap="round"/>
        </svg>`;
    default: // classic
      return `
        <svg viewBox="0 0 60 60" class="sphere-svg" aria-hidden="true">
          <defs><radialGradient id="clg" cx="35%" cy="35%"><stop offset="0%" stop-color="currentColor" stop-opacity="0.45"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>
          <circle cx="30" cy="30" r="22" fill="url(#clg)"/>
          <circle cx="30" cy="30" r="22" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.35"/>
          ${[[20,18],[28,15],[36,17],[42,22],[44,30],[42,38],[36,43],[28,45],[20,42],[16,36],[14,28],[16,21],[26,24],[34,26],[24,32],[34,34],[28,38]]
            .map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.4" fill="currentColor" opacity="0.85"/>`).join('')}
        </svg>`;
  }
}
function sphereModelOptions(active){
  return SPHERE_MODELS.map(m => `
    <button type="button"
            class="sphere-model-opt ${m.key===active?'selected':''}"
            data-model="${m.key}"
            onclick="setSetting('sphereModel','${m.key}')"
            title="${escapeAttr(m.name)} — ${escapeAttr(m.desc)}">
      <div class="sphere-model-svg-wrap">${sphereModelSvg(m.key)}</div>
      <div class="sphere-model-meta">
        <div class="sphere-model-name">${m.emoji} ${escapeHtml(m.name)}</div>
        <div class="sphere-model-desc">${escapeHtml(m.desc)}</div>
      </div>
      <span class="sphere-model-check" aria-hidden="true">✓</span>
    </button>
  `).join('');
}

function applySettings(){
  applyTheme();
  applyAccent();
  applyDensity();
  applyAnimations();
  applyLanguage();
  applySidebarOrder();
  applySidebarCollapsed();
  applyProfilePhoto();
  applySphereScale();
  if(typeof applyClockVisibility === 'function') applyClockVisibility();
}

/* ===== THEME · dark | light | auto ===== */
function _themeResolved(){
  const mode = state.settings?.theme || 'dark';
  if(mode === 'auto'){
    const h = new Date().getHours();
    const sunrise = state.settings?.themeAutoSunrise ?? 7;
    const sunset  = state.settings?.themeAutoSunset ?? 19;
    return (h >= sunrise && h < sunset) ? 'light' : 'dark';
  }
  return mode === 'light' ? 'light' : 'dark';
}
function applyTheme(){
  const t = _themeResolved();
  document.documentElement.setAttribute('data-theme', t);
  // Aplica overrides custom do user
  const ov = state.settings?.themeOverrides || {};
  const root = document.documentElement.style;
  // Remove qualquer override antigo (custom-set inline) que NÃO esteja no ov atual
  const known = ['--bg-0','--bg-1','--bg-2','--sidebar','--sidebar-2','--surface','--surface-2','--surface-3','--border','--border-strong','--text','--text-dim','--text-mute','--neon','--neon-2','--neon-3','--good','--warn','--bad'];
  known.forEach(k => root.removeProperty(k));
  // Aplica overrides ativos
  Object.entries(ov).forEach(([k,v]) => {
    if(v && typeof v === 'string') root.setProperty(k, v);
  });
}
let _themeAutoTimer = null;
function startThemeAutoTimer(){
  if(_themeAutoTimer) clearInterval(_themeAutoTimer);
  _themeAutoTimer = setInterval(() => {
    if(state.settings?.theme === 'auto') applyTheme();
  }, 5 * 60 * 1000); // checa a cada 5 min
}

function applyLanguage(){
  const lang = state.settings?.language === 'en' ? 'en' : 'pt';
  document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'pt-BR');
  if(typeof startI18nObserver === 'function') startI18nObserver();
  if(lang === 'en'){
    if(typeof translateDOM === 'function') translateDOM(document.body);
  } else {
    if(typeof restoreDOM === 'function') restoreDOM(document.body);
  }
}

function applySphereScale(){
  const v = Number(state.settings?.sphereScale);
  const scale = (isFinite(v) && v > 0) ? v : 1;
  document.documentElement.style.setProperty('--sphere-scale', scale);
  const lbl = document.getElementById('sphereScaleLbl');
  if(lbl) lbl.textContent = Math.round(scale*100)+'%';
}

/* Slider sem rerender do modal — mantém foco/drag */
let sphereScaleSaveTimer = null;
function setSphereScaleLive(v){
  const val = parseFloat(v);
  state.settings.sphereScale = isFinite(val) ? val : 1;
  applySphereScale();
  clearTimeout(sphereScaleSaveTimer);
  sphereScaleSaveTimer = setTimeout(save, 250);
}
function resetSphereScale(){
  state.settings.sphereScale = 1;
  save();
  applySphereScale();
  const slider = document.getElementById('sphereScaleSlider');
  if(slider) slider.value = 1;
}

function applyProfilePhoto(){
  const logo = document.getElementById('brandLogo');
  const letter = document.getElementById('brandLogoLetter');
  if(!logo) return;
  const photo = state.settings?.profilePhoto;
  if(photo){
    logo.style.backgroundImage = `url('${photo}')`;
    logo.style.backgroundSize = 'cover';
    logo.style.backgroundPosition = 'center';
    logo.classList.add('has-photo');
    if(letter) letter.style.display = 'none';
  } else {
    logo.style.backgroundImage = '';
    logo.classList.remove('has-photo');
    if(letter) letter.style.display = '';
  }
}

function changeProfilePhoto(input){
  const file = input.files?.[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){
    cortexToast({msg:'Selecione um arquivo de imagem.', type:'error'});
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    state.settings.profilePhoto = e.target.result;
    save();
    applyProfilePhoto();
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function removeProfilePhoto(){
  const prev = state.settings.profilePhoto;
  if(!prev) return;
  delete state.settings.profilePhoto;
  save(); applyProfilePhoto(); renderSettings();
  cortexToast({
    msg:'Foto de perfil removida',
    type:'success',
    undo:()=>{ state.settings.profilePhoto = prev; save(); applyProfilePhoto(); renderSettings(); cortexToast({msg:'Foto restaurada',type:'info'}); }
  });
}
function applyAccent(){
  const acc = ACCENT_PRESETS[state.settings.accentColor] || ACCENT_PRESETS.purple;
  const root = document.documentElement;
  root.style.setProperty('--neon', acc.neon);
  root.style.setProperty('--neon-2', acc.neon2);
  root.style.setProperty('--neon-3', acc.neon3);
  root.style.setProperty('--neon-glow', `0 0 24px rgba(${acc.rgb},0.45)`);
  root.style.setProperty('--neon-glow-soft', `0 0 14px rgba(${acc.rgb},0.25)`);

  let dyn = document.getElementById('dynamicAccent');
  if(!dyn){ dyn = document.createElement('style'); dyn.id='dynamicAccent'; document.head.appendChild(dyn); }
  const rgba = a => `rgba(${acc.rgb},${a})`;
  dyn.textContent = `
    .btn-primary{background:linear-gradient(135deg,${acc.neon},${acc.neon2})}
    .btn-primary:hover{box-shadow:0 0 28px ${rgba(0.55)}, inset 0 1px 0 rgba(255,255,255,0.18)}
    .cal-view-btn.active,.tracker-pill.active,.seg-opt.selected{background:linear-gradient(135deg,${acc.neon},${acc.neon2});box-shadow:0 0 14px ${rgba(0.45)};color:#fff}
    .logo{background:linear-gradient(135deg,${acc.neon},${acc.neon2} 55%,${acc.neon3});box-shadow:0 0 24px ${rgba(0.55)}, inset 0 0 14px rgba(255,255,255,0.18)}
    .cat-fill{background:linear-gradient(90deg,${acc.neon2},${acc.neon},${acc.neon3});box-shadow:0 0 12px ${rgba(0.5)}}
    .progress-fill:not(.green):not(.cyan){background:linear-gradient(90deg,${acc.neon2},${acc.neon},${acc.neon3});box-shadow:0 0 10px ${rgba(0.45)}}
    .month-day.today .day-num,.week-head-cell.today-head .wh-num{background:linear-gradient(135deg,${acc.neon},${acc.neon2});box-shadow:0 0 14px ${rgba(0.55)};color:#fff}
    .switch input:checked + span{background:linear-gradient(135deg,${acc.neon},${acc.neon2})}
    .ss-num{color:${acc.neon}}
    .nav-item.active{background:linear-gradient(135deg,${rgba(0.22)},${rgba(0.14)});box-shadow:0 0 18px ${rgba(0.28)}, inset 0 1px 0 rgba(255,255,255,0.06)}
    .now-line{background:linear-gradient(90deg,transparent,${acc.neon3},transparent);box-shadow:0 0 12px ${rgba(0.6)}}
    .now-line::before{background:${acc.neon3};box-shadow:0 0 12px ${rgba(0.8)}}
    .timer-num{color:${acc.neon};text-shadow:0 0 14px ${rgba(0.4)}}
    .info-card-icon{background:linear-gradient(135deg,${rgba(0.25)},${rgba(0.15)});box-shadow:0 0 14px ${rgba(0.2)}}
    .page-title{background:linear-gradient(90deg,#fff 0%,${rgba(0.85)} 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
    .brand-text h1{background:linear-gradient(90deg,#fff,${acc.neon3});-webkit-background-clip:text;background-clip:text;color:transparent}
  `;
}
function applyDensity(){
  document.body.classList.remove('density-compact','density-comfortable','density-spacious');
  document.body.classList.add('density-' + (state.settings.density||'comfortable'));
}
function applyAnimations(){
  document.body.classList.toggle('no-animations', !state.settings.animations);
}
function applySidebarCollapsed(){
  const sb = document.getElementById('sidebar');
  if(!sb) return;
  const collapsed = !!state.settings.sidebarCollapsed;
  sb.classList.toggle('collapsed', collapsed);
  const btn = document.getElementById('sidebarCollapseBtn');
  if(btn){
    btn.title = collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral';
    btn.setAttribute('aria-label', btn.title);
  }
}
function toggleSidebarCollapsed(){
  state.settings.sidebarCollapsed = !state.settings.sidebarCollapsed;
  save();
  applySidebarCollapsed();
}
function setThemeOverride(varName, value){
  state.settings.themeOverrides = state.settings.themeOverrides || {};
  if(value === null || value === '' || value === undefined){
    delete state.settings.themeOverrides[varName];
  } else {
    state.settings.themeOverrides[varName] = value;
  }
  save();
  applyTheme();
  // Não rerender o modal a cada input (perde foco do color picker)
}
function resetThemeOverrides(){
  state.settings.themeOverrides = {};
  save();
  applyTheme();
  renderSettings();
}

async function enableEncryption(){
  const p1 = prompt('Defina uma senha forte (mínimo 8 caracteres):');
  if(!p1 || p1.length < 8){ alert('Senha precisa ter pelo menos 8 caracteres.'); return; }
  const p2 = prompt('Confirme a senha:');
  if(p1 !== p2){ alert('Senhas não conferem.'); return; }
  if(!confirm('⚠ ATENÇÃO\n\nSe você esquecer essa senha, NÃO há como recuperar seus dados.\n\nDeseja continuar?')) return;
  try {
    await setupCrypto(p1);
    state.settings.encryptStorage = true;
    save();   // já encrypta a partir daqui
    renderSettings();
  } catch(e){
    alert('Erro ao ativar criptografia: ' + e.message);
  }
}

async function disableEncryption(){
  if(!confirm('Desativar criptografia?\n\nSeus dados serão salvos em texto puro no localStorage do navegador.')) return;
  state.settings.encryptStorage = false;
  lockCrypto();
  // save() agora escreve plaintext porque encryptStorage=false
  save();
  renderSettings();
}

async function changeEncryptionPassphrase(){
  const old = prompt('Senha atual:');
  if(!old) return;
  const raw = localStorage.getItem(LS_KEY);
  const okJson = await unlockCrypto(old, raw);
  if(!okJson){ alert('Senha atual incorreta.'); return; }
  const p1 = prompt('Nova senha (mínimo 8 caracteres):');
  if(!p1 || p1.length < 8){ alert('Senha curta.'); return; }
  const p2 = prompt('Confirme a nova senha:');
  if(p1 !== p2){ alert('Senhas não conferem.'); return; }
  try {
    await setupCrypto(p1);
    save();
    alert('✓ Senha alterada com sucesso.');
  } catch(e){
    alert('Erro: ' + e.message);
  }
}

function addCortexMemoryFromInput(){
  const inp = document.getElementById('cmemInput');
  if(!inp) return;
  const v = inp.value.trim();
  if(!v) return;
  state.cortex = state.cortex || { messages:[], memory:[] };
  state.cortex.memory = state.cortex.memory || [];
  if(!state.cortex.memory.includes(v)) state.cortex.memory.push(v);
  save();
  inp.value = '';
  renderSettings();
}
function removeCortexMemory(idx){
  state.cortex = state.cortex || { messages:[], memory:[] };
  state.cortex.memory = state.cortex.memory || [];
  state.cortex.memory.splice(idx, 1);
  save();
  renderSettings();
}

function setCortexAI(field, value){
  state.settings.cortexAI = state.settings.cortexAI || { provider:'none', apiKey:'', model:'' };
  state.settings.cortexAI[field] = value;
  save();
  if(field === 'provider') renderSettings();   // rerender pra mostrar/esconder inputs
}

function setSetting(key, value){
  state.settings[key] = value;
  save();
  // Trocar idioma: rerender tudo PT primeiro, depois applySettings traduz pra EN se preciso
  if(key === 'language'){
    renderAll();
    applySettings();
    renderSettings();
    return;
  }
  applySettings(); renderSettings();
  if(['currency','weekStart','density'].includes(key)) renderAll();
  if(key === 'sphereModel' && typeof applySphereModel === 'function') applySphereModel();
}

function openSettings(){ renderSettings(); openModal('settingsModal'); }

function countAllItems(){
  let n = 0;
  const arrs = [state.transactions,state.notes,state.mindset,state.mantras,state.events,state.workouts,state.habits];
  arrs.forEach(a => { n += (a||[]).length; });
  ['todos','diet','books','goals','dreams','movies','pHabits','routines','challenges','skills','bucket'].forEach(k=>{ n += (state.trackers?.[k]||[]).length; });
  const a = state.trackers?.analysis;
  if(a) n += (a.fears.length+a.weaknesses.length+a.strengths.length);
  n += (state.info?.emergencyContacts||[]).length;
  ['pessoal','profissional'].forEach(k=>{
    (state.kanbans?.[k]?.columns||[]).forEach(c => n += c.cards.length);
  });
  return n;
}
function storageInfo(){
  const raw = localStorage.getItem(LS_KEY) || '';
  const bytes = new Blob([raw]).size;
  return { bytes, kb: (bytes/1024).toFixed(1) };
}

function renderSettings(){
  const s = state.settings;
  const info = storageInfo();
  const items = countAllItems();
  const breakdown = {
    'Transações': state.transactions.length,
    'Notas/Mind/Mantras': state.notes.length + state.mindset.length + state.mantras.length,
    'Eventos': state.events.length,
    'Treinos': state.workouts.length,
    'Hábitos': state.habits.length,
    'Tarefas': state.trackers?.todos?.length || 0,
    'Livros': state.trackers?.books?.length || 0,
    'Metas': state.trackers?.goals?.length || 0,
    'Filmes': state.trackers?.movies?.length || 0,
    'Skills': state.trackers?.skills?.length || 0,
  };

  document.getElementById('settingsBody').innerHTML = `
    <div class="settings-section">
      <h4>🎨 Aparência</h4>
      <div class="settings-row">
        <div class="row-label">Cor de acento<span class="row-desc">${ACCENT_PRESETS[s.accentColor]?.label || ''}</span></div>
        <div class="accent-picker">
          ${Object.entries(ACCENT_PRESETS).map(([k,v])=>`
            <div class="accent-opt ${k===s.accentColor?'selected':''}"
                 style="background:linear-gradient(135deg,${v.neon},${v.neon2});color:${v.neon}"
                 onclick="setSetting('accentColor','${k}')" title="${v.label}"></div>
          `).join('')}
        </div>
      </div>
      <div class="settings-row">
        <div class="row-label">Densidade<span class="row-desc">Tamanho dos cards e espaçamento</span></div>
        <div class="seg-pick">
          ${[['compact','Compacto'],['comfortable','Confortável'],['spacious','Espaçoso']].map(([k,v])=>`
            <button class="seg-opt ${s.density===k?'selected':''}" onclick="setSetting('density','${k}')">${v}</button>
          `).join('')}
        </div>
      </div>
      <div class="settings-row">
        <div class="row-label">Animações<span class="row-desc">Transições e efeitos visuais</span></div>
        ${togglePillHtml(!!s.animations, 'animations')}
      </div>
      <div class="settings-row">
        <div class="row-label">Idioma<span class="row-desc">Language · escolha o idioma da interface</span></div>
        <div class="seg-pick">
          <button class="seg-opt ${s.language!=='en'?'selected':''}" onclick="setSetting('language','pt')">🇧🇷 Português</button>
          <button class="seg-opt ${s.language==='en'?'selected':''}" onclick="setSetting('language','en')">🇺🇸 English</button>
        </div>
      </div>
      <div class="settings-row">
        <div class="row-label">Relógio minimalista<span class="row-desc">Mostra data e hora no canto superior direito</span></div>
        ${togglePillHtml(s.showClock!==false, 'showClock')}
      </div>
      <div class="settings-row">
        <div class="row-label">Barra lateral recolhida<span class="row-desc">Mostra só os ícones na sidebar (clique no chevron na lateral também alterna)</span></div>
        ${togglePillHtml(!!s.sidebarCollapsed, 'sidebarCollapsed')}
      </div>
      <div class="settings-row settings-row-stack">
        <div class="row-label">Modelo da esfera<span class="row-desc">Escolha o estilo das partículas · transição suave no CORTEX</span></div>
        <div class="sphere-model-grid">
          ${sphereModelOptions(s.sphereModel||'classic')}
        </div>
      </div>
      <div class="settings-row">
        <div class="row-label">Tamanho da esfera<span class="row-desc">Escala visual da esfera no CORTEX · responsivo a qualquer tela</span></div>
        <div style="display:flex;align-items:center;gap:10px;min-width:240px">
          <input type="range" id="sphereScaleSlider" min="0.4" max="2" step="0.05" value="${s.sphereScale||1}"
                 oninput="setSphereScaleLive(this.value)"
                 style="flex:1;accent-color:var(--neon)" />
          <span id="sphereScaleLbl" style="font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:700;color:var(--neon);min-width:42px;text-align:right">${Math.round((s.sphereScale||1)*100)}%</span>
          <button class="btn-icon" onclick="resetSphereScale()" title="Resetar 100%" style="font-size:13px">↺</button>
        </div>
      </div>
      <div class="settings-row">
        <div class="row-label">Foto de perfil<span class="row-desc">Substitui o "C" no canto superior · clique no logo pra trocar</span></div>
        <div style="display:flex;gap:8px">
          ${s.profilePhoto ? `<button class="btn btn-secondary" onclick="removeProfilePhoto()">🗑️ Remover foto</button>` : `<span style="font-size:11px;color:var(--text-mute);align-self:center">Nenhuma definida</span>`}
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4>🧭 Ordem da Sidebar</h4>
      <div style="font-size:11.5px;color:var(--text-mute);margin-bottom:12px;line-height:1.5">
        Use ▲ ▼ para reordenar dentro da seção · use ⇄ para mover um item entre <strong>Profissional</strong> e <strong>Pessoal</strong>.
      </div>
      ${getSidebarSections().map(sec => `
        <div style="margin-bottom:14px">
          <div style="font-size:10.5px;color:var(--neon);text-transform:uppercase;letter-spacing:0.12em;font-weight:800;margin-bottom:6px;padding:0 4px">${escapeHtml(sec.label)}</div>
          <div class="sidebar-order-list" data-section="${sec.id}">
            ${sec.items.map((id, i, arr) => {
              const it = SIDEBAR_ITEMS[id];
              if(!it) return '';
              return `
                <div class="sidebar-order-item" data-page="${id}" data-section="${sec.id}">
                  <span class="drag-handle">⋮⋮</span>
                  <span class="order-num">${i+1}</span>
                  <span class="item-icon">${it.icon}</span>
                  <span class="item-label">${it.label}</span>
                  <button class="arrow-btn" onclick="moveSidebarItem('${sec.id}','${id}',-1)" ${i===0?'disabled':''} title="Subir">▲</button>
                  <button class="arrow-btn" onclick="moveSidebarItem('${sec.id}','${id}',1)" ${i===arr.length-1?'disabled':''} title="Descer">▼</button>
                  <button class="arrow-btn" onclick="moveItemBetweenSections('${sec.id}','${id}')" title="Mover para a outra seção">⇄</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
      <button class="btn btn-secondary" onclick="resetSidebarOrder()" style="width:100%">↺ Restaurar ordem padrão</button>
    </div>

    <div class="settings-section">
      <h4>🌗 Tema</h4>
      <div class="settings-row">
        <div class="row-label">Modo<span class="row-desc">Dark, Light ou Auto (sol/lua por horário)</span></div>
        <div class="seg-pick">
          ${[['dark','🌙 Dark'],['light','☀️ Light'],['auto','🌗 Auto']].map(([k,v])=>`
            <button class="seg-opt ${(s.theme||'dark')===k?'selected':''}" onclick="setSetting('theme','${k}')">${v}</button>
          `).join('')}
        </div>
      </div>
      ${(s.theme||'dark')==='auto' ? `
        <div class="settings-row">
          <div class="row-label">Horário Light<span class="row-desc">Hora local pra dark→light (manhã)</span></div>
          <input type="number" min="0" max="23" value="${s.themeAutoSunrise ?? 7}" onchange="setSetting('themeAutoSunrise',Number(this.value))" style="width:70px;padding:8px 10px;background:rgba(7,3,15,0.4);border:1px solid var(--border);border-radius:8px;color:var(--text);text-align:center;font-weight:700" />
        </div>
        <div class="settings-row">
          <div class="row-label">Horário Dark<span class="row-desc">Hora local pra light→dark (noite)</span></div>
          <input type="number" min="0" max="23" value="${s.themeAutoSunset ?? 19}" onchange="setSetting('themeAutoSunset',Number(this.value))" style="width:70px;padding:8px 10px;background:rgba(7,3,15,0.4);border:1px solid var(--border);border-radius:8px;color:var(--text);text-align:center;font-weight:700" />
        </div>
      ` : ''}
      <div class="settings-row settings-row-stack">
        <div class="row-label">Paleta customizável<span class="row-desc">Override de cores · qualquer mudança aplica em tempo real</span></div>
        <div class="theme-builder">
          ${[
            ['--bg-0','Fundo principal'],
            ['--surface','Superfície (cards)'],
            ['--surface-2','Superfície 2'],
            ['--sidebar','Sidebar'],
            ['--text','Texto'],
            ['--text-dim','Texto secundário'],
            ['--neon','Neon (acento)'],
            ['--neon-2','Neon 2 (escuro)'],
            ['--neon-3','Neon 3 (claro)'],
            ['--good','Sucesso (verde)'],
            ['--warn','Aviso (laranja)'],
            ['--bad','Perigo (vermelho)'],
          ].map(([k,label])=>{
            const cur = (s.themeOverrides && s.themeOverrides[k]) || getComputedStyle(document.documentElement).getPropertyValue(k).trim() || '#000000';
            // converte rgba pra hex aproximado (input color só aceita hex)
            const hex = /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#7a2bff';
            return `
              <label class="theme-builder-row">
                <span class="tb-label">${label}</span>
                <input type="color" class="tb-color" value="${hex}"
                       data-var="${k}"
                       oninput="setThemeOverride('${k}',this.value)" />
                ${(s.themeOverrides && s.themeOverrides[k]) ? `<button class="tb-reset" onclick="setThemeOverride('${k}',null)" title="Resetar">×</button>` : ''}
              </label>
            `;
          }).join('')}
        </div>
        <button class="btn btn-secondary" onclick="resetThemeOverrides()" style="margin-top:8px">↺ Resetar tudo</button>
      </div>
    </div>

    <div class="settings-section">
      <h4>🤖 Inteligência Artificial</h4>
      <div style="font-size:11.5px;color:var(--text-mute);margin-bottom:12px;line-height:1.6">
        Conecte o CORTEX a um modelo de linguagem real. Sua chave fica salva localmente no navegador.
        Sem chave, o CORTEX usa respostas locais baseadas em regras.
      </div>
      <div class="settings-row">
        <div class="row-label">Provedor<span class="row-desc">Escolha o serviço de IA · use a chave da sua conta</span></div>
        <div class="seg-pick">
          ${[
            ['none','— Off'],
            ['openai','OpenAI'],
            ['anthropic','Anthropic'],
            ['groq','Groq (grátis)']
          ].map(([k,v])=>`
            <button class="seg-opt ${(s.cortexAI?.provider||'none')===k?'selected':''}" onclick="setCortexAI('provider','${k}')">${v}</button>
          `).join('')}
        </div>
      </div>
      ${(s.cortexAI?.provider && s.cortexAI.provider !== 'none') ? `
        <div class="settings-row">
          <div class="row-label">API Key<span class="row-desc">${(({
            openai:'platform.openai.com/api-keys',
            anthropic:'console.anthropic.com/settings/keys',
            groq:'console.groq.com/keys (grátis com limite generoso)'
          })[s.cortexAI.provider] || '')}</span></div>
          <input type="password" class="form-input"
                 value="${escapeAttr(s.cortexAI?.apiKey||'')}"
                 placeholder="sk-... / xai-... / gsk-..."
                 oninput="setCortexAI('apiKey',this.value)"
                 style="min-width:260px;font-family:'JetBrains Mono',monospace;font-size:12px" />
        </div>
        <div class="settings-row">
          <div class="row-label">Modelo<span class="row-desc">Vazio = padrão (${(({
            openai:'gpt-4o-mini',
            anthropic:'claude-3-5-haiku-latest',
            groq:'llama-3.3-70b-versatile'
          })[s.cortexAI.provider] || '')})</span></div>
          <input type="text" class="form-input"
                 value="${escapeAttr(s.cortexAI?.model||'')}"
                 placeholder="(padrão)"
                 oninput="setCortexAI('model',this.value)"
                 style="min-width:200px;font-family:'JetBrains Mono',monospace;font-size:12px" />
        </div>
        <div class="settings-row">
          <div class="row-label">Status<span class="row-desc">Conexão validada ao primeiro uso</span></div>
          <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;${
            (s.cortexAI?.apiKey||'').trim()
              ? 'background:rgba(92,255,177,0.14);color:var(--good);border:1px solid rgba(92,255,177,0.3)'
              : 'background:rgba(255,184,107,0.14);color:var(--warn);border:1px solid rgba(255,184,107,0.3)'
          }">${(s.cortexAI?.apiKey||'').trim() ? '✓ Pronto' : '⚠ Aguardando chave'}</span>
        </div>
      ` : `
        <div style="font-size:11.5px;color:var(--text-mute);padding:10px;background:rgba(7,3,15,0.4);border:1px dashed var(--border);border-radius:8px;line-height:1.6">
          <strong style="color:var(--text-dim)">Dica:</strong> Groq oferece tier grátis com Llama 3.3 70B —
          rápido e bom pra começar sem cartão de crédito.
        </div>
      `}

      <div class="settings-row settings-row-stack" style="margin-top:8px">
        <div class="row-label">🧠 Memória pinada<span class="row-desc">Fatos que o CORTEX sempre lembra · injetados no prompt</span></div>
        <div class="cortex-memory-list">
          ${(state.cortex?.memory||[]).map((m,i)=>`
            <div class="cmem-row">
              <span class="cmem-text">${escapeHtml(m)}</span>
              <button class="cmem-del" onclick="removeCortexMemory(${i})" title="Remover">×</button>
            </div>
          `).join('') || '<div style="font-size:11.5px;color:var(--text-mute);font-style:italic;padding:8px">Nenhum fato salvo ainda. Adicione abaixo.</div>'}
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input type="text" id="cmemInput" class="form-input"
                 placeholder="Ex: prefiro treino de manhã, sou vegetariano…"
                 onkeydown="if(event.key==='Enter'){event.preventDefault();addCortexMemoryFromInput()}"
                 style="flex:1;font-size:12.5px" />
          <button class="btn btn-primary" onclick="addCortexMemoryFromInput()">Adicionar</button>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4>📅 Calendário</h4>
      <div class="settings-row">
        <div class="row-label">Primeiro dia da semana<span class="row-desc">Afeta o calendário</span></div>
        <div class="seg-pick">
          <button class="seg-opt ${s.weekStart===0?'selected':''}" onclick="setSetting('weekStart',0)">Domingo</button>
          <button class="seg-opt ${s.weekStart===1?'selected':''}" onclick="setSetting('weekStart',1)">Segunda</button>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4>🍅 Pomodoro</h4>
      <div class="settings-row">
        <div class="row-label">Tempo de foco<span class="row-desc">Duração de cada sessão de trabalho</span></div>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" min="1" max="120" value="${s.pomodoro.work}" onchange="setPomoSetting('work',this.value)" style="width:70px;padding:8px 10px;background:rgba(7,3,15,0.4);border:1px solid var(--border);border-radius:8px;color:var(--text);text-align:center;font-weight:700" />
          <span style="font-size:11px;color:var(--text-mute);font-weight:600">min</span>
        </div>
      </div>
      <div class="settings-row">
        <div class="row-label">Pausa curta<span class="row-desc">Após cada sessão de foco</span></div>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" min="1" max="60" value="${s.pomodoro.shortBreak}" onchange="setPomoSetting('shortBreak',this.value)" style="width:70px;padding:8px 10px;background:rgba(7,3,15,0.4);border:1px solid var(--border);border-radius:8px;color:var(--text);text-align:center;font-weight:700" />
          <span style="font-size:11px;color:var(--text-mute);font-weight:600">min</span>
        </div>
      </div>
      <div class="settings-row">
        <div class="row-label">Pausa longa<span class="row-desc">Pausa estendida após várias sessões</span></div>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" min="1" max="120" value="${s.pomodoro.longBreak}" onchange="setPomoSetting('longBreak',this.value)" style="width:70px;padding:8px 10px;background:rgba(7,3,15,0.4);border:1px solid var(--border);border-radius:8px;color:var(--text);text-align:center;font-weight:700" />
          <span style="font-size:11px;color:var(--text-mute);font-weight:600">min</span>
        </div>
      </div>
      <div class="settings-row">
        <div class="row-label">Ciclo até pausa longa<span class="row-desc">Após quantas sessões de foco</span></div>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" min="2" max="10" value="${s.pomodoro.longBreakAfter}" onchange="setPomoSetting('longBreakAfter',this.value)" style="width:70px;padding:8px 10px;background:rgba(7,3,15,0.4);border:1px solid var(--border);border-radius:8px;color:var(--text);text-align:center;font-weight:700" />
          <span style="font-size:11px;color:var(--text-mute);font-weight:600">sessões</span>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4>💰 Finanças</h4>
      <div class="settings-row">
        <div class="row-label">Moeda<span class="row-desc">Símbolo usado em valores</span></div>
        <div class="seg-pick">
          ${['BRL','USD','EUR'].map(c=>`
            <button class="seg-opt ${s.currency===c?'selected':''}" onclick="setSetting('currency','${c}')">${c}</button>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4>⌨️ Atalhos de teclado</h4>
      <div style="font-size:11.5px;color:var(--text-mute);margin-bottom:12px;line-height:1.5">
        Clique em um atalho para gravar uma nova combinação. <kbd class="kbd">Esc</kbd> durante a captura cancela.
        <br><span style="opacity:0.8">Nota: <kbd class="kbd">Ctrl+T</kbd> não pode ser interceptado pelo Chrome — use <kbd class="kbd">Alt+T</kbd> como alternativa.</span>
      </div>
      <div class="shortcut-list">
        ${Object.entries(SHORTCUT_ACTIONS).map(([action, def])=>{
          const combos = getShortcutsConfig()[action] || [];
          const btnId = 'sc_btn_' + action.replace(/[^a-z0-9]/gi,'_');
          return `
            <div class="shortcut-row">
              <span class="sc-label">${escapeHtml(def.label)}</span>
              <div class="sc-keys">
                ${combos.length
                  ? combos.map(c => `<kbd class="kbd">${escapeHtml(c)}</kbd>`).join(' <span style="color:var(--text-mute);font-size:10px">ou</span> ')
                  : `<span style="color:var(--text-mute);font-size:11px;font-style:italic">sem atalho</span>`}
              </div>
              <button id="${btnId}" class="btn-icon sc-edit" onclick="startShortcutCapture('${action}','${btnId}')" title="Gravar novo atalho">✎</button>
              <button class="btn-icon sc-clear" onclick="clearShortcut('${action}')" title="Remover atalho">✕</button>
            </div>
          `;
        }).join('')}
      </div>
      <button class="btn btn-secondary" onclick="resetShortcuts()" style="width:100%;margin-top:8px">↺ Restaurar atalhos padrão</button>
    </div>

    <div class="settings-section">
      <h4>📊 Estatísticas</h4>
      <div class="stats-grid">
        <div class="settings-stat"><div class="ss-num">${items}</div><div class="ss-lbl">Itens totais</div></div>
        <div class="settings-stat"><div class="ss-num">${info.kb}</div><div class="ss-lbl">KB usados</div></div>
        <div class="settings-stat"><div class="ss-num">${info.bytes.toLocaleString('pt-BR')}</div><div class="ss-lbl">Bytes</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-top:8px">
        ${Object.entries(breakdown).map(([k,v])=>`
          <div style="display:flex;justify-content:space-between;padding:7px 10px;background:rgba(7,3,15,0.4);border:1px solid var(--border);border-radius:8px;font-size:12px">
            <span style="color:var(--text-dim)">${k}</span>
            <span style="color:var(--neon);font-weight:700">${v}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="settings-section">
      <h4>🔒 Criptografia local</h4>
      <div style="font-size:11.5px;color:var(--text-mute);margin-bottom:12px;line-height:1.6">
        Protege seus dados no <code>localStorage</code> com senha (AES-256-GCM via Web Crypto).
        Se ativar, você precisará digitar a senha a cada boot. <strong style="color:var(--warn)">⚠ Se esquecer a senha, os dados são perdidos.</strong>
      </div>
      <div class="settings-row">
        <div class="row-label">Status<span class="row-desc">${s.encryptStorage ? 'Ativada · próximo boot pedirá senha' : 'Desativada · dados em texto puro no navegador'}</span></div>
        <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;${
          s.encryptStorage
            ? 'background:rgba(92,255,177,0.14);color:var(--good);border:1px solid rgba(92,255,177,0.3)'
            : 'background:rgba(255,184,107,0.14);color:var(--warn);border:1px solid rgba(255,184,107,0.3)'
        }">${s.encryptStorage ? '🔒 Ativa' : '🔓 Inativa'}</span>
      </div>
      ${s.encryptStorage ? `
        <div class="settings-row">
          <div class="row-label">Desativar criptografia<span class="row-desc">Salva dados em texto puro a partir de agora</span></div>
          <button class="btn btn-secondary" onclick="disableEncryption()">🔓 Desativar</button>
        </div>
        <div class="settings-row">
          <div class="row-label">Trocar senha<span class="row-desc">Re-criptografa com nova senha</span></div>
          <button class="btn btn-secondary" onclick="changeEncryptionPassphrase()">🔁 Trocar senha</button>
        </div>
      ` : `
        <div class="settings-row">
          <div class="row-label">Ativar criptografia<span class="row-desc">Define senha · dados serão re-salvos criptografados</span></div>
          <button class="btn btn-primary" onclick="enableEncryption()">🔒 Ativar</button>
        </div>
      `}
    </div>

    <div class="settings-section">
      <h4>💾 Dados & Backup</h4>
      <div class="settings-row">
        <div class="row-label">Exportar<span class="row-desc">Baixe um JSON com todos os seus dados</span></div>
        <button class="btn btn-secondary" onclick="exportData()">📥 Baixar backup</button>
      </div>
      <div class="settings-row">
        <div class="row-label">Importar<span class="row-desc">Restaurar de um JSON exportado</span></div>
        <button class="btn btn-secondary" onclick="importDataPrompt()">📤 Carregar arquivo</button>
      </div>
      <div class="settings-row">
        <div class="row-label" style="color:var(--warn)">Zerar interface<span class="row-desc">Limpa todos os dados (transações, notas, tarefas, hábitos…) mantendo suas preferências de tema e configuração · <strong>segure o botão</strong> 1.5s para confirmar</span></div>
        <button class="btn" id="btnResetInterface" type="button">🔄 Começar do zero</button>
      </div>
      <div class="settings-row">
        <div class="row-label" style="color:var(--bad)">Zona de perigo<span class="row-desc">Apaga permanentemente todos os dados + configurações · <strong>segure o botão</strong> 2s para confirmar (sem Undo)</span></div>
        <button class="btn" id="btnResetAll" type="button">🗑️ Limpar tudo</button>
      </div>
    </div>

    <div class="settings-section">
      <h4>🔄 Sincronização com Arquivo</h4>
      ${!FS_SUPPORTED ? `
        <div class="file-sync-info" style="border-color:rgba(255,184,107,0.4);color:var(--warn)">
          ⚠️ Seu navegador não suporta gravação direta em arquivos locais.<br>
          Use <strong>Chrome</strong> ou <strong>Edge</strong> para esta funcionalidade. Por enquanto, use o backup manual abaixo.
        </div>
      ` : s.fileSync && fileHandle ? `
        <div class="file-sync-info connected">
          ✓ Conectado · arquivo <code>${escapeHtml(fileHandle.name)}</code> recebe gravações automáticas a cada alteração.
        </div>
        <div class="settings-row">
          <div class="row-label">Forçar gravação<span class="row-desc">Salvar imediatamente no arquivo</span></div>
          <button class="btn btn-secondary" onclick="writeToFile()">💾 Salvar agora</button>
        </div>
        <div class="settings-row">
          <div class="row-label">Reconectar<span class="row-desc">Pedir permissão novamente (se o navegador perdeu acesso)</span></div>
          <button class="btn btn-secondary" onclick="reconnectFile()">🔄 Reconectar</button>
        </div>
        <div class="settings-row">
          <div class="row-label" style="color:var(--bad)">Desconectar arquivo<span class="row-desc">Para de gravar no arquivo. Dados continuam no navegador.</span></div>
          <button class="btn" onclick="disconnectFile()" style="background:rgba(255,122,154,0.15);color:#ff7a9a;border:1px solid rgba(255,122,154,0.35);font-weight:600">Desconectar</button>
        </div>
      ` : s.fileSync && !fileHandle ? `
        <div class="file-sync-info" style="border-color:rgba(255,184,107,0.4);color:var(--warn)">
          ⚠️ Sincronização configurada, mas o navegador perdeu acesso ao arquivo.<br>Clique em <strong>Reconectar</strong> para liberar a permissão novamente.
        </div>
        <div class="settings-row">
          <div class="row-label">Reconectar arquivo<span class="row-desc">Restaurar acesso de gravação</span></div>
          <button class="btn btn-primary" onclick="reconnectFile()">🔗 Reconectar</button>
        </div>
        <div class="settings-row">
          <div class="row-label">Esquecer arquivo<span class="row-desc">Cancelar a sincronização</span></div>
          <button class="btn btn-secondary" onclick="disconnectFile()">Desconectar</button>
        </div>
      ` : `
        <div class="file-sync-info">
          ℹ️ Escolha um arquivo <code>.json</code> no seu computador. A cada alteração na página, o arquivo será atualizado automaticamente — seus dados ficam fora do navegador, num arquivo que você pode fazer backup, mover, sincronizar com Drive/Dropbox, etc.
        </div>
        <div class="settings-row">
          <div class="row-label">Conectar arquivo local<span class="row-desc">Cria ou abre um .json no seu disco</span></div>
          <button class="btn btn-primary" onclick="connectFile()">🔗 Conectar arquivo</button>
        </div>
      `}
    </div>

    <div class="settings-section">
      <h4>ℹ️ Sobre</h4>
      <div class="settings-row">
        <div class="row-label">CORTEX<span class="row-desc">Dashboard pessoal · v1.0 · Local-first</span></div>
        <span style="font-size:11px;color:var(--text-mute);text-transform:uppercase;letter-spacing:0.1em;font-weight:700">Premium Neon</span>
      </div>
    </div>
  `;
}

// Bind drag-and-drop + hold-confirm após cada renderização do modal de configurações
const _origRenderSettings = renderSettings;
renderSettings = function(){
  _origRenderSettings.apply(this, arguments);
  bindSidebarDrag();
  // Botões destrutivos viram hold-to-confirm (substituem o confirm() nativo)
  const btnInterface = document.getElementById('btnResetInterface');
  if(btnInterface) attachHoldConfirm(btnInterface, {
    duration: 1500,
    labelReady: '🔄 Começar do zero',
    labelHold: 'Segure 1.5s para zerar...',
    onConfirm: () => resetInterfaceFresh()
  });
  const btnAll = document.getElementById('btnResetAll');
  if(btnAll) attachHoldConfirm(btnAll, {
    duration: 2000,
    labelReady: '🗑️ Limpar tudo',
    labelHold: 'Segure 2s para apagar TUDO...',
    onConfirm: () => resetAllData()
  });
};

function exportData(){
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cortex-backup-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function importDataPrompt(){
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json,.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if(!data || typeof data !== 'object') throw new Error('Arquivo inválido');
        // Snapshot do estado atual pra Undo (window de 10s)
        const snapshot = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        state = data;
        save();
        load();
        applySettings();
        renderAll();
        renderSettings();
        cortexToast({
          msg:'✓ Dados importados · estado anterior preservado',
          type:'success',
          duration: 10000,
          undo:()=>{
            state = snapshot;
            save(); load();
            applySettings(); renderAll(); renderSettings();
            cortexToast({msg:'Estado anterior restaurado',type:'info'});
          }
        });
      } catch(err){
        cortexToast({msg:'Erro ao importar: ' + err.message, type:'error', duration:5000});
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
// "Nuclear" — não pede confirm, executa direto. UI usa hold-confirm.
function resetAllData(){
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_KEY_LEGACY);
  localStorage.removeItem('cortex_pomo');
  location.reload();
}

/**
 * Zera toda a interface (dados de transações, notas, projetos, hábitos, etc.)
 * mas MANTÉM preferências (tema, densidade, cor de acento, ordem da sidebar)
 * e informações pessoais (nome, documentos, contatos de emergência).
 */
function resetInterfaceFresh(){
  // Snapshot completo pra Undo via toast (20s)
  const snapshot = JSON.parse(localStorage.getItem(LS_KEY) || '{}');

  // Preserva preferências
  const keepSettings = state.settings;
  const keepInfo = state.info;

  // Limpa dados
  state.transactions = [];
  state.notes = [];
  state.mindset = [];
  state.mantras = [];
  state.events = [];
  state.projects = [];
  state.triggers = [];
  state.drafts = [];
  state.habitsList = [];
  state.shopping = [];
  state.workouts = [];
  state.habits = [];
  state.cortex = { messages: [] };
  state.trackers = {
    todos:[], diet:[], books:[], goals:[], dreams:[], movies:[],
    pHabits:[], routines:[], challenges:[], skills:[], bucket:[],
    analysis: { fears:[], weaknesses:[], strengths:[] }
  };
  // Reseta colunas dos Kanbans para estado inicial vazio
  state.kanbans = {
    pessoal:      { columns: defaultKanban('pessoal') },
    profissional: { columns: defaultKanban('profissional') }
  };

  // Restaura preferências e info
  state.settings = keepSettings;
  state.info = keepInfo;

  // Limpa stats do Pomodoro
  const pomoSnap = localStorage.getItem('cortex_pomo');
  localStorage.removeItem('cortex_pomo');

  save();
  applySettings(); renderAll(); renderSettings();
  cortexToast({
    msg:'✓ Interface zerada · você pode desfazer',
    type:'warn',
    duration: 20000,
    undo:()=>{
      state = snapshot;
      if(pomoSnap) localStorage.setItem('cortex_pomo', pomoSnap);
      save(); load();
      applySettings(); renderAll(); renderSettings();
      if(typeof pomoLoad === 'function') pomoLoad();
      cortexToast({msg:'Tudo restaurado',type:'info'});
    }
  });
}

