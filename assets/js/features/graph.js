/* =========================================================
   GRAPH · visualização force-directed estilo Obsidian
   ========================================================= */

const GRAPH = {
  nodes: [],       // {id, type:'note'|'tag', noteId, label, x,y,vx,vy, r, color, folder, degree}
  edges: [],       // {a, b, kind:'link'|'tag'}
  transform: { x:0, y:0, k:1 },
  hover: null,
  dragging: null,
  panStart: null,
  running: false,
  paused: false,
  options: { showTags:false, showLabels:true, showOrphans:true },
  rafId: null,
  resizeObs: null,
  energy: 1,
};

const GRAPH_FOLDER_COLORS = {
  dashboard: '#39d4ff',
  projects:  '#b061ff',
  areas:     '#5cffb1',
  resources: '#ffb86b',
  archive:   '#7e6aa8',
  mocs:      '#e26bff',
  _default:  '#b061ff',
};

/* ---------- Build graph from state.vault ---------- */
function graphBuild(){
  if(!state.vault) return;
  const notes = state.vault.notes || [];
  const nodes = [];
  const edges = [];
  const byTitle = {};
  notes.forEach(n => {
    const t = (n.title||'').trim().toLowerCase();
    if(t) byTitle[t] = n;
  });

  // note nodes
  const adj = {};
  notes.forEach(n => {
    const links = vaultExtractWikilinks(n.content || '');
    adj[n.id] = adj[n.id] || new Set();
    links.forEach(target => {
      const tgt = byTitle[target.toLowerCase()];
      if(tgt && tgt.id !== n.id){
        adj[n.id].add(tgt.id);
        adj[tgt.id] = adj[tgt.id] || new Set();
        adj[tgt.id].add(n.id);
        edges.push({ a:n.id, b:tgt.id, kind:'link' });
      }
    });
  });

  const showOrphans = GRAPH.options.showOrphans;
  notes.forEach(n => {
    const deg = (adj[n.id] || new Set()).size;
    if(!showOrphans && deg === 0) return;
    const color = GRAPH_FOLDER_COLORS[n.folder] || GRAPH_FOLDER_COLORS._default;
    nodes.push({
      id: n.id, type:'note', noteId: n.id,
      label: n.title || 'Sem título',
      x: (Math.random()-0.5)*200, y: (Math.random()-0.5)*200,
      vx: 0, vy: 0,
      r: Math.max(5, Math.min(18, 5 + deg * 1.6)),
      color, folder: n.folder, degree: deg,
    });
  });

  // tag nodes (optional)
  if(GRAPH.options.showTags){
    const tagMap = {};
    notes.forEach(n => {
      (n.tags||[]).forEach(t => { (tagMap[t] = tagMap[t] || []).push(n.id); });
      const re = /(^|\s)#([a-zA-Z0-9_\-À-ſ]+)/g;
      let m;
      while((m = re.exec(n.content||''))){
        const t = m[2].toLowerCase();
        if(!(n.tags||[]).includes(t)){
          (tagMap[t] = tagMap[t] || []).push(n.id);
        }
      }
    });
    Object.entries(tagMap).forEach(([tag, noteIds])=>{
      const tagId = 'tag::'+tag;
      nodes.push({
        id: tagId, type:'tag',
        label:'#'+tag,
        x:(Math.random()-0.5)*200, y:(Math.random()-0.5)*200,
        vx:0, vy:0,
        r: Math.max(3, Math.min(10, 3 + noteIds.length)),
        color:'#39d4ff', degree: noteIds.length,
      });
      noteIds.forEach(nid => edges.push({ a:tagId, b:nid, kind:'tag' }));
    });
  }

  GRAPH.nodes = nodes;
  GRAPH.edges = edges;
  GRAPH.energy = 1;

  const stat = document.getElementById('graphStat');
  if(stat){
    const noteCount = nodes.filter(n=>n.type==='note').length;
    const linkCount = edges.filter(e=>e.kind==='link').length;
    stat.textContent = `${noteCount} notas · ${linkCount} conexões${GRAPH.options.showTags?` · ${nodes.filter(n=>n.type==='tag').length} tags`:''}`;
  }

  const empty = document.getElementById('graphEmpty');
  if(empty) empty.style.display = nodes.length ? 'none' : '';

  graphRenderLegend();
}

function graphRenderLegend(){
  const el = document.getElementById('graphLegend');
  if(!el) return;
  const folders = (state.vault?.folders) || [];
  el.innerHTML = folders.map(f => {
    const col = GRAPH_FOLDER_COLORS[f.id] || GRAPH_FOLDER_COLORS._default;
    return `<div class="g-leg-item"><span class="g-leg-dot" style="background:${col};box-shadow:0 0 8px ${col}"></span>${escapeHtml(f.name)}</div>`;
  }).join('') + (GRAPH.options.showTags ? `<div class="g-leg-item"><span class="g-leg-dot" style="background:#39d4ff;box-shadow:0 0 8px #39d4ff"></span>Tag</div>` : '');
}

/* ---------- Physics ---------- */
function graphStep(){
  const N = GRAPH.nodes;
  const E = GRAPH.edges;
  if(!N.length) return;

  const REPULSE = 1400;
  const SPRING_LEN = 80;
  const SPRING_K = 0.04;
  const CENTER_K = 0.005;
  const DAMP = 0.86;

  // pairwise repulsion
  for(let i=0;i<N.length;i++){
    const a = N[i];
    for(let j=i+1;j<N.length;j++){
      const b = N[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      let d2 = dx*dx + dy*dy;
      if(d2 < 0.01){ dx = Math.random()-0.5; dy = Math.random()-0.5; d2 = 0.01; }
      const d = Math.sqrt(d2);
      const f = REPULSE / d2;
      const fx = (dx/d) * f;
      const fy = (dy/d) * f;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }
  }
  // spring on edges
  const idx = {};
  N.forEach((n,i)=>idx[n.id]=i);
  E.forEach(e=>{
    const a = N[idx[e.a]], b = N[idx[e.b]];
    if(!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 0.01;
    const diff = d - SPRING_LEN;
    const f = SPRING_K * diff;
    const fx = (dx/d) * f, fy = (dy/d) * f;
    a.vx += fx; a.vy += fy;
    b.vx -= fx; b.vy -= fy;
  });
  // center pull + integrate
  let maxV = 0;
  N.forEach(n=>{
    if(n === GRAPH.dragging) return;
    n.vx += -n.x * CENTER_K;
    n.vy += -n.y * CENTER_K;
    n.vx *= DAMP; n.vy *= DAMP;
    n.x += n.vx; n.y += n.vy;
    const v = Math.abs(n.vx) + Math.abs(n.vy);
    if(v > maxV) maxV = v;
  });
  GRAPH.energy = maxV;
}

/* ---------- Rendering ---------- */
function graphDraw(){
  const canvas = document.getElementById('graphCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;

  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);

  // background grid
  ctx.fillStyle = 'rgba(7,3,15,0.4)';
  ctx.fillRect(0,0,W,H);

  ctx.save();
  ctx.translate(W/2 + GRAPH.transform.x, H/2 + GRAPH.transform.y);
  ctx.scale(GRAPH.transform.k, GRAPH.transform.k);

  const N = GRAPH.nodes;
  const E = GRAPH.edges;
  const idx = {};
  N.forEach((n,i)=>idx[n.id]=i);

  // edges
  const hoverNode = GRAPH.hover;
  const connectedIds = new Set();
  if(hoverNode){
    connectedIds.add(hoverNode.id);
    E.forEach(e=>{
      if(e.a === hoverNode.id) connectedIds.add(e.b);
      if(e.b === hoverNode.id) connectedIds.add(e.a);
    });
  }
  E.forEach(e=>{
    const a = N[idx[e.a]], b = N[idx[e.b]];
    if(!a || !b) return;
    const dim = hoverNode && !(connectedIds.has(a.id) && connectedIds.has(b.id));
    ctx.strokeStyle = dim ? 'rgba(170,120,255,0.06)' : (e.kind==='tag' ? 'rgba(57,212,255,0.35)' : 'rgba(170,120,255,0.32)');
    ctx.lineWidth = (e.kind==='tag' ? 0.8 : 1.2) / GRAPH.transform.k;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });

  // nodes
  N.forEach(n=>{
    const isHover = (n === hoverNode);
    const isConnected = hoverNode && connectedIds.has(n.id);
    const dim = hoverNode && !isConnected;
    const alpha = dim ? 0.18 : 1;
    ctx.globalAlpha = alpha;
    // glow
    if(isHover){
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * 2.2, 0, Math.PI*2);
      const grad = ctx.createRadialGradient(n.x, n.y, n.r, n.x, n.y, n.r*2.2);
      grad.addColorStop(0, n.color + 'cc');
      grad.addColorStop(1, n.color + '00');
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI*2);
    ctx.fillStyle = n.color;
    ctx.shadowColor = n.color;
    ctx.shadowBlur = isHover ? 22 : (isConnected ? 12 : 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    // ring
    ctx.lineWidth = 1.4 / GRAPH.transform.k;
    ctx.strokeStyle = isHover ? '#fff' : 'rgba(255,255,255,0.25)';
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // labels
  if(GRAPH.options.showLabels && GRAPH.transform.k > 0.55){
    ctx.font = `${Math.max(10, 11/GRAPH.transform.k)}px Inter,system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    N.forEach(n=>{
      const isHover = (n === hoverNode);
      const isConnected = hoverNode && connectedIds.has(n.id);
      const dim = hoverNode && !isConnected;
      if(dim) return;
      const label = n.label || '';
      const trunc = label.length > 26 ? label.slice(0,24)+'…' : label;
      ctx.fillStyle = isHover ? '#fff' : 'rgba(232,212,255,0.78)';
      ctx.fillText(trunc, n.x, n.y + n.r + 4);
    });
  }

  ctx.restore();
}

/* ---------- Loop ---------- */
function graphLoop(){
  if(!GRAPH.running) return;
  // auto-stop if view hidden (user navigated away)
  const wrap = document.getElementById('notesViewGraph');
  if(!wrap || wrap.offsetParent === null){
    graphStop();
    return;
  }
  if(!GRAPH.paused) graphStep();
  graphDraw();
  GRAPH.rafId = requestAnimationFrame(graphLoop);
}

function graphStart(){
  if(GRAPH.running) return;
  GRAPH.running = true;
  graphResize();
  graphLoop();
}
function graphStop(){
  GRAPH.running = false;
  if(GRAPH.rafId) cancelAnimationFrame(GRAPH.rafId);
  GRAPH.rafId = null;
}
function graphTogglePause(){
  GRAPH.paused = !GRAPH.paused;
  const btn = document.getElementById('graphPauseBtn');
  if(btn) btn.textContent = GRAPH.paused ? '▶' : '⏸';
}

/* ---------- Controls (pan / zoom / drag / click) ---------- */
function graphResize(){
  const canvas = document.getElementById('graphCanvas');
  if(!canvas) return;
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}

function graphScreenToWorld(sx, sy){
  const canvas = document.getElementById('graphCanvas');
  const rect = canvas.getBoundingClientRect();
  const x = sx - rect.left, y = sy - rect.top;
  const W = rect.width, H = rect.height;
  return {
    x: (x - W/2 - GRAPH.transform.x) / GRAPH.transform.k,
    y: (y - H/2 - GRAPH.transform.y) / GRAPH.transform.k
  };
}
function graphNodeAt(wx, wy){
  for(let i = GRAPH.nodes.length-1; i>=0; i--){
    const n = GRAPH.nodes[i];
    const dx = wx - n.x, dy = wy - n.y;
    if(dx*dx + dy*dy <= (n.r + 3) * (n.r + 3)) return n;
  }
  return null;
}
function graphZoom(factor){
  GRAPH.transform.k = Math.max(0.15, Math.min(4, GRAPH.transform.k * factor));
}
function graphReset(){
  GRAPH.transform = { x:0, y:0, k:1 };
  GRAPH.energy = 1;
}
function graphSetOption(key, val){
  GRAPH.options[key] = val;
  graphBuild();
}

function graphBindEvents(){
  const canvas = document.getElementById('graphCanvas');
  if(!canvas || canvas.dataset.bound) return;
  canvas.dataset.bound = '1';
  const tip = document.getElementById('graphTooltip');

  canvas.addEventListener('wheel', e=>{
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.88 : 1.13;
    // zoom toward cursor
    const wPre = graphScreenToWorld(e.clientX, e.clientY);
    graphZoom(factor);
    const wPost = graphScreenToWorld(e.clientX, e.clientY);
    GRAPH.transform.x += (wPost.x - wPre.x) * GRAPH.transform.k;
    GRAPH.transform.y += (wPost.y - wPre.y) * GRAPH.transform.k;
  }, { passive:false });

  canvas.addEventListener('mousedown', e=>{
    const w = graphScreenToWorld(e.clientX, e.clientY);
    const node = graphNodeAt(w.x, w.y);
    if(node){
      GRAPH.dragging = node;
      node._dragOff = { x: w.x - node.x, y: w.y - node.y };
    } else {
      GRAPH.panStart = { mx:e.clientX, my:e.clientY, tx:GRAPH.transform.x, ty:GRAPH.transform.y };
    }
  });

  window.addEventListener('mousemove', e=>{
    if(GRAPH.dragging){
      const w = graphScreenToWorld(e.clientX, e.clientY);
      GRAPH.dragging.x = w.x - GRAPH.dragging._dragOff.x;
      GRAPH.dragging.y = w.y - GRAPH.dragging._dragOff.y;
      GRAPH.dragging.vx = GRAPH.dragging.vy = 0;
      return;
    }
    if(GRAPH.panStart){
      GRAPH.transform.x = GRAPH.panStart.tx + (e.clientX - GRAPH.panStart.mx);
      GRAPH.transform.y = GRAPH.panStart.ty + (e.clientY - GRAPH.panStart.my);
      return;
    }
    // hover
    const rect = canvas.getBoundingClientRect();
    if(e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom){
      GRAPH.hover = null;
      if(tip) tip.style.display = 'none';
      return;
    }
    const w = graphScreenToWorld(e.clientX, e.clientY);
    const node = graphNodeAt(w.x, w.y);
    GRAPH.hover = node;
    if(tip){
      if(node){
        tip.style.display = '';
        tip.style.left = (e.clientX - rect.left + 14) + 'px';
        tip.style.top  = (e.clientY - rect.top + 14) + 'px';
        if(node.type === 'tag'){
          tip.innerHTML = `<strong>${escapeHtml(node.label)}</strong><span class="g-tip-meta">${node.degree} nota${node.degree===1?'':'s'}</span>`;
        } else {
          tip.innerHTML = `<strong>${escapeHtml(node.label)}</strong><span class="g-tip-meta">${node.degree} conexão${node.degree===1?'':'es'} · ${(state.vault.folders.find(f=>f.id===node.folder)||{}).name||'—'}</span>`;
        }
      } else {
        tip.style.display = 'none';
      }
    }
    canvas.style.cursor = node ? 'pointer' : (GRAPH.panStart ? 'grabbing' : 'grab');
  });

  window.addEventListener('mouseup', e=>{
    if(GRAPH.dragging){
      // click vs drag
      const w = graphScreenToWorld(e.clientX, e.clientY);
      const moved = Math.abs(w.x - (GRAPH.dragging.x + (GRAPH.dragging._dragOff?.x||0))) +
                    Math.abs(w.y - (GRAPH.dragging.y + (GRAPH.dragging._dragOff?.y||0)));
      if(moved < 2 && GRAPH.dragging.type === 'note'){
        graphOpenNote(GRAPH.dragging.noteId);
      } else if(moved < 2 && GRAPH.dragging.type === 'tag'){
        // jump to vault and filter tag
        const tag = GRAPH.dragging.label.replace(/^#/,'');
        state.vault.notesView = 'vault';
        save();
        setNotesView('vault');
        vaultSetActiveTag(tag);
      }
      delete GRAPH.dragging._dragOff;
      GRAPH.dragging = null;
    }
    GRAPH.panStart = null;
  });

  canvas.addEventListener('mouseleave', ()=>{
    GRAPH.hover = null;
    if(tip) tip.style.display = 'none';
  });

  // resize observer
  if(window.ResizeObserver && !GRAPH.resizeObs){
    GRAPH.resizeObs = new ResizeObserver(()=>graphResize());
    GRAPH.resizeObs.observe(canvas.parentElement);
  }
}

function graphOpenNote(noteId){
  if(!noteId) return;
  state.vault.currentNoteId = noteId;
  state.vault.notesView = 'vault';
  save();
  setNotesView('vault');
}

/* ---------- Entry point called by setNotesView ---------- */
function renderGraph(){
  graphBindEvents();
  // sync option checkboxes from state
  const optEls = {
    showTags: document.getElementById('graphShowTags'),
    showLabels: document.getElementById('graphShowLabels'),
    showOrphans: document.getElementById('graphShowOrphans'),
  };
  if(optEls.showTags) optEls.showTags.checked = GRAPH.options.showTags;
  if(optEls.showLabels) optEls.showLabels.checked = GRAPH.options.showLabels;
  if(optEls.showOrphans) optEls.showOrphans.checked = GRAPH.options.showOrphans;
  graphBuild();
  graphResize();
  graphStart();
}
