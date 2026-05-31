
/* =========================================================
   CORTEX · STATE + UTILS
   ========================================================= */
const LS_KEY = 'cortex_v1';
const LS_KEY_LEGACY = 'fincontrol_v1';
const CATEGORIES = {
  receita: ['salário','freelance','investimentos','vendas','presente','outros'],
  despesa: ['alimentação','transporte','moradia','saúde','educação','lazer','vestuário','contas','assinaturas','outros']
};
const HABIT_EMOJIS = ['🚫','🚬','🍺','🍷','🍔','🍰','📱','🎮','🎰','💊','😴','💸','📺','🛒','😡','🤥'];
const COL_COLORS = ['#7e6aa8','#39d4ff','#ffb86b','#5cffb1','#b061ff','#e26bff','#ff7a9a'];

const INFO_DEFAULTS = {
  name:'', birthDate:'', birthTime:'', mbti:'', sign:'', ascendant:'',
  cpf:'', rg:'', passport:'', voterId:'',
  address:'', cep:'', city:'', state:'',
  bloodType:'', allergies:'', medications:'', medicalRestrictions:'',
  healthPlan:'', trustedDoctor:'',
  emergencyContacts: [],
  prints: []
};

const SETTINGS_DEFAULTS = {
  accentColor: 'purple',
  density: 'comfortable',
  animations: true,
  language: 'pt',
  weekStart: 0,
  currency: 'BRL',
  fileSync: false,
  cortexSphereEnabled: true,
  sphereScale: 1,
  sphereModel: 'classic',
  cortexVoice: false,
  cortexAI: {
    provider: 'none',    // 'none' | 'openai' | 'anthropic' | 'groq'
    apiKey: '',
    model: ''            // vazio = default do provider
  },
  theme: 'dark',         // 'dark' | 'light' | 'auto'
  themeAutoSunrise: 7,   // hora local pra mudar dark→light em auto mode
  themeAutoSunset: 19,   // hora local pra mudar light→dark
  themeOverrides: {},    // { '--neon':'#xxx', ... } overrides custom do user
  dashboardLayout: 'classic',  // 'classic' | 'bento'
  encryptStorage: false,       // opt-in encryption via passphrase
  showClock: true,
  sidebarCollapsed: false,
  shortcuts: null, // overrides — usa DEFAULT_SHORTCUTS quando null
  pomodoro: { work:25, shortBreak:5, longBreak:15, longBreakAfter:4 },
  eventCategories: [
    { id:'reunioes', name:'Reuniões', emoji:'🤝', color:'#39d4ff' },
    { id:'trabalho', name:'Trabalho', emoji:'💼', color:'#b061ff' },
    { id:'pessoal',  name:'Pessoal',  emoji:'🏡', color:'#5cffb1' },
    { id:'saude',    name:'Saúde',    emoji:'💚', color:'#ff7a9a' },
    { id:'estudo',   name:'Estudo',   emoji:'📚', color:'#ffb86b' },
    { id:'outros',   name:'Outros',   emoji:'✨', color:'#e26bff' }
  ],
};

let state = {
  settings: {...SETTINGS_DEFAULTS},
  calendar: { activeCategories: [] },
  cortex: { messages: [] },
  info: {...INFO_DEFAULTS},
  transactions: [],
  notes: [],
  mindset: [],
  mantras: [],
  events: [],
  projects: [],
  triggers: [],
  drafts: [],
  bills: [],
  dynCards: [],
  vault: null,
  habitsList: [],
  shopping: [],
  workouts: [],
  habits: [],
  kanbans: { pessoal:{columns:[]}, profissional:{columns:[]} },
  trackers: {
    todos:[], diet:[], books:[], goals:[], dreams:[], movies:[],
    pHabits:[], routines:[], challenges:[], skills:[], bucket:[],
    analysis: { fears:[], weaknesses:[], strengths:[] }
  }
};

function load(){
  try{
    let raw = localStorage.getItem(LS_KEY);
    if(!raw){
      // migrate from legacy FinControl key
      raw = localStorage.getItem(LS_KEY_LEGACY);
      if(raw){ localStorage.setItem(LS_KEY, raw); }
    }
    if(raw){
      // Detecta blob criptografado — boot async pede passphrase em outro lugar
      if(typeof isEncryptedBlob === 'function' && isEncryptedBlob(raw)){
        state._encryptedRaw = raw;   // sinaliza boot pra mostrar prompt
      } else {
        state = JSON.parse(raw);
      }
    }
  }catch(e){ console.warn('load failed', e); }
  if(!state.transactions || state.transactions.length===0){ seed(); }
  state.settings = Object.assign({...SETTINGS_DEFAULTS}, state.settings||{});
  state.settings.pomodoro = Object.assign({...SETTINGS_DEFAULTS.pomodoro}, state.settings.pomodoro||{});
  if(!Array.isArray(state.settings.eventCategories) || !state.settings.eventCategories.length){
    state.settings.eventCategories = [...SETTINGS_DEFAULTS.eventCategories];
  }
  state.calendar ||= { activeCategories: [] };
  state.calendar.activeCategories ||= [];
  // Migração v6: adiciona Hábitos na seção Pessoal (acima de Trackers)
  if(state.settings.sidebarOrderVersion !== 6){
    state.settings.sidebarSections = [
      { id:'professional', label:'Profissional', items:['cortex','calendar','tasks','kanban','projects','triggers'] },
      { id:'personal',     label:'Pessoal',      items:['habits','trackers','dashboard','mentalidade','notes','drafts','info'] }
    ];
    delete state.settings.sidebarOrder;
    state.settings.sidebarOrderVersion = 6;
  }
  state.cortex ||= { messages: [], memory: [] };
  state.cortex.messages ||= [];
  state.cortex.memory ||= [];
  state.info = Object.assign({...INFO_DEFAULTS}, state.info||{});
  state.info.emergencyContacts ||= [];
  state.info.prints ||= [];
  state.bills ||= [];
  state.dynCards ||= [];
  state.dashboardView ||= 'resumo';
  state.dynCardsUi ||= { search:'', filterStatus:'todos', sort:'manual' };
  state.transactions ||= [];
  state.notes ||= [];
  state.mindset ||= defaultMindset();
  state.mantras ||= defaultMantras();
  state.events ||= defaultEvents();
  state.projects ||= defaultProjects();
  state.triggers ||= defaultTriggers();
  state.drafts ||= defaultDrafts();
  if(!state.vault || !state.vault.folders){
    state.vault = (typeof defaultVault === 'function') ? defaultVault() : {
      notes:[], folders:[], activeFolder:null, activeTag:null,
      search:'', currentNoteId:null, previewMode:'split', notesView:'postit'
    };
  } else {
    state.vault.notes ||= [];
    state.vault.folders ||= [];
    state.vault.notesView ||= 'postit';
    state.vault.previewMode ||= 'split';
  }
  state.shopping ||= [];
  // Migra pHabits do tracker antigo para habitsList do novo sistema (uma vez só)
  if(!state.habitsList){
    const oldPH = state.trackers?.pHabits || [];
    if(oldPH.length){
      state.habitsList = oldPH.map(h => ({
        id: h.id || uid(),
        name: h.name || '',
        emoji: h.emoji || '✨',
        category: '',
        type: 'daily',
        frequency: 7,
        targetTime: 'qualquer',
        color: '#b061ff',
        notes: '',
        log: h.log || {},
        createdAt: h.createdAt || new Date().toISOString(),
        archived: false
      }));
    } else {
      state.habitsList = defaultHabitsList();
    }
  }
  state.workouts ||= [];
  state.weeklyWorkouts ||= { mon:[], tue:[], wed:[], thu:[], fri:[], sat:[], sun:[] };
  ['mon','tue','wed','thu','fri','sat','sun'].forEach(d => { state.weeklyWorkouts[d] ||= []; });
  state.weeklyWorkoutsUi ||= { showWeekend: false };
  state.habits ||= [];
  state.kanbans ||= { pessoal:{columns:[]}, profissional:{columns:[]} };
  state.trackers ||= {};
  const tk = state.trackers;
  tk.todos ||= []; tk.diet ||= []; tk.books ||= []; tk.goals ||= [];
  tk.dreams ||= []; tk.movies ||= []; tk.pHabits ||= []; tk.routines ||= [];
  tk.challenges ||= []; tk.skills ||= []; tk.bucket ||= [];
  tk.dietPlan ||= {};
  tk.analysis ||= { fears:[], weaknesses:[], strengths:[] };
  tk.analysis.fears ||= []; tk.analysis.weaknesses ||= []; tk.analysis.strengths ||= [];
  state.kanbans.pessoal ||= {columns:[]};
  state.kanbans.profissional ||= {columns:[]};
  if(!state.kanbans.pessoal.columns.length) state.kanbans.pessoal.columns = defaultKanban('pessoal');
  if(!state.kanbans.profissional.columns.length) state.kanbans.profissional.columns = defaultKanban('profissional');
}
function defaultKanban(kind){
  // Colunas vazias — usuário começa com estrutura mas sem cartões
  if(kind==='pessoal'){
    return [
      {id:uid(),title:'A Fazer',       color:'#7e6aa8',cards:[]},
      {id:uid(),title:'Em Andamento',  color:'#39d4ff',cards:[]},
      {id:uid(),title:'Concluído',     color:'#5cffb1',cards:[]}
    ];
  }
  return [
    {id:uid(),title:'Backlog',         color:'#7e6aa8',cards:[]},
    {id:uid(),title:'Em Andamento',    color:'#39d4ff',cards:[]},
    {id:uid(),title:'Em Revisão',      color:'#ffb86b',cards:[]},
    {id:uid(),title:'Concluído',       color:'#5cffb1',cards:[]}
  ];
}
function save(){
  const json = JSON.stringify(state);
  // Se crypto opt-in e unlocked → encrypt async, escreve depois
  if(state.settings?.encryptStorage && typeof isCryptoUnlocked === 'function' && isCryptoUnlocked()){
    cryptoEncrypt(json).then(blob => {
      localStorage.setItem(LS_KEY, blob);
    }).catch(err => {
      console.error('encrypt save failed:', err);
      // Fallback safety: salva plaintext pra não perder dados
      localStorage.setItem(LS_KEY, json);
    });
  } else {
    localStorage.setItem(LS_KEY, json);
  }
  if(fileHandle && state.settings?.fileSync) scheduleFileWrite();
}
let fileWriteTimer = null;
function scheduleFileWrite(){
  clearTimeout(fileWriteTimer);
  fileWriteTimer = setTimeout(writeToFile, 600);
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function fmt(n){
  const cur = state.settings?.currency || 'BRL';
  const sym = {BRL:'R$',USD:'$',EUR:'€'}[cur] || 'R$';
  return sym + ' ' + Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function todayStr(){ return new Date().toISOString().slice(0,10); }
function monthKey(dateStr){ return dateStr.slice(0,7); }
function thisMonth(){ return todayStr().slice(0,7); }

function seed(){
  // Interface zerada para usuário novo — nada de dados de exemplo.
  // Os arrays são inicializados vazios em load() via ||= [].
  state.transactions = [];
  state.notes = [];
  state.workouts = [];
  state.habits = [];
  save();
}

