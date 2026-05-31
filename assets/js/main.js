/* =========================================================
   MAIN · orquestra render + boot da aplicação
   ========================================================= */

function renderAll(){
  renderCortex();
  renderInfo();
  renderDashboard();
  renderTransactions();
  renderCalendar();
  renderTasks();
  renderTriggers();
  renderHabitsPage();
  renderNotes('notes');
  renderNotes('mindset');
  renderNotes('mantras');
  renderWorkouts();
  renderHabits();
  renderTrackersPage();
  renderProjects();
  renderKanbans();
  renderDrafts();
  renderVault();
  renderBills();
  if(typeof renderDynCards === 'function') renderDynCards();
}

/* boot */
async function _bootCortex(){
  load();
  // Se localStorage está criptografado → bloqueia boot até unlock
  if(state._encryptedRaw){
    const ok = await _promptUnlock(state._encryptedRaw);
    if(!ok){
      // Falhou unlock — para boot, mostra apenas mensagem
      document.body.innerHTML = '<div style="padding:40px;font-family:Inter,sans-serif;color:#ff7a9a;text-align:center"><h2>🔒 Acesso bloqueado</h2><p>Recarregue a página pra tentar de novo.</p></div>';
      return;
    }
  }
  applySettings();
  if(typeof startThemeAutoTimer === 'function') startThemeAutoTimer();
  document.querySelectorAll('.page').forEach(s=>s.classList.toggle('active', s.dataset.page==='cortex'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.page==='cortex'));
  renderAll();
  applyDashboardView();
  if(typeof applyDashboardLayout === 'function') applyDashboardLayout();
  applyClockVisibility();
  pomoLoad();
  initFileSync();
  initCortexHero();
  applyCortexSphere();
  if(typeof initCortexTTS === 'function') initCortexTTS();
  bindShortcuts();
  setInterval(updateCortexGreeting, 60000);
}

async function _promptUnlock(encryptedRaw){
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:linear-gradient(180deg,#07030f 0%,#0a0518 100%);display:grid;place-items:center;font-family:Inter,sans-serif;color:#efe8ff';
    overlay.innerHTML = `
      <div style="max-width:380px;width:90vw;padding:32px;background:rgba(22,9,47,0.85);border:1px solid rgba(176,97,255,0.35);border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,0.5),0 0 40px rgba(176,97,255,0.25);backdrop-filter:blur(20px)">
        <div style="font-size:32px;text-align:center;margin-bottom:10px">🔒</div>
        <h2 style="margin:0 0 6px;font-size:18px;font-weight:800;text-align:center;background:linear-gradient(90deg,#fff,#e26bff);-webkit-background-clip:text;background-clip:text;color:transparent">CORTEX bloqueado</h2>
        <p style="margin:0 0 18px;font-size:12px;color:#b8a8d8;text-align:center;line-height:1.5">Seus dados estão criptografados. Digite a senha pra desbloquear.</p>
        <input type="password" id="unlockInp" placeholder="Senha"
               style="width:100%;padding:12px 14px;background:rgba(7,3,15,0.6);border:1px solid rgba(176,97,255,0.3);border-radius:9px;color:#fff;font-size:14px;font-family:inherit;outline:none;margin-bottom:10px" autofocus />
        <div id="unlockErr" style="font-size:11.5px;color:#ff7a9a;min-height:16px;margin-bottom:10px;text-align:center"></div>
        <button id="unlockBtn" style="width:100%;padding:11px;background:linear-gradient(135deg,#b061ff,#7a2bff);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;letter-spacing:0.04em;cursor:pointer;text-transform:uppercase">Desbloquear</button>
      </div>`;
    document.body.appendChild(overlay);
    const inp = document.getElementById('unlockInp');
    const btn = document.getElementById('unlockBtn');
    const err = document.getElementById('unlockErr');
    const attempt = async () => {
      err.textContent = '';
      btn.disabled = true; btn.textContent = 'Verificando…';
      const decryptedJson = await unlockCrypto(inp.value, encryptedRaw);
      if(decryptedJson){
        try {
          state = JSON.parse(decryptedJson);
          delete state._encryptedRaw;
          overlay.remove();
          resolve(true);
          return;
        } catch(e){ /* shouldn't happen */ }
      }
      err.textContent = '✕ Senha incorreta';
      btn.disabled = false; btn.textContent = 'Desbloquear';
      inp.select();
    };
    btn.onclick = attempt;
    inp.onkeydown = (e) => { if(e.key === 'Enter') attempt(); };
  });
}

_bootCortex();

// Code antigo (removido): load() + applySettings() etc — agora dentro de _bootCortex
function _legacyBootIgnore(){
applySettings();
if(typeof startThemeAutoTimer === 'function') startThemeAutoTimer();
// garante CORTEX como página ativa no carregamento
document.querySelectorAll('.page').forEach(s=>s.classList.toggle('active', s.dataset.page==='cortex'));
document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.page==='cortex'));
renderAll();
applyDashboardView();
if(typeof applyDashboardLayout === 'function') applyDashboardLayout();
applyClockVisibility();
pomoLoad();
initFileSync();
initCortexHero();
applyCortexSphere();
if(typeof initCortexTTS === 'function') initCortexTTS();
bindShortcuts();
// re-saudação a cada minuto caso a hora mude (manhã→tarde)
setInterval(updateCortexGreeting, 60000);
} // _legacyBootIgnore
window.addEventListener('beforeunload', ()=>{
  if(fileHandle && state.settings?.fileSync){
    try { writeToFile(); } catch(_){}
  }
});

/* Logout · soft session reset:
   - grava arquivo se conectado
   - desconecta file handle
   - recarrega página (estado local preservado em localStorage) */
function logoutCortex(){
  if(!confirm('Sair da sessão?\n\nSeus dados ficam salvos no navegador. Se você usa sincronização com arquivo, ele será desconectado.')) return;
  try {
    if(fileHandle && state.settings?.fileSync){ writeToFile(); }
  } catch(_){}
  try {
    if(typeof disconnectFile === 'function' && fileHandle){
      // disconnectFile é async; ignora promessa, reload já vai limpar contexto
      disconnectFile();
    }
  } catch(_){}
  // pequena espera pro write antes do reload
  setTimeout(()=>location.reload(), 250);
}
