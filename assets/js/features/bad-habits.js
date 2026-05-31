/* =========================================================
   HABITS
   ========================================================= */
let habitInterval = null;
function openHabitModal(id=null){
  document.getElementById('habitForm').reset();
  document.getElementById('hbId').value = '';
  document.getElementById('hbEmoji').value = '🚫';
  renderEmojiPicker('🚫');
  document.getElementById('habitModalTitle').textContent = 'Novo Hábito';
  if(id){
    const h = state.habits.find(x=>x.id===id);
    if(h){
      document.getElementById('hbId').value = h.id;
      document.getElementById('hbName').value = h.name;
      document.getElementById('hbEmoji').value = h.emoji;
      renderEmojiPicker(h.emoji);
      document.getElementById('habitModalTitle').textContent = 'Editar Hábito';
    }
  }
  openModal('habitModal');
}
function renderEmojiPicker(selected){
  const p = document.getElementById('emojiPicker');
  p.innerHTML = HABIT_EMOJIS.map(e=>`
    <div class="emoji-opt ${e===selected?'selected':''}" onclick="pickEmoji('${e}')">${e}</div>
  `).join('');
}
function pickEmoji(e){
  document.getElementById('hbEmoji').value = e;
  renderEmojiPicker(e);
}
function saveHabit(e){
  e.preventDefault();
  const id = document.getElementById('hbId').value;
  const data = {
    name: document.getElementById('hbName').value.trim(),
    emoji: document.getElementById('hbEmoji').value
  };
  if(id){
    const h = state.habits.find(x=>x.id===id); Object.assign(h,data);
  }else{
    state.habits.unshift({id:uid(),...data,since:Date.now()});
  }
  save(); closeModal('habitModal'); renderHabits();
}
function deleteHabit(id){
  instantDelete({
    from: state.habits,
    predicate: h => h.id === id,
    label: 'Hábito excluído',
    rerender: renderHabits
  });
}
function relapse(id){
  const h = state.habits.find(x=>x.id===id);
  if(!h) return;
  const prev = h.since;
  h.since = Date.now(); save(); renderHabits();
  cortexToast({
    msg:'Contador reiniciado',
    type:'warn',
    undo:()=>{ h.since = prev; save(); renderHabits(); cortexToast({msg:'Contador restaurado',type:'info'}); }
  });
}
function badgeFor(ms){
  const days = ms / 86400000;
  if(days < 1) return {cls:'badge-red',label:'Recente'};
  if(days < 7) return {cls:'badge-yellow',label:'Construindo'};
  if(days < 30) return {cls:'badge-blue',label:'Firme'};
  return {cls:'badge-green',label:'Sólido'};
}
function renderHabits(){
  const grid = document.getElementById('habitsGrid');
  if(!grid) return;
  if(!state.habits.length){
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1;background:var(--surface);border:1px dashed var(--border);border-radius:14px">Nenhum hábito rastreado. Adicione o primeiro.</div>`;
    if(habitInterval){ clearInterval(habitInterval); habitInterval=null; }
    return;
  }
  grid.innerHTML = state.habits.map(h=>`
    <div class="habit-card" data-habit="${h.id}">
      <div class="habit-actions-top">
        <button class="btn-icon" onclick="openHabitModal('${h.id}')" title="Editar">✏️</button>
        <button class="btn-icon" onclick="deleteHabit('${h.id}')" title="Excluir" style="color:#ff7a9a">🗑️</button>
      </div>
      <div class="habit-emoji">${h.emoji||'🚫'}</div>
      <h4 class="habit-name">${escapeHtml(h.name)}</h4>
      <div class="habit-badge" data-badge></div>
      <div class="habit-timer" data-timer>
        <div class="timer-unit"><div class="timer-num" data-d>0</div><div class="timer-lbl">dias</div></div>
        <div class="timer-unit"><div class="timer-num" data-h>0</div><div class="timer-lbl">horas</div></div>
        <div class="timer-unit"><div class="timer-num" data-m>0</div><div class="timer-lbl">min</div></div>
      </div>
      <button class="habit-relapse" onclick="relapse('${h.id}')">⚠️ Recaí agora</button>
    </div>
  `).join('');
  tickHabits();
  if(habitInterval) clearInterval(habitInterval);
  habitInterval = setInterval(tickHabits, 30000);
}
function tickHabits(){
  state.habits.forEach(h=>{
    const card = document.querySelector(`[data-habit="${h.id}"]`);
    if(!card) return;
    const diff = Date.now() - h.since;
    const d = Math.floor(diff/86400000);
    const hr = Math.floor((diff%86400000)/3600000);
    const mi = Math.floor((diff%3600000)/60000);
    card.querySelector('[data-d]').textContent = d;
    card.querySelector('[data-h]').textContent = hr;
    card.querySelector('[data-m]').textContent = mi;
    const b = badgeFor(diff);
    const badge = card.querySelector('[data-badge]');
    badge.className = 'habit-badge ' + b.cls;
    badge.textContent = b.label;
  });
}

