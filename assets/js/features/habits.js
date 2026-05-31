/* =========================================================
   HÁBITOS · sistema completo (positivos)
   ========================================================= */
const HABIT_COLORS = ['#b061ff','#e26bff','#39d4ff','#5cffb1','#ffb86b','#ff7a9a','#ff8c50','#7e6aa8','#ffd700','#00ff41'];

function defaultHabitsList(){ return []; }
function hbpStreak(h){
  let s = 0;
  for(let i=0; i<730; i++){
    const d = new Date(); d.setDate(d.getDate() - i);
    if((h.log||{})[toDateStr(d)]) s++;
    else if(i > 0) break;
  }
  return s;
}
function hbpLongestStreak(h){
  const dates = Object.keys(h.log||{}).filter(k => (h.log||{})[k]).sort();
  if(!dates.length) return 0;
  let longest = 1, current = 1;
  for(let i=1; i<dates.length; i++){
    const diff = Math.round((new Date(dates[i]) - new Date(dates[i-1])) / 86400000);
    if(diff === 1) current++;
    else current = 1;
    if(current > longest) longest = current;
  }
  return longest;
}
function hbpCompletionRate(h, days=30){
  let done = 0;
  for(let i=0; i<days; i++){
    const d = new Date(); d.setDate(d.getDate() - i);
    if((h.log||{})[toDateStr(d)]) done++;
  }
  return Math.round(done/days*100);
}
function renderHabitsPage(){
  const list = (state.habitsList||[]).filter(h => !h.archived);
  const today = todayStr();

  // Sincroniza estado da view (toggle/visibilidade) com o que tá salvo
  const view = state.settings?.habitsView || 'lista';
  const listaEl = document.getElementById('hbpViewLista');
  const dashEl = document.getElementById('hbpViewDashboard');
  if(listaEl) listaEl.style.display = view==='lista' ? '' : 'none';
  if(dashEl) dashEl.style.display = view==='dashboard' ? '' : 'none';
  document.querySelectorAll('[data-hbpview]').forEach(b=>{
    b.classList.toggle('active', b.dataset.hbpview === view);
  });

  if(view === 'dashboard'){
    renderHabitsDashboard();
    return;
  }

  // Stats
  const statsEl = document.getElementById('hbpStats');
  if(statsEl){
    const doneToday = list.filter(h => (h.log||{})[today]).length;
    const streaks = list.map(hbpStreak);
    const avgStreak = streaks.length ? Math.round(streaks.reduce((a,b)=>a+b,0)/streaks.length) : 0;
    const maxStreak = streaks.length ? Math.max(...streaks) : 0;
    statsEl.innerHTML = [
      statCard('Hábitos Ativos', list.length, '', '#b061ff'),
      statCard('Concluídos Hoje', `${doneToday}/${list.length}`, '', (doneToday>=list.length && list.length)?'#5cffb1':'#39d4ff'),
      statCard('Streak Médio', avgStreak+' dias', '', '#ffb86b'),
      statCard('Maior Streak', maxStreak+' dias', '', '#e26bff'),
    ].join('');
  }

  // Today
  const todayEl = document.getElementById('hbpTodayRow');
  if(todayEl){
    if(!list.length){
      todayEl.innerHTML = '<div style="color:var(--text-mute);font-size:13px;padding:14px 0">Nenhum hábito ainda — clique em <strong>+ Novo Hábito</strong> para começar.</div>';
    } else {
      todayEl.innerHTML = list.map(h => {
        const done = !!(h.log||{})[today];
        const streak = hbpStreak(h);
        return `
          <div class="habit-today-card ${done?'done':''}" style="--h-color:${h.color||'#b061ff'}" onclick="toggleHabitDay('${h.id}','${today}')">
            <div class="habit-today-emoji">${escapeHtml(h.emoji||'✨')}</div>
            <div class="habit-today-info">
              <div class="ht-name">${escapeHtml(h.name)}</div>
              <div class="ht-streak">🔥 ${streak} dias${h.targetTime && h.targetTime!=='qualquer' ? ' · '+escapeHtml(h.targetTime) : ''}</div>
            </div>
            <div class="habit-today-check"></div>
          </div>
        `;
      }).join('');
    }
  }

  // List with heatmap
  const listEl = document.getElementById('hbpListGrid');
  if(listEl){
    if(!list.length){
      listEl.innerHTML = '<div class="empty-tracker" style="grid-column:1/-1">✨ Nenhum hábito cadastrado.<br>Crie o primeiro e comece a construir sua melhor versão!</div>';
    } else {
      listEl.innerHTML = list.map(h => {
        const streak = hbpStreak(h);
        const longest = hbpLongestStreak(h);
        const rate = hbpCompletionRate(h);
        const doneToday = !!(h.log||{})[today];
        const days = [];
        for(let i=29; i>=0; i--){
          const d = new Date(); d.setDate(d.getDate() - i);
          const k = toDateStr(d);
          days.push({date:k, done:!!(h.log||{})[k], isToday:k===today});
        }
        return `
          <div class="habit-pro-card" style="--h-color:${h.color||'#b061ff'}">
            <div class="habit-pro-head">
              <div class="habit-pro-emoji">${escapeHtml(h.emoji||'✨')}</div>
              <div class="habit-pro-title-block">
                <h4 class="habit-pro-name">${escapeHtml(h.name)}</h4>
                <div class="habit-pro-meta">
                  ${h.category ? `<span class="badge-pill">${escapeHtml(h.category)}</span>` : ''}
                  ${(h.targetTime && h.targetTime !== 'qualquer') ? `<span class="badge-pill cyan">${escapeHtml(h.targetTime)}</span>` : ''}
                  ${h.type === 'weekly' ? `<span class="badge-pill warn">${h.frequency||3}×/semana</span>` : '<span class="badge-pill green">diário</span>'}
                </div>
              </div>
              <div class="habit-pro-actions">
                <button class="btn-icon" onclick="openHabitItemModal('${h.id}')" title="Editar">✏️</button>
                <button class="btn-icon" onclick="deleteHabitItem('${h.id}')" style="color:#ff7a9a" title="Excluir">🗑️</button>
              </div>
            </div>
            <div class="habit-pro-stats">
              <div class="habit-stat">
                <div class="habit-stat-value">🔥 ${streak}</div>
                <div class="habit-stat-label">Streak</div>
              </div>
              <div class="habit-stat">
                <div class="habit-stat-value">${longest}</div>
                <div class="habit-stat-label">Maior</div>
              </div>
              <div class="habit-stat">
                <div class="habit-stat-value">${rate}%</div>
                <div class="habit-stat-label">30d</div>
              </div>
            </div>
            <div class="habit-heatmap">
              ${days.map(d => `<div class="habit-day-dot ${d.done?'done':''} ${d.isToday?'today':''}" title="${d.date}${d.done?' ✓':''}"></div>`).join('')}
            </div>
            <button class="habit-pro-toggle ${doneToday?'done':''}" onclick="toggleHabitDay('${h.id}','${today}')">
              ${doneToday ? '✓ Feito hoje' : '○ Marcar como feito hoje'}
            </button>
            ${h.notes ? `<div class="habit-pro-notes">${escapeHtml(h.notes)}</div>` : ''}
          </div>
        `;
      }).join('');
    }
  }
}
function setHabitsView(view){
  state.settings.habitsView = view;
  save();
  document.querySelectorAll('[data-hbpview]').forEach(b=>{
    b.classList.toggle('active', b.dataset.hbpview === view);
  });
  document.getElementById('hbpViewLista').style.display = view==='lista' ? '' : 'none';
  document.getElementById('hbpViewDashboard').style.display = view==='dashboard' ? '' : 'none';
  renderHabitsPage();
}

let _hbpCharts = { weekly:null, category:null, time:null };
function destroyHbpCharts(){
  Object.keys(_hbpCharts).forEach(k=>{
    if(_hbpCharts[k]){ try{ _hbpCharts[k].destroy(); }catch(_){} _hbpCharts[k]=null; }
  });
}

function renderHabitsDashboard(){
  const root = document.getElementById('hbpDashboardContent');
  if(!root) return;
  const list = (state.habitsList||[]).filter(h => !h.archived);
  const today = todayStr();
  destroyHbpCharts();

  if(!list.length){
    root.innerHTML = `
      <div class="empty-tracker" style="padding:60px 20px">
        ✨ Nenhum hábito cadastrado.<br>
        Crie o primeiro hábito para começar a ver seu dashboard.
      </div>`;
    return;
  }

  // ── Métricas globais ──────────────────────────────────
  const doneToday = list.filter(h => (h.log||{})[today]).length;
  const streaks = list.map(hbpStreak);
  const avgStreak = streaks.length ? Math.round(streaks.reduce((a,b)=>a+b,0)/streaks.length) : 0;
  const maxStreakEver = list.length ? Math.max(...list.map(hbpLongestStreak)) : 0;
  const rates30d = list.map(h => hbpCompletionRate(h, 30));
  const avgRate30 = rates30d.length ? Math.round(rates30d.reduce((a,b)=>a+b,0)/rates30d.length) : 0;
  // Conclusões totais nos últimos 30 dias
  let totalDone30 = 0;
  for(let i=0;i<30;i++){
    const d=new Date(); d.setDate(d.getDate()-i); const k=toDateStr(d);
    list.forEach(h=>{ if((h.log||{})[k]) totalDone30++; });
  }

  // ── Atividade últimos 7 dias ──────────────────────────
  const week = [];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const k=toDateStr(d);
    const done = list.filter(h => (h.log||{})[k]).length;
    week.push({
      label:['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()],
      date:k, done, total:list.length
    });
  }

  // ── Categoria ──────────────────────────────────────────
  const catMap = {};
  list.forEach(h => {
    const cat = h.category || 'Sem categoria';
    catMap[cat] = (catMap[cat]||0) + 1;
  });
  const catEntries = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);

  // ── Horários ──────────────────────────────────────────
  const timeMap = {manha:0, tarde:0, noite:0, qualquer:0};
  list.forEach(h => {
    const t = h.targetTime || 'qualquer';
    const key = t==='manhã'?'manha' : (timeMap[t]!==undefined ? t : 'qualquer');
    timeMap[key]++;
  });
  const timeLabels = ['Manhã','Tarde','Noite','Qualquer'];
  const timeVals = [timeMap.manha, timeMap.tarde, timeMap.noite, timeMap.qualquer];

  // ── Top streaks ───────────────────────────────────────
  const topStreaks = [...list]
    .map(h => ({h, streak:hbpStreak(h)}))
    .sort((a,b)=>b.streak-a.streak)
    .slice(0,5);

  // ── Em risco (taxa < 50%) ─────────────────────────────
  const atRisk = list
    .map(h => ({h, rate:hbpCompletionRate(h,30), streak:hbpStreak(h)}))
    .filter(x => x.rate < 50)
    .sort((a,b)=>a.rate-b.rate)
    .slice(0,6);

  // ── Heatmap consolidado (12 semanas) ──────────────────
  const heatDays = 12*7;
  const heatGrid = [];
  for(let i=heatDays-1; i>=0; i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const k=toDateStr(d);
    const done = list.filter(h => (h.log||{})[k]).length;
    heatGrid.push({date:k, done, total:list.length, isToday:k===today});
  }

  // ── Render ─────────────────────────────────────────────
  root.innerHTML = `
    <div class="stat-row">
      ${statCard('Hábitos Ativos', list.length, '', '#b061ff')}
      ${statCard('Concluídos Hoje', `${doneToday}/${list.length}`, doneToday>=list.length?'Dia completo 🎉':'em andamento', (doneToday>=list.length && list.length)?'#5cffb1':'#39d4ff')}
      ${statCard('Taxa Média 30d', avgRate30+'%', `${totalDone30} conclusões`, '#ffb86b')}
      ${statCard('Maior Streak', maxStreakEver+' dias', `Médio: ${avgStreak}d`, '#e26bff')}
    </div>

    <div class="hbp-dash-grid">
      <div class="hbp-dash-card">
        <h3 class="hbp-dash-title">📅 Últimos 7 dias</h3>
        <p class="hbp-dash-sub">Conclusões totais por dia</p>
        <div class="hbp-chart-wrap"><canvas id="hbpChartWeekly"></canvas></div>
      </div>

      <div class="hbp-dash-card">
        <h3 class="hbp-dash-title">🏷️ Por categoria</h3>
        <p class="hbp-dash-sub">Distribuição dos hábitos ativos</p>
        <div class="hbp-chart-wrap"><canvas id="hbpChartCategory"></canvas></div>
      </div>

      <div class="hbp-dash-card">
        <h3 class="hbp-dash-title">🔥 Top 5 Streaks</h3>
        <p class="hbp-dash-sub">Suas melhores sequências atuais</p>
        <div class="hbp-rank-list">
          ${topStreaks.map((t,i) => {
            const max = topStreaks[0].streak || 1;
            const w = Math.max(8, Math.round(t.streak/max*100));
            return `
              <div class="hbp-rank-row" style="--h-color:${t.h.color||'#b061ff'}">
                <span class="hbp-rank-pos">${i+1}</span>
                <span class="hbp-rank-emoji">${escapeHtml(t.h.emoji||'✨')}</span>
                <div class="hbp-rank-bar-wrap">
                  <div class="hbp-rank-name">${escapeHtml(t.h.name)}</div>
                  <div class="hbp-rank-bar"><div class="hbp-rank-fill" style="width:${w}%"></div></div>
                </div>
                <span class="hbp-rank-val">🔥 ${t.streak}d</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="hbp-dash-card">
        <h3 class="hbp-dash-title">⏰ Por horário ideal</h3>
        <p class="hbp-dash-sub">Quando seus hábitos acontecem</p>
        <div class="hbp-chart-wrap"><canvas id="hbpChartTime"></canvas></div>
      </div>

      <div class="hbp-dash-card hbp-dash-wide">
        <h3 class="hbp-dash-title">🗓️ Heatmap consolidado · 12 semanas</h3>
        <p class="hbp-dash-sub">Intensidade = quantos hábitos foram feitos no dia</p>
        <div class="hbp-mega-heatmap">
          ${heatGrid.map(d => {
            const pct = d.total ? d.done/d.total : 0;
            const intensity = pct === 0 ? 0 : pct < 0.34 ? 1 : pct < 0.67 ? 2 : pct < 1 ? 3 : 4;
            return `<div class="hbp-heat-cell intensity-${intensity} ${d.isToday?'is-today':''}" title="${d.date} · ${d.done}/${d.total}"></div>`;
          }).join('')}
        </div>
        <div class="hbp-heat-legend">
          <span>Menos</span>
          <div class="hbp-heat-cell intensity-0"></div>
          <div class="hbp-heat-cell intensity-1"></div>
          <div class="hbp-heat-cell intensity-2"></div>
          <div class="hbp-heat-cell intensity-3"></div>
          <div class="hbp-heat-cell intensity-4"></div>
          <span>Mais</span>
        </div>
      </div>

      <div class="hbp-dash-card hbp-dash-wide">
        <h3 class="hbp-dash-title">⚠️ Hábitos em risco</h3>
        <p class="hbp-dash-sub">Taxa de conclusão abaixo de 50% nos últimos 30 dias</p>
        ${atRisk.length ? `
          <div class="hbp-risk-list">
            ${atRisk.map(x => `
              <div class="hbp-risk-row" style="--h-color:${x.h.color||'#b061ff'}">
                <span class="hbp-risk-emoji">${escapeHtml(x.h.emoji||'✨')}</span>
                <div class="hbp-risk-info">
                  <div class="hbp-risk-name">${escapeHtml(x.h.name)}</div>
                  <div class="hbp-risk-meta">
                    ${x.h.category ? `<span class="badge-pill">${escapeHtml(x.h.category)}</span>` : ''}
                    <span>🔥 ${x.streak}d</span>
                  </div>
                </div>
                <div class="hbp-risk-rate">
                  <div class="hbp-risk-bar"><div class="hbp-risk-fill" style="width:${x.rate}%"></div></div>
                  <span class="hbp-risk-pct">${x.rate}%</span>
                </div>
                <button class="btn-icon" onclick="openHabitItemModal('${x.h.id}')" title="Editar">✏️</button>
              </div>
            `).join('')}
          </div>
        ` : `<div class="hbp-risk-empty">🎉 Todos os hábitos estão em dia (acima de 50%)!</div>`}
      </div>
    </div>
  `;

  // ── Charts ─────────────────────────────────────────────
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--neon').trim() || '#b061ff';
  const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--neon-2').trim() || '#7a2bff';
  const palette = ['#b061ff','#39d4ff','#5cffb1','#ffb86b','#ff7a9a','#e26bff','#ffd700','#00ff41','#ff8c50','#7e6aa8'];

  // Weekly bar
  const ctxW = document.getElementById('hbpChartWeekly');
  if(ctxW){
    const grad = ctxW.getContext('2d').createLinearGradient(0,0,0,260);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, 'rgba(176,97,255,0.15)');
    _hbpCharts.weekly = new Chart(ctxW, {
      type:'bar',
      data:{
        labels: week.map(w=>w.label),
        datasets:[{
          label:'Conclusões', data:week.map(w=>w.done),
          backgroundColor:grad, borderColor:accent, borderWidth:1, borderRadius:6, maxBarThickness:36
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor:'rgba(22,9,47,0.95)', titleColor:'#efe8ff', bodyColor:'#efe8ff',
            borderColor:'rgba(176,97,255,0.4)', borderWidth:1, padding:10, cornerRadius:8,
            callbacks:{label:c=>c.raw+'/'+list.length+' hábitos'}
          }
        },
        scales:{
          x:{grid:{display:false},ticks:{color:'#b8a8d8',font:{size:11}}},
          y:{grid:{color:'rgba(170,120,255,0.1)'},ticks:{color:'#b8a8d8',stepSize:1,precision:0},beginAtZero:true,suggestedMax:list.length}
        }
      }
    });
  }

  // Category donut
  const ctxC = document.getElementById('hbpChartCategory');
  if(ctxC && catEntries.length){
    _hbpCharts.category = new Chart(ctxC, {
      type:'doughnut',
      data:{
        labels:catEntries.map(e=>e[0]),
        datasets:[{
          data:catEntries.map(e=>e[1]),
          backgroundColor:catEntries.map((_,i)=>palette[i%palette.length]),
          borderColor:'rgba(7,3,15,0.9)', borderWidth:2
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false, cutout:'62%',
        plugins:{
          legend:{position:'bottom',labels:{color:'#b8a8d8',font:{size:11},padding:10,usePointStyle:true,boxWidth:8}},
          tooltip:{
            backgroundColor:'rgba(22,9,47,0.95)', titleColor:'#efe8ff', bodyColor:'#efe8ff',
            borderColor:'rgba(176,97,255,0.4)', borderWidth:1, padding:10, cornerRadius:8,
            callbacks:{label:c=>c.label+': '+c.raw+' hábito'+(c.raw===1?'':'s')}
          }
        }
      }
    });
  }

  // Time donut
  const ctxT = document.getElementById('hbpChartTime');
  if(ctxT){
    _hbpCharts.time = new Chart(ctxT, {
      type:'doughnut',
      data:{
        labels:timeLabels,
        datasets:[{
          data:timeVals,
          backgroundColor:['#ffb86b','#39d4ff','#b061ff','#5cffb1'],
          borderColor:'rgba(7,3,15,0.9)', borderWidth:2
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false, cutout:'62%',
        plugins:{
          legend:{position:'bottom',labels:{color:'#b8a8d8',font:{size:11},padding:10,usePointStyle:true,boxWidth:8}},
          tooltip:{
            backgroundColor:'rgba(22,9,47,0.95)', titleColor:'#efe8ff', bodyColor:'#efe8ff',
            borderColor:'rgba(176,97,255,0.4)', borderWidth:1, padding:10, cornerRadius:8
          }
        }
      }
    });
  }
}

function toggleHabitDay(id, date){
  const h = state.habitsList.find(x => x.id === id);
  if(!h) return;
  h.log = h.log || {};
  if(h.log[date]) delete h.log[date];
  else h.log[date] = true;
  save();
  renderHabitsPage();
}
function renderHbpColors(selected){
  const row = document.getElementById('hbpColorRow');
  if(!row) return;
  row.innerHTML = HABIT_COLORS.map(c => `
    <div class="color-opt ${c===selected?'selected':''}" style="background:${c};color:${c}" onclick="pickHbpColor('${c}')"></div>
  `).join('');
}
function pickHbpColor(c){
  document.getElementById('hbpColor').value = c;
  renderHbpColors(c);
}
function openHabitItemModal(id){
  const form = document.getElementById('habitItemForm');
  form.reset();
  document.getElementById('hbpId').value = '';
  document.getElementById('hbpColor').value = HABIT_COLORS[0];
  document.getElementById('hbpEmoji').value = '✨';
  document.getElementById('hbpType').value = 'daily';
  document.getElementById('hbpFreqField').style.display = 'none';
  document.getElementById('hbpTime').value = 'qualquer';
  renderHbpColors(HABIT_COLORS[0]);
  document.getElementById('hbpDeleteBtn').style.display = 'none';
  document.getElementById('hbpModalTitle').textContent = 'Novo Hábito';
  if(id){
    const h = state.habitsList.find(x => x.id === id);
    if(h){
      document.getElementById('hbpId').value = h.id;
      document.getElementById('hbpName').value = h.name;
      document.getElementById('hbpEmoji').value = h.emoji||'✨';
      document.getElementById('hbpCategory').value = h.category||'';
      document.getElementById('hbpTime').value = h.targetTime||'qualquer';
      document.getElementById('hbpType').value = h.type||'daily';
      document.getElementById('hbpFrequency').value = h.frequency||3;
      document.getElementById('hbpFreqField').style.display = (h.type==='weekly') ? '' : 'none';
      document.getElementById('hbpColor').value = h.color || HABIT_COLORS[0];
      renderHbpColors(h.color || HABIT_COLORS[0]);
      document.getElementById('hbpNotes').value = h.notes||'';
      document.getElementById('hbpDeleteBtn').style.display = '';
      document.getElementById('hbpModalTitle').textContent = 'Editar Hábito';
    }
  }
  openModal('habitItemModal');
}
function saveHabitItem(e){
  e.preventDefault();
  const id = document.getElementById('hbpId').value;
  const data = {
    name: document.getElementById('hbpName').value.trim(),
    emoji: document.getElementById('hbpEmoji').value.trim() || '✨',
    category: document.getElementById('hbpCategory').value.trim(),
    targetTime: document.getElementById('hbpTime').value,
    type: document.getElementById('hbpType').value,
    frequency: Number(document.getElementById('hbpFrequency').value) || 7,
    color: document.getElementById('hbpColor').value || HABIT_COLORS[0],
    notes: document.getElementById('hbpNotes').value.trim(),
  };
  if(id){
    const h = state.habitsList.find(x => x.id === id);
    Object.assign(h, data);
  } else {
    state.habitsList.push({id:uid(), ...data, log:{}, archived:false, createdAt:new Date().toISOString()});
  }
  save();
  closeModal('habitItemModal');
  renderHabitsPage();
}
function deleteHabitItem(idArg){
  const id = idArg || document.getElementById('hbpId').value;
  if(!id) return;
  if(document.getElementById('habitItemModal').classList.contains('show')) closeModal('habitItemModal');
  instantDelete({
    from: state.habitsList,
    predicate: h => h.id === id,
    label: 'Hábito excluído (histórico preservado no Desfazer)',
    rerender: renderHabitsPage
  });
}

