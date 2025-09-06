/**
 * Streamhive - Core JavaScript
 * Funcionalidades globais compartilhadas entre todas as páginas
 */

// Configuração global
window.StreamhiveApp = {
    version: '1.0.0',
    debug: true,
    currentUser: null,
    config: {
        apiTimeout: 10000,
        toastDuration: 4000,
        retryAttempts: 3
    }
};

// Detecção de dispositivo
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTouch = 'ontouchstart' in window;

// Adicionar classes de dispositivo
document.documentElement.classList.add(isMobile ? 'mobile' : 'desktop');
if (isTouch) document.documentElement.classList.add('touch');

// Sistema de Toast Global
class ToastManager {
    constructor() {
        this.toastContainer = document.getElementById('toast');
        this.toastContent = document.getElementById('toastContent');
        this.toastMessage = document.getElementById('toastMessage');
        this.currentTimeout = null;
    }

    show(message, type = 'info', duration = StreamhiveApp.config.toastDuration) {
        if (!this.toastContainer || !this.toastContent || !this.toastMessage) {
            console.warn('Toast elements not found');
            return;
        }

        // Limpar timeout anterior
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
        }

        // Configurar mensagem
        this.toastMessage.textContent = message;
        
        // Remover classes de tipo anteriores
        this.toastContent.classList.remove('success', 'error', 'warning', 'info');
        
        // Adicionar classe do tipo atual
        this.toastContent.classList.add(type);
        
        // Mostrar toast
        this.toastContainer.classList.add('show');
        
        // Esconder após duração especificada
        this.currentTimeout = setTimeout(() => {
            this.hide();
        }, duration);
    }

    hide() {
        if (this.toastContainer) {
            this.toastContainer.classList.remove('show');
        }
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
    }
}

// Instância global do toast
const toast = new ToastManager();

// Sistema de Modal Global
class ModalManager {
    constructor() {
        this.openModals = new Set();
        this.setupGlobalListeners();
    }

    setupGlobalListeners() {
        // Fechar modal com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAll();
            }
        });
    }

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return false;
        }

        modal.classList.remove('hidden');
        modal.classList.add('show');
        
        // Adicionar à lista de modais abertos
        this.openModals.add(modalId);
        
        // Bloquear scroll do body
        document.body.style.overflow = 'hidden';
        
        // Foco no primeiro input
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }

        // Configurar clique no fundo para fechar
        this.setupBackdropClose(modal, modalId);

        return true;
    }

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;

        modal.classList.remove('show');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            
            // Remover da lista de modais abertos
            this.openModals.delete(modalId);
            
            // Restaurar scroll se não há mais modais
            if (this.openModals.size === 0) {
                document.body.style.overflow = '';
            }
            
            // Limpar forms
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                // Resetar estilos de validação
                form.querySelectorAll('.input-field').forEach(input => {
                    input.classList.remove('valid', 'invalid');
                });
            }
        }, 300);

        return true;
    }

    closeAll() {
        Array.from(this.openModals).forEach(modalId => {
            this.close(modalId);
        });
    }

    switch(fromModalId, toModalId) {
        this.close(fromModalId);
        setTimeout(() => this.open(toModalId), 300);
    }

    setupBackdropClose(modal, modalId) {
        const handler = (e) => {
            if (e.target === modal) {
                this.close(modalId);
            }
        };

        modal.removeEventListener('click', handler); // Remove listeners anteriores
        modal.addEventListener('click', handler);
    }
}

// Instância global do modal
const modal = new ModalManager();

// Sistema de API Calls
class APIManager {
    constructor() {
        this.baseURL = '';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    async call(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // Se o response não é JSON, retornar como texto
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    async get(endpoint, params = {}) {
        const url = new URL(this.baseURL + endpoint, window.location.origin);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        return this.call(url.pathname + url.search);
    }

    async post(endpoint, data = {}) {
        return this.call(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        return this.call(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.call(endpoint, {
            method: 'DELETE'
        });
    }
}

// Instância global da API
const api = new APIManager();

// Utilitários globais
const utils = {
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Format date
    formatDate(date, format = 'dd/mm/yyyy') {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        if (!(date instanceof Date) || isNaN(date)) {
            return 'Data inválida';
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return format
            .replace('dd', day)
            .replace('mm', month)
            .replace('yyyy', year);
    },

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback para navegadores mais antigos
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (err) {
            console.error('Erro ao copiar para clipboard:', err);
            return false;
        }
    },

    // Generate random ID
    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // Storage helpers
    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.warn('localStorage não disponível:', error);
                return false;
            }
        },
        
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('Erro ao ler localStorage:', error);
                return defaultValue;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn('Erro ao remover do localStorage:', error);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.warn('Erro ao limpar localStorage:', error);
                return false;
            }
        }
    }
};

// Loading state para botões
function setButtonLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
        button.setAttribute('data-original-text', button.textContent);
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.textContent = originalText;
            button.removeAttribute('data-original-text');
        }
    }
}

// Verificação de recursos do navegador
const browserFeatures = {
    supportsWebRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    supportsNotifications: 'Notification' in window,
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsWebSockets: 'WebSocket' in window,
    supportsLocalStorage: (() => {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch {
            return false;
        }
    })(),
    supportsIntersectionObserver: 'IntersectionObserver' in window,
    supportsResizeObserver: 'ResizeObserver' in window
};

// Detectar mudanças de conectividade
function setupConnectivityDetection() {
    if ('navigator' in window && 'onLine' in navigator) {
        function updateConnectionStatus() {
            const isOnline = navigator.onLine;
            document.body.setAttribute('data-connection', isOnline ? 'online' : 'offline');
            
            if (!isOnline) {
                toast.show('🔌 Você está offline. Algumas funcionalidades podem não funcionar.', 'warning', 6000);
            } else {
                toast.show('🌐 Conexão restaurada!', 'success', 2000);
            }
        }
        
        window.addEventListener('online', updateConnectionStatus);
        window.addEventListener('offline', updateConnectionStatus);
        
        // Verificação inicial
        updateConnectionStatus();
    }
}

// Otimizações para dispositivos touch
function setupTouchOptimizations() {
    if (isTouch) {
        // Prevenção de zoom duplo toque
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });

        // Melhorar performance de scroll em mobile
        document.addEventListener('touchstart', () => {}, { passive: true });
        document.addEventListener('touchmove', () => {}, { passive: true });
    }
}

// Gerenciamento de foco para acessibilidade
function setupAccessibilityEnhancements() {
    // Detectar navegação por teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });

    document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-navigation');
    });

    // Melhorar foco visível
    const style = document.createElement('style');
    style.textContent = `
        .keyboard-navigation *:focus {
            outline: 2px solid var(--primary-yellow) !important;
            outline-offset: 2px !important;
        }
    `;
    document.head.appendChild(style);
}

// Error handling global
function setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('JavaScript Error:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
        
        if (StreamhiveApp.debug) {
            toast.show('❌ Erro de JavaScript detectado. Verifique o console.', 'error');
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);
        
        if (StreamhiveApp.debug) {
            toast.show('❌ Erro de Promise detectado. Verifique o console.', 'error');
        }
    });
}

// Inicialização do core
function initializeCore() {
    setupConnectivityDetection();
    setupTouchOptimizations();
    setupAccessibilityEnhancements();
    setupGlobalErrorHandling();
    
    // Log de inicialização
    console.log('🚀 Streamhive Core carregado!');
    console.log('📱 Dispositivo:', isMobile ? 'Mobile' : 'Desktop');
    console.log('👆 Touch:', isTouch ? 'Sim' : 'Não');
    console.log('🌐 Recursos:', browserFeatures);
}

// Exportar para uso global
window.StreamhiveApp = {
    ...window.StreamhiveApp,
    
    // Managers
    toast,
    modal,
    api,
    utils,
    
    // Informações
    isMobile,
    isTouch,
    browserFeatures,
    
    // Funções utilitárias
    setButtonLoading,
    
    // Inicialização
    init: initializeCore
};

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCore);
} else {
    initializeCore();
}