/**
 * Streamhive - Funções Auxiliares
 * Utilitários e helpers reutilizáveis
 */
const Helpers = {
    // Formatação de data
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
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return format
            .replace('dd', day)
            .replace('mm', month)
            .replace('yyyy', year)
            .replace('hh', hours)
            .replace('ii', minutes);
    },

    formatRelativeTime(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        if (!(date instanceof Date) || isNaN(date)) {
            return 'Data inválida';
        }

        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'agora mesmo';
        if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
        
        return this.formatDate(date);
    },

    formatNumber(num, options = {}) {
        const {
            locale = 'pt-BR',
            minimumFractionDigits = 0,
            maximumFractionDigits = 2
        } = options;

        return new Intl.NumberFormat(locale, {
            minimumFractionDigits,
            maximumFractionDigits
        }).format(num);
    },

    abbreviateNumber(num) {
        if (num < 1000) return num.toString();
        
        const units = ['', 'K', 'M', 'B', 'T'];
        let unitIndex = 0;
        
        while (num >= 1000 && unitIndex < units.length - 1) {
            num /= 1000;
            unitIndex++;
        }
        
        return `${num.toFixed(1).replace('.0', '')}${units[unitIndex]}`;
    },

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
            '/': '&#x2F;'
        };
        
        return text ? String(text).replace(/[&<>"'\/]/g, s => map[s]) : '';
    },

    truncateText(text, maxLength, suffix = '...') {
        if (!text || text.length <= maxLength) return text;
        
        return text.substring(0, maxLength - suffix.length) + suffix;
    },

    generateId(prefix = '', length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = prefix;
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    },

    getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/tablet|ipad|playbook|silk/.test(userAgent)) {
            return 'tablet';
        }
        
        if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
            return 'mobile';
        }
        
        return 'desktop';
    },

    getOS() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('win')) return 'Windows';
        if (userAgent.includes('mac')) return 'MacOS';
        if (userAgent.includes('linux')) return 'Linux';
        if (userAgent.includes('android')) return 'Android';
        if (userAgent.includes('ios') || userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS';
        
        return 'Unknown';
    },

    getBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('chrome')) return 'Chrome';
        if (userAgent.includes('firefox')) return 'Firefox';
        if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari';
        if (userAgent.includes('edge')) return 'Edge';
        if (userAgent.includes('opera')) return 'Opera';
        
        return 'Unknown';
    },

    supportsFeature(feature) {
        const features = {
            webrtc: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            websockets: 'WebSocket' in window,
            notifications: 'Notification' in window,
            serviceworker: 'serviceWorker' in navigator,
            localstorage: (() => {
                try {
                    localStorage.setItem('test', 'test');
                    localStorage.removeItem('test');
                    return true;
                } catch {
                    return false;
                }
            })(),
            intersectionobserver: 'IntersectionObserver' in window,
            resizeobserver: 'ResizeObserver' in window,
            clipboard: !!(navigator.clipboard && navigator.clipboard.writeText)
        };
        
        return features[feature.toLowerCase()] || false;
    },

    async retry(fn, maxAttempts = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxAttempts) {
                    throw lastError;
                }
                
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    },

    isElementVisible(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= windowHeight &&
            rect.right <= windowWidth
        );
    },

    scrollToElement(element, offset = 0) {
        if (!element) return;
        
        const elementPosition = element.offsetTop - offset;
        
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    validateFileSize(file, maxSizeMB = 5) {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        return file.size <= maxSizeBytes;
    },

    validateFileType(file, allowedTypes = []) {
        if (!allowedTypes.length) return true;
        
        return allowedTypes.some(type => {
            if (type.startsWith('.')) {
                return file.name.toLowerCase().endsWith(type.toLowerCase());
            }
            return file.type.toLowerCase().includes(type.toLowerCase());
        });
    },

    createDownloadUrl(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    },


    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            Object.keys(obj).forEach(key => {
                clonedObj[key] = this.deepClone(obj[key]);
            });
            return clonedObj;
        }
    },


    deepMerge(target, source) {
        const result = this.deepClone(target);
        
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        });
        
        return result;
    },

    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            
            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Elemento ${selector} não encontrado em ${timeout}ms`));
            }, timeout);
        });
    }
};

if (typeof window !== 'undefined') {
    window.Helpers = Helpers;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Helpers;
}