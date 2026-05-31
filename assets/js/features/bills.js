/* =========================================================
   BILLS · contas mensais a pagar
   ========================================================= */
const BILL_CATEGORIES = {
  moradia:      { label:'Moradia',           icon:'🏠', color:'#b061ff' },
  contas:       { label:'Contas',            icon:'💡', color:'#ffb86b' },
  internet:     { label:'Internet/Telefone', icon:'📡', color:'#39d4ff' },
  assinaturas:  { label:'Assinaturas',       icon:'📺', color:'#e26bff' },
  cartao:       { label:'Cartão',            icon:'💳', color:'#ff7a9a' },
  transporte:   { label:'Transporte',        icon:'🚗', color:'#7a2bff' },
  saude:        { label:'Saúde',             icon:'💚', color:'#5cffb1' },
  educacao:     { label:'Educação',          icon:'📚', color:'#ffb86b' },
  alimentacao:  { label:'Alimentação',       icon:'🍔', color:'#ff8c50' },
  outros:       { label:'Outros',            icon:'📎', color:'#7e6aa8' }
};

let billsCurrentMonth = thisMonth(); // YYYY-MM
let billsFilter = 'todas'; // todas|pendentes|pagas|vencidas

/* ---------- View toggle ---------- */
function setDashboardView(view){
  state.dashboardView = view;
  save();
  const r = document.getElementById('dashViewResumo');
  const b = document.getElementById('dashViewBills');
  const c = document.getElementById('dashViewCards');
  if(r) r.style.display = (view==='resumo') ? '' : 'none';
  if(b) b.style.display = (view==='bills')  ? '' : 'none';
  if(c) c.style.display = (view==='cards')  ? '' : 'none';
  document.querySelectorAll('[data-dashview]').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.dashview === view);
  });
  const addBtn = document.getElementById('dashAddBtn');
  const sub = document.getElementById('dashSubtitle');
  if(view==='bills'){
    if(addBtn){ addBtn.style.display=''; addBtn.textContent = '+ Nova Conta'; addBtn.setAttribute('onclick','openBillModal()'); }
    if(sub) sub.textContent = 'Gerencie contas mensais · marque pagas · controle vencimentos';
    renderBills();
  } else if(view==='cards'){
    if(addBtn){ addBtn.style.display='none'; }
    if(sub) sub.textContent = 'Painel estratégico · cartões dinâmicos personalizáveis';
    if(typeof renderDynCards === 'function') renderDynCards();
  } else {
    if(addBtn){ addBtn.style.display=''; addBtn.textContent = '+ Nova Transação'; addBtn.setAttribute('onclick','openTxModal()'); }
    renderDashboard();
  }
}

/* ---------- Month nav ---------- */
function billsNavMonth(dir){
  const [y,m] = billsCurrentMonth.split('-').map(Number);
  const d = new Date(y, m-1+dir, 1);
  billsCurrentMonth = d.toISOString().slice(0,7);
  renderBills();
}
function billsToday(){ billsCurrentMonth = thisMonth(); renderBills(); }
function setBillsFilter(f){ billsFilter = f; renderBills(); }

/* ---------- CRUD ---------- */
function openBillModal(id=null){
  const form = document.getElementById('billForm');
  form.reset();
  document.getElementById('billId').value = '';
  document.getElementById('billRecurring').checked = true;
  document.getElementById('billDueDay').value = 10;
  document.getElementById('billCategory').value = 'moradia';
  document.getElementById('billDeleteBtn').style.display = 'none';
  document.getElementById('billModalTitle').textContent = 'Nova Conta';
  if(id){
    const b = state.bills.find(x=>x.id===id);
    if(b){
      document.getElementById('billId').value = b.id;
      document.getElementById('billTitle').value = b.title || '';
      document.getElementById('billAmount').value = b.amount || '';
      document.getElementById('billDueDay').value = b.dueDay || 10;
      document.getElementById('billCategory').value = b.category || 'outros';
      document.getElementById('billRecurring').checked = b.recurring !== false;
      document.getElementById('billNotes').value = b.notes || '';
      document.getElementById('billDeleteBtn').style.display = '';
      document.getElementById('billModalTitle').textContent = 'Editar Conta';
    }
  }
  openModal('billModal');
}

function saveBill(e){
  e.preventDefault();
  const id = document.getElementById('billId').value;
  const data = {
    title:     document.getElementById('billTitle').value.trim(),
    amount:    parseFloat(document.getElementById('billAmount').value) || 0,
    dueDay:    Math.min(31, Math.max(1, parseInt(document.getElementById('billDueDay').value)||1)),
    category:  document.getElementById('billCategory').value,
    recurring: document.getElementById('billRecurring').checked,
    notes:     document.getElementById('billNotes').value.trim()
  };
  if(id){
    const b = state.bills.find(x=>x.id===id);
    Object.assign(b, data);
  } else {
    state.bills.unshift({
      id: uid(),
      ...data,
      paid: {},
      createdMonth: thisMonth(),
      createdAt: new Date().toISOString()
    });
  }
  save(); closeModal('billModal'); renderBills();
}

function deleteBill(){
  const id = document.getElementById('billId').value;
  if(!id) return;
  closeModal('billModal');
  instantDelete({
    from: state.bills,
    predicate: b => b.id === id,
    label: 'Conta excluída',
    rerender: renderBills
  });
}

function toggleBillPaid(id, monthKey){
  const b = state.bills.find(x=>x.id===id);
  if(!b) return;
  b.paid ||= {};
  b.paid[monthKey] = !b.paid[monthKey];
  if(!b.paid[monthKey]) delete b.paid[monthKey];
  save(); renderBills();
}

/* ---------- Logic ---------- */
function billsForMonth(monthKey){
  return (state.bills||[]).filter(b => {
    if(b.recurring) return (b.createdMonth || '0000-00') <= monthKey;
    return (b.createdMonth || thisMonth()) === monthKey;
  });
}
function isBillOverdue(bill, monthKey){
  if(bill.paid?.[monthKey]) return false;
  const today = new Date();
  const [y,m] = monthKey.split('-').map(Number);
  const due = new Date(y, m-1, Math.min(bill.dueDay, new Date(y, m, 0).getDate()));
  return due < new Date(today.getFullYear(), today.getMonth(), today.getDate());
}
function daysUntilDue(bill, monthKey){
  const today = new Date();
  const [y,m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const due = new Date(y, m-1, Math.min(bill.dueDay, lastDay));
  return Math.ceil((due - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}

/* ---------- Render ---------- */
function renderBills(){
  if(!document.getElementById('billsList')) return;
  const mk = billsCurrentMonth;
  const [y,m] = mk.split('-').map(Number);
  const monthName = new Date(y, m-1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const lbl = document.getElementById('billsMonthLabel');
  if(lbl) lbl.textContent = monthName;

  const list = billsForMonth(mk);
  const totalAll = list.reduce((s,b)=>s+Number(b.amount||0), 0);
  const paidArr = list.filter(b => b.paid?.[mk]);
  const pendingArr = list.filter(b => !b.paid?.[mk]);
  const overdueArr = pendingArr.filter(b => isBillOverdue(b, mk));
  const totalPaid = paidArr.reduce((s,b)=>s+Number(b.amount||0), 0);
  const totalPending = pendingArr.reduce((s,b)=>s+Number(b.amount||0), 0);
  const totalOverdue = overdueArr.reduce((s,b)=>s+Number(b.amount||0), 0);

  // Summary cards
  setText('billsTotalAll', fmt(totalAll));
  setText('billsCountAll', `${list.length} conta${list.length===1?'':'s'}`);
  setText('billsTotalPaid', fmt(totalPaid));
  setText('billsCountPaid', `${paidArr.length} quitada${paidArr.length===1?'':'s'}`);
  setText('billsTotalPending', fmt(totalPending));
  setText('billsCountPending', `${pendingArr.length} pendente${pendingArr.length===1?'':'s'}`);
  setText('billsTotalOverdue', fmt(totalOverdue));
  setText('billsCountOverdue', `${overdueArr.length} atrasada${overdueArr.length===1?'':'s'}`);

  // Progress
  const pct = totalAll > 0 ? (totalPaid/totalAll*100) : 0;
  const fill = document.getElementById('billsProgressFill');
  if(fill) fill.style.width = pct.toFixed(1) + '%';
  setText('billsProgressSub', `${pct.toFixed(0)}% pago`);
  setText('billsProgressStat', `${fmt(totalPaid)} / ${fmt(totalAll)}`);

  // Filter pills
  const fp = document.getElementById('billsFilterPills');
  if(fp){
    fp.innerHTML = [
      ['todas','📋 Todas',list.length],
      ['pendentes','⏳ Pendentes',pendingArr.length],
      ['pagas','✓ Pagas',paidArr.length],
      ['vencidas','! Vencidas',overdueArr.length]
    ].map(([k,lbl,c])=>`
      <button class="bills-filter-pill ${billsFilter===k?'active':''}" onclick="setBillsFilter('${k}')">
        ${lbl} <span class="cnt">${c}</span>
      </button>
    `).join('');
  }

  // List
  let view = list;
  if(billsFilter==='pendentes') view = pendingArr;
  if(billsFilter==='pagas') view = paidArr;
  if(billsFilter==='vencidas') view = overdueArr;
  view = [...view].sort((a,b)=> a.dueDay - b.dueDay);

  const el = document.getElementById('billsList');
  if(view.length === 0){
    el.innerHTML = `<div class="empty" style="padding:30px;font-size:13px;text-align:center;color:var(--text-mute)">
      ${list.length===0 ? 'Nenhuma conta cadastrada. Clique em <strong>+ Nova conta</strong>.' : 'Nada neste filtro.'}
    </div>`;
  } else {
    el.innerHTML = view.map(b => billCardHtml(b, mk)).join('');
  }

  // Category breakdown
  const cm = {};
  list.forEach(b => { cm[b.category] = (cm[b.category]||0) + Number(b.amount||0); });
  const catEntries = Object.entries(cm).sort((a,b)=>b[1]-a[1]);
  const maxCat = catEntries.length ? catEntries[0][1] : 1;
  const cl = document.getElementById('billsCatList');
  if(cl){
    cl.innerHTML = catEntries.length
      ? catEntries.map(([k,v])=>{
          const c = BILL_CATEGORIES[k] || BILL_CATEGORIES.outros;
          return `
            <div class="cat-item">
              <div class="cat-head">
                <span class="cat-name">${c.icon} ${c.label}</span>
                <span class="cat-value">${fmt(v)}</span>
              </div>
              <div class="cat-bar"><div class="cat-fill" style="width:${(v/maxCat*100).toFixed(1)}%;background:linear-gradient(90deg,${c.color},${c.color}aa)"></div></div>
            </div>`;
        }).join('')
      : '<div class="empty" style="padding:20px;font-size:13px">Sem contas no mês.</div>';
  }

  // All bills
  const ba = document.getElementById('billsAll');
  if(ba){
    if(!state.bills.length){
      ba.innerHTML = `<div class="empty" style="padding:24px;text-align:center;color:var(--text-mute);background:var(--surface);border:1px dashed var(--border);border-radius:12px">Nenhuma conta cadastrada ainda.</div>`;
    } else {
      ba.innerHTML = state.bills.map(b => {
        const c = BILL_CATEGORIES[b.category] || BILL_CATEGORIES.outros;
        const recur = b.recurring ? '<span class="bills-tag rec">↻ Recorrente</span>' : '<span class="bills-tag once">Única</span>';
        return `
          <div class="bills-row" onclick="openBillModal('${b.id}')">
            <span class="bills-row-icon" style="background:${c.color}22;color:${c.color}">${c.icon}</span>
            <div class="bills-row-info">
              <div class="bills-row-title">${escapeHtml(b.title||'Sem título')}</div>
              <div class="bills-row-sub">${c.label} · venc. todo dia ${b.dueDay} ${recur}</div>
            </div>
            <div class="bills-row-amount">${fmt(b.amount)}</div>
          </div>
        `;
      }).join('');
    }
  }
}

function billCardHtml(b, mk){
  const c = BILL_CATEGORIES[b.category] || BILL_CATEGORIES.outros;
  const paid = !!b.paid?.[mk];
  const overdue = !paid && isBillOverdue(b, mk);
  const days = daysUntilDue(b, mk);
  let badge = '';
  if(paid){
    badge = '<span class="bill-badge paid">✓ Pago</span>';
  } else if(overdue){
    badge = `<span class="bill-badge overdue">! ${Math.abs(days)}d atrasado</span>`;
  } else if(days === 0){
    badge = '<span class="bill-badge today">Vence hoje</span>';
  } else if(days <= 7){
    badge = `<span class="bill-badge soon">Em ${days}d</span>`;
  } else {
    badge = `<span class="bill-badge ok">Dia ${b.dueDay}</span>`;
  }
  return `
    <div class="bill-card ${paid?'is-paid':''} ${overdue?'is-overdue':''}">
      <label class="bill-check">
        <input type="checkbox" ${paid?'checked':''} onchange="toggleBillPaid('${b.id}','${mk}')" />
        <span></span>
      </label>
      <span class="bill-icon" style="background:${c.color}22;color:${c.color}">${c.icon}</span>
      <div class="bill-info" onclick="openBillModal('${b.id}')">
        <div class="bill-title">${escapeHtml(b.title||'Sem título')}</div>
        <div class="bill-sub">${c.label} · venc. dia ${b.dueDay}${b.recurring?' · todo mês':''}</div>
      </div>
      ${badge}
      <div class="bill-amount">${fmt(b.amount)}</div>
    </div>
  `;
}

function setText(id, txt){
  const el = document.getElementById(id);
  if(el) el.textContent = txt;
}

/* boot: aplica view salva */
function applyDashboardLayout(){
  const layout = state.settings?.dashboardLayout || 'classic';
  const main = document.querySelector('section.page[data-page="dashboard"]');
  if(main){
    main.classList.toggle('dash-layout-bento', layout === 'bento');
    main.classList.toggle('dash-layout-classic', layout === 'classic');
  }
  const btn = document.getElementById('dashLayoutToggle');
  if(btn){
    btn.title = layout === 'bento' ? 'Layout Bento ativo · clique pra clássico' : 'Layout Clássico · clique pra Bento';
    btn.textContent = layout === 'bento' ? '🎴' : '⊞';
  }
}
function toggleDashboardLayout(){
  state.settings.dashboardLayout = (state.settings.dashboardLayout === 'bento') ? 'classic' : 'bento';
  save();
  applyDashboardLayout();
}

function applyDashboardView(){
  const v = state.dashboardView || 'resumo';
  setDashboardView(v);
}
