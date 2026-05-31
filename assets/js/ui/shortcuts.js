/* =========================================================
   SHORTCUTS · atalhos de teclado globais + customização
   ========================================================= */

const SHORTCUT_ACTIONS = {
  'goto:habits':    { label:'Abrir Hábitos',        run:()=>navigateToPage('habits') },
  'goto:trackers':  { label:'Abrir Trackers',       run:()=>navigateToPage('trackers') },
  'goto:calendar':  { label:'Abrir Agenda',         run:()=>navigateToPage('calendar') },
  'goto:dashboard': { label:'Abrir Dashboard',      run:()=>navigateToPage('dashboard') },
  'goto:cortex':    { label:'Abrir CORTEX',         run:()=>navigateToPage('cortex') },
  'goto:notes':     { label:'Abrir Notas',          run:()=>navigateToPage('notes') },
  'goto:kanban':    { label:'Abrir Kanban',         run:()=>navigateToPage('kanban') },
  'goto:projects':  { label:'Abrir Projetos',       run:()=>navigateToPage('projects') },
  'goto:tasks':     { label:'Abrir Tarefas',        run:()=>navigateToPage('tasks') },
  'open:settings':  { label:'Abrir Configurações',  run:()=>openSettings() },
  'toggle:sidebar': { label:'Recolher/expandir sidebar', run:()=>toggleSidebarCollapsed() },
  'close:modal':    { label:'Fechar modal aberto',  run:()=>closeAllModals() },
  'show:help':      { label:'Mostrar atalhos (esta tela)', run:()=>openShortcutsHelp() },
  'nav:down':       { label:'Próximo item (lista/sidebar)', run:()=>navListMove(1) },
  'nav:up':         { label:'Item anterior (lista/sidebar)', run:()=>navListMove(-1) },
  'focus:input':    { label:'Foco no input do CORTEX', run:()=>focusCortexInput() },
};

// Defaults pedidos no backlog. Ctrl+T no Chrome NÃO é interceptável → também
// mapeamos Alt+T como alternativa garantida.
const DEFAULT_SHORTCUTS = {
  'goto:habits':    ['Ctrl+H', 'Alt+H'],
  'goto:trackers':  ['Ctrl+T', 'Alt+T'],
  'goto:calendar':  ['Ctrl+A', 'Alt+A'],
  'goto:dashboard': ['Ctrl+D', 'Alt+D'],
  'open:settings':  ['Ctrl+,', 'Alt+S'],   // Ctrl+S é "salvar" no navegador
  'goto:cortex':    ['Alt+C'],
  'goto:notes':     ['Alt+N'],
  'goto:kanban':    ['Alt+K'],
  'goto:projects':  ['Alt+P'],
  'toggle:sidebar': ['Ctrl+\\', 'Alt+B'],
  'close:modal':    ['Escape'],
  'show:help':      ['?', 'Shift+?'],
  'nav:down':       ['J'],
  'nav:up':         ['K'],
  'focus:input':    ['/'],
};

/* ===== Implementações dos novos atalhos ===== */
function navListMove(dir){
  // Navega entre nav-items da sidebar
  const items = Array.from(document.querySelectorAll('.nav-item'));
  if(!items.length) return;
  const active = document.querySelector('.nav-item.active');
  let idx = active ? items.indexOf(active) : 0;
  idx = (idx + dir + items.length) % items.length;
  items[idx].click();
}
function focusCortexInput(){
  navigateToPage('cortex');
  setTimeout(()=>{
    const inp = document.getElementById('cortexInput');
    if(inp){ inp.focus(); inp.select?.(); }
  }, 80);
}
function openShortcutsHelp(){
  let modal = document.getElementById('shortcutsHelpModal');
  if(!modal){
    modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.id = 'shortcutsHelpModal';
    modal.onclick = (e) => { if(e.target === modal) closeModal('shortcutsHelpModal'); };
    document.body.appendChild(modal);
  }
  const cfg = getShortcutsConfig();
  modal.innerHTML = `
    <div class="modal" style="max-width:560px">
      <h3 class="modal-title">⌨️ Atalhos de teclado</h3>
      <p class="modal-sub">Pressione <kbd class="kbd">?</kbd> a qualquer momento pra abrir essa lista</p>
      <div class="shortcuts-help-list">
        ${Object.entries(SHORTCUT_ACTIONS).map(([action, def]) => {
          const combos = cfg[action] || [];
          return `
            <div class="shortcuts-help-row">
              <span class="shr-label">${escapeHtml(def.label)}</span>
              <div class="shr-keys">
                ${combos.length
                  ? combos.map(c => `<kbd class="kbd">${escapeHtml(c)}</kbd>`).join(' <span style="opacity:0.45;font-size:10px">ou</span> ')
                  : '<span style="color:var(--text-mute);font-size:11px;font-style:italic">—</span>'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="openSettings();closeModal('shortcutsHelpModal')">Personalizar</button>
        <button class="btn btn-primary" onclick="closeModal('shortcutsHelpModal')">Fechar</button>
      </div>
    </div>
  `;
  openModal('shortcutsHelpModal');
}

function getShortcutsConfig(){
  const overrides = state.settings?.shortcuts || {};
  const out = {};
  Object.keys(DEFAULT_SHORTCUTS).forEach(k => {
    out[k] = overrides[k] !== undefined ? overrides[k] : DEFAULT_SHORTCUTS[k];
  });
  return out;
}

function setShortcutBinding(action, combos){
  state.settings.shortcuts ||= {};
  state.settings.shortcuts[action] = Array.isArray(combos) ? combos : [combos];
  save();
}

function resetShortcuts(){
  state.settings.shortcuts = null;
  save();
  if(typeof renderSettings === 'function') renderSettings();
  cortexToast({ msg:'Atalhos restaurados', type:'info' });
}

// Normaliza um KeyboardEvent num combo "Ctrl+Shift+K" ou "Escape"
function eventToCombo(e){
  if(['Control','Shift','Alt','Meta'].includes(e.key)) return null;
  const parts = [];
  if(e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if(e.altKey) parts.push('Alt');
  if(e.shiftKey) parts.push('Shift');
  let k = e.key;
  if(k === ' ') k = 'Space';
  if(k.length === 1) k = k.toUpperCase();
  parts.push(k);
  return parts.join('+');
}

function isTypingTarget(t){
  if(!t) return false;
  if(t.isContentEditable) return true;
  const tag = t.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return false;
}

function dispatchShortcut(e){
  const combo = eventToCombo(e);
  if(!combo) return;
  const typing = isTypingTarget(e.target);
  const cfg = getShortcutsConfig();
  for(const action of Object.keys(cfg)){
    const combos = cfg[action] || [];
    if(combos.includes(combo)){
      // Esc fecha modal mesmo digitando
      if(action !== 'close:modal' && typing) continue;
      const def = SHORTCUT_ACTIONS[action];
      if(!def) continue;
      e.preventDefault();
      e.stopPropagation();
      try { def.run(); } catch(err){ console.warn('shortcut failed', action, err); }
      return;
    }
  }
}

function bindShortcuts(){
  document.addEventListener('keydown', dispatchShortcut, true);
}

/* =========================================================
   Customização inline (capture)
   ========================================================= */
let _capturingShortcut = null;
function startShortcutCapture(action, btnId){
  _capturingShortcut = action;
  const btn = document.getElementById(btnId);
  if(btn){
    btn.dataset.prev = btn.textContent;
    btn.textContent = 'Pressione...';
    btn.classList.add('capturing');
  }
  const onKey = (e) => {
    const combo = eventToCombo(e);
    if(!combo) return;
    e.preventDefault(); e.stopPropagation();
    if(combo === 'Escape'){
      stopCapture(action, btnId, null);
    } else {
      stopCapture(action, btnId, combo);
    }
    document.removeEventListener('keydown', onKey, true);
  };
  document.addEventListener('keydown', onKey, true);
}
function stopCapture(action, btnId, combo){
  const btn = document.getElementById(btnId);
  if(btn) btn.classList.remove('capturing');
  if(combo){
    setShortcutBinding(action, [combo]);
  }
  if(typeof renderSettings === 'function') renderSettings();
}
function clearShortcut(action){
  setShortcutBinding(action, []);
  if(typeof renderSettings === 'function') renderSettings();
}
