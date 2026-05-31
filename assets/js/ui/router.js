/* =========================================================
   ROUTING
   ========================================================= */
// Event delegation: sobrevive a reconstruções dinâmicas da nav
document.querySelector('.nav').addEventListener('click', e => {
  const btn = e.target.closest('.nav-item');
  if(!btn) return;
  navigateToPage(btn.dataset.page);
});

function navigateToPage(p){
  if(!p) return;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === p));
  document.querySelectorAll('.page').forEach(s => s.classList.toggle('active', s.dataset.page === p));
  renderAll();
  // Mobile: fecha sheet automaticamente após navegar
  if(window.innerWidth <= 600){
    const sb = document.getElementById('sidebar');
    sb?.classList.remove('mobile-open');
  }
}

/* Mobile sidebar overlay toggle */
function toggleMobileSidebar(){
  document.getElementById('sidebar')?.classList.toggle('mobile-open');
}
// Click fora da sidebar em mobile → fecha
document.addEventListener('click', (e) => {
  if(window.innerWidth > 600) return;
  const sb = document.getElementById('sidebar');
  if(!sb || !sb.classList.contains('mobile-open')) return;
  if(e.target.closest('.sidebar') || e.target.closest('.mobile-menu-btn')) return;
  sb.classList.remove('mobile-open');
});

function closeModal(id){ document.getElementById(id).classList.remove('show'); }
function openModal(id){ document.getElementById(id).classList.add('show'); }
function closeAllModals(){
  let closed = false;
  document.querySelectorAll('.modal-backdrop.show').forEach(m=>{ m.classList.remove('show'); closed = true; });
  return closed;
}
document.querySelectorAll('.modal-backdrop').forEach(m=>{
  m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('show'); });
});

