/* =========================================================
   DASHBOARD
   ========================================================= */
let chartInstance = null;
function renderDashboard(){
  const tm = thisMonth();
  const txs = state.transactions;
  const monthTxs = txs.filter(t=>monthKey(t.date)===tm);
  const receita = monthTxs.filter(t=>t.type==='receita').reduce((s,t)=>s+Number(t.value),0);
  const despesa = monthTxs.filter(t=>t.type==='despesa').reduce((s,t)=>s+Number(t.value),0);
  const saldo = receita - despesa;

  document.getElementById('sumReceita').textContent = fmt(receita);
  document.getElementById('sumDespesa').textContent = fmt(despesa);
  const saldoEl = document.getElementById('sumSaldo');
  saldoEl.textContent = fmt(saldo);
  saldoEl.className = 'summary-value ' + (saldo>=0?'positive':'negative');
  document.getElementById('sumReceitaCount').textContent = monthTxs.filter(t=>t.type==='receita').length + ' transações';
  document.getElementById('sumDespesaCount').textContent = monthTxs.filter(t=>t.type==='despesa').length + ' transações';

  const monthName = new Date(tm+'-01').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  if((state.dashboardView||'resumo')==='resumo'){
    document.getElementById('dashSubtitle').textContent = 'Resumo de ' + monthName;
  }

  // 6-month chart
  const labels = [], rec = [], des = [];
  const base = new Date(); base.setDate(1);
  for(let i=5;i>=0;i--){
    const d = new Date(base.getFullYear(), base.getMonth()-i, 1);
    const k = d.toISOString().slice(0,7);
    labels.push(d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''));
    const ms = txs.filter(t=>monthKey(t.date)===k);
    rec.push(ms.filter(t=>t.type==='receita').reduce((s,t)=>s+Number(t.value),0));
    des.push(ms.filter(t=>t.type==='despesa').reduce((s,t)=>s+Number(t.value),0));
  }
  const ctx = document.getElementById('chartBars');
  if(chartInstance) chartInstance.destroy();
  // gradients
  const c2d = ctx.getContext('2d');
  const gradGood = c2d.createLinearGradient(0,0,0,300);
  gradGood.addColorStop(0,'rgba(92,255,177,0.9)');
  gradGood.addColorStop(1,'rgba(92,255,177,0.25)');
  const gradBad = c2d.createLinearGradient(0,0,0,300);
  gradBad.addColorStop(0,'rgba(255,122,154,0.9)');
  gradBad.addColorStop(1,'rgba(255,122,154,0.25)');
  chartInstance = new Chart(ctx,{
    type:'bar',
    data:{
      labels,
      datasets:[
        {label:'Receitas',data:rec,backgroundColor:gradGood,borderColor:'#5cffb1',borderWidth:1,borderRadius:6,maxBarThickness:36},
        {label:'Despesas',data:des,backgroundColor:gradBad,borderColor:'#ff7a9a',borderWidth:1,borderRadius:6,maxBarThickness:36}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{position:'bottom',labels:{font:{size:12},color:'#b8a8d8',usePointStyle:true,padding:14}},
        tooltip:{
          backgroundColor:'rgba(22,9,47,0.95)',
          titleColor:'#efe8ff',bodyColor:'#efe8ff',
          borderColor:'rgba(176,97,255,0.4)',borderWidth:1,
          padding:10,cornerRadius:8,
          callbacks:{label:c=>c.dataset.label+': '+fmt(c.parsed.y)}
        }
      },
      scales:{
        x:{grid:{display:false},ticks:{color:'#b8a8d8'}},
        y:{grid:{color:'rgba(170,120,255,0.1)'},ticks:{color:'#b8a8d8',callback:v=>'R$'+(v/1000).toFixed(0)+'k'},beginAtZero:true}
      }
    }
  });

  // categories
  const catMap = {};
  monthTxs.filter(t=>t.type==='despesa').forEach(t=>{
    catMap[t.category] = (catMap[t.category]||0) + Number(t.value);
  });
  const catEntries = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const maxCat = catEntries.length ? catEntries[0][1] : 1;
  const catList = document.getElementById('catList');
  catList.innerHTML = catEntries.length
    ? catEntries.map(([k,v])=>`
      <div class="cat-item">
        <div class="cat-head"><span class="cat-name">${k}</span><span class="cat-value">${fmt(v)}</span></div>
        <div class="cat-bar"><div class="cat-fill" style="width:${(v/maxCat*100).toFixed(1)}%"></div></div>
      </div>`).join('')
    : '<div class="empty" style="padding:20px;font-size:13px">Sem despesas no mês.</div>';

  // recent
  const recent = [...txs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  const recentList = document.getElementById('recentList');
  recentList.innerHTML = recent.length
    ? recent.map(t=>`
      <div class="recent-item">
        <div class="recent-icon ${t.type}">${t.type==='receita'?'↑':'↓'}</div>
        <div class="recent-info">
          <div class="recent-desc">${escapeHtml(t.desc)}</div>
          <div class="recent-meta">${escapeHtml(t.category)} · ${formatDate(t.date)}</div>
        </div>
        <div class="recent-value ${t.type}">${t.type==='despesa'?'−':'+'} ${fmt(t.value)}</div>
      </div>`).join('')
    : '<div class="empty">Nenhuma transação registrada.</div>';
}

/* =========================================================
   TRANSACTIONS
   ========================================================= */
function updateCategoryOptions(){
  const type = document.getElementById('txType').value;
  const sel = document.getElementById('txCategory');
  sel.innerHTML = CATEGORIES[type].map(c=>`<option value="${c}">${c}</option>`).join('');
}
function openTxModal(id=null){
  document.getElementById('txForm').reset();
  document.getElementById('txId').value = '';
  document.getElementById('txDate').value = todayStr();
  document.getElementById('txType').value = 'despesa';
  updateCategoryOptions();
  document.getElementById('txModalTitle').textContent = 'Nova Transação';
  if(id){
    const t = state.transactions.find(x=>x.id===id);
    if(t){
      document.getElementById('txId').value = t.id;
      document.getElementById('txDesc').value = t.desc;
      document.getElementById('txValue').value = t.value;
      document.getElementById('txDate').value = t.date;
      document.getElementById('txType').value = t.type;
      updateCategoryOptions();
      document.getElementById('txCategory').value = t.category;
      document.getElementById('txModalTitle').textContent = 'Editar Transação';
    }
  }
  openModal('txModal');
}
function saveTx(e){
  e.preventDefault();
  const id = document.getElementById('txId').value;
  const data = {
    desc: document.getElementById('txDesc').value.trim(),
    value: parseFloat(document.getElementById('txValue').value),
    date: document.getElementById('txDate').value,
    type: document.getElementById('txType').value,
    category: document.getElementById('txCategory').value
  };
  if(id){
    const t = state.transactions.find(x=>x.id===id);
    Object.assign(t,data);
  }else{
    state.transactions.unshift({id:uid(),...data});
  }
  save();
  closeModal('txModal');
  renderAll();
}
function deleteTx(id){
  instantDelete({
    from: state.transactions,
    predicate: t => t.id === id,
    label: 'Transação excluída',
    rerender: renderAll
  });
}
function renderTransactions(){
  const body = document.getElementById('txBody');
  const list = [...state.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  if(!list.length){
    body.innerHTML = `<tr><td colspan="6" class="empty">Nenhuma transação. Clique em "Nova Transação" para começar.</td></tr>`;
    return;
  }
  body.innerHTML = list.map(t=>`
    <tr>
      <td><strong>${escapeHtml(t.desc)}</strong></td>
      <td><span class="tag cat">${escapeHtml(t.category)}</span></td>
      <td>${formatDate(t.date)}</td>
      <td><span class="tag ${t.type}">${t.type}</span></td>
      <td style="text-align:right;font-weight:700;color:${t.type==='receita'?'#5cffb1':'#ff7a9a'}">
        ${t.type==='despesa'?'−':'+'} ${fmt(t.value)}
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" title="Editar" onclick="openTxModal('${t.id}')">✏️</button>
          <button class="btn-icon" title="Excluir" onclick="deleteTx('${t.id}')" style="color:#ff7a9a">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

