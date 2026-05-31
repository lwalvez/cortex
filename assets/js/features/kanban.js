/* =========================================================
   KANBAN
   ========================================================= */
let dragState = null;

function renderKanbans(){
  renderKanban('pessoal');
  renderKanban('profissional');
}
function renderKanban(kind){
  const board = document.getElementById(kind==='pessoal'?'kanbanPessoalBoard':'kanbanProfissionalBoard');
  const data = state.kanbans[kind];
  board.innerHTML = data.columns.map(col=>`
    <div class="kanban-col" data-col="${col.id}" data-kind="${kind}">
      <div class="col-head">
        <div class="col-title-wrap">
          <div class="col-dot" style="background:${col.color};color:${col.color}" onclick="cycleColColor('${kind}','${col.id}')" title="Mudar cor"></div>
          <input class="col-title" value="${escapeAttr(col.title)}" oninput="updateColTitle('${kind}','${col.id}',this.value)" />
          <span class="col-count">${col.cards.length}</span>
        </div>
        <div class="col-actions">
          <button class="btn-icon" title="Excluir coluna" onclick="deleteCol('${kind}','${col.id}')" style="color:#ff7a9a">✕</button>
        </div>
      </div>
      <div class="kanban-cards" data-cards>
        ${col.cards.map(c=>renderCard(kind,col.id,c)).join('')}
      </div>
      <button class="add-card-btn" onclick="openCardModal('${kind}','${col.id}')">+ Adicionar cartão</button>
    </div>
  `).join('') + `<button class="add-col-btn" onclick="addCol('${kind}')">+ Adicionar coluna</button>`;

  board.querySelectorAll('.kanban-card').forEach(card=>{
    card.addEventListener('dragstart',onDragStart);
    card.addEventListener('dragend',onDragEnd);
  });
  board.querySelectorAll('.kanban-col').forEach(col=>{
    col.addEventListener('dragover',onDragOver);
    col.addEventListener('dragleave',onDragLeave);
    col.addEventListener('drop',onDrop);
  });
}
function renderCard(kind,colId,c){
  const dueTxt = c.due ? `📅 ${formatDate(c.due)}` : '';
  return `
    <div class="kanban-card" draggable="true" data-card="${c.id}" data-col="${colId}" data-kind="${kind}">
      <div class="kanban-card-actions">
        <button class="btn-icon" onclick="event.stopPropagation();openCardModal('${kind}','${colId}','${c.id}')" title="Editar">✏️</button>
        <button class="btn-icon" onclick="event.stopPropagation();deleteCard('${kind}','${colId}','${c.id}')" title="Excluir" style="color:#ff7a9a">🗑️</button>
      </div>
      <h5 class="kanban-card-title">${escapeHtml(c.title)}</h5>
      ${c.desc ? `<div class="kanban-card-desc">${escapeHtml(c.desc)}</div>` : ''}
      <div class="kanban-card-foot">
        <span class="prio-tag prio-${c.prio||'media'}">${c.prio||'media'}</span>
        <span class="kanban-card-date">${dueTxt}</span>
      </div>
    </div>
  `;
}
function onDragStart(e){
  const el = e.currentTarget;
  dragState = { cardId: el.dataset.card, fromCol: el.dataset.col, kind: el.dataset.kind };
  el.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  try{ e.dataTransfer.setData('text/plain', el.dataset.card); }catch(_){}
}
function onDragEnd(e){
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.kanban-col.drag-over').forEach(c=>c.classList.remove('drag-over'));
  dragState = null;
}
function onDragOver(e){
  if(!dragState) return;
  const col = e.currentTarget;
  if(col.dataset.kind !== dragState.kind) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  col.classList.add('drag-over');
}
function onDragLeave(e){
  if(e.currentTarget.contains(e.relatedTarget)) return;
  e.currentTarget.classList.remove('drag-over');
}
function onDrop(e){
  if(!dragState) return;
  e.preventDefault();
  const col = e.currentTarget;
  col.classList.remove('drag-over');
  const toColId = col.dataset.col;
  const kind = col.dataset.kind;
  if(kind !== dragState.kind) return;
  moveCard(kind, dragState.fromCol, toColId, dragState.cardId);
}
function moveCard(kind, fromColId, toColId, cardId){
  if(fromColId === toColId) return;
  const cols = state.kanbans[kind].columns;
  const fromCol = cols.find(c=>c.id===fromColId);
  const toCol = cols.find(c=>c.id===toColId);
  if(!fromCol || !toCol) return;
  const idx = fromCol.cards.findIndex(c=>c.id===cardId);
  if(idx<0) return;
  const [card] = fromCol.cards.splice(idx,1);
  toCol.cards.push(card);
  save(); renderKanban(kind);
}
function addCol(kind){
  const used = state.kanbans[kind].columns.length;
  state.kanbans[kind].columns.push({
    id:uid(), title:'Nova Coluna',
    color: COL_COLORS[used % COL_COLORS.length],
    cards:[]
  });
  save(); renderKanban(kind);
}
function deleteCol(kind, colId){
  const col = state.kanbans[kind].columns.find(c=>c.id===colId);
  if(!col) return;
  const label = col.cards.length
    ? `Coluna "${col.title}" + ${col.cards.length} cartões excluídos`
    : `Coluna "${col.title}" excluída`;
  instantDelete({
    from: state.kanbans[kind].columns,
    predicate: c => c.id === colId,
    label,
    rerender: () => renderKanban(kind)
  });
}
function updateColTitle(kind, colId, val){
  const col = state.kanbans[kind].columns.find(c=>c.id===colId);
  if(!col) return;
  col.title = val; save();
}
function cycleColColor(kind, colId){
  const col = state.kanbans[kind].columns.find(c=>c.id===colId);
  if(!col) return;
  const i = COL_COLORS.indexOf(col.color);
  col.color = COL_COLORS[(i+1) % COL_COLORS.length];
  save(); renderKanban(kind);
}
function openCardModal(kind, colId, cardId=null){
  document.getElementById('cardForm').reset();
  document.getElementById('cardBoard').value = kind;
  document.getElementById('cardColId').value = colId;
  document.getElementById('cardId').value = '';
  document.getElementById('cardModalTitle').textContent = 'Novo Cartão';
  if(cardId){
    const col = state.kanbans[kind].columns.find(c=>c.id===colId);
    const card = col && col.cards.find(c=>c.id===cardId);
    if(card){
      document.getElementById('cardId').value = card.id;
      document.getElementById('cardTitle').value = card.title;
      document.getElementById('cardDesc').value = card.desc||'';
      document.getElementById('cardPrio').value = card.prio||'media';
      document.getElementById('cardDue').value = card.due||'';
      document.getElementById('cardModalTitle').textContent = 'Editar Cartão';
    }
  }
  openModal('cardModal');
}
function saveCard(e){
  e.preventDefault();
  const kind = document.getElementById('cardBoard').value;
  const colId = document.getElementById('cardColId').value;
  const cardId = document.getElementById('cardId').value;
  const col = state.kanbans[kind].columns.find(c=>c.id===colId);
  if(!col) return;
  const data = {
    title: document.getElementById('cardTitle').value.trim(),
    desc: document.getElementById('cardDesc').value.trim(),
    prio: document.getElementById('cardPrio').value,
    due: document.getElementById('cardDue').value
  };
  if(cardId){
    const card = col.cards.find(c=>c.id===cardId);
    Object.assign(card, data);
  }else{
    col.cards.push({id:uid(),...data,created:Date.now()});
  }
  save(); closeModal('cardModal'); renderKanban(kind);
}
function deleteCard(kind, colId, cardId){
  const col = state.kanbans[kind].columns.find(c=>c.id===colId);
  if(!col) return;
  instantDelete({
    from: col.cards,
    predicate: c => c.id === cardId,
    label: 'Cartão excluído',
    rerender: () => renderKanban(kind)
  });
}

