/* =========================================================
   POMODORO · timer com ciclos e estatísticas diárias
   ========================================================= */
const POMO_LS_KEY = 'cortex_pomo';
let pomo = {
  mode: 'idle',         // 'idle' | 'work' | 'shortBreak' | 'longBreak'
  remaining: 25*60,
  duration: 25*60,
  running: false,
  sessionsInCycle: 0,
  totalToday: 0,
  lastDate: '',
  interval: null,
};
const _origTitle = 'CORTEX — Premium Dashboard';

function pomoConfig(){
  return state.settings?.pomodoro || {work:25,shortBreak:5,longBreak:15,longBreakAfter:4};
}
function pomoLoad(){
  try {
    const raw = localStorage.getItem(POMO_LS_KEY);
    if(raw){
      const d = JSON.parse(raw);
      pomo.totalToday = d.totalToday || 0;
      pomo.sessionsInCycle = d.sessionsInCycle || 0;
      pomo.lastDate = d.lastDate || '';
    }
  } catch(_){}
  if(pomo.lastDate !== todayStr()){
    pomo.totalToday = 0;
    pomo.sessionsInCycle = 0;
    pomo.lastDate = todayStr();
    pomoSave();
  }
  pomo.duration = pomoConfig().work * 60;
  pomo.remaining = pomo.duration;
  updatePomoDisplay();
}
function pomoSave(){
  try {
    localStorage.setItem(POMO_LS_KEY, JSON.stringify({
      totalToday: pomo.totalToday,
      sessionsInCycle: pomo.sessionsInCycle,
      lastDate: pomo.lastDate || todayStr()
    }));
  } catch(_){}
}
function togglePomodoro(){
  pomo.running ? pausePomodoro() : startPomodoro();
}
function startPomodoro(){
  if(pomo.mode === 'idle'){
    pomo.mode = 'work';
    pomo.duration = pomoConfig().work * 60;
    pomo.remaining = pomo.duration;
  }
  pomo.running = true;
  if(pomo.interval) clearInterval(pomo.interval);
  pomo.interval = setInterval(pomoTick, 1000);
  updatePomoDisplay();
}
function pausePomodoro(){
  pomo.running = false;
  if(pomo.interval){ clearInterval(pomo.interval); pomo.interval = null; }
  updatePomoDisplay();
}
function resetPomodoro(){
  const wasRunning = pomo.running;
  pausePomodoro();
  if(wasRunning) cortexToast({msg:'Ciclo reiniciado',type:'warn'});
  pomo.mode = 'idle';
  pomo.duration = pomoConfig().work * 60;
  pomo.remaining = pomo.duration;
  updatePomoDisplay();
}
function skipPomodoro(){
  pausePomodoro();
  pomoNext(false);
}
function pomoTick(){
  pomo.remaining--;
  if(pomo.remaining <= 0){ pomoComplete(); }
  else updatePomoDisplay();
}
function pomoComplete(){
  pausePomodoro();
  pomoBeep();
  if(pomo.mode === 'work'){
    pomo.sessionsInCycle++;
    pomo.totalToday++;
    pomo.lastDate = todayStr();
    pomoSave();
    flashStatus('🍅 Sessão concluída! Hora da pausa.');
  } else {
    flashStatus('☕ Pausa terminou! De volta ao foco.');
  }
  pomoNext(true);
}
function pomoNext(announce){
  const cfg = pomoConfig();
  if(pomo.mode === 'work'){
    if(pomo.sessionsInCycle > 0 && pomo.sessionsInCycle % cfg.longBreakAfter === 0){
      pomo.mode = 'longBreak';
      pomo.duration = cfg.longBreak * 60;
    } else {
      pomo.mode = 'shortBreak';
      pomo.duration = cfg.shortBreak * 60;
    }
  } else {
    pomo.mode = 'work';
    pomo.duration = cfg.work * 60;
  }
  pomo.remaining = pomo.duration;
  updatePomoDisplay();
}
function updatePomoDisplay(){
  const min = Math.floor(pomo.remaining / 60);
  const sec = pomo.remaining % 60;
  const timeStr = String(min).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  const timeEl = document.getElementById('pomoTime');
  if(!timeEl) return;
  timeEl.textContent = timeStr;

  const iconEl = document.getElementById('pomoIcon');
  const modeEl = document.getElementById('pomoMode');
  const btnEl  = document.getElementById('pomoBtn');
  const barEl  = document.getElementById('pomoBar');
  const widget = document.getElementById('pomodoroWidget');

  let icon, modeLabel, color;
  switch(pomo.mode){
    case 'work':       icon='🍅'; modeLabel='Foco';        color='var(--neon)';   break;
    case 'shortBreak': icon='☕'; modeLabel='Pausa curta'; color='var(--good)';   break;
    case 'longBreak':  icon='🌴'; modeLabel='Pausa longa'; color='var(--neon-4)'; break;
    default:           icon='🍅'; modeLabel='Pomodoro';    color='var(--neon)';
  }
  iconEl.textContent = icon;
  modeEl.textContent = modeLabel;
  barEl.style.stroke = color;

  if(btnEl){
    btnEl.textContent = pomo.running ? '⏸' : '▶';
    btnEl.classList.toggle('primary', !pomo.running);
  }
  if(widget) widget.classList.toggle('running', pomo.running);

  const circumference = 2 * Math.PI * 46;
  const progress = pomo.duration > 0 ? (pomo.duration - pomo.remaining) / pomo.duration : 0;
  barEl.style.strokeDasharray = circumference.toFixed(2);
  barEl.style.strokeDashoffset = (circumference * (1 - progress)).toFixed(2);

  const sessEl  = document.getElementById('pomoSessions');
  const todayEl = document.getElementById('pomoTodayCount');
  if(sessEl)  sessEl.textContent  = pomo.sessionsInCycle;
  if(todayEl) todayEl.textContent = pomo.totalToday;

  if(pomo.running) document.title = `${timeStr} ${icon} CORTEX`;
  else document.title = _origTitle;
}
function pomoBeep(){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 220, 440].forEach(delay => {
      setTimeout(() => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.25, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        o.start();
        o.stop(ctx.currentTime + 0.4);
      }, delay);
    });
  } catch(_){}
}
function setPomoSetting(key, val){
  const v = Math.max(1, Math.min(120, Number(val)||1));
  state.settings.pomodoro[key] = v;
  save();
  if(pomo.mode === 'idle' || !pomo.running){
    if(pomo.mode === 'idle' || pomo.mode === 'work') pomo.duration = pomoConfig().work * 60;
    else if(pomo.mode === 'shortBreak')              pomo.duration = pomoConfig().shortBreak * 60;
    else if(pomo.mode === 'longBreak')               pomo.duration = pomoConfig().longBreak * 60;
    pomo.remaining = pomo.duration;
    updatePomoDisplay();
  }
}

