/**
 * Streamhive - Chat Component
 * Chat em tempo real para salas
 */

class Chat {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            maxMessages: 100,
            autoScroll: true,
            showTimestamps: true,
            allowEmojis: true,
            maxMessageLength: 500,
            ...options
        };

        this.messages = [];
        this.isAtBottom = true;
        this.currentUser = null;
        
        this.eventHandlers = {
            'message_sent': [],
            'message_received': []
        };

        this.init();
    }

    init() {
        this.createChatHTML();
        this.setupEventListeners();
        this.setupEmojiPicker();
        
        console.log('💬 Chat inicializado');
    }

    createChatHTML() {
        this.container.innerHTML = `
            <div class="chat-wrapper">
                <div class="chat-header">
                    <div class="chat-title">
                        <span class="chat-icon">💬</span>
                        <span class="chat-text">Chat da Sala</span>
                    </div>
                    <div class="chat-actions">
                        <button class="chat-btn emoji-btn" id="emojiBtn" title="Emojis">
                            😀
                        </button>
                        <button class="chat-btn clear-btn" id="clearBtn" title="Limpar chat">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                    <div class="welcome-message">
                        <div class="welcome-icon">👋</div>
                        <div class="welcome-text">Bem-vindo ao chat! Seja respeitoso com outros usuários.</div>
                    </div>
                </div>
                
                <div class="scroll-indicator hidden" id="scrollIndicator">
                    <button class="scroll-btn" id="scrollToBottomBtn">
                        <span>↓</span>
                        <span class="new-messages-count" id="newMessagesCount">0</span>
                    </button>
                </div>
                
                <div class="chat-input-container">
                    <div class="emoji-picker hidden" id="emojiPicker">
                        <div class="emoji-grid">
                            <button class="emoji-item" data-emoji="😀">😀</button>
                            <button class="emoji-item" data-emoji="😂">😂</button>
                            <button class="emoji-item" data-emoji="🤣">🤣</button>
                            <button class="emoji-item" data-emoji="😊">😊</button>
                            <button class="emoji-item" data-emoji="😍">😍</button>
                            <button class="emoji-item" data-emoji="🤔">🤔</button>
                            <button class="emoji-item" data-emoji="😮">😮</button>
                            <button class="emoji-item" data-emoji="😱">😱</button>
                            <button class="emoji-item" data-emoji="👍">👍</button>
                            <button class="emoji-item" data-emoji="👎">👎</button>
                            <button class="emoji-item" data-emoji="❤️">❤️</button>
                            <button class="emoji-item" data-emoji="🔥">🔥</button>
                            <button class="emoji-item" data-emoji="💯">💯</button>
                            <button class="emoji-item" data-emoji="🎉">🎉</button>
                            <button class="emoji-item" data-emoji="🚀">🚀</button>
                            <button class="emoji-item" data-emoji="⭐">⭐</button>
                        </div>
                    </div>
                    
                    <div class="chat-input-wrapper">
                        <input 
                            type="text" 
                            class="chat-input" 
                            id="chatInput" 
                            placeholder="Digite sua mensagem..." 
                            maxlength="${this.options.maxMessageLength}"
                            autocomplete="off"
                        >
                        <div class="input-actions">
                            <div class="char-counter" id="charCounter">
                                <span id="charCount">0</span>/${this.options.maxMessageLength}
                            </div>
                            <button class="send-btn" id="sendBtn" disabled>
                                <span class="send-icon">📤</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Obter referências
        this.elements = {
            messages: this.container.querySelector('#chatMessages'),
            input: this.container.querySelector('#chatInput'),
            sendBtn: this.container.querySelector('#sendBtn'),
            emojiBtn: this.container.querySelector('#emojiBtn'),
            emojiPicker: this.container.querySelector('#emojiPicker'),
            clearBtn: this.container.querySelector('#clearBtn'),
            scrollIndicator: this.container.querySelector('#scrollIndicator'),
            scrollToBottomBtn: this.container.querySelector('#scrollToBottomBtn'),
            newMessagesCount: this.container.querySelector('#newMessagesCount'),
            charCount: this.container.querySelector('#charCount')
        };
    }

    setupEventListeners() {
        // Input de mensagem
        this.elements.input.addEventListener('input', () => {
            this.updateCharCounter();
            this.updateSendButton();
        });

        this.elements.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Botão enviar
        this.elements.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Emoji picker
        this.elements.emojiBtn.addEventListener('click', () => {
            this.toggleEmojiPicker();
        });

        this.elements.emojiPicker.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji-item')) {
                const emoji = e.target.dataset.emoji;
                this.insertEmoji(emoji);
            }
        });

        // Limpar chat
        this.elements.clearBtn.addEventListener('click', () => {
            this.clearMessages();
        });

        // Scroll automático
        this.elements.messages.addEventListener('scroll', () => {
            this.handleScroll();
        });

        this.elements.scrollToBottomBtn.addEventListener('click', () => {
            this.scrollToBottom();
        });

        // Fechar emoji picker ao clicar fora
        document.addEventListener('click', (e) => {
            if (!this.elements.emojiPicker.contains(e.target) && !this.elements.emojiBtn.contains(e.target)) {
                this.hideEmojiPicker();
            }
        });
    }

    setupEmojiPicker() {
        // Adicionar mais emojis se necessário
        const additionalEmojis = ['😎', '🤯', '🥳', '😇', '🤓', '😴', '🤐', '🙄'];
        const emojiGrid = this.elements.emojiPicker.querySelector('.emoji-grid');
        
        additionalEmojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'emoji-item';
            btn.dataset.emoji = emoji;
            btn.textContent = emoji;
            emojiGrid.appendChild(btn);
        });
    }

    // Métodos de mensagem
    sendMessage() {
        const message = this.elements.input.value.trim();
        
        if (!message || message.length > this.options.maxMessageLength) {
            return false;
        }

        // Emitir evento
        this.emit('message_sent', { message });
        
        // Limpar input
        this.elements.input.value = '';
        this.updateCharCounter();
        this.updateSendButton();
        this.hideEmojiPicker();
        
        return true;
    }

    receiveMessage(messageData) {
        const { id, user_id, username, message, timestamp, formatted_time } = messageData;
        
        // Adicionar à lista
        this.messages.push(messageData);
        
        // Manter limite de mensagens
        if (this.messages.length > this.options.maxMessages) {
            this.messages = this.messages.slice(-this.options.maxMessages);
        }
        
        // Renderizar mensagem
        this.renderMessage(messageData);
        
        // Auto scroll se estiver no final
        if (this.isAtBottom) {
            this.scrollToBottom();
        } else {
            this.updateNewMessagesIndicator();
        }
        
        this.emit('message_received', messageData);
    }

    renderMessage(messageData) {
        const { id, user_id, username, message, timestamp, formatted_time } = messageData;
        const isOwnMessage = this.currentUser && user_id === this.currentUser.id;
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${isOwnMessage ? 'own-message' : ''}`;
        messageElement.dataset.messageId = id;
        messageElement.dataset.userId = user_id;
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                ${username.charAt(0).toUpperCase()}
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${this.escapeHtml(username)}</span>
                    ${this.options.showTimestamps ? `<span class="message-time">${formatted_time}</span>` : ''}
                </div>
                <div class="message-text">${this.formatMessage(message)}</div>
            </div>
        `;
        
        // Adicionar animação de entrada
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(20px)';
        
        this.elements.messages.appendChild(messageElement);
        
        // Animar entrada
        requestAnimationFrame(() => {
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
            messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        });
    }

    formatMessage(message) {
        // Escapar HTML
        let formatted = this.escapeHtml(message);
        
        // Converter URLs em links
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Converter quebras de linha
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    loadMessages(messages) {
        this.clearMessages(false);
        
        messages.forEach(messageData => {
            this.messages.push(messageData);
            this.renderMessage(messageData);
        });
        
        this.scrollToBottom();
    }

    clearMessages(showConfirm = true) {
        if (showConfirm && !confirm('Tem certeza que deseja limpar o chat?')) {
            return false;
        }
        
        this.messages = [];
        
        // Manter apenas mensagem de boas-vindas
        const welcomeMessage = this.elements.messages.querySelector('.welcome-message');
        this.elements.messages.innerHTML = '';
        if (welcomeMessage) {
            this.elements.messages.appendChild(welcomeMessage);
        }
        
        this.hideScrollIndicator();
        return true;
    }

    // Gerenciamento de scroll
    handleScroll() {
        const messages = this.elements.messages;
        const threshold = 50;
        
        this.isAtBottom = (
            messages.scrollTop + messages.clientHeight >= 
            messages.scrollHeight - threshold
        );
        
        if (this.isAtBottom) {
            this.hideScrollIndicator();
        }
    }

    scrollToBottom() {
        const messages = this.elements.messages;
        messages.scrollTop = messages.scrollHeight;
        this.isAtBottom = true;
        this.hideScrollIndicator();
    }

    updateNewMessagesIndicator() {
        if (!this.isAtBottom) {
            let count = parseInt(this.elements.newMessagesCount.textContent) || 0;
            count++;
            this.elements.newMessagesCount.textContent = count;
            this.showScrollIndicator();
        }
    }

    showScrollIndicator() {
        this.elements.scrollIndicator.classList.remove('hidden');
    }

    hideScrollIndicator() {
        this.elements.scrollIndicator.classList.add('hidden');
        this.elements.newMessagesCount.textContent = '0';
    }

    // Emoji picker
    toggleEmojiPicker() {
        this.elements.emojiPicker.classList.toggle('hidden');
    }

    hideEmojiPicker() {
        this.elements.emojiPicker.classList.add('hidden');
    }

    insertEmoji(emoji) {
        const input = this.elements.input;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        
        const newText = text.slice(0, start) + emoji + text.slice(end);
        
        if (newText.length <= this.options.maxMessageLength) {
            input.value = newText;
            input.setSelectionRange(start + emoji.length, start + emoji.length);
            input.focus();
            
            this.updateCharCounter();
            this.updateSendButton();
        }
        
        this.hideEmojiPicker();
    }

    // UI Updates
    updateCharCounter() {
        const count = this.elements.input.value.length;
        this.elements.charCount.textContent = count;
        
        // Mudar cor se próximo do limite
        const counter = this.elements.charCount.parentElement;
        if (count > this.options.maxMessageLength * 0.9) {
            counter.style.color = '#ef4444';
        } else if (count > this.options.maxMessageLength * 0.7) {
            counter.style.color = '#f59e0b';
        } else {
            counter.style.color = 'rgba(255, 255, 255, 0.6)';
        }
    }

    updateSendButton() {
        const hasText = this.elements.input.value.trim().length > 0;
        const isValid = this.elements.input.value.length <= this.options.maxMessageLength;
        
        this.elements.sendBtn.disabled = !hasText || !isValid;
    }

    // Configurações
    setCurrentUser(user) {
        this.currentUser = user;
        console.log('💬 Usuário atual do chat definido:', user);
    }

    setOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        
        // Atualizar maxlength do input
        this.elements.input.maxLength = this.options.maxMessageLength;
        
        // Atualizar contador
        const counter = this.elements.charCount.parentElement;
        counter.innerHTML = `<span id="charCount">0</span>/${this.options.maxMessageLength}`;
        this.elements.charCount = counter.querySelector('#charCount');
    }

    // Moderação (para futuras implementações)
    deleteMessage(messageId) {
        const messageElement = this.elements.messages.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                messageElement.remove();
            }, 300);
        }
        
        // Remover da lista
        this.messages = this.messages.filter(msg => msg.id !== messageId);
    }

    banUser(userId) {
        // Remover todas as mensagens do usuário
        const userMessages = this.elements.messages.querySelectorAll(`[data-user-id="${userId}"]`);
        userMessages.forEach(msg => {
            msg.style.opacity = '0.5';
            msg.querySelector('.message-text').textContent = '[Mensagem removida]';
        });
    }

    // Utilitários
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Sistema de eventos
    on(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        }
    }

    off(event, handler) {
        if (this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[event].splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Erro no handler do evento ${event}:`, error);
                }
            });
        }
    }

    // Cleanup
    destroy() {
        this.messages = [];
        this.eventHandlers = {};
        console.log('💬 Chat destruído');
    }

    // Getters
    get messageCount() {
        return this.messages.length;
    }

    get isInputFocused() {
        return document.activeElement === this.elements.input;
    }
}

// Exportar
window.Chat = Chat;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chat;
}