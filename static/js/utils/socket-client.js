/**
 * Streamhive - Cliente Socket.IO
 * Gerenciamento de conexões WebSocket
 */

class SocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentRoom = null;
        this.userRole = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        this.eventHandlers = {
            'connected': [],
            'disconnected': [],
            'room_joined': [],
            'room_left': [],
            'video_sync': [],
            'new_message': [],
            'user_joined': [],
            'user_left': [],
            'user_kicked': [],
            'room_deleted': [],
            'error': []
        };
    }

    connect() {
        if (this.socket && this.isConnected) {
            console.log('Socket já conectado');
            return;
        }

        try {
            // Inicializar socket.io
            this.socket = io({
                transports: ['websocket', 'polling'],
                timeout: 20000,
                forceNew: true
            });

            this.setupEventListeners();
            
            console.log('🔌 Conectando ao Socket.IO...');
            
        } catch (error) {
            console.error('Erro ao conectar socket:', error);
            this.handleConnectionError();
        }
    }

    setupEventListeners() {
        // Conexão estabelecida
        this.socket.on('connect', () => {
            console.log('✅ Socket conectado');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connected', { socket_id: this.socket.id });
        });

        // Confirmação de conexão do servidor
        this.socket.on('connected', (data) => {
            console.log('✅ Autenticado no servidor:', data);
            StreamhiveApp.toast.show(`Conectado como ${data.username}`, 'success');
        });

        // Desconexão
        this.socket.on('disconnect', (reason) => {
            console.log('❌ Socket desconectado:', reason);
            this.isConnected = false;
            
            if (reason === 'io server disconnect') {
                // Servidor desconectou - não reconectar automaticamente
                StreamhiveApp.toast.show('Desconectado do servidor', 'warning');
            } else {
                // Desconexão não intencional - tentar reconectar
                this.handleReconnection();
            }
            
            this.emit('disconnected', { reason });
        });

        // Estado da sala
        this.socket.on('room_state', (data) => {
            console.log('🏠 Estado da sala recebido:', data);
            this.currentRoom = data;
            this.userRole = data.user_role;
            this.emit('room_joined', data);
        });

        // Sincronização de vídeo
        this.socket.on('video_sync', (data) => {
            console.log('🎬 Sincronização de vídeo:', data);
            this.emit('video_sync', data);
        });

        // Nova mensagem do chat
        this.socket.on('new_message', (data) => {
            console.log('💬 Nova mensagem:', data);
            this.emit('new_message', data);
        });

        // Usuário entrou
        this.socket.on('user_joined', (data) => {
            console.log('👤 Usuário entrou:', data);
            StreamhiveApp.toast.show(`${data.username} entrou na sala`, 'info');
            this.emit('user_joined', data);
        });

        // Usuário saiu
        this.socket.on('user_left', (data) => {
            console.log('👤 Usuário saiu:', data);
            StreamhiveApp.toast.show(`${data.username} saiu da sala`, 'info');
            this.emit('user_left', data);
        });

        // Usuário expulso
        this.socket.on('user_kicked', (data) => {
            console.log('🚪 Usuário expulso:', data);
            StreamhiveApp.toast.show(data.message, 'warning');
            this.emit('user_kicked', data);
        });

        // Sala deletada
        this.socket.on('room_deleted', (data) => {
            console.log('🗑️ Sala deletada:', data);
            StreamhiveApp.toast.show(data.message, 'error');
            this.emit('room_deleted', data);
            
            // Redirecionar após delay
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 3000);
        });

        // Erros
        this.socket.on('error', (data) => {
            console.error('❌ Erro do socket:', data);
            StreamhiveApp.toast.show(data.message || 'Erro de conexão', 'error');
            this.emit('error', data);
        });

        // Erro de conexão
        this.socket.on('connect_error', (error) => {
            console.error('❌ Erro de conexão:', error);
            this.handleConnectionError();
        });
    }

    handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ Máximo de tentativas de reconexão atingido');
            StreamhiveApp.toast.show('Falha na reconexão. Recarregue a página.', 'error');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        
        console.log(`🔄 Tentando reconectar em ${delay}ms (tentativa ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, delay);
    }

    handleConnectionError() {
        console.error('❌ Erro de conexão do socket');
        this.isConnected = false;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.handleReconnection();
        }
    }

    // Métodos de sala
    joinRoom(roomId) {
        if (!this.isConnected) {
            console.warn('Socket não conectado');
            return false;
        }

        console.log(`🏠 Entrando na sala ${roomId}`);
        this.socket.emit('join_room', { room_id: roomId });
        return true;
    }

    leaveRoom(roomId) {
        if (!this.isConnected) {
            return false;
        }

        console.log(`🚪 Saindo da sala ${roomId}`);
        this.socket.emit('leave_room', { room_id: roomId });
        this.currentRoom = null;
        this.userRole = null;
        return true;
    }

    // Controles de vídeo
    sendVideoAction(roomId, action, data = {}) {
        if (!this.isConnected) {
            console.warn('Socket não conectado');
            return false;
        }

        if (this.userRole !== 'owner') {
            console.warn('Apenas o dono pode controlar o vídeo');
            return false;
        }

        console.log(`🎬 Enviando ação de vídeo: ${action}`);
        this.socket.emit('video_action', {
            room_id: roomId,
            action: action,
            ...data
        });
        return true;
    }

    // Chat
    sendMessage(roomId, message) {
        if (!this.isConnected) {
            console.warn('Socket não conectado');
            return false;
        }

        if (!message.trim()) {
            return false;
        }

        console.log('💬 Enviando mensagem');
        this.socket.emit('chat_message', {
            room_id: roomId,
            message: message.trim()
        });
        return true;
    }

    // Ações de moderação
    kickUser(roomId, userId) {
        if (!this.isConnected || this.userRole !== 'owner') {
            return false;
        }

        console.log(`🚪 Expulsando usuário ${userId}`);
        this.socket.emit('kick_user', {
            room_id: roomId,
            user_id: userId
        });
        return true;
    }

    deleteRoom(roomId) {
        if (!this.isConnected || this.userRole !== 'owner') {
            return false;
        }

        console.log(`🗑️ Deletando sala ${roomId}`);
        this.socket.emit('delete_room', {
            room_id: roomId
        });
        return true;
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
    disconnect() {
        if (this.socket) {
            console.log('🔌 Desconectando socket...');
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.currentRoom = null;
        this.userRole = null;
    }

    // Getters
    get connected() {
        return this.isConnected;
    }

    get room() {
        return this.currentRoom;
    }

    get role() {
        return this.userRole;
    }

    get isOwner() {
        return this.userRole === 'owner';
    }
}

// Instância global
window.SocketClient = SocketClient;

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocketClient;
}