/* =========================================================
   MINI CLOCK · data e hora minimalista
   ========================================================= */
let clockInterval = null;

function tickClock(){
  const t = document.getElementById('mcTime');
  const d = document.getElementById('mcDate');
  if(!t || !d) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  t.textContent = `${hh}:${mm}`;
  const wd = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][now.getDay()];
  const day = String(now.getDate()).padStart(2,'0');
  const mon = String(now.getMonth()+1).padStart(2,'0');
  d.textContent = `${wd}, ${day}/${mon}`;
}

function applyClockVisibility(){
  const el = document.getElementById('miniClock');
  if(!el) return;
  const on = state.settings?.showClock !== false;
  el.style.display = on ? '' : 'none';
  if(on){
    tickClock();
    if(!clockInterval) clockInterval = setInterval(tickClock, 30000);
  } else if(clockInterval){
    clearInterval(clockInterval);
    clockInterval = null;
  }
}
