/* =========================================================
   INFO (dados pessoais)
   ========================================================= */
let saveTimer = null;
function showSaved(){
  const el = document.getElementById('saveIndicator');
  if(!el) return;
  el.textContent = 'salvo';
  el.classList.add('show');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>el.classList.remove('show'), 1400);
}
function calcAge(birthDate){
  if(!birthDate) return '';
  const b = new Date(birthDate);
  if(isNaN(b)) return '';
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if(m < 0 || (m===0 && now.getDate() < b.getDate())) age--;
  return age >= 0 ? age + ' anos' : '';
}
function bindInfoInputs(){
  document.querySelectorAll('[data-info]').forEach(el=>{
    if(el.dataset.bound) return;
    el.dataset.bound = '1';
    const key = el.dataset.info;
    el.addEventListener('input', ()=>{
      state.info[key] = el.value;
      if(key==='birthDate') document.getElementById('ageDisplay').value = calcAge(el.value);
      save(); showSaved();
    });
    el.addEventListener('change', ()=>{
      state.info[key] = el.value;
      save(); showSaved();
    });
  });
}
function renderInfo(){
  document.querySelectorAll('[data-info]').forEach(el=>{
    const key = el.dataset.info;
    el.value = state.info[key] || '';
  });
  document.getElementById('ageDisplay').value = calcAge(state.info.birthDate);
  bindInfoInputs();
  renderContacts();
  setupPrintsDropzone();
}
function addContact(){
  state.info.emergencyContacts.push({id:uid(), name:'', relationship:'', phone:''});
  save(); renderContacts(); showSaved();
}
function updateContact(id, field, value){
  const c = state.info.emergencyContacts.find(x=>x.id===id);
  if(!c) return;
  c[field] = value;
  save(); showSaved();
}
function deleteContact(id){
  instantDelete({
    from: state.info.emergencyContacts,
    predicate: c => c.id === id,
    label: 'Contato removido',
    rerender: () => { renderContacts(); showSaved(); }
  });
}
function renderContacts(){
  const list = document.getElementById('contactList');
  if(!list) return;
  const contacts = state.info.emergencyContacts || [];
  if(!contacts.length){
    list.innerHTML = `<div style="padding:14px;text-align:center;color:var(--text-mute);font-size:13px;border:1px dashed var(--border);border-radius:10px">Nenhum contato cadastrado.</div>`;
    return;
  }
  list.innerHTML = contacts.map(c=>`
    <div class="contact-row" data-contact="${c.id}">
      <input type="text" placeholder="Nome" value="${escapeAttr(c.name)}" oninput="updateContact('${c.id}','name',this.value)" />
      <input type="text" placeholder="Parentesco" value="${escapeAttr(c.relationship)}" oninput="updateContact('${c.id}','relationship',this.value)" />
      <input type="tel" placeholder="Telefone" value="${escapeAttr(c.phone)}" oninput="updateContact('${c.id}','phone',this.value)" />
      <button class="btn-icon" onclick="deleteContact('${c.id}')" title="Remover" style="color:#ff7a9a">✕</button>
    </div>
  `).join('');
  renderPrints();
}

/* =========================================================
   PRINTS · screenshots estratégicos (docs, comprovantes, fotos)
   ========================================================= */
const PRINT_CATEGORIES = [
  { id:'documento',   label:'Documento',   icon:'📄', color:'#39d4ff' },
  { id:'comprovante', label:'Comprovante', icon:'🧾', color:'#5cffb1' },
  { id:'recibo',      label:'Recibo',      icon:'💳', color:'#ffb86b' },
  { id:'foto',        label:'Foto',        icon:'📸', color:'#e26bff' },
  { id:'medico',      label:'Médico',      icon:'💊', color:'#ff7a9a' },
  { id:'outro',       label:'Outro',       icon:'📎', color:'#b061ff' }
];

let printsFilterCat = null;

function setPrintsFilter(cat){
  printsFilterCat = (printsFilterCat === cat) ? null : cat;
  renderPrints();
}

async function handlePrintUpload(input){
  const files = Array.from(input.files || []);
  if(!files.length) return;
  for(const file of files){
    if(!file.type.startsWith('image/')) continue;
    const dataUrl = await fileToDataUrl(file);
    state.info.prints ||= [];
    state.info.prints.unshift({
      id: uid(),
      title: file.name.replace(/\.[^.]+$/,''),
      category: 'documento',
      dataUrl,
      size: file.size,
      addedAt: new Date().toISOString()
    });
  }
  input.value = '';
  save(); showSaved();
  renderPrints();
}

function fileToDataUrl(file){
  return new Promise((res, rej)=>{
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function updatePrint(id, field, value){
  const p = state.info.prints.find(x=>x.id===id);
  if(!p) return;
  p[field] = value;
  save(); showSaved();
  if(field === 'category') renderPrints();
}

function deletePrint(id){
  instantDelete({
    from: state.info.prints || (state.info.prints = []),
    predicate: p => p.id === id,
    label: 'Print excluído',
    rerender: () => { renderPrints(); showSaved(); }
  });
}

function openPrintLightbox(id){
  const p = state.info.prints.find(x=>x.id===id);
  if(!p) return;
  const lb = document.getElementById('printLightbox');
  if(!lb) return;
  document.getElementById('printLightboxImg').src = p.dataUrl;
  document.getElementById('printLightboxTitle').textContent = p.title || 'Sem título';
  document.getElementById('printLightboxMeta').textContent =
    `${(PRINT_CATEGORIES.find(c=>c.id===p.category)||{}).label||'Outro'} · ${new Date(p.addedAt).toLocaleDateString('pt-BR')} · ${(p.size/1024).toFixed(1)} KB`;
  document.getElementById('printLightboxDownload').onclick = () => downloadPrint(id);
  lb.classList.add('show');
}
function closePrintLightbox(){
  const lb = document.getElementById('printLightbox');
  if(lb) lb.classList.remove('show');
}
function downloadPrint(id){
  const p = state.info.prints.find(x=>x.id===id);
  if(!p) return;
  const a = document.createElement('a');
  a.href = p.dataUrl;
  a.download = (p.title || 'print') + '.png';
  document.body.appendChild(a); a.click(); a.remove();
}

function renderPrints(){
  const grid = document.getElementById('printsGrid');
  const pills = document.getElementById('printsFilterPills');
  if(!grid) return;
  const all = state.info.prints || [];
  const counts = {};
  all.forEach(p => { counts[p.category||'outro'] = (counts[p.category||'outro']||0) + 1; });

  if(pills){
    pills.innerHTML = `
      <button class="prints-pill ${printsFilterCat===null?'active':''}" onclick="setPrintsFilter(null)">
        <span>📂</span><span>Todos</span><span class="cnt">${all.length}</span>
      </button>
      ${PRINT_CATEGORIES.map(c=>`
        <button class="prints-pill ${printsFilterCat===c.id?'active':''}" style="--cat-color:${c.color}" onclick="setPrintsFilter('${c.id}')">
          <span>${c.icon}</span><span>${c.label}</span><span class="cnt">${counts[c.id]||0}</span>
        </button>
      `).join('')}
    `;
  }

  const filtered = printsFilterCat ? all.filter(p => (p.category||'outro') === printsFilterCat) : all;

  if(!filtered.length){
    grid.innerHTML = `<div class="prints-empty">
      <div style="font-size:38px;opacity:0.4;margin-bottom:8px">📸</div>
      <div style="font-weight:600;color:var(--text-dim);margin-bottom:4px">${all.length?'Nada nesta categoria':'Nenhum print ainda'}</div>
      <div style="font-size:12px">${all.length?'Mude o filtro acima.':'Clique em <strong>+ Adicionar print</strong> ou arraste imagens aqui.'}</div>
    </div>`;
    return;
  }
  grid.innerHTML = filtered.map(p=>{
    const cat = PRINT_CATEGORIES.find(c=>c.id===(p.category||'outro')) || PRINT_CATEGORIES[5];
    return `
      <div class="print-card" data-id="${p.id}">
        <div class="print-thumb" onclick="openPrintLightbox('${p.id}')" style="background-image:url('${p.dataUrl}')">
          <span class="print-cat-badge" style="background:${cat.color}">${cat.icon} ${cat.label}</span>
        </div>
        <div class="print-meta">
          <input type="text" class="print-title" value="${escapeAttr(p.title||'')}" placeholder="Título..." oninput="updatePrint('${p.id}','title',this.value)" />
          <select class="print-cat-select" onchange="updatePrint('${p.id}','category',this.value)">
            ${PRINT_CATEGORIES.map(c=>`<option value="${c.id}" ${(p.category||'outro')===c.id?'selected':''}>${c.icon} ${c.label}</option>`).join('')}
          </select>
          <div class="print-actions">
            <button class="btn-icon" title="Baixar" onclick="downloadPrint('${p.id}')">⬇</button>
            <button class="btn-icon" title="Excluir" onclick="deletePrint('${p.id}')" style="color:#ff7a9a">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* =========================================================
   COPY · cada card de info copia próprios dados pra clipboard
   ========================================================= */
const INFO_CARD_TITLES = {
  identity:  'IDENTIDADE',
  documents: 'DOCUMENTOS',
  address:   'ENDEREÇO',
  health:    'SAÚDE',
  contacts:  'CONTATOS DE EMERGÊNCIA',
  prints:    'PRINTS ESTRATÉGICOS'
};

function buildCardText(card){
  const kind = card.dataset.card;
  const lines = [];
  const title = INFO_CARD_TITLES[kind] || (card.querySelector('.info-card-title')?.textContent || 'CARD').toUpperCase();
  lines.push(`━━━ ${title} ━━━`);

  if(kind === 'contacts'){
    const list = state.info.emergencyContacts || [];
    if(!list.length) lines.push('(nenhum contato cadastrado)');
    list.forEach((c,i)=>{
      const parts = [c.name||'(sem nome)'];
      if(c.relationship) parts.push(c.relationship);
      if(c.phone) parts.push(c.phone);
      lines.push(`${i+1}. ${parts.join(' · ')}`);
    });
  } else if(kind === 'prints'){
    const list = state.info.prints || [];
    if(!list.length) lines.push('(nenhum print cadastrado)');
    list.forEach((p,i)=>{
      const cat = (PRINT_CATEGORIES.find(c=>c.id===(p.category||'outro'))||{}).label || 'Outro';
      const date = new Date(p.addedAt).toLocaleDateString('pt-BR');
      lines.push(`${i+1}. ${p.title||'(sem título)'} [${cat}] · ${date}`);
    });
  } else {
    card.querySelectorAll('.info-field').forEach(f=>{
      const label = f.querySelector('label')?.textContent?.trim();
      const input = f.querySelector('input,select,textarea');
      if(!label || !input) return;
      let v = (input.value||'').trim();
      if(input.tagName === 'SELECT' && input.selectedIndex > 0){
        v = input.options[input.selectedIndex].textContent.trim();
      }
      if(!v) return;
      lines.push(`${label}: ${v}`);
    });
    if(lines.length === 1) lines.push('(nenhum dado preenchido)');
  }
  return lines.join('\n');
}

async function copyInfoCard(btn){
  const card = btn.closest('.info-card');
  if(!card) return;
  const text = buildCardText(card);
  try {
    await navigator.clipboard.writeText(text);
    flashCopyBtn(btn, true);
  } catch(_){
    // fallback for non-https / older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); flashCopyBtn(btn, true); }
    catch(e){ flashCopyBtn(btn, false); }
    document.body.removeChild(ta);
  }
}

function flashCopyBtn(btn, ok){
  const original = btn.textContent;
  btn.textContent = ok ? '✓' : '✕';
  btn.classList.add(ok ? 'copied' : 'failed');
  setTimeout(()=>{
    btn.textContent = original;
    btn.classList.remove('copied','failed');
  }, 1400);
}

/* ---------- SCREENSHOT (html2canvas → PNG download) ---------- */
async function screenshotInfoCard(btn){
  const card = btn.closest('.info-card');
  if(!card) return;
  if(typeof html2canvas !== 'function'){
    cortexToast({msg:'html2canvas não carregada. Verifique sua conexão.', type:'error'});
    return;
  }
  const original = btn.textContent;
  btn.textContent = '⏳';
  btn.classList.add('working');
  // hide action buttons (copy + print) during capture
  const head = card.querySelector('.info-card-head');
  const hidden = head ? Array.from(head.querySelectorAll('.info-copy-btn,.info-print-btn,.btn,label.btn,label.btn-primary')) : [];
  hidden.forEach(el => el.dataset._prevVis = el.style.visibility || '');
  hidden.forEach(el => el.style.visibility = 'hidden');
  try {
    const bgColor = getComputedStyle(document.body).getPropertyValue('--bg-0').trim() || '#07030f';
    const canvas = await html2canvas(card, {
      backgroundColor: bgColor,
      scale: window.devicePixelRatio > 1 ? 2 : 1.5,
      useCORS: true,
      logging: false,
      windowWidth: document.documentElement.scrollWidth
    });
    const kind = card.dataset.card || 'card';
    const title = (INFO_CARD_TITLES[kind] || kind).toLowerCase().replace(/\s+/g,'-');
    const stamp = new Date().toISOString().slice(0,10);
    canvas.toBlob(blob => {
      if(!blob){ flashPrintBtn(btn, false); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cortex-${title}-${stamp}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 1500);
      flashPrintBtn(btn, true, original);
    }, 'image/png');
  } catch(err){
    console.warn('screenshot failed', err);
    flashPrintBtn(btn, false, original);
  } finally {
    hidden.forEach(el => { el.style.visibility = el.dataset._prevVis || ''; delete el.dataset._prevVis; });
    btn.classList.remove('working');
  }
}
function flashPrintBtn(btn, ok, original){
  btn.textContent = ok ? '✓' : '✕';
  btn.classList.add(ok ? 'copied' : 'failed');
  setTimeout(()=>{
    btn.textContent = original || '📷';
    btn.classList.remove('copied','failed');
  }, 1400);
}

function setupPrintsDropzone(){
  const dz = document.getElementById('printsDropzone');
  if(!dz || dz.dataset.bound) return;
  dz.dataset.bound = '1';
  ['dragenter','dragover'].forEach(ev=>{
    dz.addEventListener(ev, e=>{ e.preventDefault(); dz.classList.add('drag-active'); });
  });
  ['dragleave','drop'].forEach(ev=>{
    dz.addEventListener(ev, e=>{ e.preventDefault(); dz.classList.remove('drag-active'); });
  });
  dz.addEventListener('drop', async e=>{
    const files = Array.from(e.dataTransfer.files||[]).filter(f=>f.type.startsWith('image/'));
    for(const file of files){
      const dataUrl = await fileToDataUrl(file);
      state.info.prints ||= [];
      state.info.prints.unshift({
        id: uid(), title: file.name.replace(/\.[^.]+$/,''), category: 'documento',
        dataUrl, size: file.size, addedAt: new Date().toISOString()
      });
    }
    save(); showSaved(); renderPrints();
  });
}

