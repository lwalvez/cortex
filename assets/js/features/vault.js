/* =========================================================
   VAULT · Obsidian-style notes (PARA + Zettelkasten + MOCs)
   ========================================================= */

const VAULT_DEFAULT_FOLDERS = [
  { id:'dashboard', name:'00 - Dashboard', icon:'🏛️', system:true },
  { id:'projects',  name:'01 - Projects',  icon:'🎯', system:true },
  { id:'areas',     name:'02 - Areas',     icon:'🧭', system:true },
  { id:'resources', name:'03 - Resources', icon:'📚', system:true },
  { id:'archive',   name:'04 - Archive',   icon:'🗄️', system:true },
  { id:'mocs',      name:'MOCs',           icon:'🗺️', system:true }
];

function defaultVault(){
  return {
    notes: [],
    folders: VAULT_DEFAULT_FOLDERS.map(f=>({...f})),
    activeFolder: null,
    activeTag: null,
    search: '',
    currentNoteId: null,
    previewMode: 'split',
    notesView: 'postit'
  };
}

/* ---------- View toggle (Post-it ↔ Vault) ---------- */
function setNotesView(mode){
  state.vault ||= defaultVault();
  state.vault.notesView = mode;
  save();
  const post  = document.getElementById('notesViewPostit');
  const vault = document.getElementById('notesViewVault');
  const graph = document.getElementById('notesViewGraph');
  if(post)  post.style.display  = (mode==='postit') ? '' : 'none';
  if(vault) vault.style.display = (mode==='vault')  ? '' : 'none';
  if(graph) graph.style.display = (mode==='graph')  ? '' : 'none';
  document.querySelectorAll('.notes-view-toggle button').forEach(b=>{
    b.classList.toggle('active', b.dataset.view === mode);
  });
  const addBtn = document.getElementById('notesAddBtn');
  if(addBtn){
    if(mode==='vault'){
      addBtn.style.display = '';
      addBtn.textContent = '+ Nova nota';
      addBtn.setAttribute('onclick', 'vaultNewNote()');
    } else if(mode==='graph'){
      addBtn.style.display = 'none';
    } else {
      addBtn.style.display = '';
      addBtn.textContent = '+ Nova Nota';
      addBtn.setAttribute('onclick', "addNote('notes')");
    }
  }
  if(mode==='vault') renderVault();
  if(mode==='graph' && typeof renderGraph === 'function') renderGraph();
  if(mode!=='graph' && typeof graphStop === 'function') graphStop();
}

/* ---------- CRUD ---------- */
function vaultNewNote(){
  state.vault ||= defaultVault();
  const folder = state.vault.activeFolder || 'projects';
  const n = {
    id: uid(),
    title: '',
    content: '',
    folder,
    tags: [],
    pinned: false,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  state.vault.notes.unshift(n);
  state.vault.currentNoteId = n.id;
  save();
  renderVault();
  setTimeout(()=>{
    const t = document.querySelector('.vault-title-input');
    if(t) t.focus();
  }, 50);
}

let vaultSaveTimer = null;
function vaultUpdate(id, patch){
  const n = state.vault.notes.find(x=>x.id===id);
  if(!n) return;
  Object.assign(n, patch, { updated: new Date().toISOString() });
  clearTimeout(vaultSaveTimer);
  vaultSaveTimer = setTimeout(save, 300);
  // Light refresh: list item + preview + connections
  vaultRefreshListItem(id);
  vaultRefreshPreview();
  vaultRefreshConnections();
}

function vaultRefreshListItem(id){
  const n = state.vault.notes.find(x=>x.id===id);
  const card = document.querySelector(`.vault-card[data-id="${id}"]`);
  if(!n || !card) return;
  const t = card.querySelector('.vault-card-title');
  if(t) t.textContent = n.title || 'Sem título';
  const p = card.querySelector('.vault-card-preview');
  if(p) p.textContent = vaultStripMd(n.content).slice(0,160) || 'Vazio';
}

function vaultSelectNote(id){
  state.vault.currentNoteId = id;
  save();
  renderVault();
}

function vaultDeleteNote(id){
  if(state.vault.currentNoteId === id) state.vault.currentNoteId = null;
  instantDelete({
    from: state.vault.notes,
    predicate: n => n.id === id,
    label: 'Nota excluída · backlinks ficarão quebrados',
    rerender: renderVault
  });
}

function vaultTogglePin(id){
  const n = state.vault.notes.find(x=>x.id===id);
  if(!n) return;
  n.pinned = !n.pinned;
  save();
  renderVault();
}

function vaultSetFolder(id, folder){
  vaultUpdate(id, { folder });
  vaultRefreshList();
}

/* ---------- Filters ---------- */
function vaultSetActiveFolder(folderId){
  state.vault.activeFolder = (state.vault.activeFolder === folderId) ? null : folderId;
  state.vault.activeTag = null;
  save();
  renderVault();
}
function vaultSetActiveTag(tag){
  state.vault.activeTag = (state.vault.activeTag === tag) ? null : tag;
  save();
  renderVault();
}
function vaultSetSearch(q){
  state.vault.search = (q||'').toLowerCase().trim();
  vaultRefreshList();
}
function vaultSetPreviewMode(mode){
  state.vault.previewMode = mode;
  save();
  const body = document.querySelector('.vault-editor-body');
  if(!body) return;
  body.classList.remove('mode-split','mode-edit','mode-preview');
  body.classList.add('mode-'+mode);
  document.querySelectorAll('[data-vault-mode]').forEach(b=>{
    b.classList.toggle('active', b.dataset.vaultMode === mode);
  });
}

/* ---------- Tags ---------- */
function vaultAddTag(id, raw){
  const n = state.vault.notes.find(x=>x.id===id);
  if(!n) return;
  const tag = (raw||'').trim().replace(/^#/,'').toLowerCase();
  if(!tag) return;
  n.tags ||= [];
  if(!n.tags.includes(tag)) n.tags.push(tag);
  vaultUpdate(id, {});
  vaultRefreshTagsBar();
  vaultRefreshTagList();
}
function vaultRemoveTag(id, tag){
  const n = state.vault.notes.find(x=>x.id===id);
  if(!n) return;
  n.tags = (n.tags||[]).filter(t=>t!==tag);
  vaultUpdate(id, {});
  vaultRefreshTagsBar();
  vaultRefreshTagList();
}
function vaultTagInputKey(e, id){
  if(e.key === 'Enter' || e.key === ','){
    e.preventDefault();
    vaultAddTag(id, e.target.value);
    e.target.value = '';
  }
}

/* ---------- Wikilinks ---------- */
function vaultFindNoteByTitle(title){
  const t = (title||'').trim().toLowerCase();
  return state.vault.notes.find(n => (n.title||'').trim().toLowerCase() === t);
}

function vaultOpenWikilink(title){
  let n = vaultFindNoteByTitle(title);
  if(!n){
    // cria a nota automaticamente (sem prompt) — fluido. Toast com undo.
    n = {
      id: uid(),
      title,
      content: '',
      folder: state.vault.activeFolder || 'resources',
      tags: [],
      pinned: false,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    state.vault.notes.unshift(n);
    cortexToast({
      msg:`Nota "${title}" criada`,
      type:'success',
      undo:()=>{
        state.vault.notes = state.vault.notes.filter(x=>x.id!==n.id);
        if(state.vault.currentNoteId===n.id) state.vault.currentNoteId = null;
        save(); renderVault();
        cortexToast({msg:'Criação desfeita',type:'info'});
      }
    });
  }
  state.vault.currentNoteId = n.id;
  save();
  renderVault();
}

function vaultExtractWikilinks(content){
  const out = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while((m = re.exec(content||''))){
    const target = m[1].split('|')[0].trim();
    if(target) out.push(target);
  }
  return out;
}

function vaultComputeBacklinks(noteId){
  const n = state.vault.notes.find(x=>x.id===noteId);
  if(!n) return [];
  const target = (n.title||'').trim().toLowerCase();
  if(!target) return [];
  const out = [];
  state.vault.notes.forEach(other=>{
    if(other.id === noteId) return;
    const links = vaultExtractWikilinks(other.content).map(s=>s.toLowerCase());
    if(links.includes(target)){
      // grab snippet around the link
      const re = new RegExp(`\\[\\[${target.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:\\|[^\\]]+)?\\]\\]`, 'i');
      const match = other.content.match(re);
      let ctx = '';
      if(match){
        const idx = other.content.toLowerCase().indexOf(match[0].toLowerCase());
        const start = Math.max(0, idx - 40);
        const end = Math.min(other.content.length, idx + match[0].length + 40);
        ctx = (start>0?'…':'') + other.content.slice(start,end).replace(/\n+/g,' ') + (end<other.content.length?'…':'');
      }
      out.push({ id: other.id, title: other.title || 'Sem título', ctx });
    }
  });
  return out;
}

function vaultComputeRelated(noteId){
  // Related = shared tags (excluding current)
  const n = state.vault.notes.find(x=>x.id===noteId);
  if(!n || !n.tags || !n.tags.length) return [];
  const scored = state.vault.notes
    .filter(o => o.id !== noteId)
    .map(o => {
      const shared = (o.tags||[]).filter(t => n.tags.includes(t));
      return { note:o, score: shared.length, shared };
    })
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0,6);
  return scored.map(x => ({ id:x.note.id, title:x.note.title || 'Sem título', ctx: x.shared.map(t=>'#'+t).join(' ') }));
}

/* ---------- Markdown ---------- */
function vaultStripMd(s){
  return String(s||'')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_,a,b)=> b || a)
    .replace(/[#*_`>\-]/g, '')
    .replace(/\n+/g,' ');
}

function vaultRenderMd(src){
  if(!src) return '<p style="color:var(--text-mute);font-style:italic">Comece a escrever... Use <code>[[Nome da Nota]]</code> para criar links e <code>#tag</code> para tags.</p>';
  let s = escapeHtml(src);

  // code blocks ```...```
  s = s.replace(/```([\s\S]*?)```/g, (_,c)=>`<pre><code>${c.trim()}</code></pre>`);
  // inline code
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // headings
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // blockquote
  s = s.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // hr
  s = s.replace(/^---+$/gm, '<hr/>');
  // bold + italic
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  // images & links (markdown)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // wikilinks [[Title]] or [[Title|alias]]
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_,title,alias)=>{
    const label = alias || title;
    const exists = !!vaultFindNoteByTitle(title);
    const cls = exists ? 'wikilink' : 'wikilink broken';
    const safeTitle = title.replace(/'/g,'&#39;');
    return `<a class="${cls}" onclick="vaultOpenWikilink('${safeTitle}');return false;">${escapeHtml(label)}</a>`;
  });
  // inline tags #tag (not inside code)
  s = s.replace(/(^|\s)#([a-zA-Z0-9_\-À-ſ]+)/g, (_,pre,t)=>`${pre}<span class="tag-inline" onclick="vaultSetActiveTag('${t.toLowerCase()}')">#${t}</span>`);
  // lists
  s = s.replace(/^(?:- |\* )(.+)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>[\s\S]+?<\/li>)/g, m => m.includes('</ul>') ? m : `<ul>${m}</ul>`);
  // paragraphs
  s = s.split(/\n{2,}/).map(block=>{
    if(/^\s*<(h\d|ul|ol|pre|blockquote|hr)/.test(block.trim())) return block;
    return `<p>${block.replace(/\n/g,'<br/>')}</p>`;
  }).join('\n');
  return s;
}

/* ---------- Render ---------- */
function renderVault(){
  if(!state.vault) state.vault = defaultVault();
  // Sync view-toggle visibility once
  const post  = document.getElementById('notesViewPostit');
  const vault = document.getElementById('notesViewVault');
  if(post && vault){
    const mode = state.vault.notesView || 'postit';
    post.style.display  = (mode==='postit') ? '' : 'none';
    vault.style.display = (mode==='vault')  ? '' : 'none';
    document.querySelectorAll('.notes-view-toggle button').forEach(b=>{
      b.classList.toggle('active', b.dataset.view === mode);
    });
    if(mode !== 'vault') return;
  }
  vaultRefreshTree();
  vaultRefreshTagList();
  vaultRefreshList();
  vaultRefreshEditor();
}

function vaultRefreshTree(){
  const el = document.getElementById('vaultFolderList');
  if(!el) return;
  const counts = {};
  state.vault.notes.forEach(n => { counts[n.folder] = (counts[n.folder]||0) + 1; });
  const active = state.vault.activeFolder;
  el.innerHTML = `
    <div class="vault-folder ${active===null?'active':''}" onclick="vaultSetActiveFolder(null)">
      <span class="ico">📂</span><span>Todas</span>
      <span class="count">${state.vault.notes.length}</span>
    </div>
    ${state.vault.folders.map(f=>`
      <div class="vault-folder ${active===f.id?'active':''}" onclick="vaultSetActiveFolder('${f.id}')">
        <span class="ico">${f.icon}</span><span>${escapeHtml(f.name)}</span>
        <span class="count">${counts[f.id]||0}</span>
      </div>
    `).join('')}
  `;
}

function vaultRefreshTagList(){
  const el = document.getElementById('vaultTagList');
  if(!el) return;
  const counts = {};
  state.vault.notes.forEach(n => (n.tags||[]).forEach(t => { counts[t] = (counts[t]||0) + 1; }));
  // also pull inline tags from content
  state.vault.notes.forEach(n => {
    const re = /(^|\s)#([a-zA-Z0-9_\-À-ſ]+)/g;
    let m;
    while((m = re.exec(n.content||''))){
      const t = m[2].toLowerCase();
      if(!(n.tags||[]).includes(t)) counts[t] = (counts[t]||0) + 1;
    }
  });
  const tags = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  if(!tags.length){
    el.innerHTML = '<div style="font-size:11px;color:var(--text-mute);padding:6px 4px;font-style:italic">Sem tags ainda. Use #tag no conteúdo.</div>';
    return;
  }
  const active = state.vault.activeTag;
  el.innerHTML = tags.map(([t,c])=>`
    <span class="vault-tag ${active===t?'active':''}" onclick="vaultSetActiveTag('${t}')">
      #${escapeHtml(t)} <span style="opacity:0.6">${c}</span>
    </span>
  `).join('');
}

function vaultGetFilteredNotes(){
  let list = [...(state.vault.notes||[])];
  if(state.vault.activeFolder){
    list = list.filter(n => n.folder === state.vault.activeFolder);
  }
  if(state.vault.activeTag){
    const t = state.vault.activeTag;
    list = list.filter(n => (n.tags||[]).includes(t) || new RegExp(`(^|\\s)#${t}\\b`,'i').test(n.content||''));
  }
  if(state.vault.search){
    const q = state.vault.search;
    list = list.filter(n =>
      (n.title||'').toLowerCase().includes(q) ||
      (n.content||'').toLowerCase().includes(q) ||
      (n.tags||[]).some(t => t.includes(q))
    );
  }
  list.sort((a,b)=> (b.pinned?1:0)-(a.pinned?1:0) || (b.updated||'').localeCompare(a.updated||''));
  return list;
}

function vaultRefreshList(){
  const el = document.getElementById('vaultList');
  const sub = document.getElementById('vaultListSub');
  if(!el) return;
  const list = vaultGetFilteredNotes();
  if(sub){
    let label = 'Todas as notas';
    if(state.vault.activeFolder){
      const f = state.vault.folders.find(x=>x.id===state.vault.activeFolder);
      label = f ? f.name : label;
    }
    if(state.vault.activeTag) label += ` · #${state.vault.activeTag}`;
    sub.textContent = `${list.length} nota${list.length===1?'':'s'} · ${label}`;
  }
  if(!list.length){
    el.innerHTML = `<div class="vault-list-empty">
      ${state.vault.search ? 'Nada encontrado.' : 'Vazio.<br>Clique em <strong>+ Nova nota</strong>.'}
    </div>`;
    return;
  }
  const curr = state.vault.currentNoteId;
  el.innerHTML = list.map(n=>{
    const tags = (n.tags||[]).slice(0,3).map(t=>`<span class="vault-card-tag">#${escapeHtml(t)}</span>`).join('');
    const date = new Date(n.updated).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    return `
      <div class="vault-card ${n.id===curr?'active':''}" data-id="${n.id}" onclick="vaultSelectNote('${n.id}')">
        <div class="vault-card-head">
          ${n.pinned?'<span class="vault-card-pin">📌</span>':''}
          <span class="vault-card-title">${escapeHtml(n.title || 'Sem título')}</span>
        </div>
        <div class="vault-card-preview">${escapeHtml(vaultStripMd(n.content).slice(0,160) || 'Vazio')}</div>
        <div class="vault-card-meta">
          <div class="vault-card-tags">${tags}</div>
          <span>${date}</span>
        </div>
      </div>
    `;
  }).join('');
}

function vaultRefreshEditor(){
  const el = document.getElementById('vaultEditor');
  if(!el) return;
  const id = state.vault.currentNoteId;
  const n = id ? state.vault.notes.find(x=>x.id===id) : null;
  if(!n){
    el.innerHTML = `
      <div class="vault-editor-empty">
        <div>
          <div class="ico">🧠</div>
          <h3>Segundo cérebro</h3>
          <p>Selecione uma nota à esquerda ou crie a primeira.<br/>
          Use <code>[[Nome]]</code> para conectar ideias e <code>#tag</code> para classificar.</p>
        </div>
      </div>
    `;
    return;
  }
  const mode = state.vault.previewMode || 'split';
  el.innerHTML = `
    <div class="vault-editor-toolbar">
      <input type="text" class="vault-title-input" value="${escapeAttr(n.title||'')}" placeholder="Título da nota..." oninput="vaultUpdate('${n.id}',{title:this.value})" />
      <select class="vault-folder-select" onchange="vaultSetFolder('${n.id}', this.value)">
        ${state.vault.folders.map(f=>`<option value="${f.id}" ${n.folder===f.id?'selected':''}>${escapeHtml(f.icon+' '+f.name)}</option>`).join('')}
      </select>
      <button class="vault-toolbar-btn ${mode==='edit'?'active':''}" data-vault-mode="edit" onclick="vaultSetPreviewMode('edit')" title="Apenas editor">✏️</button>
      <button class="vault-toolbar-btn ${mode==='split'?'active':''}" data-vault-mode="split" onclick="vaultSetPreviewMode('split')" title="Editor + preview">⚌</button>
      <button class="vault-toolbar-btn ${mode==='preview'?'active':''}" data-vault-mode="preview" onclick="vaultSetPreviewMode('preview')" title="Apenas preview">👁️</button>
      <button class="vault-toolbar-btn" onclick="vaultTogglePin('${n.id}')" title="${n.pinned?'Desafixar':'Fixar'}">${n.pinned?'📌':'📍'}</button>
      <button class="vault-toolbar-btn danger" onclick="vaultDeleteNote('${n.id}')" title="Excluir">🗑️</button>
    </div>
    <div class="vault-tags-bar" id="vaultTagsBar">
      ${vaultTagsBarInner(n)}
    </div>
    <div class="vault-editor-body mode-${mode}">
      <textarea class="vault-editor-textarea" placeholder="Escreva em Markdown. Use [[Link]] e #tag." oninput="vaultUpdate('${n.id}',{content:this.value})">${escapeHtml(n.content||'')}</textarea>
      <div class="vault-preview" id="vaultPreview">${vaultRenderMd(n.content)}</div>
    </div>
    <div class="vault-connections" id="vaultConnections">
      ${vaultConnectionsInner(n)}
    </div>
  `;
}

function vaultTagsBarInner(n){
  const chips = (n.tags||[]).map(t=>`
    <span class="vault-tag-chip">#${escapeHtml(t)}<span class="x" onclick="vaultRemoveTag('${n.id}','${t}')">×</span></span>
  `).join('');
  return `
    <span class="lbl">Tags</span>
    ${chips}
    <input type="text" class="vault-tag-input" placeholder="+ adicionar (Enter)" onkeydown="vaultTagInputKey(event,'${n.id}')" />
  `;
}

function vaultConnectionsInner(n){
  const back = vaultComputeBacklinks(n.id);
  const rel = vaultComputeRelated(n.id);
  const out = vaultExtractWikilinks(n.content);
  return `
    <div class="vault-conn-section">
      <div class="vault-conn-title">↩ Backlinks <span class="count-badge">${back.length}</span></div>
      <div class="vault-conn-items">
        ${back.length ? back.map(b=>`
          <div class="vault-conn-item" onclick="vaultSelectNote('${b.id}')">
            <span>📄</span><span>${escapeHtml(b.title)}</span>
            ${b.ctx?`<span class="ctx">${escapeHtml(b.ctx)}</span>`:''}
          </div>
        `).join('') : '<div class="vault-conn-empty">Nenhuma nota aponta para esta ainda.</div>'}
      </div>
    </div>
    <div class="vault-conn-section">
      <div class="vault-conn-title">→ Links de saída <span class="count-badge">${out.length}</span></div>
      <div class="vault-conn-items">
        ${out.length ? out.map(title=>{
          const exists = vaultFindNoteByTitle(title);
          return `<div class="vault-conn-item" onclick="vaultOpenWikilink('${title.replace(/'/g,'&#39;')}')">
            <span>${exists?'🔗':'➕'}</span><span>${escapeHtml(title)}</span>
            ${!exists?'<span class="ctx">criar</span>':''}
          </div>`;
        }).join('') : '<div class="vault-conn-empty">Use [[Nome]] no conteúdo para criar conexões.</div>'}
      </div>
    </div>
    <div class="vault-conn-section">
      <div class="vault-conn-title">≈ Relacionadas (por tags) <span class="count-badge">${rel.length}</span></div>
      <div class="vault-conn-items">
        ${rel.length ? rel.map(r=>`
          <div class="vault-conn-item" onclick="vaultSelectNote('${r.id}')">
            <span>🧩</span><span>${escapeHtml(r.title)}</span>
            <span class="ctx">${escapeHtml(r.ctx)}</span>
          </div>
        `).join('') : '<div class="vault-conn-empty">Adicione tags para ver notas relacionadas.</div>'}
      </div>
    </div>
  `;
}

function vaultRefreshPreview(){
  const id = state.vault.currentNoteId;
  if(!id) return;
  const n = state.vault.notes.find(x=>x.id===id);
  if(!n) return;
  const p = document.getElementById('vaultPreview');
  if(p) p.innerHTML = vaultRenderMd(n.content);
}
function vaultRefreshConnections(){
  const id = state.vault.currentNoteId;
  if(!id) return;
  const n = state.vault.notes.find(x=>x.id===id);
  if(!n) return;
  const c = document.getElementById('vaultConnections');
  if(c) c.innerHTML = vaultConnectionsInner(n);
}
function vaultRefreshTagsBar(){
  const id = state.vault.currentNoteId;
  if(!id) return;
  const n = state.vault.notes.find(x=>x.id===id);
  if(!n) return;
  const bar = document.getElementById('vaultTagsBar');
  if(bar) bar.innerHTML = vaultTagsBarInner(n);
}
