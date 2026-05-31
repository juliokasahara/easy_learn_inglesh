# EasyLearn English 🇺🇸

Extensão para Chrome/Edge que traduz palavras e frases em inglês instantaneamente ao selecionar texto em qualquer página.

---

## Instalação

### 1. Gerar os ícones

```bash
node generate-icons.js
```

Isso cria a pasta `icons/` com os arquivos `icon16.png`, `icon48.png` e `icon128.png`.

### 2. Carregar a extensão no Chrome ou Edge

1. Abra `chrome://extensions/` (ou `edge://extensions/`)
2. Ative o **Modo desenvolvedor** (toggle no canto superior direito)
3. Clique em **"Carregar sem compactação"**
4. Selecione esta pasta (`easy_learn_inglish/`)

---

## Como usar

| Ação | Resultado |
|------|-----------|
| Selecionar uma palavra em inglês | Popup aparece automaticamente com tradução + IPA |
| Selecionar uma frase | Popup com tradução da frase inteira |
| Botão direito em texto selecionado | Menu "Traduzir com EasyLearn" |
| Pressionar **Esc** | Fecha o popup |
| Clicar em 🔊 | Ouve a pronúncia em inglês |
| Clicar em ⭐ | Salva nos favoritos |
| Clicar em 📋 | Copia a tradução para o clipboard |

---

## Funcionalidades

- **Tradução automática** ao selecionar — sem precisar clicar
- **Fonética IPA** para palavras únicas (ex: `/səˈsteɪnəbl/`)
- **Pronúncia** via Web Speech API (sem custo)
- **Controle de velocidade** da fala: 0.5× · 1× · 1.5×
- **Histórico** das últimas 100 traduções
- **Favoritos** para salvar palavras importantes
- **Tema escuro / claro** configurável
- **Menu de contexto** (botão direito)
- **Funciona offline** para pronúncia (a tradução exige conexão)

---

## Configurações

Clique no ícone da extensão na barra de ferramentas para acessar:

- **Servidor de tradução** — escolha entre instâncias gratuitas do LibreTranslate
- **API Key** — necessária apenas para `libretranslate.com`
- **Tema** do popup (escuro ou claro)
- **Velocidade padrão** da fala

---

## Servidores de tradução

| Servidor | Gratuito | API Key |
|----------|----------|---------|
| ArgosOpenTech (`translate.argosopentech.com`) | ✅ | Não |
| LibreTranslate.de (`libretranslate.de`) | ✅ | Não |
| LibreTranslate.com | ⚠️ Limitado | Sim (plano pago) |
| URL personalizada | — | — |

> Você pode hospedar seu próprio servidor LibreTranslate para uso ilimitado e privado.  
> Instruções: https://github.com/LibreTranslate/LibreTranslate

---

## Estrutura do projeto

```
easy_learn_inglish/
├── manifest.json        # Configuração da extensão (Manifest V3)
├── content.js           # Detecta seleção e exibe popup (Shadow DOM)
├── background.js        # Service worker: tradução via fetch, menu de contexto
├── popup.html           # UI da barra de ferramentas
├── popup.js             # Lógica do histórico, favoritos e configurações
├── popup.css            # Estilos da barra de ferramentas
├── generate-icons.js    # Script para gerar os ícones PNG
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Tecnologias

- **Manifest V3** — padrão atual para extensões Chrome/Edge
- **Shadow DOM** — isola os estilos do popup da página visitada
- **Web Speech API** — síntese de voz nativa do navegador (sem custo)
- **Free Dictionary API** — fonética IPA gratuita (`api.dictionaryapi.dev`)
- **LibreTranslate** — tradução de código aberto e gratuita
- **`chrome.storage`** — histórico e favoritos persistentes

---

## Limitações conhecidas

- A seleção de texto em PDFs dentro do Chrome pode não ser detectada
- Textos com mais de 500 caracteres não são traduzidos automaticamente
- A fonética IPA está disponível apenas para palavras únicas (não frases)
- Algumas páginas com CSP estrita podem bloquear a fetch da API de fonética
