/**
 * EasyLearn English — Popup (barra de ferramentas)
 * Gerencia: abas, histórico, favoritos, configurações
 */

const CONFIG_KEY = 'easylearn_config';
const DEFAULT_CONFIG = {
  apiUrl: 'https://translate.argosopentech.com/translate',
  apiKey: '',
  sourceLang: 'en',
  targetLang: 'pt',
  speechRate: 1.0,
  theme: 'dark',
};

// ── Troca de abas ────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function speak(text) {
  chrome.storage.sync.get(CONFIG_KEY, (res) => {
    const cfg = { ...DEFAULT_CONFIG, ...(res[CONFIG_KEY] || {}) };
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = cfg.speechRate;
    speechSynthesis.speak(utt);
  });
}

function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

// ── Renderiza lista (histórico ou favoritos) ─────────────────────────────────
function renderList(containerId, items, isFavorites) {
  const container = document.getElementById(containerId);
  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">${
      isFavorites
        ? 'Nenhum favorito ainda.<br />Clique em ⭐ no popup para salvar!'
        : 'Nenhuma palavra traduzida ainda.<br />Selecione texto em inglês em qualquer página!'
    }</div>`;
    return;
  }

  container.innerHTML = items
    .map(
      (item, i) => `
    <div class="word-item" data-index="${i}">
      <div class="word-texts">
        <div class="word-original" title="${esc(item.original)}">${esc(item.original)}</div>
        ${item.phonetic ? `<div class="word-phonetic">${esc(item.phonetic)}</div>` : ''}
        <div class="word-translated" title="${esc(item.translated)}">${esc(item.translated)}</div>
      </div>
      <div class="word-actions">
        <button class="word-action speak-btn" title="Ouvir" data-text="${esc(item.original)}">🔊</button>
        ${isFavorites ? `<button class="word-action remove-btn" title="Remover" data-index="${i}">🗑️</button>` : ''}
      </div>
    </div>`
    )
    .join('');

  // Falar
  container.querySelectorAll('.speak-btn').forEach((btn) => {
    btn.addEventListener('click', () => speak(btn.dataset.text));
  });

  // Remover favorito
  if (isFavorites) {
    container.querySelectorAll('.remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        chrome.storage.local.get('easylearn_favorites', (res) => {
          const favs = res.easylearn_favorites || [];
          favs.splice(idx, 1);
          chrome.storage.local.set({ easylearn_favorites: favs }, loadFavorites);
        });
      });
    });
  }
}

// ── Histórico ────────────────────────────────────────────────────────────────
function loadHistory() {
  chrome.storage.local.get('easylearn_history', (res) => {
    const list = res.easylearn_history || [];
    document.getElementById('history-count').textContent = pluralize(list.length, 'palavra', 'palavras');
    renderList('history-list', list, false);
  });
}

document.getElementById('clear-history').addEventListener('click', () => {
  if (!confirm('Apagar todo o histórico de traduções?')) return;
  chrome.storage.local.remove('easylearn_history', loadHistory);
});

// ── Memory / Repetição Espaçada ──────────────────────────────────────────────
const MEMORY_KEY = 'easylearn_memory';

let _memoryCards = [];
let _dueCards    = [];
let _cardIdx     = 0;
let _memorySpeed = 1.0;

function speakAt(text) {
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  utt.rate = _memorySpeed;
  speechSynthesis.speak(utt);
}

// Botões de velocidade do flashcard (estáticos no HTML, listener registrado uma vez)
document.querySelectorAll('.card-speed-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    _memorySpeed = parseFloat(btn.dataset.speed);
    document.querySelectorAll('.card-speed-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/**
 * Algoritmo SM-2 simplificado.
 * quality: 1=Muito difícil  2=Difícil  3=Fácil  4=Muito fácil
 */
function updateSRS(card, quality) {
  const now = Date.now();
  card.repetitions = (card.repetitions ?? 0) + (quality === 1 ? 0 : 1);

  // Intervalos fixos conforme dificuldade
  const INTERVALS = {
    1: 60_000,            // Muito difícil → 1 minuto
    2: 3_600_000,         // Difícil       → 1 hora
    3: 86_400_000,        // Fácil         → 1 dia
    4: 3  * 86_400_000,   // Muito fácil   → 3 dias
    5: 13 * 86_400_000,   // Easy Peasy    → 13 dias
  };

  if (quality === 1) card.repetitions = 0;

  card.nextReview = now + INTERVALS[quality];
  return card;
}

function getDueCards(cards) {
  const now = Date.now();
  return cards.filter((c) => !c.nextReview || c.nextReview <= now);
}

function formatNextReview(cards) {
  const now = Date.now();
  const next = cards
    .filter((c) => c.nextReview && c.nextReview > now)
    .map((c) => c.nextReview)
    .sort((a, b) => a - b)[0];
  if (!next) return '';
  const diff = next - now;
  if (diff < 3_600_000) {
    const mins = Math.ceil(diff / 60_000);
    return `Próxima revisão em ${mins} min`;
  }
  if (diff < 86_400_000) {
    const hours = Math.ceil(diff / 3_600_000);
    return `Próxima revisão em ${hours}h`;
  }
  const days = Math.ceil(diff / 86_400_000);
  return `Próxima revisão em ${days} dia${days > 1 ? 's' : ''}`;
}

function renderMemoryCard() {
  const emptyEl = document.getElementById('memory-empty');
  const cardEl  = document.getElementById('memory-card');
  const doneEl  = document.getElementById('memory-done');

  if (_memoryCards.length === 0) {
    emptyEl.style.display = '';
    cardEl.style.display  = 'none';
    doneEl.style.display  = 'none';
    return;
  }

  _dueCards = getDueCards(_memoryCards);

  if (_dueCards.length === 0) {
    emptyEl.style.display = 'none';
    cardEl.style.display  = 'none';
    doneEl.style.display  = '';
    document.getElementById('memory-done-next').textContent = formatNextReview(_memoryCards);
    return;
  }

  emptyEl.style.display = 'none';
  doneEl.style.display  = 'none';
  cardEl.style.display  = '';

  if (_cardIdx >= _dueCards.length) _cardIdx = 0;
  const card = _dueCards[_cardIdx];

  // Alterna aleatoriamente qual lado mostrar
  const showPT   = Math.random() < 0.5;
  const question = showPT ? card.translated : card.original;
  const answer   = showPT ? card.original   : card.translated;
  const label    = showPT ? 'PT → EN' : 'EN → PT';

  // Guarda a resposta atual no card para uso posterior
  card._answer = answer;

  document.getElementById('card-progress').textContent =
    `Carta ${_cardIdx + 1} de ${_dueCards.length}`;
  document.getElementById('card-lang').textContent     = label;
  document.getElementById('card-question').textContent = question;
  document.getElementById('card-answer').textContent   = answer;

  // Botões de ouvir: mostra o row onde o inglês está
  const rowQ = document.getElementById('card-speak-row-question');
  const rowA = document.getElementById('card-speak-row-answer');
  const speakQ = document.getElementById('card-speak-question');
  const speakA = document.getElementById('card-speak-answer');

  if (!showPT) {
    // Inglês é a pergunta
    rowQ.style.display = '';
    rowA.style.display = 'none';
    speakQ.onclick = () => speakAt(card.original);
  } else {
    // Inglês é a resposta
    rowQ.style.display = 'none';
    rowA.style.display = '';
    speakA.onclick = () => speakAt(card.original);
  }

  // Reseta o estado (esconde resposta, mostra botão revelar)
  document.getElementById('card-reveal-area').style.display  = '';
  document.getElementById('card-answer-area').style.display  = 'none';
}

function loadMemory() {
  chrome.storage.local.get(MEMORY_KEY, (res) => {
    _memoryCards = res[MEMORY_KEY] || [];
    const due    = getDueCards(_memoryCards).length;
    const total  = _memoryCards.length;
    document.getElementById('memory-count').textContent =
      `${total} frase${total !== 1 ? 's' : ''} · ${due} para revisar`;
    renderMemoryCard();
  });
}

document.getElementById('clear-memory').addEventListener('click', () => {
  if (!confirm('Apagar todas as frases do Memory?')) return;
  chrome.storage.local.remove(MEMORY_KEY, () => { _cardIdx = 0; loadMemory(); });
});

document.getElementById('reveal-btn').addEventListener('click', () => {
  document.getElementById('card-reveal-area').style.display = 'none';
  document.getElementById('card-answer-area').style.display = '';
});

document.getElementById('card-answer-area').addEventListener('click', (e) => {
  const btn = e.target.closest('.rating-btn');
  if (!btn) return;
  const quality = parseInt(btn.dataset.quality, 10);

  chrome.storage.local.get(MEMORY_KEY, (res) => {
    const cards = res[MEMORY_KEY] || [];
    const due   = _dueCards[_cardIdx];
    const idx   = cards.findIndex((c) => c.original === due.original);
    if (idx >= 0) updateSRS(cards[idx], quality);
    chrome.storage.local.set({ [MEMORY_KEY]: cards }, () => {
      _cardIdx++;
      loadMemory();
    });
  });
});

// ── Configurações ────────────────────────────────────────────────────────────
const presetSelect = document.getElementById('api-preset');
const customUrlField = document.getElementById('custom-url-field');

presetSelect.addEventListener('change', () => {
  customUrlField.style.display = presetSelect.value === 'custom' ? 'block' : 'none';
});

document.querySelectorAll('.speed-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.speed-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function loadSettings() {
  chrome.storage.sync.get(CONFIG_KEY, (res) => {
    const cfg = { ...DEFAULT_CONFIG, ...(res[CONFIG_KEY] || {}) };

    const knownUrls = Array.from(presetSelect.options).map((o) => o.value);
    if (knownUrls.includes(cfg.apiUrl)) {
      presetSelect.value = cfg.apiUrl;
      customUrlField.style.display = 'none';
    } else {
      presetSelect.value = 'custom';
      document.getElementById('custom-api-url').value = cfg.apiUrl;
      customUrlField.style.display = 'block';
    }

    document.getElementById('api-key').value = cfg.apiKey || '';
    document.getElementById('theme').value = cfg.theme || 'dark';

    document.querySelectorAll('.speed-btn').forEach((btn) => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === cfg.speechRate);
    });
  });
}

document.getElementById('save-settings').addEventListener('click', () => {
  const rawUrl =
    presetSelect.value === 'custom'
      ? document.getElementById('custom-api-url').value.trim()
      : presetSelect.value;

  // Validação mínima da URL
  try {
    const parsed = new URL(rawUrl);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error();
  } catch {
    alert('URL da API inválida. Por favor, insira uma URL válida.');
    return;
  }

  const activeSpeed = document.querySelector('.speed-btn.active');
  const newCfg = {
    apiUrl: rawUrl,
    apiKey: document.getElementById('api-key').value.trim(),
    theme: document.getElementById('theme').value,
    speechRate: activeSpeed ? parseFloat(activeSpeed.dataset.speed) : 1.0,
  };

  chrome.storage.sync.get(CONFIG_KEY, (res) => {
    const merged = { ...DEFAULT_CONFIG, ...(res[CONFIG_KEY] || {}), ...newCfg };
    chrome.storage.sync.set({ [CONFIG_KEY]: merged }, () => {
      // Notifica content scripts da aba ativa sobre a nova configuração
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'CONFIG_UPDATE', config: merged });
        }
      });

      const status = document.getElementById('save-status');
      status.textContent = '✓ Salvo com sucesso!';
      setTimeout(() => { status.textContent = ''; }, 2500);
    });
  });
});

// ── Inicialização ────────────────────────────────────────────────────────────
loadHistory();
loadMemory();
loadSettings();
