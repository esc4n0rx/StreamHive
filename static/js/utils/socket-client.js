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
            
        } catch (error) {
            console.error('Erro ao conectar socket:', error);
            this.handleConnectionError();
        }
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connected', { socket_id: this.socket.id });
        });

        this.socket.on('connected', (data) => {
            StreamhiveApp.toast.show(`Conectado como ${data.username}`, 'success');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Socket desconectado:', reason);
            this.isConnected = false;
            
            if (reason === 'io server disconnect') {
                StreamhiveApp.toast.show('Desconectado do servidor', 'warning');
            } else {
                this.handleReconnection();
            }
            
            this.emit('disconnected', { reason });
        });

        this.socket.on('room_state', (data) => {
            this.currentRoom = data;
            this.userRole = data.user_role;
            this.emit('room_joined', data);
        });

        this.socket.on('video_sync', (data) => {
            this.emit('video_sync', data);
        });

        this.socket.on('new_message', (data) => {
            this.emit('new_message', data);
        });

        this.socket.on('user_joined', (data) => {
            StreamhiveApp.toast.show(`${data.username} entrou na sala`, 'info');
            this.emit('user_joined', data);
        });

        this.socket.on('user_left', (data) => {
            StreamhiveApp.toast.show(`${data.username} saiu da sala`, 'info');
            this.emit('user_left', data);
        });

        this.socket.on('user_kicked', (data) => {
            StreamhiveApp.toast.show(data.message, 'warning');
            this.emit('user_kicked', data);
        });

        this.socket.on('room_deleted', (data) => {
            StreamhiveApp.toast.show(data.message, 'error');
            this.emit('room_deleted', data);
            
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 3000);
        });

        this.socket.on('error', (data) => {
            StreamhiveApp.toast.show(data.message || 'Erro de conexão', 'error');
            this.emit('error', data);
        });

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

    joinRoom(roomId) {
        if (!this.isConnected) {
            console.warn('Socket não conectado');
            return false;
        }
        this.socket.emit('join_room', { room_id: roomId });
        return true;
    }

    leaveRoom(roomId) {
        if (!this.isConnected) {
            return false;
        }
        this.socket.emit('leave_room', { room_id: roomId });
        this.currentRoom = null;
        this.userRole = null;
        return true;
    }

    sendNetflixSync(roomId, data) {
        if (this.connected && this.socket) {
            this.socket.emit('netflix_sync', {
                room_id: roomId,
                ...data
            });
            return true;
        }
        return false;
    }

    sendVideoAction(roomId, action, data = {}) {
        if (!this.isConnected) {
            console.warn('Socket não conectado');
            return false;
        }

        if (this.userRole !== 'owner') {
            StreamhiveApp.toast.show('Apenas o dono pode controlar o vídeo.', 'error');
            return false;
        }

        this.socket.emit('video_action', {
            room_id: roomId,
            action: action,
            ...data
        });
        return true;
    }

    sendMessage(roomId, message) {
        if (!this.isConnected) {
            console.warn('Socket não conectado');
            return false;
        }

        if (!message.trim()) {
            return false;
        }

        this.socket.emit('chat_message', {
            room_id: roomId,
            message: message.trim()
        });
        return true;
    }

    kickUser(roomId, userId) {
        if (!this.isConnected || this.userRole !== 'owner') {
            return false;
        }

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

        this.socket.emit('delete_room', {
            room_id: roomId
        });
        return true;
    }

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

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.currentRoom = null;
        this.userRole = null;
    }

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


window.SocketClient = SocketClient;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocketClient;
}