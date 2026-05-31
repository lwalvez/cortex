/* =========================================================
   TRACKERS · 12 sub-trackers com insights
   ========================================================= */
const TRACKERS = [
  {id:'workouts',   label:'Treinos',       icon:'🏋️'},
  {id:'diet',       label:'Dieta',         icon:'🥗'},
  {id:'books',      label:'Livros',        icon:'📚'},
  {id:'goals',      label:'Metas',         icon:'🎯'},
  {id:'dreams',     label:'Sonhos',        icon:'💭'},
  {id:'movies',     label:'Filmes',        icon:'🎬'},
  {id:'routines',   label:'Rotinas',       icon:'🔄'},
  {id:'challenges', label:'Desafios',      icon:'🏆'},
  {id:'skills',     label:'Skills',        icon:'🧩'},
  {id:'badHabits',  label:'Hábitos Ruins', icon:'🚫'},
  {id:'analysis',   label:'Análise',       icon:'🔍'},
  {id:'bucket',     label:'Antes de Morrer',icon:'⭐'},
];
let currentTracker = 'workouts';

function renderTrackersPage(){
  renderTrackerPills();
  renderCurrentTracker();
}
function renderTrackerPills(){
  const el = document.getElementById('trackerPills');
  if(!el) return;
  el.innerHTML = TRACKERS.map(t=>`
    <button class="tracker-pill ${t.id===currentTracker?'active':''}" onclick="setTracker('${t.id}')">
      <span>${t.icon}</span><span>${t.label}</span>
    </button>
  `).join('');
}
function setTracker(id){
  currentTracker = id;
  renderTrackerPills();
  renderCurrentTracker();
}
function renderCurrentTracker(){
  const el = document.getElementById('trackerContent');
  if(!el) return;
  const map = {
    workouts:renderWorkoutsTracker, diet:renderDiet, books:renderBooks, goals:renderGoals,
    dreams:renderDreams, movies:renderMovies, routines:renderRoutines,
    challenges:renderChallenges, skills:renderSkills, badHabits:renderBadHabitsTracker,
    analysis:renderAnalysis, bucket:renderBucket
  };
  const fn = map[currentTracker];
  el.innerHTML = fn ? fn() : '';
  // re-popula conteúdo dinâmico de Hábitos Ruins / Skills (radar chart)
  if(currentTracker==='badHabits') setTimeout(renderHabits, 0);
  if(currentTracker==='skills')    setTimeout(initSkillsRadarChart, 0);
}
function statCard(label, value, meta='', color=''){
  return `<div class="stat-card ${color?'accent':''}" ${color?`style="color:${color}"`:''}>
    <div class="stat-label">${label}</div>
    <div class="stat-value" style="color:var(--text)">${value}</div>
    ${meta?`<div class="stat-meta">${meta}</div>`:''}
  </div>`;
}
function emptyTracker(msg){ return `<div class="empty-tracker">${msg}</div>`; }

/* ----- TAREFAS ----- */
function renderTodos(){
  const list = state.trackers.todos;
  const today = todayStr();
  const total = list.length;
  const done = list.filter(t=>t.done).length;
  const pending = total - done;
  const doneToday = list.filter(t=>t.done && (t.completedAt||'').slice(0,10)===today).length;
  const overdue = list.filter(t=>!t.done && t.dueDate && t.dueDate < today).length;
  const rate = total ? Math.round(done/total*100) : 0;
  const sorted = [...list].sort((a,b)=>(a.done-b.done) || (a.dueDate||'9').localeCompare(b.dueDate||'9'));
  return `
    <div class="stat-row">
      ${statCard('Pendentes', pending, total+' total', '#39d4ff')}
      ${statCard('Concluídas Hoje', doneToday, '', '#5cffb1')}
      ${statCard('Atrasadas', overdue, 'Vencidas não feitas', '#ff7a9a')}
      ${statCard('Taxa de Conclusão', rate+'%', done+' de '+total, '#b061ff')}
    </div>
    <div class="tracker-add">
      <input type="text" class="form-input" id="todoText" placeholder="Nova tarefa..." />
      <select class="form-select" id="todoPrio" style="max-width:130px">
        <option value="low">Baixa</option><option value="med" selected>Média</option><option value="high">Alta</option>
      </select>
      <input type="date" class="form-input" id="todoDue" style="max-width:170px" />
      <button class="btn btn-primary" onclick="addTodo()">+ Adicionar</button>
    </div>
    <div class="tracker-list">
      ${sorted.length ? sorted.map(t=>`
        <div class="tracker-item ${t.done?'done':''}">
          <label class="check-pill"><input type="checkbox" ${t.done?'checked':''} onchange="toggleTodo('${t.id}')"/><span></span></label>
          <div class="tracker-item-body">
            <div class="tracker-item-title">${escapeHtml(t.title)}</div>
            <div class="tracker-item-meta">
              <span class="badge-pill ${t.priority==='high'?'bad':t.priority==='med'?'warn':'cyan'}">${t.priority==='high'?'alta':t.priority==='med'?'média':'baixa'}</span>
              ${t.dueDate?`<span class="${t.dueDate<today&&!t.done?'overdue':''}">📅 ${formatDate(t.dueDate)}</span>`:''}
            </div>
          </div>
          <button class="btn-icon" onclick="deleteTodo('${t.id}')" style="color:#ff7a9a">🗑️</button>
        </div>
      `).join('') : emptyTracker('Nenhuma tarefa ainda. Adicione a primeira acima.')}
    </div>
  `;
}
function addTodo(){
  const text = document.getElementById('todoText').value.trim();
  if(!text) return;
  state.trackers.todos.push({id:uid(),title:text,priority:document.getElementById('todoPrio').value,dueDate:document.getElementById('todoDue').value,done:false,createdAt:new Date().toISOString()});
  save(); renderTasks();
}
function toggleTodo(id){
  const t = state.trackers.todos.find(x=>x.id===id);
  t.done = !t.done; t.completedAt = t.done ? new Date().toISOString() : null;
  save(); renderTasks();
}
function deleteTodo(id){
  instantDelete({
    from: state.trackers.todos, predicate: t=>t.id===id,
    label: 'Tarefa excluída', rerender: renderTasks
  });
}
function renderTasks(){
  const el = document.getElementById('tasksPageContent');
  if(!el) return;
  el.innerHTML = renderTodos();
  renderShoppingList();
}

/* ----- LISTA DE COMPRAS (na página Tarefas) ----- */
function renderShoppingList(){
  const el = document.getElementById('shoppingListContent');
  if(!el) return;
  const list = state.shopping || [];

  const subtotal = (it) => (Number(it.price)||0) * (Number(it.qty)||1);
  const totalGeral = list.reduce((s,it)=>s+subtotal(it), 0);
  const totalPend  = list.filter(it=>!it.done).reduce((s,it)=>s+subtotal(it), 0);
  const totalCompr = list.filter(it=>it.done).reduce((s,it)=>s+subtotal(it), 0);
  const pendCount  = list.filter(it=>!it.done).length;
  const comprCount = list.filter(it=>it.done).length;

  // Pendentes primeiro, depois comprados (preserva ordem de criação dentro de cada grupo)
  const sorted = [...list].sort((a,b)=>(a.done-b.done) || (a.createdAt||'').localeCompare(b.createdAt||''));

  el.innerHTML = `
    <div class="shopping-summary">
      ${statCard('A Comprar', `${pendCount} ${pendCount===1?'item':'itens'}`, fmt(totalPend), '#39d4ff')}
      ${statCard('Já Comprado', `${comprCount} ${comprCount===1?'item':'itens'}`, fmt(totalCompr), '#5cffb1')}
      ${statCard('Total da Lista', fmt(totalGeral), `${list.length} ${list.length===1?'item':'itens'}`, '#b061ff')}
    </div>
    <div class="shopping-add">
      <input type="text" class="sh-name" id="shInput" placeholder="O que comprar?" onkeydown="if(event.key==='Enter') addShoppingItem()" />
      <input type="number" class="sh-qty" id="shQty" placeholder="Qtd" min="1" value="1" onkeydown="if(event.key==='Enter') addShoppingItem()" />
      <input type="number" class="sh-price" id="shPrice" placeholder="Valor (opcional)" step="0.01" min="0" onkeydown="if(event.key==='Enter') addShoppingItem()" />
      <button class="btn btn-primary" onclick="addShoppingItem()">+ Adicionar</button>
    </div>
    <div class="shopping-list">
      ${sorted.length ? sorted.map(it=>{
        const st = subtotal(it);
        return `
          <div class="shopping-item ${it.done?'done':''}" data-id="${it.id}">
            <label class="check-pill">
              <input type="checkbox" ${it.done?'checked':''} onchange="toggleShoppingItem('${it.id}')"/>
              <span></span>
            </label>
            <input class="sh-item-name" value="${escapeAttr(it.name)}" oninput="updateShoppingItem('${it.id}','name',this.value)" />
            <input class="sh-item-qty" type="number" min="1" value="${it.qty||1}" oninput="updateShoppingItem('${it.id}','qty',this.value);updateShoppingSubtotal('${it.id}')" title="Quantidade" />
            <input class="sh-item-price" type="number" min="0" step="0.01" placeholder="—" value="${it.price||''}" oninput="updateShoppingItem('${it.id}','price',this.value);updateShoppingSubtotal('${it.id}')" />
            <span class="sh-item-subtotal" data-subtotal>${st ? fmt(st) : ''}</span>
            <button class="btn-icon" onclick="deleteShoppingItem('${it.id}')" style="color:#ff7a9a" title="Remover">🗑️</button>
          </div>
        `;
      }).join('') : `<div class="sh-empty">🛒 Sua lista está vazia. Adicione o primeiro item acima!</div>`}
    </div>
    ${list.length ? `
      <div class="sh-total-bar">
        <div>
          <div class="sh-total-label">💰 Total da Lista</div>
          <div style="font-size:11px;color:var(--text-mute);margin-top:3px">${list.length} ${list.length===1?'item':'itens'} · ${pendCount} pendente${pendCount===1?'':'s'}</div>
        </div>
        <div class="sh-total-val">${fmt(totalGeral)}</div>
      </div>
    ` : ''}
  `;
}

function addShoppingItem(){
  const nameEl = document.getElementById('shInput');
  const priceEl = document.getElementById('shPrice');
  const qtyEl = document.getElementById('shQty');
  const name = nameEl.value.trim();
  if(!name) { nameEl.focus(); return; }
  state.shopping ||= [];
  state.shopping.push({
    id: uid(),
    name,
    qty: Number(qtyEl.value) || 1,
    price: Number(priceEl.value) || 0,
    done: false,
    createdAt: new Date().toISOString()
  });
  save();
  nameEl.value = '';
  priceEl.value = '';
  qtyEl.value = '1';
  renderShoppingList();
  document.getElementById('shInput')?.focus();
}

function toggleShoppingItem(id){
  const it = state.shopping.find(x=>x.id===id);
  if(!it) return;
  it.done = !it.done;
  it.completedAt = it.done ? new Date().toISOString() : null;
  save(); renderShoppingList();
}

function updateShoppingItem(id, field, value){
  const it = state.shopping.find(x=>x.id===id);
  if(!it) return;
  if(field === 'price' || field === 'qty'){
    it[field] = Number(value) || 0;
  } else {
    it[field] = value;
  }
  save();
  refreshShoppingSummary();
}

function updateShoppingSubtotal(id){
  const it = state.shopping.find(x=>x.id===id);
  if(!it) return;
  const row = document.querySelector(`.shopping-item[data-id="${id}"]`);
  const st = (Number(it.price)||0) * (Number(it.qty)||1);
  const subEl = row?.querySelector('[data-subtotal]');
  if(subEl) subEl.textContent = st ? fmt(st) : '';
}

function refreshShoppingSummary(){
  const el = document.getElementById('shoppingListContent');
  if(!el) return;
  const list = state.shopping || [];
  const subtotal = (it) => (Number(it.price)||0) * (Number(it.qty)||1);
  const totalGeral = list.reduce((s,it)=>s+subtotal(it), 0);
  const totalPend  = list.filter(it=>!it.done).reduce((s,it)=>s+subtotal(it), 0);
  const totalCompr = list.filter(it=>it.done).reduce((s,it)=>s+subtotal(it), 0);
  const cards = el.querySelectorAll('.shopping-summary .stat-card');
  if(cards[0]?.querySelector('.stat-meta')) cards[0].querySelector('.stat-meta').textContent = fmt(totalPend);
  if(cards[1]?.querySelector('.stat-meta')) cards[1].querySelector('.stat-meta').textContent = fmt(totalCompr);
  if(cards[2]?.querySelector('.stat-value')) cards[2].querySelector('.stat-value').textContent = fmt(totalGeral);
  const totalBar = el.querySelector('.sh-total-bar .sh-total-val');
  if(totalBar) totalBar.textContent = fmt(totalGeral);
}

function deleteShoppingItem(id){
  instantDelete({
    from: state.shopping, predicate: it=>it.id===id,
    label: 'Item removido da lista', rerender: renderShoppingList
  });
}

/* ----- DIETA ----- */
const DIET_MEAL_SLOTS = [
  {key:'cafe',   label:'Café da Manhã', emoji:'☕', color:'#ffb86b'},
  {key:'lanche', label:'Lanche',        emoji:'🥪', color:'#5cffb1'},
  {key:'almoco', label:'Almoço',        emoji:'🍽️', color:'#39d4ff'},
  {key:'jantar', label:'Jantar',        emoji:'🌙', color:'#b061ff'},
  {key:'ceia',   label:'Ceia',          emoji:'🍵', color:'#e26bff'},
];
function getDietPlan(date){
  state.trackers.dietPlan ||= {};
  state.trackers.dietPlan[date] ||= {};
  DIET_MEAL_SLOTS.forEach(s => { state.trackers.dietPlan[date][s.key] ||= []; });
  return state.trackers.dietPlan[date];
}
function addDietPlanItem(date, meal, inputEl){
  const name = (inputEl.value||'').trim();
  if(!name) return;
  const plan = getDietPlan(date);
  plan[meal] = plan[meal] || [];
  plan[meal].push({id:uid(), name, done:false});
  save();
  inputEl.value = '';
  renderCurrentTracker();
  setTimeout(()=>{
    const focused = document.querySelector(`[data-plan-input="${meal}"]`);
    if(focused) focused.focus();
  }, 0);
}
function toggleDietPlanItem(date, meal, id){
  const plan = getDietPlan(date);
  const item = (plan[meal]||[]).find(i=>i.id===id);
  if(!item) return;
  item.done = !item.done;
  save();
  renderCurrentTracker();
}
function deleteDietPlanItem(date, meal, id){
  const plan = getDietPlan(date);
  plan[meal] = (plan[meal]||[]).filter(i=>i.id!==id);
  save();
  renderCurrentTracker();
}
function clearDietPlanDay(date){
  if(!confirm('Limpar o plano de hoje?')) return;
  state.trackers.dietPlan ||= {};
  delete state.trackers.dietPlan[date];
  save();
  renderCurrentTracker();
}
function renderDietPlan(date){
  const plan = getDietPlan(date);
  const totalItems = DIET_MEAL_SLOTS.reduce((s,sl)=>s+(plan[sl.key]||[]).length, 0);
  const doneItems = DIET_MEAL_SLOTS.reduce((s,sl)=>s+(plan[sl.key]||[]).filter(i=>i.done).length, 0);
  return `
    <div class="diet-plan-card">
      <div class="diet-plan-head">
        <div>
          <h3 class="diet-plan-title">🍴 Plano de Hoje</h3>
          <p class="diet-plan-sub">${doneItems}/${totalItems} ${totalItems===1?'item comido':'itens comidos'} · ${formatDate(date)}</p>
        </div>
        ${totalItems ? `<button class="btn-icon" onclick="clearDietPlanDay('${date}')" title="Limpar plano de hoje" style="color:#ff7a9a">🗑️</button>` : ''}
      </div>
      <div class="diet-plan-board">
        ${DIET_MEAL_SLOTS.map(slot => {
          const items = plan[slot.key] || [];
          const done = items.filter(i=>i.done).length;
          return `
            <div class="diet-slot" style="--slot-color:${slot.color}">
              <div class="diet-slot-head">
                <span class="diet-slot-emoji">${slot.emoji}</span>
                <span class="diet-slot-name">${escapeHtml(slot.label)}</span>
                ${items.length ? `<span class="diet-slot-count">${done}/${items.length}</span>` : ''}
              </div>
              <div class="diet-slot-list">
                ${items.length ? items.map(it => `
                  <div class="diet-plan-item ${it.done?'is-done':''}">
                    <label class="diet-plan-check">
                      <input type="checkbox" ${it.done?'checked':''} onchange="toggleDietPlanItem('${date}','${slot.key}','${it.id}')" />
                      <span></span>
                    </label>
                    <span class="diet-plan-item-name">${escapeHtml(it.name)}</span>
                    <button class="diet-plan-del" onclick="deleteDietPlanItem('${date}','${slot.key}','${it.id}')" title="Remover">✕</button>
                  </div>
                `).join('') : '<div class="diet-slot-empty">Nada planejado</div>'}
              </div>
              <input type="text" class="diet-plan-input"
                     data-plan-input="${slot.key}"
                     placeholder="+ Adicionar item..."
                     onkeydown="if(event.key==='Enter'){event.preventDefault();addDietPlanItem('${date}','${slot.key}',this)}" />
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
function dietEntryCalories(d){
  if(Array.isArray(d.foods) && d.foods.length){
    return d.foods.reduce((s,f)=>s+(Number(f.calories)||0),0);
  }
  return Number(d.calories)||0;
}
function dietMealLabel(m){
  return ({cafe:'☕ Café da Manhã',almoco:'🍽️ Almoço',jantar:'🌙 Jantar',lanche:'🥪 Lanche',ceia:'🍵 Ceia',
           'café':'☕ Café',
           'almoço':'🍽️ Almoço'})[m] || m || '—';
}
function dietMoodLabel(m){
  return ({otimo:'😄 Ótimo',bom:'🙂 Bom',ok:'😐 Ok',cansado:'😓 Pesado',ruim:'😞 Ruim'})[m] || m || '—';
}
function renderDiet(){
  const list = state.trackers.diet;
  const today = todayStr();
  const todays = list.filter(d=>d.date===today);
  const calsToday = todays.reduce((s,d)=>s+dietEntryCalories(d),0);
  const waterToday = todays.reduce((s,d)=>s+(Number(d.water)||0),0);
  // streak de água (dias seguidos com >=8 copos)
  let streak = 0;
  for(let i=0;i<365;i++){
    const d = new Date(); d.setDate(d.getDate()-i);
    const k = toDateStr(d);
    const w = list.filter(x=>x.date===k).reduce((s,x)=>s+(Number(x.water)||0),0);
    if(w>=8) streak++; else if(i>0) break;
  }
  const sorted = [...list].sort((a,b)=>b.date.localeCompare(a.date));
  return `
    <div class="stat-row">
      ${statCard('Refeições Hoje', todays.length, '', '#5cffb1')}
      ${statCard('Calorias Hoje', calsToday + ' kcal', '', '#ffb86b')}
      ${statCard('Água Hoje', waterToday + ' copos', 'Meta: 8', '#39d4ff')}
      ${statCard('Streak Água', streak + ' dias', 'Acima de 8 copos', '#b061ff')}
    </div>
    ${renderDietPlan(today)}
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin:24px 0 12px;gap:12px;flex-wrap:wrap">
      <div>
        <h3 class="section-title" style="font-size:17px;margin:0">Histórico de Refeições</h3>
        <p class="section-sub" style="margin:2px 0 0">Refeições registradas com detalhes</p>
      </div>
      <button class="btn btn-primary" onclick="openDietModal()">+ Nova Refeição</button>
    </div>
    <div class="workout-list">
      ${sorted.length ? sorted.map(d=>{
        const foods = Array.isArray(d.foods) && d.foods.length
          ? d.foods
          : (d.items ? [{name:d.items, quantity:'', calories:Number(d.calories)||0}] : []);
        const cals = foods.reduce((s,f)=>s+(Number(f.calories)||0),0);
        const mood = d.mood || 'ok';
        const name = d.name || d.items || dietMealLabel(d.meal).replace(/^\S+\s/,'');
        return `
          <div class="workout-card" data-dt="${d.id}">
            <div class="workout-head" onclick="toggleDiet('${d.id}')">
              <div class="workout-info">
                <h4 class="workout-title">${escapeHtml(name)}</h4>
                <div class="workout-meta">
                  <span>📅 ${formatDate(d.date)}</span>
                  <span>🍴 ${escapeHtml(dietMealLabel(d.meal))}</span>
                  <span>🔥 ${cals} kcal</span>
                  ${d.water?`<span>💧 ${d.water} copos</span>`:''}
                  <span>🥗 ${foods.length} ${foods.length===1?'item':'itens'}</span>
                </div>
              </div>
              <div class="workout-actions" onclick="event.stopPropagation()">
                <span class="mood-badge mood-${mood}">${dietMoodLabel(mood)}</span>
                <button class="btn-icon" onclick="openDietModal('${d.id}')" title="Editar">✏️</button>
                <button class="btn-icon" onclick="deleteDiet('${d.id}')" title="Excluir" style="color:#ff7a9a">🗑️</button>
              </div>
            </div>
            <div class="workout-body">
              ${foods.length ? `
                <div class="exercise-list food-list">
                  <div class="exercise-row head food-row">
                    <span>Nome</span><span>Qtd</span><span>kcal</span>
                  </div>
                  ${foods.map(f=>`
                    <div class="exercise-row food-row">
                      <span class="exercise-name">${escapeHtml(f.name||'')}</span>
                      <span>${escapeHtml(f.quantity||'—')}</span>
                      <span>${Number(f.calories)||0}</span>
                    </div>
                  `).join('')}
                </div>
              ` : '<div style="color:var(--text-mute);font-size:13px;text-align:center;padding:12px">Nenhum alimento registrado.</div>'}
            </div>
          </div>
        `;
      }).join('') : emptyTracker('Nenhum registro de dieta. Comece hoje.')}
    </div>
  `;
}
function addFoodRow(food={name:'',quantity:'',calories:''}){
  const list = document.getElementById('foodList');
  if(!list) return;
  const row = document.createElement('div');
  row.className = 'exercise-row food-row';
  row.innerHTML = `
    <input type="text" placeholder="Ex: Arroz" value="${escapeAttr(food.name)}" data-f="name" />
    <input type="text" placeholder="200g" value="${escapeAttr(food.quantity||'')}" data-f="quantity" />
    <div style="display:flex;gap:6px;align-items:center">
      <input type="number" min="0" placeholder="kcal" value="${food.calories}" data-f="calories" style="width:100%" />
      <button type="button" class="btn-icon" onclick="this.closest('.food-row').remove()" style="color:#ff7a9a">✕</button>
    </div>
  `;
  list.appendChild(row);
}
function openDietModal(id=null){
  document.getElementById('dietForm').reset();
  document.getElementById('dtId').value = '';
  document.getElementById('dtDate').value = todayStr();
  document.querySelectorAll('#foodList .food-row:not(.head)').forEach(r=>r.remove());
  document.getElementById('dietModalTitle').textContent = 'Nova Refeição';
  if(id){
    const d = state.trackers.diet.find(x=>x.id===id);
    if(d){
      document.getElementById('dtId').value = d.id;
      document.getElementById('dtName').value = d.name || d.items || '';
      document.getElementById('dtDate').value = d.date || todayStr();
      // migra antigos rótulos com acento
      const mealMap = {'café':'cafe','almoço':'almoco'};
      document.getElementById('dtMeal').value = mealMap[d.meal] || d.meal || 'almoco';
      document.getElementById('dtWater').value = d.water || '';
      document.getElementById('dtMood').value = d.mood || 'ok';
      const foods = Array.isArray(d.foods) && d.foods.length
        ? d.foods
        : (d.items ? [{name:d.items, quantity:'', calories:Number(d.calories)||0}] : []);
      foods.forEach(addFoodRow);
      document.getElementById('dietModalTitle').textContent = 'Editar Refeição';
    }
  }
  if(!document.querySelectorAll('#foodList .food-row:not(.head)').length){
    addFoodRow();
  }
  openModal('dietModal');
}
function saveDiet(e){
  e.preventDefault();
  const id = document.getElementById('dtId').value;
  const rows = document.querySelectorAll('#foodList .food-row:not(.head)');
  const foods = [];
  rows.forEach(r=>{
    const obj = {};
    r.querySelectorAll('input').forEach(i=>{
      obj[i.dataset.f] = i.dataset.f==='calories' ? (Number(i.value)||0) : i.value;
    });
    if(obj.name) foods.push(obj);
  });
  const data = {
    name: document.getElementById('dtName').value.trim(),
    date: document.getElementById('dtDate').value,
    meal: document.getElementById('dtMeal').value,
    water: Number(document.getElementById('dtWater').value)||0,
    mood: document.getElementById('dtMood').value,
    foods
  };
  if(id){
    const d = state.trackers.diet.find(x=>x.id===id);
    if(d){
      // limpa campos legados ao migrar
      delete d.items; delete d.calories;
      Object.assign(d, data);
    }
  } else {
    state.trackers.diet.unshift({id:uid(),...data});
  }
  save(); closeModal('dietModal'); renderCurrentTracker();
}
function toggleDiet(id){
  const el = document.querySelector(`[data-dt="${id}"]`);
  if(el) el.classList.toggle('expanded');
}
function deleteDiet(id){
  instantDelete({
    from: state.trackers.diet, predicate: d=>d.id===id,
    label: 'Registro excluído', rerender: renderCurrentTracker
  });
}

/* ----- LIVROS ----- */
function renderBooks(){
  const list = state.trackers.books;
  const reading = list.filter(b=>b.status==='lendo');
  const thisYear = new Date().getFullYear();
  const readThisYear = list.filter(b=>b.status==='lido' && (b.finishedAt||'').startsWith(String(thisYear)));
  const totalPages = list.filter(b=>b.status==='lido').reduce((s,b)=>s+(Number(b.pages)||0),0);
  const rated = list.filter(b=>b.rating);
  const avg = rated.length ? (rated.reduce((s,b)=>s+Number(b.rating),0)/rated.length).toFixed(1) : '—';
  const sorted = [...list].sort((a,b)=>({lendo:0,quero:1,lido:2})[a.status]-({lendo:0,quero:1,lido:2})[b.status]);
  return `
    <div class="stat-row">
      ${statCard('Lendo Agora', reading.length, '', '#39d4ff')}
      ${statCard('Lidos em '+thisYear, readThisYear.length, '', '#5cffb1')}
      ${statCard('Páginas Lidas', totalPages.toLocaleString('pt-BR'), 'Total', '#b061ff')}
      ${statCard('Avaliação Média', avg, rated.length+' avaliados', '#ffb86b')}
    </div>
    <div class="tracker-add">
      <input type="text" class="form-input" id="bookTitle" placeholder="Título" />
      <input type="text" class="form-input" id="bookAuthor" placeholder="Autor" style="max-width:200px" />
      <input type="number" min="0" class="form-input" id="bookPages" placeholder="Páginas" style="max-width:110px" />
      <select class="form-select" id="bookStatus" style="max-width:140px">
        <option value="quero">Quero ler</option><option value="lendo" selected>Lendo</option><option value="lido">Lido</option>
      </select>
      <button class="btn btn-primary" onclick="addBook()">+ Adicionar</button>
    </div>
    <div class="tracker-list">
      ${sorted.length ? sorted.map(b=>{
        const prog = b.pages ? Math.min(100, Math.round((Number(b.currentPage)||0)/Number(b.pages)*100)) : 0;
        return `
        <div class="tracker-item">
          <div class="tracker-item-body">
            <div class="tracker-item-title">${escapeHtml(b.title)}${b.author?` <span style="color:var(--text-mute);font-weight:400">— ${escapeHtml(b.author)}</span>`:''}</div>
            <div class="tracker-item-meta">
              <span class="badge-pill ${b.status==='lido'?'green':b.status==='lendo'?'cyan':''}">${b.status}</span>
              ${b.pages?`<span>📖 ${b.currentPage||0}/${b.pages}</span>`:''}
              ${b.rating?`<span class="star">${'★'.repeat(b.rating)}<span class="off">${'★'.repeat(5-b.rating)}</span></span>`:''}
            </div>
            ${b.pages?`<div class="progress-bar"><div class="progress-fill cyan" style="width:${prog}%"></div></div>`:''}
          </div>
          ${b.status==='lendo'?`<input type="number" min="0" max="${b.pages||999}" placeholder="pg" value="${b.currentPage||''}" onchange="updateBookPage('${b.id}',this.value)" style="width:70px;padding:6px;background:rgba(7,3,15,0.4);border:1px solid var(--border);border-radius:6px;color:var(--text)" />`:''}
          ${b.status==='lido' && !b.rating?`<select onchange="rateBook('${b.id}',this.value)" style="padding:6px;background:rgba(7,3,15,0.4);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px">
            <option value="">⭐ Avaliar</option><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option>
          </select>`:''}
          <button class="btn-icon" onclick="cycleBook('${b.id}')" title="Mudar status">🔄</button>
          <button class="btn-icon" onclick="deleteBook('${b.id}')" style="color:#ff7a9a">🗑️</button>
        </div>`;
      }).join('') : emptyTracker('Nenhum livro registrado.')}
    </div>
  `;
}
function addBook(){
  const title = document.getElementById('bookTitle').value.trim();
  if(!title) return;
  state.trackers.books.push({
    id:uid(),title,
    author:document.getElementById('bookAuthor').value.trim(),
    pages:Number(document.getElementById('bookPages').value)||0,
    status:document.getElementById('bookStatus').value,
    currentPage:0,rating:0,startedAt:new Date().toISOString(),finishedAt:''
  });
  save(); renderCurrentTracker();
}
function updateBookPage(id,val){
  const b = state.trackers.books.find(x=>x.id===id);
  b.currentPage = Number(val)||0;
  if(b.pages && b.currentPage>=b.pages){ b.status='lido'; b.finishedAt=new Date().toISOString(); }
  save(); renderCurrentTracker();
}
function rateBook(id,r){
  const b = state.trackers.books.find(x=>x.id===id);
  b.rating = Number(r); save(); renderCurrentTracker();
}
function cycleBook(id){
  const b = state.trackers.books.find(x=>x.id===id);
  const order = ['quero','lendo','lido'];
  b.status = order[(order.indexOf(b.status)+1)%3];
  if(b.status==='lido') b.finishedAt = new Date().toISOString();
  save(); renderCurrentTracker();
}
function deleteBook(id){
  instantDelete({
    from: state.trackers.books, predicate: b=>b.id===id,
    label: 'Livro excluído', rerender: renderCurrentTracker
  });
}

/* ----- METAS ----- */
function renderGoals(){
  const list = state.trackers.goals;
  const today = todayStr();
  const active = list.filter(g=>g.status==='active');
  const done = list.filter(g=>g.status==='done');
  const overdue = list.filter(g=>g.status==='active' && g.deadline && g.deadline<today);
  const avg = active.length ? Math.round(active.reduce((s,g)=>s+(Number(g.progress)||0),0)/active.length) : 0;
  return `
    <div class="stat-row">
      ${statCard('Ativas', active.length, '', '#39d4ff')}
      ${statCard('Concluídas', done.length, '', '#5cffb1')}
      ${statCard('Atrasadas', overdue.length, '', '#ff7a9a')}
      ${statCard('Progresso Médio', avg+'%', 'Das ativas', '#b061ff')}
    </div>
    <div class="tracker-add">
      <input type="text" class="form-input" id="goalTitle" placeholder="Nova meta..." />
      <input type="date" class="form-input" id="goalDeadline" style="max-width:170px" />
      <input type="text" class="form-input" id="goalCategory" placeholder="Categoria" style="max-width:160px" />
      <button class="btn btn-primary" onclick="addGoal()">+ Adicionar</button>
    </div>
    <div class="tracker-list">
      ${list.length ? list.sort((a,b)=>({active:0,done:2,paused:1})[a.status]-({active:0,done:2,paused:1})[b.status]).map(g=>`
        <div class="tracker-item ${g.status==='done'?'done':''}">
          <div class="tracker-item-body">
            <div class="tracker-item-title">${escapeHtml(g.title)}</div>
            <div class="tracker-item-meta">
              <span class="badge-pill ${g.status==='done'?'green':g.status==='paused'?'warn':'cyan'}">${g.status==='active'?'ativa':g.status==='done'?'concluída':'pausada'}</span>
              ${g.category?`<span>🏷️ ${escapeHtml(g.category)}</span>`:''}
              ${g.deadline?`<span class="${g.deadline<today&&g.status==='active'?'overdue':''}">⏰ ${formatDate(g.deadline)}</span>`:''}
              <span style="color:var(--neon);font-weight:700">${g.progress||0}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${g.progress||0}%"></div></div>
          </div>
          <input type="range" min="0" max="100" value="${g.progress||0}" oninput="updateGoalProgress('${g.id}',this.value)" style="width:100px" />
          <button class="btn-icon" onclick="cycleGoal('${g.id}')" title="Mudar status">🔄</button>
          <button class="btn-icon" onclick="deleteGoal('${g.id}')" style="color:#ff7a9a">🗑️</button>
        </div>
      `).join('') : emptyTracker('Nenhuma meta. Defina a primeira!')}
    </div>
  `;
}
function addGoal(){
  const t = document.getElementById('goalTitle').value.trim();
  if(!t) return;
  state.trackers.goals.push({id:uid(),title:t,deadline:document.getElementById('goalDeadline').value,category:document.getElementById('goalCategory').value.trim(),progress:0,status:'active',createdAt:new Date().toISOString()});
  save(); renderCurrentTracker();
}
function updateGoalProgress(id,val){
  const g = state.trackers.goals.find(x=>x.id===id);
  g.progress = Number(val);
  if(g.progress>=100) g.status='done';
  else if(g.status==='done') g.status='active';
  save();
  // re-render apenas o número e a barra desta linha pra evitar perder foco do range
  renderCurrentTracker();
}
function cycleGoal(id){
  const g = state.trackers.goals.find(x=>x.id===id);
  const order = ['active','paused','done'];
  g.status = order[(order.indexOf(g.status)+1)%3];
  if(g.status==='done') g.progress=100;
  save(); renderCurrentTracker();
}
function deleteGoal(id){
  instantDelete({
    from: state.trackers.goals, predicate: g=>g.id===id,
    label: 'Meta excluída', rerender: renderCurrentTracker
  });
}

/* ----- SONHOS ----- */
function renderDreams(){
  const list = state.trackers.dreams;
  const thisMonth = todayStr().slice(0,7);
  const monthCount = list.filter(d=>(d.date||'').startsWith(thisMonth)).length;
  const lucid = list.filter(d=>d.lucid).length;
  const recurring = list.filter(d=>d.recurring).length;
  const sorted = [...list].sort((a,b)=>b.date.localeCompare(a.date));
  return `
    <div class="stat-row">
      ${statCard('Total Registrados', list.length, '', '#b061ff')}
      ${statCard('Este Mês', monthCount, thisMonth, '#39d4ff')}
      ${statCard('Lúcidos', lucid, list.length?Math.round(lucid/list.length*100)+'%':'—', '#e26bff')}
      ${statCard('Recorrentes', recurring, '', '#ffb86b')}
    </div>
    <div class="tracker-add">
      <input type="date" class="form-input" id="dreamDate" value="${todayStr()}" style="max-width:170px" />
      <input type="text" class="form-input" id="dreamTitle" placeholder="Título do sonho" />
      <select class="form-select" id="dreamMood" style="max-width:160px">
        <option value="bom">😊 Bom</option><option value="neutro">😐 Neutro</option><option value="estranho">😵 Estranho</option><option value="ruim">😨 Ruim</option><option value="pesadelo">😱 Pesadelo</option>
      </select>
      <label class="checkbox-label" style="max-width:auto"><input type="checkbox" id="dreamLucid" /> Lúcido</label>
      <label class="checkbox-label" style="max-width:auto"><input type="checkbox" id="dreamRecur" /> Recorrente</label>
      <button class="btn btn-primary" onclick="addDream()">+ Registrar</button>
    </div>
    <div class="tracker-list">
      ${sorted.length ? sorted.map(d=>`
        <div class="tracker-item">
          <div class="tracker-item-body">
            <div class="tracker-item-title">${escapeHtml(d.title)}</div>
            <div class="tracker-item-meta">
              <span>📅 ${formatDate(d.date)}</span>
              <span class="badge-pill">${d.mood}</span>
              ${d.lucid?'<span class="badge-pill">✨ lúcido</span>':''}
              ${d.recurring?'<span class="badge-pill warn">🔁 recorrente</span>':''}
            </div>
            ${d.content?`<div style="margin-top:6px;font-size:13px;color:var(--text-dim);white-space:pre-wrap">${escapeHtml(d.content)}</div>`:''}
          </div>
          <button class="btn-icon" onclick="editDreamContent('${d.id}')" title="Editar conteúdo">✏️</button>
          <button class="btn-icon" onclick="deleteDream('${d.id}')" style="color:#ff7a9a">🗑️</button>
        </div>
      `).join('') : emptyTracker('Nenhum sonho registrado.')}
    </div>
  `;
}
function addDream(){
  const t = document.getElementById('dreamTitle').value.trim();
  if(!t) return;
  state.trackers.dreams.push({id:uid(),date:document.getElementById('dreamDate').value||todayStr(),title:t,content:'',mood:document.getElementById('dreamMood').value,lucid:document.getElementById('dreamLucid').checked,recurring:document.getElementById('dreamRecur').checked});
  save(); renderCurrentTracker();
}
function editDreamContent(id){
  const d = state.trackers.dreams.find(x=>x.id===id);
  const c = prompt('Descreva o sonho:', d.content||'');
  if(c===null) return;
  d.content = c; save(); renderCurrentTracker();
}
function deleteDream(id){
  instantDelete({
    from: state.trackers.dreams, predicate: d=>d.id===id,
    label: 'Sonho excluído', rerender: renderCurrentTracker
  });
}

/* ----- FILMES ----- */
function renderMovies(){
  const list = state.trackers.movies;
  const year = new Date().getFullYear();
  const watched = list.filter(m=>m.status==='visto');
  const watchedYear = watched.filter(m=>(m.watchedAt||'').startsWith(String(year)));
  const wishlist = list.filter(m=>m.status==='quero');
  const rated = watched.filter(m=>m.rating);
  const avg = rated.length ? (rated.reduce((s,m)=>s+Number(m.rating),0)/rated.length).toFixed(1) : '—';
  const sorted = [...list].sort((a,b)=>({quero:0,visto:1})[a.status]-({quero:0,visto:1})[b.status]);
  return `
    <div class="stat-row">
      ${statCard('Vistos em '+year, watchedYear.length, '', '#5cffb1')}
      ${statCard('Watchlist', wishlist.length, 'Pendentes', '#39d4ff')}
      ${statCard('Total Vistos', watched.length, '', '#b061ff')}
      ${statCard('Nota Média', avg, rated.length+' avaliados', '#ffb86b')}
    </div>
    <div class="tracker-add">
      <input type="text" class="form-input" id="movTitle" placeholder="Título do filme" />
      <input type="number" class="form-input" id="movYear" placeholder="Ano" style="max-width:100px" />
      <input type="text" class="form-input" id="movGenre" placeholder="Gênero" style="max-width:160px" />
      <select class="form-select" id="movStatus" style="max-width:140px">
        <option value="quero">Quero ver</option><option value="visto">Já vi</option>
      </select>
      <button class="btn btn-primary" onclick="addMovie()">+ Adicionar</button>
    </div>
    <div class="tracker-list">
      ${sorted.length ? sorted.map(m=>`
        <div class="tracker-item">
          <div class="tracker-item-body">
            <div class="tracker-item-title">${escapeHtml(m.title)}${m.year?` <span style="color:var(--text-mute);font-weight:400">(${m.year})</span>`:''}</div>
            <div class="tracker-item-meta">
              <span class="badge-pill ${m.status==='visto'?'green':'cyan'}">${m.status}</span>
              ${m.genre?`<span>🎭 ${escapeHtml(m.genre)}</span>`:''}
              ${m.rating?`<span class="star">${'★'.repeat(m.rating)}<span class="off">${'★'.repeat(5-m.rating)}</span></span>`:''}
              ${m.watchedAt?`<span>📅 ${formatDate(m.watchedAt.slice(0,10))}</span>`:''}
            </div>
          </div>
          ${m.status==='visto' && !m.rating?`<select onchange="rateMovie('${m.id}',this.value)" style="padding:6px;background:rgba(7,3,15,0.4);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px">
            <option value="">⭐ Avaliar</option><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option>
          </select>`:''}
          <button class="btn-icon" onclick="toggleMovie('${m.id}')" title="Marcar como visto">🔄</button>
          <button class="btn-icon" onclick="deleteMovie('${m.id}')" style="color:#ff7a9a">🗑️</button>
        </div>
      `).join('') : emptyTracker('Nenhum filme registrado.')}
    </div>
  `;
}
function addMovie(){
  const t = document.getElementById('movTitle').value.trim();
  if(!t) return;
  state.trackers.movies.push({id:uid(),title:t,year:Number(document.getElementById('movYear').value)||'',genre:document.getElementById('movGenre').value.trim(),status:document.getElementById('movStatus').value,rating:0,watchedAt:document.getElementById('movStatus').value==='visto'?new Date().toISOString():''});
  save(); renderCurrentTracker();
}
function rateMovie(id,r){
  const m = state.trackers.movies.find(x=>x.id===id);
  m.rating = Number(r); save(); renderCurrentTracker();
}
function toggleMovie(id){
  const m = state.trackers.movies.find(x=>x.id===id);
  m.status = m.status==='visto'?'quero':'visto';
  if(m.status==='visto') m.watchedAt = new Date().toISOString();
  save(); renderCurrentTracker();
}
function deleteMovie(id){
  instantDelete({
    from: state.trackers.movies, predicate: m=>m.id===id,
    label: 'Filme excluído', rerender: renderCurrentTracker
  });
}

/* ----- HÁBITOS POSITIVOS ----- */
function renderPHabits(){
  const list = state.trackers.pHabits;
  const today = todayStr();
  const last7 = []; for(let i=6;i>=0;i--){const d=new Date(); d.setDate(d.getDate()-i); last7.push(toDateStr(d));}
  const doneToday = list.filter(h=>(h.log||{})[today]).length;
  function streakOf(h){
    let s=0;
    for(let i=0;i<365;i++){
      const d=new Date(); d.setDate(d.getDate()-i);
      const k=toDateStr(d);
      if((h.log||{})[k]) s++; else if(i>0) break;
    }
    return s;
  }
  const streaks = list.map(streakOf);
  const avgStreak = streaks.length ? Math.round(streaks.reduce((a,b)=>a+b,0)/streaks.length) : 0;
  const maxStreak = streaks.length ? Math.max(...streaks) : 0;
  return `
    <div class="stat-row">
      ${statCard('Hábitos Ativos', list.length, '', '#b061ff')}
      ${statCard('Concluídos Hoje', doneToday+'/'+list.length, '', '#5cffb1')}
      ${statCard('Streak Médio', avgStreak+' dias', '', '#39d4ff')}
      ${statCard('Maior Streak', maxStreak+' dias', '', '#ffb86b')}
    </div>
    <div class="tracker-add">
      <input type="text" class="form-input" id="phName" placeholder="Nome do hábito (ex: Beber água, Ler)" />
      <input type="text" class="form-input" id="phEmoji" placeholder="Emoji" value="✨" style="max-width:80px" />
      <button class="btn btn-primary" onclick="addPHabit()">+ Adicionar</button>
    </div>
    <div class="tracker-list">
      ${list.length ? list.map((h,i)=>{
        const s = streakOf(h);
        return `
        <div class="tracker-item">
          <div style="font-size:28px">${h.emoji||'✨'}</div>
          <div class="tracker-item-body">
            <div class="tracker-item-title">${escapeHtml(h.name)}</div>
            <div class="tracker-item-meta">
              <span class="badge-pill green">🔥 ${s} dias</span>
            </div>
          </div>
          <div class="day-dots">
            ${last7.map(k=>{
              const lbl = new Date(k).toLocaleDateString('pt-BR',{weekday:'short'}).slice(0,1).toUpperCase();
              return `<div class="day-dot ${(h.log||{})[k]?'on':''} ${k===today?'today':''}" onclick="togglePHabit('${h.id}','${k}')" title="${k}">${lbl}</div>`;
            }).join('')}
          </div>
          <button class="btn-icon" onclick="deletePHabit('${h.id}')" style="color:#ff7a9a">🗑️</button>
        </div>`;
      }).join('') : emptyTracker('Nenhum hábito ainda.')}
    </div>
  `;
}
function addPHabit(){
  const n = document.getElementById('phName').value.trim();
  if(!n) return;
  state.trackers.pHabits.push({id:uid(),name:n,emoji:document.getElementById('phEmoji').value.trim()||'✨',log:{},createdAt:new Date().toISOString()});
  save(); renderCurrentTracker();
}
function togglePHabit(id,date){
  const h = state.trackers.pHabits.find(x=>x.id===id);
  h.log ||= {};
  if(h.log[date]) delete h.log[date]; else h.log[date]=true;
  save(); renderCurrentTracker();
}
function deletePHabit(id){
  instantDelete({
    from: state.trackers.pHabits, predicate: h=>h.id===id,
    label: 'Hábito excluído', rerender: renderCurrentTracker
  });
}

/* ----- ROTINAS ----- */
function renderRoutines(){
  const list = state.trackers.routines;
  const today = todayStr();
  const doneToday = list.filter(r=>(r.log||{})[today]).length;
  const morning = list.filter(r=>r.time==='manhã').length;
  const evening = list.filter(r=>r.time==='noite').length;
  function streakOf(r){
    let s=0; for(let i=0;i<365;i++){
      const d=new Date(); d.setDate(d.getDate()-i);
      if((r.log||{})[toDateStr(d)]) s++; else if(i>0) break;
    }
    return s;
  }
  return `
    <div class="stat-row">
      ${statCard('Total Rotinas', list.length, '', '#b061ff')}
      ${statCard('Feitas Hoje', doneToday+'/'+list.length, '', '#5cffb1')}
      ${statCard('Manhã', morning, '', '#ffb86b')}
      ${statCard('Noite', evening, '', '#39d4ff')}
    </div>
    <div class="tracker-add">
      <input type="text" class="form-input" id="rtName" placeholder="Nome da rotina" />
      <select class="form-select" id="rtTime" style="max-width:140px">
        <option>manhã</option><option>tarde</option><option>noite</option>
      </select>
      <input type="number" min="0" class="form-input" id="rtDur" placeholder="min" style="max-width:90px" />
      <button class="btn btn-primary" onclick="addRoutine()">+ Adicionar</button>
    </div>
    <div class="tracker-list">
      ${list.length ? list.map(r=>{
        const s = streakOf(r);
        const doneT = (r.log||{})[today];
        return `
        <div class="tracker-item">
          <label class="check-pill"><input type="checkbox" ${doneT?'checked':''} onchange="toggleRoutine('${r.id}')" /><span></span></label>
          <div class="tracker-item-body">
            <div class="tracker-item-title">${escapeHtml(r.name)}</div>
            <div class="tracker-item-meta">
              <span class="badge-pill">${r.time}</span>
              ${r.duration?`<span>⏱️ ${r.duration} min</span>`:''}
              <span class="badge-pill green">🔥 ${s} dias</span>
            </div>
          </div>
          <button class="btn-icon" onclick="deleteRoutine('${r.id}')" style="color:#ff7a9a">🗑️</button>
        </div>`;
      }).join('') : emptyTracker('Nenhuma rotina configurada.')}
    </div>
  `;
}
function addRoutine(){
  const n = document.getElementById('rtName').value.trim();
  if(!n) return;
  state.trackers.routines.push({id:uid(),name:n,time:document.getElementById('rtTime').value,duration:Number(document.getElementById('rtDur').value)||0,log:{}});
  save(); renderCurrentTracker();
}
function toggleRoutine(id){
  const r = state.trackers.routines.find(x=>x.id===id);
  const k = todayStr();
  r.log ||= {};
  if(r.log[k]) delete r.log[k]; else r.log[k]=true;
  save(); renderCurrentTracker();
}
function deleteRoutine(id){
  instantDelete({
    from: state.trackers.routines, predicate: r=>r.id===id,
    label: 'Rotina excluída', rerender: renderCurrentTracker
  });
}

/* ----- DESAFIOS ----- */
function renderChallenges(){
  const list = state.trackers.challenges;
  const today = todayStr();
  function progress(c){
    const dayN = Math.floor((Date.now()-new Date(c.startDate).getTime())/86400000)+1;
    const elapsed = Math.min(c.days, Math.max(0,dayN));
    const completed = (c.completedDays||[]).length;
    return {elapsed, completed, pct: c.days?Math.round(completed/c.days*100):0, dayN};
  }
  const active = list.filter(c=>{ const p=progress(c); return p.elapsed<=c.days && p.completed<c.days; });
  const done = list.filter(c=>{ const p=progress(c); return p.completed>=c.days; });
  const avgPct = list.length ? Math.round(list.reduce((s,c)=>s+progress(c).pct,0)/list.length) : 0;
  return `
    <div class="stat-row">
      ${statCard('Ativos', active.length, '', '#39d4ff')}
      ${statCard('Concluídos', done.length, '', '#5cffb1')}
      ${statCard('Progresso Médio', avgPct+'%', '', '#b061ff')}
      ${statCard('Total Desafios', list.length, '', '#ffb86b')}
    </div>
    <div class="tracker-add">
      <input type="text" class="form-input" id="chTitle" placeholder="Nome do desafio (ex: 30 dias de leitura)" />
      <input type="number" min="1" class="form-input" id="chDays" placeholder="Dias" value="30" style="max-width:100px" />
      <input type="date" class="form-input" id="chStart" value="${today}" style="max-width:170px" />
      <button class="btn btn-primary" onclick="addChallenge()">+ Iniciar</button>
    </div>
    <div class="tracker-list">
      ${list.length ? list.map(c=>{
        const p = progress(c);
        const doneT = (c.completedDays||[]).includes(today);
        return `
        <div class="tracker-item">
          <div class="tracker-item-body">
            <div class="tracker-item-title">${escapeHtml(c.title)}</div>
            <div class="tracker-item-meta">
              <span>📅 Início: ${formatDate(c.startDate)}</span>
              <span class="badge-pill ${p.completed>=c.days?'green':'cyan'}">${p.completed}/${c.days} dias</span>
              <span style="color:var(--neon);font-weight:700">${p.pct}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill green" style="width:${p.pct}%"></div></div>
          </div>
          <button class="btn ${doneT?'btn-secondary':'btn-primary'}" style="padding:7px 12px;font-size:12px" onclick="markChallenge('${c.id}')">${doneT?'✓ Feito hoje':'Marcar hoje'}</button>
          <button class="btn-icon" onclick="deleteChallenge('${c.id}')" style="color:#ff7a9a">🗑️</button>
        </div>`;
      }).join('') : emptyTracker('Nenhum desafio. Comece um!')}
    </div>
  `;
}
function addChallenge(){
  const t = document.getElementById('chTitle').value.trim();
  if(!t) return;
  state.trackers.challenges.push({id:uid(),title:t,days:Number(document.getElementById('chDays').value)||30,startDate:document.getElementById('chStart').value||todayStr(),completedDays:[]});
  save(); renderCurrentTracker();
}
function markChallenge(id){
  const c = state.trackers.challenges.find(x=>x.id===id);
  c.completedDays ||= [];
  const today = todayStr();
  if(c.completedDays.includes(today)) c.completedDays = c.completedDays.filter(d=>d!==today);
  else c.completedDays.push(today);
  save(); renderCurrentTracker();
}
function deleteChallenge(id){
  instantDelete({
    from: state.trackers.challenges, predicate: c=>c.id===id,
    label: 'Desafio excluído', rerender: renderCurrentTracker
  });
}

/* ----- SKILLS ----- */
let skillsChartInstance = null;
function renderSkills(){
  const list = state.trackers.skills;
  const totalHours = list.reduce((s,sk)=>s+(Number(sk.hours)||0),0);
  const avgLevel = list.length ? (list.reduce((s,sk)=>s+(Number(sk.currentLevel)||0),0)/list.length).toFixed(1) : '—';
  const inProgress = list.filter(sk=>(Number(sk.currentLevel)||0)<(Number(sk.targetLevel)||0)).length;
  const mastered = list.filter(sk=>(Number(sk.currentLevel)||0)>=(Number(sk.targetLevel)||0) && sk.targetLevel).length;
  // Spider chart precisa de pelo menos 3 skills para fazer sentido visualmente
  const chartHtml = list.length >= 3 ? `
    <div class="card skills-chart-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
        <div>
          <h3 class="section-title">🕸️ Spider Chart</h3>
          <p class="section-sub" style="margin-bottom:0">Comparativo visual · nível atual vs. meta em cada skill</p>
        </div>
        <div class="skills-chart-legend">
          <span class="leg-dot" style="background:#b061ff"></span> Atual
          <span class="leg-dot" style="background:#5cffb1;margin-left:14px"></span> Meta
        </div>
      </div>
      <div class="skills-chart-wrap"><canvas id="skillsRadarChart"></canvas></div>
    </div>
  ` : list.length > 0 ? `
    <div class="skills-chart-empty">📊 Adicione pelo menos <strong>3 skills</strong> para ver o spider chart comparativo (você tem ${list.length})</div>
  ` : '';
  return `
    <div class="stat-row">
      ${statCard('Total Skills', list.length, '', '#b061ff')}
      ${statCard('Em Desenvolvimento', inProgress, '', '#39d4ff')}
      ${statCard('Horas Investidas', totalHours+' h', '', '#ffb86b')}
      ${statCard('Nível Médio', avgLevel, mastered+' dominadas', '#5cffb1')}
    </div>
    ${chartHtml}
    <div class="tracker-add">
      <input type="text" class="form-input" id="skName" placeholder="Nome da skill (ex: Python, Inglês)" />
      <input type="text" class="form-input" id="skCat" placeholder="Categoria" style="max-width:160px" />
      <input type="number" min="0" max="10" class="form-input" id="skCur" placeholder="Atual /10" value="1" style="max-width:110px" />
      <input type="number" min="0" max="10" class="form-input" id="skTgt" placeholder="Meta /10" value="10" style="max-width:110px" />
      <button class="btn btn-primary" onclick="addSkill()">+ Adicionar</button>
    </div>
    <div class="tracker-list">
      ${list.length ? list.map(sk=>{
        const cur = Number(sk.currentLevel)||0;
        const tgt = Number(sk.targetLevel)||10;
        const pct = (cur/10)*100;
        const tgtPct = (tgt/10)*100;
        return `
        <div class="tracker-item">
          <div class="tracker-item-body">
            <div class="tracker-item-title">${escapeHtml(sk.name)}</div>
            <div class="tracker-item-meta">
              ${sk.category?`<span class="badge-pill">${escapeHtml(sk.category)}</span>`:''}
              <span>Nível ${cur}/10</span>
              <span style="color:var(--good)">Meta: ${tgt}</span>
              ${sk.hours?`<span>⏱️ ${sk.hours}h</span>`:''}
            </div>
            <div class="level-bar"><div class="cur" style="width:${pct}%"></div><div class="target" style="left:${tgtPct}%"></div></div>
          </div>
          <input type="number" min="0" class="form-input" placeholder="+h" onchange="addSkillHours('${sk.id}',this.value);this.value=''" style="width:70px" title="Somar horas praticadas" />
          <input type="range" min="0" max="10" value="${cur}" oninput="updateSkillLevel('${sk.id}',this.value)" style="width:100px" />
          <button class="btn-icon" onclick="deleteSkill('${sk.id}')" style="color:#ff7a9a">🗑️</button>
        </div>`;
      }).join('') : emptyTracker('Nenhuma skill em desenvolvimento.')}
    </div>
  `;
}
function addSkill(){
  const n = document.getElementById('skName').value.trim();
  if(!n) return;
  state.trackers.skills.push({id:uid(),name:n,category:document.getElementById('skCat').value.trim(),currentLevel:Number(document.getElementById('skCur').value)||1,targetLevel:Number(document.getElementById('skTgt').value)||10,hours:0,lastPracticed:''});
  save(); renderCurrentTracker();
}
function updateSkillLevel(id,val){
  const sk = state.trackers.skills.find(x=>x.id===id);
  sk.currentLevel = Number(val); save(); renderCurrentTracker();
}
function addSkillHours(id,val){
  const h = Number(val); if(!h) return;
  const sk = state.trackers.skills.find(x=>x.id===id);
  sk.hours = (Number(sk.hours)||0) + h;
  sk.lastPracticed = new Date().toISOString();
  save(); renderCurrentTracker();
}
function deleteSkill(id){
  instantDelete({
    from: state.trackers.skills, predicate: s=>s.id===id,
    label: 'Skill excluída', rerender: renderCurrentTracker
  });
}
function initSkillsRadarChart(){
  const canvas = document.getElementById('skillsRadarChart');
  if(!canvas || typeof Chart === 'undefined') return;
  const list = (state.trackers?.skills || []).filter(s => s.name);
  if(list.length < 3) return;
  // destrói instância anterior pra evitar memory leak
  if(skillsChartInstance){ try{ skillsChartInstance.destroy(); }catch(_){} skillsChartInstance = null; }
  // Pega cor de acento dinâmica do tema
  const root = getComputedStyle(document.documentElement);
  const neon = (root.getPropertyValue('--neon').trim() || '#b061ff');
  const neon2 = (root.getPropertyValue('--neon-2').trim() || '#7a2bff');
  const good = (root.getPropertyValue('--good').trim() || '#5cffb1');
  // converte hex pra rgba
  const toRgba = (hex, a) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if(!m) return `rgba(176,97,255,${a})`;
    const n = parseInt(m[1], 16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  };
  const labels = list.map(s => s.name);
  const curData = list.map(s => Number(s.currentLevel) || 0);
  const tgtData = list.map(s => Number(s.targetLevel) || 0);
  skillsChartInstance = new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: 'Nível Atual',
          data: curData,
          backgroundColor: toRgba(neon, 0.22),
          borderColor: neon,
          borderWidth: 2.5,
          pointBackgroundColor: neon,
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: neon,
        },
        {
          label: 'Meta',
          data: tgtData,
          backgroundColor: toRgba(good, 0.08),
          borderColor: good,
          borderWidth: 2,
          borderDash: [6, 4],
          pointBackgroundColor: good,
          pointBorderColor: '#fff',
          pointRadius: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: good,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }, // legend customizada no header
        tooltip: {
          backgroundColor: 'rgba(22,9,47,0.95)',
          titleColor: '#efe8ff',
          bodyColor: '#efe8ff',
          borderColor: toRgba(neon, 0.5),
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleFont: { weight: '700', size: 13 },
          bodyFont: { size: 12 },
          callbacks: {
            label: c => `${c.dataset.label}: ${c.parsed.r}/10`
          }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 10,
          ticks: {
            stepSize: 2,
            color: '#7e6aa8',
            backdropColor: 'transparent',
            font: { size: 10, weight: '600' },
            showLabelBackdrop: false,
          },
          grid: { color: toRgba(neon, 0.12), lineWidth: 1 },
          angleLines: { color: toRgba(neon, 0.2), lineWidth: 1 },
          pointLabels: {
            color: '#d8c2ff',
            font: { size: 12, weight: '700' },
            padding: 6,
          }
        }
      },
      animation: { duration: 600, easing: 'easeOutQuart' }
    }
  });
}

/* ----- ANÁLISE (medos, fraquezas, pontos fortes) ----- */
function renderAnalysis(){
  const a = state.trackers.analysis;
  function col(title, key, cls, icon){
    const items = a[key] || [];
    return `
      <div class="analysis-col ${cls}">
        <h4>${icon} ${title} <span class="badge-pill" style="margin-left:auto">${items.length}</span></h4>
        <input type="text" placeholder="Adicionar..." onkeydown="if(event.key==='Enter'){addAnalysis('${key}',this.value);this.value=''}" />
        ${items.length ? items.map(it=>`
          <div class="analysis-item">
            <span>${escapeHtml(it.text)}</span>
            <button class="btn-icon" onclick="deleteAnalysis('${key}','${it.id}')" style="color:#ff7a9a">✕</button>
          </div>
        `).join('') : `<div style="color:var(--text-mute);font-size:12px;text-align:center;padding:8px">Vazio</div>`}
      </div>
    `;
  }
  return `
    <div class="stat-row">
      ${statCard('Medos Mapeados', a.fears.length, '', '#ff7a9a')}
      ${statCard('Fraquezas', a.weaknesses.length, '', '#ffb86b')}
      ${statCard('Pontos Fortes', a.strengths.length, '', '#5cffb1')}
      ${statCard('Equilíbrio', (a.strengths.length>=a.weaknesses.length+a.fears.length?'✓ Forte':'⚠ Trabalhar'), 'Fortes vs negativos', '#b061ff')}
    </div>
    <div class="analysis-grid">
      ${col('Medos','fears','analysis-fears','😨')}
      ${col('Fraquezas','weaknesses','analysis-weaknesses','⚠️')}
      ${col('Pontos Fortes','strengths','analysis-strengths','💪')}
    </div>
  `;
}
function addAnalysis(key,val){
  const t = (val||'').trim(); if(!t) return;
  state.trackers.analysis[key].push({id:uid(),text:t});
  save(); renderCurrentTracker();
}
function deleteAnalysis(key,id){
  state.trackers.analysis[key] = state.trackers.analysis[key].filter(i=>i.id!==id);
  save(); renderCurrentTracker();
}

/* ----- BUCKET LIST (antes de morrer) ----- */
function renderBucket(){
  const list = state.trackers.bucket;
  const done = list.filter(b=>b.done).length;
  const pct = list.length ? Math.round(done/list.length*100) : 0;
  return `
    <div class="stat-row">
      ${statCard('Total', list.length, 'Sonhos da vida', '#b061ff')}
      ${statCard('Realizados', done, '', '#5cffb1')}
      ${statCard('A Realizar', list.length-done, '', '#39d4ff')}
      ${statCard('Progresso de Vida', pct+'%', '', '#e26bff')}
    </div>
    <div class="tracker-add">
      <input type="text" class="form-input" id="bkTitle" placeholder="O que você quer fazer antes de morrer?" />
      <input type="text" class="form-input" id="bkCat" placeholder="Categoria (viagem, conquista...)" style="max-width:240px" />
      <button class="btn btn-primary" onclick="addBucket()">+ Adicionar</button>
    </div>
    <div class="tracker-list">
      ${list.length ? list.sort((a,b)=>a.done-b.done).map(b=>`
        <div class="tracker-item ${b.done?'done':''}">
          <label class="check-pill"><input type="checkbox" ${b.done?'checked':''} onchange="toggleBucket('${b.id}')" /><span></span></label>
          <div class="tracker-item-body">
            <div class="tracker-item-title">${escapeHtml(b.title)}</div>
            <div class="tracker-item-meta">
              ${b.category?`<span class="badge-pill">${escapeHtml(b.category)}</span>`:''}
              ${b.done && b.completedAt?`<span class="badge-pill green">✓ ${formatDate(b.completedAt.slice(0,10))}</span>`:''}
            </div>
          </div>
          <button class="btn-icon" onclick="deleteBucket('${b.id}')" style="color:#ff7a9a">🗑️</button>
        </div>
      `).join('') : emptyTracker('Sua bucket list está vazia. Comece a sonhar grande!')}
    </div>
  `;
}
function addBucket(){
  const t = document.getElementById('bkTitle').value.trim();
  if(!t) return;
  state.trackers.bucket.push({id:uid(),title:t,category:document.getElementById('bkCat').value.trim(),done:false,createdAt:new Date().toISOString()});
  save(); renderCurrentTracker();
}
function toggleBucket(id){
  const b = state.trackers.bucket.find(x=>x.id===id);
  b.done = !b.done;
  b.completedAt = b.done ? new Date().toISOString() : null;
  save(); renderCurrentTracker();
}
function deleteBucket(id){
  instantDelete({
    from: state.trackers.bucket, predicate: b=>b.id===id,
    label: 'Item excluído', rerender: renderCurrentTracker
  });
}

/* ----- TREINOS (board semanal Seg–Sex) ----- */
const WW_DAYS = [
  { id:'mon', label:'Segunda', short:'SEG', emoji:'🟣', color:'#b061ff' },
  { id:'tue', label:'Terça',   short:'TER', emoji:'🔵', color:'#39d4ff' },
  { id:'wed', label:'Quarta',  short:'QUA', emoji:'🟢', color:'#5cffb1' },
  { id:'thu', label:'Quinta',  short:'QUI', emoji:'🟡', color:'#ffb86b' },
  { id:'fri', label:'Sexta',   short:'SEX', emoji:'🟠', color:'#ff8c50' },
  { id:'sat', label:'Sábado',  short:'SÁB', emoji:'🔴', color:'#ff7a9a' },
  { id:'sun', label:'Domingo', short:'DOM', emoji:'🟣', color:'#e26bff' }
];

let wwDragId = null;
let wwDragFromDay = null;

function wwGetDays(){
  const all = WW_DAYS;
  return state.weeklyWorkoutsUi?.showWeekend ? all : all.slice(0,5);
}

function wwToggleWeekend(){
  state.weeklyWorkoutsUi.showWeekend = !state.weeklyWorkoutsUi.showWeekend;
  save(); renderCurrentTracker();
}

function wwAddExercise(day, name){
  name = (name||'').trim();
  if(!name) return;
  state.weeklyWorkouts[day] ||= [];
  state.weeklyWorkouts[day].push({
    id: uid(), name, sets:'', reps:'', weight:'', notes:'', done:false,
    created: new Date().toISOString()
  });
  save(); renderCurrentTracker();
}

function wwQuickAddSubmit(e, day){
  if(e.key !== 'Enter') return;
  e.preventDefault();
  wwAddExercise(day, e.target.value);
  e.target.value = '';
  setTimeout(()=>{
    const inp = document.querySelector(`.ww-quick-add[data-day="${day}"]`);
    if(inp) inp.focus();
  }, 30);
}

function wwUpdate(day, id, patch){
  const ex = (state.weeklyWorkouts[day]||[]).find(e=>e.id===id);
  if(!ex) return;
  Object.assign(ex, patch);
  save();
}

function wwToggleDone(day, id){
  const ex = (state.weeklyWorkouts[day]||[]).find(e=>e.id===id);
  if(!ex) return;
  ex.done = !ex.done;
  save(); renderCurrentTracker();
}

function wwDelete(day, id){
  state.weeklyWorkouts[day] = (state.weeklyWorkouts[day]||[]).filter(e=>e.id!==id);
  save(); renderCurrentTracker();
}

function wwClearDay(day){
  const snapshot = (state.weeklyWorkouts[day]||[]).slice();
  if(!snapshot.length) return;
  state.weeklyWorkouts[day] = [];
  save(); renderCurrentTracker();
  cortexToast({
    msg:`Dia limpo (${snapshot.length} exercícios)`, type:'warn',
    undo: ()=>{ state.weeklyWorkouts[day] = snapshot; save(); renderCurrentTracker(); cortexToast({msg:'Restaurado',type:'info'}); }
  });
}

function wwClearAll(){
  const snapshot = JSON.parse(JSON.stringify(state.weeklyWorkouts));
  WW_DAYS.forEach(d => { state.weeklyWorkouts[d.id] = []; });
  save(); renderCurrentTracker();
  cortexToast({
    msg:'Semana inteira limpa', type:'warn',
    undo: ()=>{ state.weeklyWorkouts = snapshot; save(); renderCurrentTracker(); cortexToast({msg:'Semana restaurada',type:'info'}); }
  });
}

function wwCopyDay(fromDay){
  const src = state.weeklyWorkouts[fromDay] || [];
  if(!src.length){ cortexToast({msg:'Dia vazio. Adicione exercícios primeiro.',type:'warn'}); return; }
  const target = prompt('Copiar para qual dia? (seg, ter, qua, qui, sex, sab, dom)');
  if(!target) return;
  const map = { seg:'mon', ter:'tue', qua:'wed', qui:'thu', sex:'fri', sab:'sat', dom:'sun' };
  const t = map[(target||'').toLowerCase().slice(0,3)];
  if(!t) { cortexToast({msg:'Dia inválido. Use seg/ter/qua/qui/sex/sab/dom.',type:'error'}); return; }
  if(t === fromDay) return;
  const snapshot = (state.weeklyWorkouts[t]||[]).slice();
  state.weeklyWorkouts[t] = src.map(e => ({...e, id:uid(), done:false}));
  save(); renderCurrentTracker();
  cortexToast({
    msg:`${src.length} exercícios copiados`, type:'success',
    undo: ()=>{ state.weeklyWorkouts[t] = snapshot; save(); renderCurrentTracker(); cortexToast({msg:'Desfeito',type:'info'}); }
  });
}

/* drag/drop entre colunas */
function wwOnDragStart(e, day, id){
  wwDragId = id; wwDragFromDay = day;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('ww-dragging');
}
function wwOnDragEnd(e){
  e.currentTarget.classList.remove('ww-dragging');
  document.querySelectorAll('.ww-col').forEach(c=>c.classList.remove('ww-drop-active'));
  wwDragId = null; wwDragFromDay = null;
}
function wwOnDragOver(e){
  if(!wwDragId) return;
  e.preventDefault();
  e.currentTarget.classList.add('ww-drop-active');
}
function wwOnDragLeave(e){
  if(e.currentTarget.contains(e.relatedTarget)) return;
  e.currentTarget.classList.remove('ww-drop-active');
}
function wwOnDrop(e, toDay){
  e.preventDefault();
  e.currentTarget.classList.remove('ww-drop-active');
  if(!wwDragId || !wwDragFromDay || wwDragFromDay === toDay) return;
  const ex = (state.weeklyWorkouts[wwDragFromDay]||[]).find(x=>x.id===wwDragId);
  if(!ex) return;
  state.weeklyWorkouts[wwDragFromDay] = state.weeklyWorkouts[wwDragFromDay].filter(x=>x.id!==wwDragId);
  state.weeklyWorkouts[toDay] ||= [];
  state.weeklyWorkouts[toDay].push(ex);
  save(); renderCurrentTracker();
}

function renderWorkoutsTracker(){
  const days = wwGetDays();
  const totals = WW_DAYS.reduce((acc,d)=>{
    const list = state.weeklyWorkouts[d.id]||[];
    acc.total += list.length;
    acc.done += list.filter(e=>e.done).length;
    return acc;
  }, {total:0, done:0});
  const pct = totals.total ? Math.round(totals.done/totals.total*100) : 0;
  const dayIdx = new Date().getDay(); // 0=dom..6=sab
  const todayId = ['sun','mon','tue','wed','thu','fri','sat'][dayIdx];

  return `
    <div class="stat-row">
      ${statCard('Exercícios da Semana', totals.total, '', '#b061ff')}
      ${statCard('Concluídos', totals.done, totals.total?pct+'%':'—', '#5cffb1')}
      ${statCard('Restantes', totals.total - totals.done, '', '#ffb86b')}
      ${statCard('Dias com plano', WW_DAYS.filter(d=>(state.weeklyWorkouts[d.id]||[]).length).length, 'de 7', '#39d4ff')}
    </div>
    <div class="ww-toolbar">
      <div class="ww-toolbar-left">
        <button class="dc-toolbar-btn" onclick="wwToggleWeekend()">${state.weeklyWorkoutsUi.showWeekend ? '✓ Mostrando finais de semana' : '+ Incluir fim de semana'}</button>
        <button class="dc-toolbar-btn" onclick="wwClearAll()" style="color:#ff7a9a">🗑️ Limpar semana</button>
      </div>
      <div class="ww-toolbar-right">
        <span class="ww-toolbar-hint">Dica: <kbd>Enter</kbd> no input do dia para adicionar · arraste exercícios entre colunas</span>
      </div>
    </div>
    <div class="ww-board" style="--cols:${days.length}">
      ${days.map(d => {
        const list = state.weeklyWorkouts[d.id] || [];
        const doneCount = list.filter(e=>e.done).length;
        const isToday = d.id === todayId;
        return `
          <div class="ww-col ${isToday?'is-today':''}"
               style="--day-color:${d.color}"
               ondragover="wwOnDragOver(event)"
               ondragleave="wwOnDragLeave(event)"
               ondrop="wwOnDrop(event,'${d.id}')">
            <header class="ww-col-head">
              <div class="ww-col-head-main">
                <span class="ww-day-dot"></span>
                <div>
                  <div class="ww-day-name">${d.label} ${isToday?'<span class="ww-today-pill">HOJE</span>':''}</div>
                  <div class="ww-day-meta">${list.length} ex · ${doneCount}/${list.length||0} feitos</div>
                </div>
              </div>
              <div class="ww-col-actions">
                <button class="dc-act" title="Copiar dia para outro" onclick="wwCopyDay('${d.id}')">📑</button>
                <button class="dc-act dc-act-danger" title="Limpar dia" onclick="wwClearDay('${d.id}')" ${!list.length?'disabled style="opacity:0.3"':''}>🗑️</button>
              </div>
            </header>
            <div class="ww-list">
              ${list.length ? list.map(ex => wwExerciseRow(d.id, ex)).join('') : `
                <div class="ww-empty">Nenhum exercício.<br><span style="opacity:0.6;font-size:11px">Use o campo abaixo para adicionar.</span></div>
              `}
            </div>
            <div class="ww-add-row">
              <input type="text" class="ww-quick-add" data-day="${d.id}"
                     placeholder="+ Adicionar exercício..."
                     onkeydown="wwQuickAddSubmit(event,'${d.id}')" />
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function wwExerciseRow(day, ex){
  const done = !!ex.done;
  return `
    <div class="ww-ex ${done?'is-done':''}" data-id="${ex.id}"
         draggable="true"
         ondragstart="wwOnDragStart(event,'${day}','${ex.id}')"
         ondragend="wwOnDragEnd(event)">
      <label class="ww-check">
        <input type="checkbox" ${done?'checked':''} onchange="wwToggleDone('${day}','${ex.id}')" />
        <span></span>
      </label>
      <div class="ww-ex-body">
        <input type="text" class="ww-ex-name" value="${escapeAttr(ex.name||'')}"
               placeholder="Nome do exercício"
               oninput="wwUpdate('${day}','${ex.id}',{name:this.value})" />
        <div class="ww-ex-numbers">
          <input type="text" inputmode="numeric" placeholder="séries"
                 value="${escapeAttr(ex.sets||'')}"
                 oninput="wwUpdate('${day}','${ex.id}',{sets:this.value})" />
          <span class="ww-ex-sep">×</span>
          <input type="text" inputmode="numeric" placeholder="reps"
                 value="${escapeAttr(ex.reps||'')}"
                 oninput="wwUpdate('${day}','${ex.id}',{reps:this.value})" />
          <input type="text" inputmode="decimal" placeholder="kg"
                 value="${escapeAttr(ex.weight||'')}"
                 oninput="wwUpdate('${day}','${ex.id}',{weight:this.value})" />
        </div>
      </div>
      <button class="dc-act dc-act-danger ww-del" onclick="wwDelete('${day}','${ex.id}')" title="Remover">✕</button>
    </div>
  `;
}

/* ----- HÁBITOS RUINS (como tracker) ----- */
function renderBadHabitsTracker(){
  const list = state.habits || [];
  const longest = list.length ? Math.max(...list.map(h=>Math.floor((Date.now()-h.since)/86400000))) : 0;
  const totalDays = list.reduce((s,h)=>s+Math.floor((Date.now()-h.since)/86400000), 0);
  const avgDays = list.length ? Math.round(totalDays/list.length) : 0;
  const solid = list.filter(h=>Math.floor((Date.now()-h.since)/86400000) >= 30).length;
  return `
    <div class="stat-row">
      ${statCard('Hábitos Rastreados', list.length, '', '#ff7a9a')}
      ${statCard('Maior Streak', longest+' dias', 'Sem recair', '#5cffb1')}
      ${statCard('Média Geral', avgDays+' dias', '', '#b061ff')}
      ${statCard('Sólidos (>30d)', solid, list.length?Math.round(solid/list.length*100)+'%':'—', '#39d4ff')}
    </div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
      <button class="btn btn-primary" onclick="openHabitModal()">+ Novo Hábito Ruim</button>
    </div>
    <div class="habits-grid" id="habitsGrid"></div>
  `;
}

