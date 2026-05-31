/* =========================================================
   FILE SYNC · grava em arquivo local (.json) via File System Access API
   ========================================================= */
const FS_SUPPORTED = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
const FILE_DB_NAME = 'cortex_fs';
const FILE_DB_STORE = 'handles';
let fileHandle = null;

function openFileDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FILE_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(FILE_DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbPut(key, value){
  const db = await openFileDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_DB_STORE, 'readwrite');
    tx.objectStore(FILE_DB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function dbGet(key){
  const db = await openFileDB();
  return new Promise((resolve) => {
    const tx = db.transaction(FILE_DB_STORE, 'readonly');
    const r = tx.objectStore(FILE_DB_STORE).get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => resolve(null);
  });
}
async function dbDel(key){
  const db = await openFileDB();
  return new Promise((resolve) => {
    const tx = db.transaction(FILE_DB_STORE, 'readwrite');
    tx.objectStore(FILE_DB_STORE).delete(key);
    tx.oncomplete = () => resolve();
  });
}
async function verifyPermission(handle, write=true){
  if(!handle || !handle.queryPermission) return true;
  const opts = { mode: write ? 'readwrite' : 'read' };
  let p = await handle.queryPermission(opts);
  if(p === 'granted') return true;
  p = await handle.requestPermission(opts);
  return p === 'granted';
}

let toastTimer = null;
function flashStatus(msg, isError=false){
  const t = document.getElementById('fileToast');
  if(!t) return;
  t.classList.toggle('error', isError);
  document.getElementById('fileToastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 1800);
}

async function connectFile(){
  if(!FS_SUPPORTED){
    cortexToast({msg:'Navegador não suporta gravar em arquivos locais. Use Chrome ou Edge.', type:'error', duration:5000});
    return;
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'cortex-data.json',
      types: [{description:'CORTEX data', accept:{'application/json':['.json']}}]
    });
    fileHandle = handle;
    // Verifica se o arquivo já tem dados
    let existing = null;
    try {
      const f = await handle.getFile();
      const text = await f.text();
      if(text && text.trim().length > 5){
        const parsed = JSON.parse(text);
        if(parsed && typeof parsed === 'object' && (parsed.transactions || parsed.settings)){
          existing = parsed;
        }
      }
    } catch(_){}
    if(existing){
      // Padrão seguro: carrega o arquivo (preserva dados). Undo via toast (15s)
      // dispara a sobrescrita inversa — mantém os dados que estavam no navegador.
      const browserSnap = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      state = existing;
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      load();
      cortexToast({
        msg:`Arquivo "${handle.name}" carregado · pode trocar pelo conteúdo atual do navegador`,
        type:'info',
        duration: 15000,
        undo:()=>{
          state = browserSnap;
          localStorage.setItem(LS_KEY, JSON.stringify(state));
          load(); applySettings(); renderAll(); renderSettings();
          writeToFile();
          cortexToast({msg:'Arquivo sobrescrito com os dados do navegador', type:'warn'});
        }
      });
    }
    await dbPut('main', handle);
    state.settings.fileSync = true;
    save();
    await writeToFile();
    applySettings();
    renderAll();
    renderSettings();
    flashStatus('✓ Conectado: ' + handle.name);
  } catch(err){
    if(err.name !== 'AbortError'){
      console.warn(err);
      cortexToast({msg:'Erro ao conectar arquivo: ' + err.message, type:'error', duration:5000});
    }
  }
}

async function writeToFile(){
  if(!fileHandle) return;
  try {
    if(!await verifyPermission(fileHandle, true)){
      flashStatus('⚠️ Permissão negada', true);
      return;
    }
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(state, null, 2));
    await writable.close();
    flashStatus('💾 Arquivo salvo · ' + new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
  } catch(err){
    console.warn('writeToFile', err);
    flashStatus('⚠️ Erro ao salvar', true);
  }
}

async function reconnectFile(){
  if(!fileHandle){
    const h = await dbGet('main');
    if(!h){ cortexToast({msg:'Nenhum arquivo conectado.', type:'warn'}); return; }
    fileHandle = h;
  }
  const ok = await verifyPermission(fileHandle, true);
  if(ok){
    await writeToFile();
    flashStatus('✓ Reconectado: ' + fileHandle.name);
    renderSettings();
  } else {
    flashStatus('⚠️ Permissão negada', true);
  }
}

async function disconnectFile(){
  const prevHandle = fileHandle;
  fileHandle = null;
  await dbDel('main');
  state.settings.fileSync = false;
  save();
  renderSettings();
  cortexToast({
    msg:'Arquivo desconectado · dados continuam no navegador',
    type:'success',
    undo: async ()=>{
      if(prevHandle){
        fileHandle = prevHandle;
        await dbPut('main', prevHandle);
        state.settings.fileSync = true;
        save(); renderSettings();
        cortexToast({msg:'Reconectado', type:'info'});
      }
    }
  });
}

async function initFileSync(){
  if(!FS_SUPPORTED) return;
  if(!state.settings?.fileSync) return;
  try {
    const h = await dbGet('main');
    if(!h) return;
    fileHandle = h;
    // Tenta auto-conectar silenciosamente — só funciona se a permissão estiver persistida
    const granted = (h.queryPermission ? (await h.queryPermission({mode:'readwrite'})) : 'granted');
    if(granted === 'granted'){
      // Carrega o arquivo (file = fonte da verdade)
      try {
        const f = await h.getFile();
        const text = await f.text();
        if(text && text.trim().length > 5){
          const data = JSON.parse(text);
          if(data && typeof data === 'object'){
            state = data;
            localStorage.setItem(LS_KEY, JSON.stringify(state));
            load();
            applySettings();
            renderAll();
          }
        }
      } catch(_){}
      flashStatus('🔗 Sincronizando: ' + h.name);
    } else {
      flashStatus('🔗 Arquivo encontrado · clique no ⚙️ para reconectar', false);
    }
  } catch(err){ console.warn('initFileSync', err); }
}

