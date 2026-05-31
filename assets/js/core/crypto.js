/* =========================================================
   CRYPTO · AES-GCM via Web Crypto API
   - Passphrase → PBKDF2 → key 256 bits
   - Formato em storage: {enc:1, v:1, salt:b64, iv:b64, data:b64}
   - Opt-in via state.settings.encryptStorage = true
   ========================================================= */

let _cortexCryptoKey = null;
let _cortexCryptoSalt = null;
let _cortexCryptoLocked = false;
const CRYPTO_PBKDF2_ITER = 250000;
const CRYPTO_KEY_LEN = 256;

function _b64encode(bytes){
  let s = '';
  for(let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function _b64decode(str){
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for(let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function _deriveKey(passphrase, salt){
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase),
    { name:'PBKDF2' }, false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name:'PBKDF2', salt, iterations: CRYPTO_PBKDF2_ITER, hash:'SHA-256' },
    material,
    { name:'AES-GCM', length: CRYPTO_KEY_LEN },
    false, ['encrypt','decrypt']
  );
}

/* Tenta unlock — retorna true se sucesso, false se senha errada */
async function unlockCrypto(passphrase, ciphertextBlob){
  try {
    const blob = typeof ciphertextBlob === 'string' ? JSON.parse(ciphertextBlob) : ciphertextBlob;
    if(!blob || !blob.enc) return false;
    const salt = _b64decode(blob.salt);
    const iv   = _b64decode(blob.iv);
    const data = _b64decode(blob.data);
    const key = await _deriveKey(passphrase, salt);
    const decBuf = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, data);
    const json = new TextDecoder().decode(decBuf);
    _cortexCryptoKey = key;
    _cortexCryptoSalt = salt;
    _cortexCryptoLocked = false;
    return json;
  } catch(e){
    console.warn('unlock falhou:', e.message);
    return false;
  }
}

/* Configura crypto pela primeira vez (passphrase nova).
   Gera salt fresco. Retorna {salt} pra debug. */
async function setupCrypto(passphrase){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await _deriveKey(passphrase, salt);
  _cortexCryptoKey = key;
  _cortexCryptoSalt = salt;
  _cortexCryptoLocked = false;
  return true;
}

function lockCrypto(){
  _cortexCryptoKey = null;
  _cortexCryptoSalt = null;
  _cortexCryptoLocked = true;
}

function isCryptoUnlocked(){ return !!_cortexCryptoKey; }
function isCryptoLocked(){ return _cortexCryptoLocked; }

/* Cifra string JSON → blob storable {enc:1, ...} */
async function cryptoEncrypt(jsonString){
  if(!_cortexCryptoKey) throw new Error('crypto not ready');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(jsonString);
  const enc = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, _cortexCryptoKey, data);
  return JSON.stringify({
    enc: 1, v: 1,
    salt: _b64encode(_cortexCryptoSalt),
    iv:   _b64encode(iv),
    data: _b64encode(new Uint8Array(enc))
  });
}

/* Decifra blob → JSON string */
async function cryptoDecrypt(blobOrString){
  if(!_cortexCryptoKey) throw new Error('crypto not ready');
  const blob = typeof blobOrString === 'string' ? JSON.parse(blobOrString) : blobOrString;
  const iv = _b64decode(blob.iv);
  const data = _b64decode(blob.data);
  const decBuf = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, _cortexCryptoKey, data);
  return new TextDecoder().decode(decBuf);
}

function isEncryptedBlob(rawString){
  if(!rawString || typeof rawString !== 'string') return false;
  if(rawString[0] !== '{') return false;
  try {
    const j = JSON.parse(rawString);
    return j && j.enc === 1 && typeof j.salt === 'string' && typeof j.iv === 'string' && typeof j.data === 'string';
  } catch(_) { return false; }
}

window.unlockCrypto = unlockCrypto;
window.setupCrypto = setupCrypto;
window.lockCrypto = lockCrypto;
window.isCryptoUnlocked = isCryptoUnlocked;
window.isCryptoLocked = isCryptoLocked;
window.cryptoEncrypt = cryptoEncrypt;
window.cryptoDecrypt = cryptoDecrypt;
window.isEncryptedBlob = isEncryptedBlob;
