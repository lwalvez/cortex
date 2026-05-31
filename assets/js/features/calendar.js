/* =========================================================
   CALENDAR
   ========================================================= */
const EVENT_COLORS = [
  '#b061ff','#e26bff','#39d4ff','#5cffb1','#ffb86b','#ff7a9a','#ff8c50','#7e6aa8'
];
const WEEKDAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
let calView = 'month';
let calDate = new Date();
let nowLineInterval = null;

function defaultEvents(){ return []; }

function toDateStr(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseDateStr(s){
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function hexToRgb(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(hex||'');
  if(!m) return [176,97,255];
  const n = parseInt(m[1],16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function rgba(hex, a){
  const [r,g,b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function chipStyle(color){
  return `border-left-color:${color};background:${rgba(color,0.18)};color:${color}`;
}
function blockStyle(color){
  return `border-left-color:${color};background:linear-gradient(135deg,${rgba(color,0.28)},${rgba(color,0.15)});color:${color}`;
}

function setCalView(v){
  calView = v;
  document.querySelectorAll('.cal-view-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===v));
  renderCalendar();
}
function calToday(){ calDate = new Date(); renderCalendar(); }
function calNav(dir){
  const d = new Date(calDate);
  if(calView==='month'){ d.setMonth(d.getMonth()+dir); d.setDate(1); }
  else if(calView==='week'){ d.setDate(d.getDate()+7*dir); }
  else { d.setDate(d.getDate()+dir); }
  calDate = d;
  renderCalendar();
}
function updateCalPeriod(){
  const el = document.getElementById('calPeriod');
  if(!el) return;
  const d = calDate;
  if(calView==='month'){
    el.textContent = d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  } else if(calView==='week'){
    const ws = state.settings?.weekStart || 0;
    const offset = (d.getDay() - ws + 7) % 7;
    const sun = new Date(d); sun.setDate(d.getDate()-offset);
    const sat = new Date(sun); sat.setDate(sun.getDate()+6);
    const sameMonth = sun.getMonth()===sat.getMonth();
    if(sameMonth){
      el.textContent = `${sun.getDate()}–${sat.getDate()} ${sat.toLocaleDateString('pt-BR',{month:'short',year:'numeric'}).replace('.','')}`;
    } else {
      el.textContent = `${sun.toLocaleDateString('pt-BR',{day:'numeric',month:'short'}).replace('.','')} – ${sat.toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric'}).replace('.','')}`;
    }
  } else {
    el.textContent = d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  }
}

function renderCalendar(){
  updateCalPeriod();
  renderCalFilterBar();
  const body = document.getElementById('calBody');
  if(!body) return;
  if(calView==='month') body.innerHTML = renderMonthView();
  else if(calView==='week') body.innerHTML = renderWeekView();
  else body.innerHTML = renderDayView();
  startNowLine();
}

/* ---------- CATEGORY FILTER ---------- */
function getEventCategories(){
  return state.settings?.eventCategories || [];
}
function getActiveCategories(){
  state.calendar ||= { activeCategories: [] };
  state.calendar.activeCategories ||= [];
  return state.calendar.activeCategories;
}
function passesCategoryFilter(ev){
  const active = getActiveCategories();
  if(!active.length) return true;
  if(active.includes('__none__') && !ev.category) return true;
  return active.includes(ev.category);
}
function getFilteredEvents(){
  return (state.events||[]).filter(passesCategoryFilter);
}
function toggleCalCategory(id){
  state.calendar ||= { activeCategories: [] };
  const arr = state.calendar.activeCategories ||= [];
  const i = arr.indexOf(id);
  if(i>=0) arr.splice(i,1); else arr.push(id);
  save();
  renderCalendar();
}
function clearCalCategories(){
  state.calendar.activeCategories = [];
  save();
  renderCalendar();
}
function getCategoryById(id){
  return getEventCategories().find(c=>c.id===id);
}
function renderCalFilterBar(){
  const bar = document.getElementById('calFilterBar');
  if(!bar) return;
  const cats = getEventCategories();
  const active = getActiveCategories();
  const allOff = active.length === 0;
  const counts = {};
  (state.events||[]).forEach(e=>{
    const k = e.category || '__none__';
    counts[k] = (counts[k]||0) + 1;
  });
  bar.innerHTML = `
    <span class="cal-filter-label">FILTRAR:</span>
    <button class="cal-filter-pill ${allOff?'active':''}" onclick="clearCalCategories()">
      <span>📂</span><span>Todas</span><span class="cnt">${(state.events||[]).length}</span>
    </button>
    ${cats.map(c=>{
      const on = active.includes(c.id);
      const n = counts[c.id] || 0;
      const dim = (allOff || on) ? '' : 'dim';
      const style = on ? `border-color:${c.color};background:${rgba(c.color,0.18)};color:${c.color};box-shadow:0 0 12px ${rgba(c.color,0.35)}` : `border-color:${rgba(c.color,0.35)};color:${c.color}`;
      return `<button class="cal-filter-pill ${on?'active':''} ${dim}" style="${style}" onclick="toggleCalCategory('${c.id}')">
        <span>${c.emoji}</span><span>${escapeHtml(c.name)}</span><span class="cnt">${n}</span>
      </button>`;
    }).join('')}
    ${counts['__none__'] ? `
      <button class="cal-filter-pill ${active.includes('__none__')?'active':''}" onclick="toggleCalCategory('__none__')">
        <span>○</span><span>Sem categoria</span><span class="cnt">${counts['__none__']}</span>
      </button>
    ` : ''}
  `;
}

function renderMonthView(){
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const first = new Date(y,m,1);
  const ws = state.settings?.weekStart || 0;
  const startWeekday = (first.getDay() - ws + 7) % 7;
  const daysInMonth = new Date(y,m+1,0).getDate();
  const daysInPrev = new Date(y,m,0).getDate();
  const todayKey = toDateStr(new Date());

  const cells = [];
  for(let i=startWeekday-1;i>=0;i--){
    const day = daysInPrev - i;
    const pm = m===0 ? 11 : m-1;
    const py = m===0 ? y-1 : y;
    cells.push({y:py,m:pm,d:day,faded:true});
  }
  for(let d=1; d<=daysInMonth; d++) cells.push({y,m,d,faded:false});
  while(cells.length < 42){
    const last = cells[cells.length-1];
    const next = new Date(last.y,last.m,last.d+1);
    cells.push({y:next.getFullYear(),m:next.getMonth(),d:next.getDate(),faded:true});
  }
  // trim to 42 (we want 6 rows)
  cells.length = 42;
  // optionally trim to 35 if last week is fully faded
  const lastRow = cells.slice(35);
  if(lastRow.every(c=>c.faded)) cells.length = 35;

  const orderedWds = [...WEEKDAYS_SHORT.slice(ws), ...WEEKDAYS_SHORT.slice(0,ws)];
  const headHtml = orderedWds.map((w,i)=>{
    const realIdx = (i+ws)%7;
    return `<div class="month-head-cell ${(realIdx===0||realIdx===6)?'wknd':''}">${w}</div>`;
  }).join('');

  const cellsHtml = cells.map(c=>{
    const dateStr = `${c.y}-${String(c.m+1).padStart(2,'0')}-${String(c.d).padStart(2,'0')}`;
    const isToday = dateStr === todayKey;
    const dayEvents = getFilteredEvents().filter(e=>e.date===dateStr)
      .sort((a,b)=>(a.allDay?'':a.startTime||'').localeCompare(b.allDay?'':b.startTime||''));
    const visible = dayEvents.slice(0,3);
    const extra = dayEvents.length - visible.length;
    return `
      <div class="month-day ${c.faded?'faded':''} ${isToday?'today':''}"
           data-day="${dateStr}"
           ondragover="event.preventDefault();this.classList.add('drag-over')"
           ondragleave="this.classList.remove('drag-over')"
           ondrop="event.preventDefault();this.classList.remove('drag-over');dropEventOnDay(event,'${dateStr}')"
           onclick="if(!event.target.closest('.event-chip')&&!event.target.closest('.more-chip'))openEventModal(null,'${dateStr}')">
        <div class="day-num">${c.d}</div>
        ${visible.map(ev=>{
          const cat = ev.category ? getCategoryById(ev.category) : null;
          return `
          <div class="event-chip" draggable="true"
               data-event-id="${ev.id}"
               ondragstart="dragStartEvent(event,'${ev.id}')"
               ondragend="this.classList.remove('dragging')"
               style="${chipStyle(ev.color)}"
               onclick="event.stopPropagation();openEventModal('${ev.id}')"
               title="${escapeAttr((cat?cat.name+' · ':'')+ev.title)}">
            ${cat ? `<span style="margin-right:2px">${cat.emoji}</span>` : ''}${ev.allDay ? '' : `<span style="opacity:0.8">${ev.startTime} </span>`}${escapeHtml(ev.title)}
          </div>
        `;}).join('')}
        ${extra>0 ? `<div class="more-chip" onclick="event.stopPropagation();goToDay('${dateStr}')">+${extra} mais</div>` : ''}
      </div>
    `;
  }).join('');

  return `<div class="month-head">${headHtml}</div><div class="month-grid">${cellsHtml}</div>`;
}

/* Drag-and-drop · move evento entre dias na month view */
function dragStartEvent(e, id){
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/cortex-event-id', id);
  e.currentTarget.classList.add('dragging');
}
function dropEventOnDay(e, targetDate){
  const id = e.dataTransfer.getData('text/cortex-event-id');
  if(!id) return;
  const ev = state.events.find(x => x.id === id);
  if(!ev || ev.date === targetDate) return;
  ev.date = targetDate;
  save();
  renderCalendar();
}

function goToDay(dateStr){
  calDate = parseDateStr(dateStr);
  setCalView('day');
}

function renderWeekView(){
  const ws = state.settings?.weekStart || 0;
  const offset = (calDate.getDay() - ws + 7) % 7;
  const start = new Date(calDate); start.setDate(calDate.getDate() - offset);
  const days = []; for(let i=0;i<7;i++){ const d=new Date(start); d.setDate(start.getDate()+i); days.push(d); }
  return renderTimeGrid(days);
}
function renderDayView(){
  return renderTimeGrid([new Date(calDate)]);
}

function renderTimeGrid(days){
  const todayKey = toDateStr(new Date());
  const cols = days.length;
  const gridCols = `60px repeat(${cols},1fr)`;

  const headHtml = `
    <div class="week-head" style="grid-template-columns:${gridCols}">
      <div class="week-head-cell" style="border-right:1px solid var(--border)"></div>
      ${days.map(d=>{
        const k = toDateStr(d);
        const isToday = k===todayKey;
        return `<div class="week-head-cell ${isToday?'today-head':''}">
          <div>${WEEKDAYS_SHORT[d.getDay()]}</div>
          <div class="wh-num">${d.getDate()}</div>
        </div>`;
      }).join('')}
    </div>
  `;

  // all-day row
  const allDayHtml = `
    <div class="allday-row" style="grid-template-columns:${gridCols}">
      <div class="allday-label">DIA TODO</div>
      ${days.map(d=>{
        const k = toDateStr(d);
        const evs = getFilteredEvents().filter(e=>e.date===k && e.allDay);
        return `<div class="allday-cell" onclick="openEventModal(null,'${k}',true)">
          ${evs.map(ev=>{
            const cat = ev.category ? getCategoryById(ev.category) : null;
            return `
            <div class="event-chip" style="${chipStyle(ev.color)}" onclick="event.stopPropagation();openEventModal('${ev.id}')" title="${escapeAttr((cat?cat.name+' · ':'')+ev.title)}">
              ${cat ? `<span style="margin-right:3px">${cat.emoji}</span>` : ''}${escapeHtml(ev.title)}
            </div>
          `;}).join('')}
        </div>`;
      }).join('')}
    </div>
  `;

  // hour labels
  const hourLabels = [];
  for(let h=0;h<24;h++){
    hourLabels.push(`<div class="hour-label">${String(h).padStart(2,'0')}:00</div>`);
  }

  // day columns with hour cells + event blocks
  const colsHtml = days.map(d=>{
    const k = toDateStr(d);
    const evs = getFilteredEvents().filter(e=>e.date===k && !e.allDay);
    const cells = [];
    for(let h=0;h<24;h++){
      cells.push(`<div class="hour-cell" onclick="openEventModal(null,'${k}',false,'${String(h).padStart(2,'0')}:00')"></div>`);
    }
    const blocks = evs.map(ev=>{
      const [sh,sm] = (ev.startTime||'00:00').split(':').map(Number);
      const [eh,em] = (ev.endTime||(ev.startTime||'00:00')).split(':').map(Number);
      const startMin = sh*60+sm;
      let endMin = eh*60+em;
      if(endMin <= startMin) endMin = startMin + 30;
      const top = startMin * 0.8; // 48px / 60min = 0.8
      const height = Math.max(22, (endMin-startMin) * 0.8);
      const cat = ev.category ? getCategoryById(ev.category) : null;
      return `<div class="event-block" style="top:${top}px;height:${height}px;${blockStyle(ev.color)}"
              onclick="event.stopPropagation();openEventModal('${ev.id}')" title="${escapeAttr((cat?cat.name+' · ':'')+ev.title)}">
        <div>${cat ? `<span style="margin-right:3px">${cat.emoji}</span>` : ''}${escapeHtml(ev.title)}</div>
        <div class="event-block-time">${ev.startTime} – ${ev.endTime||''}</div>
      </div>`;
    }).join('');
    const nowLine = (k===todayKey) ? renderNowLineHtml() : '';
    return `<div class="day-col" data-date="${k}">${cells.join('')}${blocks}${nowLine}</div>`;
  }).join('');

  return `
    <div class="week-wrap">
      ${headHtml}
      ${allDayHtml}
      <div class="week-body" style="grid-template-columns:${gridCols}">
        <div class="hour-labels">${hourLabels.join('')}</div>
        ${colsHtml}
      </div>
    </div>
  `;
}
function renderNowLineHtml(){
  const now = new Date();
  const top = (now.getHours()*60 + now.getMinutes()) * 0.8;
  return `<div class="now-line" data-now style="top:${top}px"></div>`;
}
function startNowLine(){
  if(nowLineInterval) clearInterval(nowLineInterval);
  nowLineInterval = setInterval(()=>{
    document.querySelectorAll('[data-now]').forEach(el=>{
      const now = new Date();
      el.style.top = ((now.getHours()*60 + now.getMinutes()) * 0.8) + 'px';
    });
  }, 60000);
}

/* EVENT MODAL */
function renderEventColors(selected){
  const row = document.getElementById('evColorRow');
  row.innerHTML = EVENT_COLORS.map(c=>`
    <div class="color-opt ${c===selected?'selected':''}" style="background:${c};color:${c}" onclick="pickEventColor('${c}')"></div>
  `).join('');
}
function pickEventColor(c){
  document.getElementById('evColor').value = c;
  renderEventColors(c);
}
function toggleAllDayUI(){
  const checked = document.getElementById('evAllDay').checked;
  document.getElementById('timeRow').style.display = checked ? 'none' : '';
  if(!checked){
    if(!document.getElementById('evStart').value) document.getElementById('evStart').value = '09:00';
    if(!document.getElementById('evEnd').value) document.getElementById('evEnd').value = '10:00';
  }
}
function populateCategorySelect(selected=''){
  const sel = document.getElementById('evCategory');
  if(!sel) return;
  const cats = getEventCategories();
  sel.innerHTML = `<option value="">— Sem categoria —</option>` +
    cats.map(c=>`<option value="${c.id}" ${selected===c.id?'selected':''}>${c.emoji} ${escapeHtml(c.name)}</option>`).join('');
  sel.value = selected || '';
}
function openEventModal(id=null, dateStr=null, allDay=false, time=null){
  const form = document.getElementById('eventForm');
  form.reset();
  document.getElementById('evId').value = '';
  document.getElementById('evDate').value = dateStr || toDateStr(calDate);
  document.getElementById('evAllDay').checked = !!allDay;
  document.getElementById('evColor').value = EVENT_COLORS[0];
  populateCategorySelect('');
  renderEventColors(EVENT_COLORS[0]);
  document.getElementById('evDeleteBtn').style.display = 'none';
  document.getElementById('eventModalTitle').textContent = 'Novo Evento';

  if(time){
    document.getElementById('evStart').value = time;
    const [h,m] = time.split(':').map(Number);
    const endH = Math.min(23, h+1);
    document.getElementById('evEnd').value = `${String(endH).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  } else {
    document.getElementById('evStart').value = '09:00';
    document.getElementById('evEnd').value = '10:00';
  }

  if(id){
    const ev = state.events.find(e=>e.id===id);
    if(ev){
      document.getElementById('evId').value = ev.id;
      document.getElementById('evTitle').value = ev.title;
      document.getElementById('evDate').value = ev.date;
      document.getElementById('evAllDay').checked = !!ev.allDay;
      document.getElementById('evStart').value = ev.startTime||'';
      document.getElementById('evEnd').value = ev.endTime||'';
      document.getElementById('evColor').value = ev.color||EVENT_COLORS[0];
      document.getElementById('evDesc').value = ev.desc||'';
      populateCategorySelect(ev.category||'');
      renderEventColors(ev.color||EVENT_COLORS[0]);
      document.getElementById('evDeleteBtn').style.display = '';
      document.getElementById('eventModalTitle').textContent = 'Editar Evento';
    }
  }
  toggleAllDayUI();
  openModal('eventModal');
}
function saveEvent(e){
  e.preventDefault();
  const id = document.getElementById('evId').value;
  const allDay = document.getElementById('evAllDay').checked;
  const data = {
    title: document.getElementById('evTitle').value.trim(),
    date: document.getElementById('evDate').value,
    allDay,
    startTime: allDay ? '' : document.getElementById('evStart').value,
    endTime: allDay ? '' : document.getElementById('evEnd').value,
    color: document.getElementById('evColor').value || EVENT_COLORS[0],
    category: document.getElementById('evCategory').value || null,
    desc: document.getElementById('evDesc').value.trim()
  };
  if(id){
    const ev = state.events.find(x=>x.id===id);
    Object.assign(ev, data);
  } else {
    state.events.push({id:uid(),...data});
  }
  save(); closeModal('eventModal'); renderCalendar();
}
function deleteEvent(){
  const id = document.getElementById('evId').value;
  if(!id) return;
  closeModal('eventModal');
  instantDelete({
    from: state.events,
    predicate: e => e.id === id,
    label: 'Evento excluído',
    rerender: renderCalendar
  });
}

