/* =========================================================
   PROJECTS · iniciativas com tarefas, prazo, progresso
   ========================================================= */
const PROJECT_COLORS = ['#b061ff','#e26bff','#39d4ff','#5cffb1','#ffb86b','#ff7a9a','#ff8c50','#7e6aa8'];
let projectFilter = 'todos';
let expandedProjects = new Set();

function defaultProjects(){ return []; }
function projectProgress(p){
  const total = (p.tasks||[]).length;
  if(!total) return p.manualProgress || 0;
  const done = p.tasks.filter(t=>t.done).length;
  return Math.round(done/total*100);
}
function projectStatusLabel(s){
  return ({planejamento:'planejamento',ativo:'ativo',pausado:'pausado',concluido:'concluído',cancelado:'cancelado'})[s] || s;
}
function daysUntil(date){
  if(!date) return null;
  const t = new Date(date); t.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((t - now) / 86400000);
}

function setProjectFilter(f){ projectFilter = f; renderProjects(); }
function toggleProjectExpand(id){
  if(expandedProjects.has(id)) expandedProjects.delete(id);
  else expandedProjects.add(id);
  renderProjects();
}

function renderProjects(){
  const list = state.projects || [];
  const statusCounts = {
    todos: list.length,
    ativo: list.filter(p=>p.status==='ativo').length,
    planejamento: list.filter(p=>p.status==='planejamento').length,
    pausado: list.filter(p=>p.status==='pausado').length,
    concluido: list.filter(p=>p.status==='concluido').length,
  };
  const active = list.filter(p=>p.status==='ativo');
  const today = todayStr();
  const overdue = list.filter(p=>p.status==='ativo' && p.deadline && p.deadline < today).length;
  const avgProgress = active.length ? Math.round(active.reduce((s,p)=>s+projectProgress(p),0)/active.length) : 0;
  const completedThisMonth = list.filter(p=>p.status==='concluido' && (p.completedAt||'').startsWith(today.slice(0,7))).length;

  // stats
  const statsEl = document.getElementById('projectStats');
  if(statsEl){
    statsEl.innerHTML = [
      statCard('Ativos', statusCounts.ativo, list.length+' total', '#39d4ff'),
      statCard('Progresso Médio', avgProgress+'%', 'Dos ativos', '#b061ff'),
      statCard('Concluídos no Mês', completedThisMonth, '', '#5cffb1'),
      statCard('Atrasados', overdue, 'Prazo vencido', '#ff7a9a'),
    ].join('');
  }

  // filters
  const filtersEl = document.getElementById('projectFilters');
  if(filtersEl){
    const filters = [
      ['todos','Todos',statusCounts.todos],
      ['ativo','Ativos',statusCounts.ativo],
      ['planejamento','Planejamento',statusCounts.planejamento],
      ['pausado','Pausados',statusCounts.pausado],
      ['concluido','Concluídos',statusCounts.concluido],
    ];
    filtersEl.innerHTML = filters.map(([k,l,c])=>`
      <button class="tracker-pill ${projectFilter===k?'active':''}" onclick="setProjectFilter('${k}')">
        <span>${l}</span><span style="opacity:0.7;font-weight:800">${c}</span>
      </button>
    `).join('');
  }

  // cards
  const filtered = projectFilter==='todos' ? list : list.filter(p=>p.status===projectFilter);
  const sorted = [...filtered].sort((a,b)=>{
    const order = {planejamento:0,ativo:1,pausado:2,concluido:3,cancelado:4};
    if(order[a.status]!==order[b.status]) return order[a.status]-order[b.status];
    return (a.deadline||'9').localeCompare(b.deadline||'9');
  });

  const gridEl = document.getElementById('projectGrid');
  if(!gridEl) return;
  if(!sorted.length){
    gridEl.innerHTML = `<div class="empty-tracker" style="grid-column:1/-1">${projectFilter==='todos'?'Nenhum projeto. Crie o primeiro!':'Nenhum projeto neste status.'}</div>`;
    return;
  }
  gridEl.innerHTML = sorted.map(p=>{
    const pct = projectProgress(p);
    const tasks = p.tasks||[];
    const doneCount = tasks.filter(t=>t.done).length;
    const days = daysUntil(p.deadline);
    const isOverdue = days !== null && days < 0 && p.status==='ativo';
    const isExpanded = expandedProjects.has(p.id);
    const daysLabel = days === null ? '' : (
      days < 0 ? ` (${Math.abs(days)} dias atrasado)` :
      days === 0 ? ' (hoje)' :
      days === 1 ? ' (amanhã)' :
      ` (em ${days} dias)`
    );
    return `
      <div class="project-card ${isExpanded?'expanded':''}" style="--p-color:${p.color}">
        <div class="project-head">
          <h4 class="project-name">${escapeHtml(p.name)}</h4>
          <span class="project-status status-${p.status}">${projectStatusLabel(p.status)}</span>
          <button class="btn-icon" onclick="openProjectModal('${p.id}')" title="Editar">✏️</button>
        </div>
        ${p.desc ? `<div class="project-desc">${escapeHtml(p.desc)}</div>` : ''}
        <div class="project-progress">
          <div class="progress-bar"><div class="progress-fill ${p.status==='concluido'?'green':''}" style="width:${pct}%"></div></div>
          <span class="project-pct">${pct}%</span>
        </div>
        <div class="project-meta">
          <span>📋 ${doneCount}/${tasks.length} tarefas</span>
          ${p.deadline ? `<span class="${isOverdue?'overdue':''}">📅 ${formatDate(p.deadline)}${daysLabel}</span>` : ''}
          ${p.priority ? `<span class="badge-pill ${p.priority==='alta'?'bad':p.priority==='media'?'warn':'cyan'}" style="font-size:9.5px">${p.priority}</span>` : ''}
        </div>
        <div class="project-body">
          ${tasks.length ? tasks.map(t=>`
            <div class="ptask ${t.done?'done':''}">
              <label class="check-pill"><input type="checkbox" ${t.done?'checked':''} onchange="toggleProjectTask('${p.id}','${t.id}')" /><span></span></label>
              <span class="ptask-text">${escapeHtml(t.text)}</span>
              <button class="btn-icon" onclick="deleteProjectTask('${p.id}','${t.id}')" style="color:#ff7a9a">✕</button>
            </div>
          `).join('') : '<div style="font-size:12px;color:var(--text-mute);padding:8px;text-align:center">Sem tarefas. Adicione abaixo.</div>'}
          <div class="ptask-add">
            <input type="text" placeholder="Nova tarefa... (Enter para adicionar)" onkeydown="if(event.key==='Enter' && this.value.trim()){addProjectTask('${p.id}', this.value); this.value=''}" />
          </div>
        </div>
        <button class="project-toggle" onclick="toggleProjectExpand('${p.id}')">${isExpanded?'▲ Recolher tarefas':`▼ Ver ${tasks.length} tarefas`}</button>
      </div>
    `;
  }).join('');
}

function renderProjectColors(selected){
  const row = document.getElementById('prColorRow');
  row.innerHTML = PROJECT_COLORS.map(c=>`
    <div class="color-opt ${c===selected?'selected':''}" style="background:${c};color:${c}" onclick="pickProjectColor('${c}')"></div>
  `).join('');
}
function pickProjectColor(c){
  document.getElementById('prColor').value = c;
  renderProjectColors(c);
}
function openProjectModal(id=null){
  const form = document.getElementById('projectForm');
  form.reset();
  document.getElementById('prId').value = '';
  document.getElementById('prColor').value = PROJECT_COLORS[0];
  renderProjectColors(PROJECT_COLORS[0]);
  document.getElementById('prDeleteBtn').style.display = 'none';
  document.getElementById('projectModalTitle').textContent = 'Novo Projeto';
  if(id){
    const p = state.projects.find(x=>x.id===id);
    if(p){
      document.getElementById('prId').value = p.id;
      document.getElementById('prName').value = p.name;
      document.getElementById('prDesc').value = p.desc || '';
      document.getElementById('prStart').value = p.startDate || '';
      document.getElementById('prDeadline').value = p.deadline || '';
      document.getElementById('prStatus').value = p.status || 'ativo';
      document.getElementById('prPriority').value = p.priority || 'media';
      document.getElementById('prColor').value = p.color || PROJECT_COLORS[0];
      renderProjectColors(p.color || PROJECT_COLORS[0]);
      document.getElementById('prDeleteBtn').style.display = '';
      document.getElementById('projectModalTitle').textContent = 'Editar Projeto';
    }
  }
  openModal('projectModal');
}
function saveProject(e){
  e.preventDefault();
  const id = document.getElementById('prId').value;
  const data = {
    name: document.getElementById('prName').value.trim(),
    desc: document.getElementById('prDesc').value.trim(),
    startDate: document.getElementById('prStart').value,
    deadline: document.getElementById('prDeadline').value,
    status: document.getElementById('prStatus').value,
    priority: document.getElementById('prPriority').value,
    color: document.getElementById('prColor').value || PROJECT_COLORS[0],
  };
  if(id){
    const p = state.projects.find(x=>x.id===id);
    const wasNotDone = p.status !== 'concluido';
    Object.assign(p, data);
    if(p.status === 'concluido' && wasNotDone) p.completedAt = new Date().toISOString();
    if(p.status !== 'concluido') p.completedAt = null;
  } else {
    state.projects.push({id:uid(),...data,tasks:[],createdAt:new Date().toISOString(),completedAt:data.status==='concluido'?new Date().toISOString():null});
  }
  save(); closeModal('projectModal'); renderProjects();
}
function deleteProject(){
  const id = document.getElementById('prId').value;
  if(!id) return;
  closeModal('projectModal');
  instantDelete({
    from: state.projects,
    predicate: p => p.id === id,
    label: 'Projeto excluído (incluindo tarefas)',
    rerender: renderProjects
  });
}
function addProjectTask(projectId, text){
  text = (text||'').trim();
  if(!text) return;
  const p = state.projects.find(x=>x.id===projectId);
  if(!p) return;
  p.tasks ||= [];
  p.tasks.push({id:uid(),text,done:false,createdAt:new Date().toISOString()});
  save(); renderProjects();
}
function toggleProjectTask(projectId, taskId){
  const p = state.projects.find(x=>x.id===projectId);
  const t = p && p.tasks.find(x=>x.id===taskId);
  if(!t) return;
  t.done = !t.done;
  t.completedAt = t.done ? new Date().toISOString() : null;
  // Auto-conclui o projeto se todas as tasks estiverem prontas (instantâneo, com undo)
  if(p.tasks.length && p.tasks.every(x=>x.done) && p.status==='ativo'){
    const prevStatus = p.status;
    const prevCompletedAt = p.completedAt;
    p.status = 'concluido';
    p.completedAt = new Date().toISOString();
    cortexToast({
      msg:`Projeto "${p.name||''}" marcado como concluído`,
      type:'success',
      undo: ()=>{
        p.status = prevStatus;
        p.completedAt = prevCompletedAt;
        save(); renderProjects();
        cortexToast({msg:'Reativado',type:'info'});
      }
    });
  }
  save(); renderProjects();
}
function deleteProjectTask(projectId, taskId){
  const p = state.projects.find(x=>x.id===projectId);
  if(!p) return;
  p.tasks = (p.tasks||[]).filter(t=>t.id!==taskId);
  save(); renderProjects();
}

