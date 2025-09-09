/**
 * Streamhive - Netflix WebView Component
 * Componente para integração com Netflix via webview
 */

class NetflixWebView {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            allowOwnerInteraction: false,
            showControls: true,
            ...options
        };

        this.webview = null;
        this.isOwner = false;
        this.isLoaded = false;
        this.currentUrl = '';
        
        this.eventHandlers = {
            'ready': [],
            'navigation': [],
            'error': []
        };

        this.init();
    }

    init() {
        this.createWebViewHTML();
        this.setupEventListeners();
        this.loadNetflix();
        
        console.log('🎬 Netflix WebView inicializado');
    }

    createWebViewHTML() {
        this.container.innerHTML = `
            <div class="netflix-webview-wrapper">
                <div class="netflix-container">
                    <iframe 
                        id="netflixWebView"
                        class="netflix-iframe"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        allow="autoplay; fullscreen; microphone; camera"
                        referrerpolicy="no-referrer-when-downgrade"
                    >
                    </iframe>
                    
                    <!-- Overlay para participantes (não owners) -->
                    <div class="netflix-overlay ${this.isOwner ? 'hidden' : ''}" id="netflixOverlay">
                        <div class="overlay-message">
                            <div class="overlay-icon">👥</div>
                            <div class="overlay-text">Assistindo Netflix</div>
                            <div class="overlay-subtext">Apenas o proprietário pode controlar</div>
                        </div>
                    </div>
                    
                    <!-- Indicador de carregamento -->
                    <div class="netflix-loading" id="netflixLoading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Carregando Netflix...</div>
                    </div>
                </div>
                
                <!-- Controles de navegação (apenas para owner) -->
                <div class="netflix-controls ${this.isOwner ? '' : 'hidden'}" id="netflixControls">
                    <div class="nav-controls">
                        <button class="nav-btn" id="refreshBtn" title="Atualizar">
                            🔄
                        </button>
                        <button class="nav-btn" id="homeBtn" title="Página Inicial">
                            🏠
                        </button>
                        <div class="url-display" id="urlDisplay">
                            Netflix
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Obter referências
        this.webview = this.container.querySelector('#netflixWebView');
        this.overlay = this.container.querySelector('#netflixOverlay');
        this.loading = this.container.querySelector('#netflixLoading');
        this.controls = this.container.querySelector('#netflixControls');
    }

    setupEventListeners() {
        // Eventos do iframe
        this.webview.addEventListener('load', () => {
            this.handleWebViewLoad();
        });

        this.webview.addEventListener('error', () => {
            this.handleWebViewError();
        });

        // Controles de navegação (apenas para owner)
        if (this.isOwner) {
            const refreshBtn = this.container.querySelector('#refreshBtn');
            const homeBtn = this.container.querySelector('#homeBtn');

            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.refresh());
            }

            if (homeBtn) {
                homeBtn.addEventListener('click', () => this.goHome());
            }
        }

        // Escutar mensagens do iframe (para capturar navegação)
        window.addEventListener('message', (event) => {
            if (event.source === this.webview.contentWindow) {
                this.handleWebViewMessage(event.data);
            }
        });
    }

    loadNetflix() {
        this.showLoading();
        
        const netflixUrl = 'https://www.netflix.com';
        // ✅ CORREÇÃO: Carregar a URL através do nosso proxy
        const proxyUrl = `/proxy/page?url=${encodeURIComponent(netflixUrl)}`;

        this.webview.src = proxyUrl;
        
        // O user-agent não é mais necessário aqui, pois é definido no proxy do backend
        
        this.currentUrl = netflixUrl;
    }

    handleWebViewLoad() {
        console.log('🎬 Netflix WebView carregado');
        this.isLoaded = true;
        this.hideLoading();
        
        // Injetar script para melhorar compatibilidade
        this.injectCompatibilityScript();
        
        this.emit('ready');
    }

    handleWebViewError() {
        console.error('🎬 Erro ao carregar Netflix WebView');
        this.hideLoading();
        this.showError();
        this.emit('error');
    }

    handleWebViewMessage(data) {
        // Capturar mudanças de URL e outros eventos
        if (data.type === 'navigation' && this.isOwner) {
            this.currentUrl = data.url;
            this.updateUrlDisplay();
            this.emit('navigation', { url: data.url });
        }
    }

    injectCompatibilityScript() {
        try {
            // Script para melhorar compatibilidade e detectar navegação
            const script = `
                (function() {
                    // Melhorar compatibilidade
                    if (window.parent !== window) {
                        // Notificar mudanças de URL
                        let lastUrl = location.href;
                        new MutationObserver(() => {
                            const url = location.href;
                            if (url !== lastUrl) {
                                lastUrl = url;
                                window.parent.postMessage({
                                    type: 'navigation',
                                    url: url
                                }, '*');
                            }
                        }).observe(document, {subtree: true, childList: true});
                        
                        // Override pushState/replaceState para capturar navegação SPA
                        const originalPushState = history.pushState;
                        const originalReplaceState = history.replaceState;
                        
                        history.pushState = function(...args) {
                            originalPushState.apply(history, args);
                            window.parent.postMessage({
                                type: 'navigation',
                                url: location.href
                            }, '*');
                        };
                        
                        history.replaceState = function(...args) {
                            originalReplaceState.apply(history, args);
                            window.parent.postMessage({
                                type: 'navigation',
                                url: location.href
                            }, '*');
                        };
                    }
                })();
            `;
            
            this.webview.contentWindow.eval(script);
        } catch (e) {
            console.warn('🎬 Não foi possível injetar script de compatibilidade:', e);
        }
    }

    // Métodos de navegação (apenas para owner)
    refresh() {
        if (!this.isOwner) return;
        
        this.showLoading();
        this.webview.src = this.webview.src;
    }

    goHome() {
        if (!this.isOwner) return;
        
        this.navigateToUrl('https://www.netflix.com');
    }

    navigateToUrl(url) {
        if (!this.isOwner) return;
        
        this.showLoading();
        this.webview.src = url;
        this.currentUrl = url;
        this.updateUrlDisplay();
        
        // Emitir evento para sincronização
        this.emit('navigation', { url });
    }

    // Sincronização - receber comandos de outros usuários
    syncNavigation(data) {
        if (this.isOwner) return; // Owner não recebe sync
        
        console.log('🎬 Sincronizando navegação Netflix:', data);
        
        if (data.url && data.url !== this.currentUrl) {
            this.showLoading();
            this.webview.src = data.url;
            this.currentUrl = data.url;
        }
    }

    // Controle de proprietário
    setOwner(isOwner) {
        this.isOwner = isOwner;
        this.options.allowOwnerInteraction = isOwner;
        
        // Atualizar interface
        if (this.overlay) {
            this.overlay.classList.toggle('hidden', isOwner);
        }
        
        if (this.controls) {
            this.controls.classList.toggle('hidden', !isOwner);
        }
        
        console.log('🎬 Netflix WebView - Owner:', isOwner);
    }

    // UI helpers
    showLoading() {
        if (this.loading) {
            this.loading.classList.remove('hidden');
        }
    }

    hideLoading() {
        if (this.loading) {
            this.loading.classList.add('hidden');
        }
    }

    showError() {
        this.container.innerHTML = `
            <div class="netflix-error">
                <div class="error-icon">❌</div>
                <div class="error-title">Erro ao carregar Netflix</div>
                <div class="error-text">
                    Verifique sua conexão com a internet ou tente atualizar a página.
                </div>
                <button class="retry-btn" onclick="location.reload()">
                    Tentar Novamente
                </button>
            </div>
        `;
    }

    updateUrlDisplay() {
        const urlDisplay = this.container.querySelector('#urlDisplay');
        if (urlDisplay && this.currentUrl) {
            const url = new URL(this.currentUrl);
            urlDisplay.textContent = url.pathname === '/' ? 'Netflix' : url.pathname;
        }
    }

    // Sistema de eventos
    on(event, callback) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(callback);
        }
    }

    emit(event, data = {}) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(callback => callback(data));
        }
    }

    // Cleanup
    destroy() {
        if (this.webview) {
            this.webview.src = 'about:blank';
        }
        this.eventHandlers = {};
        console.log('🎬 Netflix WebView destruído');
    }
}

// Exportar classe globalmente
window.NetflixWebView = NetflixWebView;