/* =========================================================
   WORKOUTS
   ========================================================= */
function addExerciseRow(ex={name:'',sets:'',reps:'',weight:''}){
  const list = document.getElementById('exerciseList');
  const row = document.createElement('div');
  row.className = 'exercise-row';
  row.innerHTML = `
    <input type="text" placeholder="Ex: Supino" value="${escapeAttr(ex.name)}" data-f="name" />
    <input type="number" min="0" placeholder="3" value="${ex.sets}" data-f="sets" />
    <input type="number" min="0" placeholder="10" value="${ex.reps}" data-f="reps" />
    <div style="display:flex;gap:6px;align-items:center">
      <input type="number" min="0" step="0.5" placeholder="20" value="${ex.weight}" data-f="weight" style="width:100%" />
      <button type="button" class="btn-icon" onclick="this.closest('.exercise-row').remove()" style="color:#ff7a9a">✕</button>
    </div>
  `;
  list.appendChild(row);
}
function openWorkoutModal(id=null){
  document.getElementById('workoutForm').reset();
  document.getElementById('wkId').value = '';
  document.getElementById('wkDate').value = todayStr();
  document.querySelectorAll('#exerciseList .exercise-row:not(.head)').forEach(r=>r.remove());
  document.getElementById('workoutModalTitle').textContent = 'Novo Treino';
  if(id){
    const w = state.workouts.find(x=>x.id===id);
    if(w){
      document.getElementById('wkId').value = w.id;
      document.getElementById('wkName').value = w.name;
      document.getElementById('wkDate').value = w.date;
      document.getElementById('wkType').value = w.type;
      document.getElementById('wkDuration').value = w.duration;
      document.getElementById('wkMood').value = w.mood;
      (w.exercises||[]).forEach(addExerciseRow);
      document.getElementById('workoutModalTitle').textContent = 'Editar Treino';
    }
  }
  if(!document.querySelectorAll('#exerciseList .exercise-row:not(.head)').length){
    addExerciseRow();
  }
  openModal('workoutModal');
}
function saveWorkout(e){
  e.preventDefault();
  const id = document.getElementById('wkId').value;
  const rows = document.querySelectorAll('#exerciseList .exercise-row:not(.head)');
  const exercises = [];
  rows.forEach(r=>{
    const obj = {};
    r.querySelectorAll('input').forEach(i=>{ obj[i.dataset.f] = i.dataset.f==='name'?i.value:Number(i.value)||0; });
    if(obj.name) exercises.push(obj);
  });
  const data = {
    name: document.getElementById('wkName').value.trim(),
    date: document.getElementById('wkDate').value,
    type: document.getElementById('wkType').value,
    duration: Number(document.getElementById('wkDuration').value),
    mood: document.getElementById('wkMood').value,
    exercises
  };
  if(id){
    const w = state.workouts.find(x=>x.id===id); Object.assign(w,data);
  }else{
    state.workouts.unshift({id:uid(),...data});
  }
  save(); closeModal('workoutModal'); renderWorkouts();
}
function deleteWorkout(id){
  instantDelete({
    from: state.workouts,
    predicate: w => w.id === id,
    label: 'Treino excluído',
    rerender: renderWorkouts
  });
}
function toggleWorkout(id){
  const el = document.querySelector(`[data-wk="${id}"]`);
  if(el) el.classList.toggle('expanded');
}
function renderWorkouts(){
  const list = document.getElementById('workoutList');
  if(!list) return;
  const sorted = [...state.workouts].sort((a,b)=>b.date.localeCompare(a.date));
  if(!sorted.length){
    list.innerHTML = `<div class="empty" style="background:var(--surface);border:1px dashed var(--border);border-radius:14px">Nenhum treino registrado.</div>`;
    return;
  }
  list.innerHTML = sorted.map(w=>`
    <div class="workout-card" data-wk="${w.id}">
      <div class="workout-head" onclick="toggleWorkout('${w.id}')">
        <div class="workout-info">
          <h4 class="workout-title">${escapeHtml(w.name)}</h4>
          <div class="workout-meta">
            <span>📅 ${formatDate(w.date)}</span>
            <span>🏷️ ${escapeHtml(w.type)}</span>
            <span>⏱️ ${w.duration} min</span>
            <span>🏋️ ${(w.exercises||[]).length} exercícios</span>
          </div>
        </div>
        <div class="workout-actions" onclick="event.stopPropagation()">
          <span class="mood-badge mood-${w.mood}">${moodLabel(w.mood)}</span>
          <button class="btn-icon" onclick="openWorkoutModal('${w.id}')" title="Editar">✏️</button>
          <button class="btn-icon" onclick="deleteWorkout('${w.id}')" title="Excluir" style="color:#ff7a9a">🗑️</button>
        </div>
      </div>
      <div class="workout-body">
        ${(w.exercises||[]).length ? `
          <div class="exercise-list">
            <div class="exercise-row head"><span>Nome</span><span>Séries</span><span>Reps</span><span>Peso(kg)</span></div>
            ${w.exercises.map(ex=>`
              <div class="exercise-row">
                <span class="exercise-name">${escapeHtml(ex.name)}</span>
                <span>${ex.sets}</span>
                <span>${ex.reps}</span>
                <span>${ex.weight} kg</span>
              </div>
            `).join('')}
          </div>
        ` : '<div style="color:var(--text-mute);font-size:13px;text-align:center;padding:12px">Nenhum exercício registrado.</div>'}
      </div>
    </div>
  `).join('');
}
function moodLabel(m){
  return ({otimo:'😄 Ótimo',bom:'🙂 Bom',ok:'😐 Ok',cansado:'😓 Cansado',ruim:'😞 Ruim'})[m] || m;
}

