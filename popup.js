/**
 * EasyLearn English — Popup mínimo
 * Exibe stats rápidos e abre a página de estudo em nova aba.
 */

const MEMORY_KEY = 'easylearn_memory';

function getDueCount(cards) {
  const now = Date.now();
  return cards.filter((c) => !c.nextReview || c.nextReview <= now).length;
}

// Carrega stats para exibir no popup
chrome.storage.local.get(['easylearn_history', MEMORY_KEY], (res) => {
  const history = res.easylearn_history || [];
  const cards   = res[MEMORY_KEY] || [];
  document.getElementById('stat-history').textContent = history.length;
  document.getElementById('stat-due').textContent     = getDueCount(cards);
});

// Abre a página completa de estudo
document.getElementById('open-page').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('page.html') });
});
