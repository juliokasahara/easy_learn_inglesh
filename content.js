/**
 * EasyLearn English — Content Script
 * Detecta seleção de texto em inglês e exibe popup de tradução com Shadow DOM.
 */

// ─────────────────────────────────────────────
// CSS inline para o Shadow DOM (estilo isolado)
// ─────────────────────────────────────────────
const POPUP_CSS = `
  :host {
    /* Estilos críticos aplicados via JS inline — não definir position aqui */
    display: block;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .popup {
    /* position: fixed no :host; o .popup usa fluxo normal (sem absolute) */
    display: block;
    width: 288px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2);
    animation: fadeIn 0.15s ease-out;
    transition: opacity 0.2s;
    /* dark theme (default) */
    background: #1e1e2e;
    color: #cdd6f4;
    border: 1px solid #313244;
  }

  .popup.light {
    background: #ffffff;
    color: #1e1e2e;
    border: 1px solid #d1d5db;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Header ── */
  .el-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 12px;
    background: rgba(0,0,0,0.18);
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .popup.light .el-header {
    background: #f3f4f6;
    border-bottom: 1px solid #e5e7eb;
  }
  .el-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.55;
    color: inherit;
  }
  .el-close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 17px;
    line-height: 1;
    color: inherit;
    opacity: 0.45;
    padding: 1px 5px;
    border-radius: 4px;
    transition: opacity 0.12s, background 0.12s;
  }
  .el-close:hover { opacity: 1; background: rgba(255,255,255,0.1); }
  .popup.light .el-close:hover { background: rgba(0,0,0,0.07); }

  /* ── Body ── */
  .el-body { padding: 13px 16px 10px; }

  .el-original {
    font-size: 17px;
    font-weight: 600;
    color: #89b4fa;
    word-break: break-word;
  }
  .popup.light .el-original { color: #1a73e8; }

  .el-copy-label {
    display: inline-block;
    padding: 1px 8px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.5px;
    border-radius: 4px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.07);
    color: inherit;
    cursor: pointer;
    opacity: 0.65;
    margin-bottom: 4px;
    transition: opacity 0.15s;
  }
  .el-copy-label:hover { opacity: 1; }
  .popup.light .el-copy-label {
    border-color: rgba(0,0,0,0.15);
    background: rgba(0,0,0,0.05);
  }

  .el-phonetic {
    font-size: 12px;
    font-style: italic;
    opacity: 0.6;
    margin-top: 2px;
    color: inherit;
  }

  .el-arrow {
    font-size: 14px;
    margin: 6px 0 4px;
    opacity: 0.35;
    color: inherit;
  }

  .el-translated {
    font-size: 19px;
    font-weight: 700;
    color: #a6e3a1;
    word-break: break-word;
  }
  .popup.light .el-translated { color: #2e7d32; }

  /* ── Actions ── */
  .el-actions {
    display: flex;
    gap: 5px;
    padding: 7px 11px;
    border-top: 1px solid rgba(255,255,255,0.06);
    flex-wrap: wrap;
  }
  .popup.light .el-actions { border-top: 1px solid #f0f0f0; }

  .el-btn {
    background: rgba(255,255,255,0.08);
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 5px 10px;
    border-radius: 6px;
    color: inherit;
    font-family: inherit;
    transition: background 0.12s;
    white-space: nowrap;
  }
  .popup.light .el-btn { background: #f0f0f0; color: #374151; }
  .el-btn:hover { background: rgba(255,255,255,0.18); }
  .popup.light .el-btn:hover { background: #e5e7eb; }
  .el-btn.saved { color: #f9e2af; }

  /* ── Speed bar ── */
  .el-speed-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 11px 9px;
    font-size: 11px;
    opacity: 0.6;
    color: inherit;
  }
  .el-speed-btn {
    background: rgba(255,255,255,0.06);
    border: none;
    cursor: pointer;
    font-size: 11px;
    font-family: inherit;
    padding: 2px 8px;
    border-radius: 4px;
    color: inherit;
    transition: all 0.12s;
  }
  .el-speed-btn.active {
    background: #89b4fa;
    color: #1e1e2e;
    font-weight: 700;
    opacity: 1;
  }
  .popup.light .el-speed-btn.active { background: #1a73e8; color: #fff; }
  .el-speed-btn:hover:not(.active) { background: rgba(255,255,255,0.15); opacity: 1; }

  /* ── Loading ── */
  .el-loading {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px 16px;
    font-size: 13px;
    opacity: 0.75;
    color: inherit;
  }
  .el-spinner {
    width: 15px;
    height: 15px;
    border: 2px solid rgba(255,255,255,0.15);
    border-top-color: #89b4fa;
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
    flex-shrink: 0;
  }
  .popup.light .el-spinner { border-top-color: #1a73e8; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Error ── */
  .el-error {
    padding: 13px 16px;
    font-size: 13px;
    color: #f38ba8;
  }
  .popup.light .el-error { color: #b91c1c; }
`;

// ─────────────────────────────────────────────
// Estado
// ─────────────────────────────────────────────
const CONFIG_KEY = 'easylearn_config';
const DEFAULT_CONFIG = {
  apiUrl: 'https://api.mymemory.translated.net/get',
  apiKey: '',
  sourceLang: 'en',
  targetLang: 'pt',
  speechRate: 1.0,
  theme: 'dark',
};

console.log('[EasyLearn] ✅ Content script carregado em:', location.href);

let config = { ...DEFAULT_CONFIG };
let hostEl = null;
let shadowRoot = null;
let popupInner = null;
let lastText = '';
let translationId = 0; // cancela requisições em voo

// Carrega configuração salva
chrome.storage.sync.get(CONFIG_KEY, (result) => {
  if (result[CONFIG_KEY]) config = { ...config, ...result[CONFIG_KEY] };
});

// Ouve mudanças de configuração e pedidos via menu de contexto
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'CONFIG_UPDATE') {
    config = { ...config, ...msg.config };
  }
  if (msg.type === 'CONTEXT_TRANSLATE' && msg.text) {
    const coords = getSelectionCoords();
    if (coords) handleSelection(msg.text, coords);
  }
});

// ─────────────────────────────────────────────
// Shadow DOM
// ─────────────────────────────────────────────
function ensureHost() {
  if (hostEl && document.documentElement.contains(hostEl)) return;

  hostEl = document.createElement('div');
  hostEl.id = 'easylearn-host';
  // Anexa ao <html> para evitar que transforms no <body> afetem position:fixed
  document.documentElement.appendChild(hostEl);

  shadowRoot = hostEl.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = POPUP_CSS;
  shadowRoot.appendChild(styleEl);
}

function removePopup() {
  translationId++; // cancela requisição em voo
  if (hostEl) hostEl.style.display = 'none';
  popupInner = null;
  lastText = '';
}

function buildPopup() {
  console.log('[EasyLearn] buildPopup() chamado');
  ensureHost();
  // position:fixed usa coordenadas do viewport (sem math de scroll)
  // Começa fora da tela; positionPopup() reposiciona no próximo frame
  hostEl.style.cssText =
    'all:initial;position:fixed;z-index:2147483647;display:block;top:-9999px;left:-9999px;pointer-events:auto;';

  const old = shadowRoot.querySelector('.popup');
  if (old) old.remove();

  const div = document.createElement('div');
  div.className = 'popup' + (config.theme === 'light' ? ' light' : '');
  shadowRoot.appendChild(div);
  popupInner = div;
  return div;
}

function positionPopup(coords) {
  // coords = viewport coordinates (getBoundingClientRect sem scroll offset)
  requestAnimationFrame(() => {
    if (!popupInner || !hostEl) return;
    const pw = popupInner.offsetWidth || 288;
    const ph = popupInner.offsetHeight || 120;
    console.log('[EasyLearn] positionPopup() — popup size:', pw, 'x', ph, '| coords:', JSON.stringify(coords));
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = coords.left + coords.width / 2 - pw / 2;
    let y = coords.bottom + 8;

    // Mantém dentro do viewport
    x = Math.max(8, Math.min(x, vw - pw - 8));
    if (y + ph > vh - 8) y = coords.top - ph - 8;
    if (y < 8) y = 8;

    console.log('[EasyLearn] posicionando em:', x, y);
    hostEl.style.left = `${x}px`;
    hostEl.style.top  = `${y}px`;
  });
}

// ─────────────────────────────────────────────
// Renderizadores do popup
// ─────────────────────────────────────────────
function showLoading(coords) {
  const el = buildPopup();
  el.innerHTML = `
    <div class="el-header">
      <span class="el-title">EasyLearn</span>
      <button class="el-close" aria-label="Fechar">×</button>
    </div>
    <div class="el-loading">
      <div class="el-spinner"></div>
      <span>Traduzindo…</span>
    </div>`;
  el.querySelector('.el-close').addEventListener('click', removePopup);
  positionPopup(coords);
}

function showTranslation(coords, original, translated, phonetic) {
  const el = buildPopup();
  const isPhrase = original.includes(' ');
  const display = original.length > 80 ? original.slice(0, 77) + '…' : original;

  el.innerHTML = `
    <div class="el-header">
      <span class="el-title">EasyLearn</span>
      <button class="el-close" aria-label="Fechar">×</button>
    </div>
    <div class="el-body">
      <button class="el-copy-label el-copy-en">copiar EN</button>
      <div class="el-original">${esc(display)}</div>
      ${phonetic ? `<div class="el-phonetic">${esc(phonetic)}</div>` : ''}
      <div class="el-arrow">↓</div>
      <button class="el-copy-label el-copy">copiar PT</button>
      <div class="el-translated">${esc(translated)}</div>
    </div>
    <div class="el-actions">
      <button class="el-btn el-speak">🔊 ${isPhrase ? 'Ouvir frase' : 'Ouvir'}</button>
      <button class="el-btn el-save">🧠 Memory</button>
    </div>
    <div class="el-speed-bar">
      <span>Velocidade:</span>
      <button class="el-speed-btn ${config.speechRate === 0.5 ? 'active' : ''}" data-speed="0.5">0.5×</button>
      <button class="el-speed-btn ${config.speechRate === 1.0 ? 'active' : ''}" data-speed="1.0">1×</button>
      <button class="el-speed-btn ${config.speechRate === 1.5 ? 'active' : ''}" data-speed="1.5">1.5×</button>
    </div>`;

  positionPopup(coords);

  el.querySelector('.el-close').addEventListener('click', removePopup);

  el.querySelector('.el-speak').addEventListener('click', () => speak(original));

  el.querySelector('.el-copy-en').addEventListener('click', () => {
    navigator.clipboard.writeText(original).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = original;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    });
    const btn = el.querySelector('.el-copy-en');
    btn.textContent = '\u2713 Copiado!';
    setTimeout(() => { btn.textContent = '\ud83d\udccb Copiar EN'; }, 1500);
  });

  el.querySelector('.el-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(translated).catch(() => {
      // fallback para navegadores sem permissão de clipboard
      const ta = document.createElement('textarea');
      ta.value = translated;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    });
    const btn = el.querySelector('.el-copy');
    btn.textContent = '\u2713 Copiado!';
    setTimeout(() => { btn.textContent = '\ud83d\udccb Copiar PT'; }, 1500);
  });

  el.querySelector('.el-save').addEventListener('click', () => {
    saveToMemory(original, translated, phonetic);
    const btn = el.querySelector('.el-save');
    btn.textContent = '✓ Salvo!';
    btn.classList.add('saved');
  });

  el.querySelectorAll('.el-speed-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed);
      config.speechRate = speed;
      el.querySelectorAll('.el-speed-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      chrome.storage.sync.get(CONFIG_KEY, (res) => {
        const saved = res[CONFIG_KEY] || {};
        chrome.storage.sync.set({ [CONFIG_KEY]: { ...saved, speechRate: speed } });
      });
    });
  });
}

function showError(coords, message) {
  const el = buildPopup();
  el.innerHTML = `
    <div class="el-header">
      <span class="el-title">EasyLearn</span>
      <button class="el-close" aria-label="Fechar">×</button>
    </div>
    <div class="el-error">⚠️ ${esc(message)}</div>`;
  el.querySelector('.el-close').addEventListener('click', removePopup);
  positionPopup(coords);
}

// ─────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────
function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function speak(text) {
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  utt.rate = config.speechRate;
  speechSynthesis.speak(utt);
}

function getSelectionCoords() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  if (!rect.width && !rect.height) return null;
  // Retorna coords do VIEWPORT (para position:fixed — sem window.scrollX/Y)
  return {
    left:   rect.left,
    right:  rect.right,
    top:    rect.top,
    bottom: rect.bottom,
    width:  rect.width,
  };
}

// Fetch de tradução direto do content script
// (content scripts com host_permissions podem fazer fetch cross-origin sem CORS)
async function fetchTranslation(text) {
  const langpair = `${config.sourceLang || 'en'}|${config.targetLang || 'pt'}`;
  const params = new URLSearchParams({ q: text, langpair });
  if (config.apiKey) params.set('key', config.apiKey);
  const url = `${config.apiUrl}?${params}`;
  console.log('[EasyLearn] fetchTranslation() — URL:', url);

  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('Sem conexão com o servidor de tradução.');
  }

  if (!res.ok) {
    if (res.status === 429) throw new Error('Limite de requisições atingido.');
    throw new Error(`Erro HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log('[EasyLearn] resposta da API:', JSON.stringify(data));
  if (data.responseStatus !== 200) throw new Error(data.responseDetails || 'Resposta inválida da API.');
  if (!data.responseData?.translatedText) throw new Error('Resposta inválida da API.');
  return data.responseData.translatedText;
}

// Fonética via Free Dictionary API (apenas palavras únicas)
async function fetchPhonetic(word) {
  if (word.includes(' ')) return null;
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (
      data[0]?.phonetic ||
      data[0]?.phonetics?.find((p) => p.text)?.text ||
      null
    );
  } catch {
    return null;
  }
}

function saveToHistory(original, translated, phonetic) {
  chrome.storage.local.get('easylearn_history', (res) => {
    const history = res.easylearn_history || [];
    const entry = { original, translated, phonetic, date: new Date().toISOString() };
    const idx = history.findIndex(
      (h) => h.original.toLowerCase() === original.toLowerCase()
    );
    if (idx >= 0) {
      history[idx] = entry;
    } else {
      history.unshift(entry);
      if (history.length > 100) history.pop();
    }
    chrome.storage.local.set({ easylearn_history: history });
  });
}

function saveToMemory(original, translated, phonetic) {
  chrome.storage.local.get('easylearn_memory', (res) => {
    const memory = res.easylearn_memory || [];
    const entry = {
      original,
      translated,
      phonetic,
      date: new Date().toISOString(),
      // Repetição espaçada — valores iniciais
      interval:    0,
      ease:        2.5,
      repetitions: 0,
      nextReview:  0,
    };
    const idx = memory.findIndex(
      (m) => m.original.toLowerCase() === original.toLowerCase()
    );
    // Preserva dados SRS se a frase já existia
    if (idx >= 0) {
      memory[idx] = {
        ...entry,
        interval:    memory[idx].interval,
        ease:        memory[idx].ease,
        repetitions: memory[idx].repetitions,
        nextReview:  memory[idx].nextReview,
      };
    } else {
      memory.unshift(entry);
    }
    chrome.storage.local.set({ easylearn_memory: memory });
  });
}

// ─────────────────────────────────────────────
// Lógica principal de seleção
// ─────────────────────────────────────────────
async function handleSelection(text, coords) {
  const myId = ++translationId;
  console.log('[EasyLearn] handleSelection() — texto:', text, '| id:', myId);
  showLoading(coords);
  try {
    const [translation, phonetic] = await Promise.all([
      fetchTranslation(text),
      fetchPhonetic(text),
    ]);
    // Cancela se uma seleção mais recente já disparou nova tradução
    if (myId !== translationId) return;
    console.log('[EasyLearn] tradução recebida:', translation, '| fonética:', phonetic);
    // Cancela se o usuário selecionou OUTRA coisa (mas não se apenas deu um click fora)
    const currentSel = window.getSelection()?.toString().trim();
    console.log('[EasyLearn] seleção atual no momento da resposta:', JSON.stringify(currentSel));
    if (currentSel && currentSel !== text) {
      console.log('[EasyLearn] seleção mudou — popup cancelado');
      return;
    }
    showTranslation(coords, text, translation, phonetic);
    saveToHistory(text, translation, phonetic);
  } catch (err) {
    if (myId !== translationId) return;
    console.error('[EasyLearn] ❌ Erro de tradução:', err.message);
    showError(coords, 'Erro ao traduzir. Verifique sua conexão ou as configurações da API.');
  }
}

// ─────────────────────────────────────────────
// Event listeners
// ─────────────────────────────────────────────
document.addEventListener('mouseup', (e) => {
  // Ignora cliques dentro do popup (shadow host)
  if (hostEl && (e.target === hostEl || hostEl.contains(e.target))) return;

  setTimeout(async () => {
    const text = window.getSelection()?.toString().trim() || '';
    console.log('[EasyLearn] mouseup — texto selecionado:', JSON.stringify(text));

    if (!text || text.length < 2) {
      removePopup();
      return;
    }

    // Evita re-traduzir a mesma seleção
    if (text === lastText && popupInner) {
      console.log('[EasyLearn] mesma seleção — ignorando');
      return;
    }
    lastText = text;

    if (text.length > 500) {
      const coords = getSelectionCoords();
      if (coords) showError(coords, 'Texto muito longo. Selecione até 500 caracteres.');
      return;
    }

    const coords = getSelectionCoords();
    console.log('[EasyLearn] coords da seleção:', JSON.stringify(coords));
    if (!coords) {
      console.warn('[EasyLearn] ⚠️ getSelectionCoords() retornou null — abortando');
      return;
    }

    await handleSelection(text, coords);
  }, 120);
});

// Fecha o popup ao clicar fora dele
document.addEventListener('mousedown', (e) => {
  if (hostEl && (e.target === hostEl || hostEl.contains(e.target))) return;
  if (popupInner) {
    removePopup();
    lastText = '';
  }
});

// Fecha com Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && popupInner) removePopup();
});

// Fecha o popup ao rolar (com position:fixed o popup fica parado enquanto a página rola)
document.addEventListener(
  'scroll',
  () => {
    if (!hostEl || !popupInner) return;
    hostEl.style.opacity = '0.35';
    clearTimeout(window._elScrollTimer);
    window._elScrollTimer = setTimeout(() => {
      if (hostEl) hostEl.style.opacity = '1';
    }, 180);
  },
  true
);
