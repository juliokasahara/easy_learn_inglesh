/**
 * EasyLearn English — Background Service Worker (Manifest V3)
 * Responsável por:
 *  - Registrar o menu de contexto
 *  - Executar as chamadas de tradução (evita CORS no content script)
 *  - Inicializar configuração padrão
 */

const CONFIG_KEY = 'easylearn_config';

const DEFAULT_CONFIG = {
  apiUrl: 'https://api.mymemory.translated.net/get',
  apiKey: '',
  sourceLang: 'en',
  targetLang: 'pt',
  speechRate: 1.0,
  theme: 'dark',
};

// ── Instalação ──────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  // Menu de contexto (botão direito em texto selecionado)
  chrome.contextMenus.create({
    id: 'easylearn-translate',
    title: 'Traduzir com EasyLearn',
    contexts: ['selection'],
  });

  // Salva configuração padrão apenas se ainda não existir
  chrome.storage.sync.get(CONFIG_KEY, (result) => {
    if (!result[CONFIG_KEY]) {
      chrome.storage.sync.set({ [CONFIG_KEY]: DEFAULT_CONFIG });
    }
  });
});

// ── Menu de contexto ─────────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (
    info.menuItemId === 'easylearn-translate' &&
    info.selectionText &&
    tab?.id
  ) {
    // Callback vazio obrigatório para evitar erro "Uncaught" se o content script não estiver carregado
    chrome.tabs.sendMessage(
      tab.id,
      { type: 'CONTEXT_TRANSLATE', text: info.selectionText.trim() },
      () => { void chrome.runtime.lastError; }
    );
  }
});

// ── Mensagens dos content scripts ────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'TRANSLATE') {
    translate(msg)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true; // mantém o canal aberto para resposta assíncrona
  }
});

// ── Função de tradução ───────────────────────────────────────────────────────
async function translate({ text, apiUrl, apiKey, source, target }) {
  const body = {
    q: text,
    source: source || 'en',
    target: target || 'pt',
    format: 'text',
  };
  if (apiKey) body.api_key = apiKey;

  let response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new Error('Sem conexão com o servidor de tradução.');
  }

  if (!response.ok) {
    const status = response.status;
    if (status === 403) throw new Error('API Key inválida ou ausente.');
    if (status === 429) throw new Error('Limite de requisições atingido. Tente novamente.');
    throw new Error(`Erro HTTP ${status} na API de tradução.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Resposta inválida da API de tradução.');
  }

  if (!data.translatedText) {
    throw new Error('A API não retornou uma tradução.');
  }

  return { translation: data.translatedText };
}
