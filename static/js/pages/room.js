/**
 * Streamhive - Sala de Streaming Completa
 * JavaScript para interface completa da sala com vídeo e chat
 */

class RoomPage {
    constructor() {
        this.roomData = window.roomData || {};
        this.currentUser = window.currentUser || {};
        
        // Componentes
        this.socketClient = null;
        this.videoPlayer = null;
        this.chat = null;
        
        // Estado
        this.participants = {};
        this.isConnected = false;
        this.isVideoLoaded = false;
        
        this.init();
    }

    init() {
        this.setupComponents();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupRoomCodeCopy();
        this.updateResponsiveLayout();
        
        // Conectar ao socket
        this.connectToRoom();
        
        console.log('🏠 Sala completa carregada:', this.roomData);
    }

    setupComponents() {
        // Inicializar Socket Client
        this.socketClient = new SocketClient();
        this.setupSocketEvents();
        
        // Inicializar Video Player
        this.videoPlayer = new VideoPlayer('#videoPlayerContainer', {
            controls: true,
            autoplay: false,
            muted: false
        });
        this.setupVideoEvents();
        
        // Inicializar Chat
        this.chat = new Chat('#chatContainer', {
            maxMessages: 100,
            autoScroll: true,
            showTimestamps: true,
            maxMessageLength: 500
        });
        this.setupChatEvents();
        
        // Configurar permissões
        this.videoPlayer.setOwner(this.roomData.isOwner);
        this.chat.setCurrentUser(this.currentUser);
    }

    setupSocketEvents() {
        // Conexão estabelecida
        this.socketClient.on('connected', () => {
            this.updateConnectionStatus('Conectado', true);
            this.joinSocketRoom();
        });

        // Desconectado
        this.socketClient.on('disconnected', () => {
            this.updateConnectionStatus('Desconectado', false);
        });

        // Entrou na sala
        this.socketClient.on('room_joined', (data) => {
            console.log('🏠 Entrou na sala:', data);
            this.handleRoomJoined(data);
        });

        // Sincronização de vídeo
        this.socketClient.on('video_sync', (data) => {
            console.log('🎬 Sincronização recebida:', data);
            this.videoPlayer.sync(data);
        });

        // Nova mensagem do chat
        this.socketClient.on('new_message', (data) => {
            this.chat.receiveMessage(data);
        });

        // Usuário entrou
        this.socketClient.on('user_joined', (data) => {
            this.addParticipant(data);
            this.updateParticipantsCount();
        });

        // Usuário saiu
        this.socketClient.on('user_left', (data) => {
            this.removeParticipant(data.user_id);
            this.updateParticipantsCount();
        });

        // Usuário expulso
        this.socketClient.on('user_kicked', (data) => {
            this.removeParticipant(data.user_id);
            this.updateParticipantsCount();
            
            // Se foi o usuário atual que foi expulso
            if (data.user_id === this.currentUser.id) {
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
            }
        });

        // Sala deletada
        this.socketClient.on('room_deleted', (data) => {
            // Redirecionar será feito automaticamente pelo socket client
        });

        // Erros
        this.socketClient.on('error', (data) => {
            console.error('❌ Erro do socket:', data);
        });
    }

    setupVideoEvents() {
        // Controles do owner
        if (this.roomData.isOwner) {
            this.videoPlayer.on('play', (data) => {
                this.socketClient.sendVideoAction(this.roomData.id, 'play', data);
            });

            this.videoPlayer.on('pause', (data) => {
                this.socketClient.sendVideoAction(this.roomData.id, 'pause', data);
            });

            this.videoPlayer.on('seeked', (data) => {
                this.socketClient.sendVideoAction(this.roomData.id, 'seek', { time: data.currentTime });
            });
        }

        // Eventos gerais
        this.videoPlayer.on('loadedmetadata', (data) => {
            console.log('🎬 Vídeo carregado:', data);
            this.isVideoLoaded = true;
        });

        this.videoPlayer.on('error', (data) => {
            console.error('🎬 Erro no vídeo:', data);
            StreamhiveApp.toast.show('Erro ao carregar vídeo', 'error');
        });
    }

    setupChatEvents() {
        // Enviar mensagem
        this.chat.on('message_sent', (data) => {
            this.socketClient.sendMessage(this.roomData.id, data.message);
        });

        // Mensagem recebida
        this.chat.on('message_received', (data) => {
            // Aqui podemos adicionar lógica adicional se necessário
        });
    }

    setupEventListeners() {
        // Botões de controle da sala (owner)
        if (this.roomData.isOwner) {
            const shareBtn = document.getElementById('shareRoomBtn');
            const manageUsersBtn = document.getElementById('manageUsersBtn');
            const deleteRoomBtn = document.getElementById('deleteRoomBtn');

            if (shareBtn) {
                shareBtn.addEventListener('click', () => this.shareRoom());
            }

            if (manageUsersBtn) {
                manageUsersBtn.addEventListener('click', () => this.toggleUserManagement());
            }

            if (deleteRoomBtn) {
                deleteRoomBtn.addEventListener('click', () => this.confirmDeleteRoom());
            }
        }

        // Redimensionamento da janela
        window.addEventListener('resize', () => {
            this.updateResponsiveLayout();
        });

        // Sair da página
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Visibilidade da página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 Página oculta');
            } else {
                console.log('📱 Página visível');
                // Reconectar se necessário
                if (!this.isConnected) {
                    this.connectToRoom();
                }
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Não interceptar se estiver digitando no chat
            if (this.chat && this.chat.isInputFocused) {
                return;
            }

            // Não interceptar em inputs/textareas
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.code) {
                case 'Escape':
                    e.preventDefault();
                    this.confirmLeaveRoom();
                    break;
                
                case 'KeyC':
                    if ((e.ctrlKey || e.metaKey) && this.roomData.isPrivate) {
                        e.preventDefault();
                        this.copyRoomCode();
                    }
                    break;
                
                case 'Space':
                    if (this.roomData.isOwner) {
                        e.preventDefault();
                        this.videoPlayer.togglePlayPause();
                    }
                    break;
                
                case 'KeyM':
                    e.preventDefault();
                    this.videoPlayer.toggleMute();
                    break;
                
                case 'KeyF':
                    e.preventDefault();
                    this.videoPlayer.toggleFullscreen();
                    break;
                
                case 'ArrowLeft':
                    if (this.roomData.isOwner) {
                        e.preventDefault();
                        this.videoPlayer.seek(this.videoPlayer.currentTime - 10);
                    }
                    break;
                
                case 'ArrowRight':
                    if (this.roomData.isOwner) {
                        e.preventDefault();
                        this.videoPlayer.seek(this.videoPlayer.currentTime + 10);
                    }
                    break;
                
                case 'ArrowUp':
                    e.preventDefault();
                    this.videoPlayer.setVolume(Math.min(1, this.videoPlayer.volume + 0.1));
                    break;
                
                case 'ArrowDown':
                    e.preventDefault();
                    this.videoPlayer.setVolume(Math.max(0, this.videoPlayer.volume - 0.1));
                    break;
                
                case 'Enter':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (this.chat) {
                            this.chat.elements.input.focus();
                        }
                    }
                    break;
            }
        });
    }

    setupRoomCodeCopy() {
        const roomCodeDisplay = document.getElementById('roomCodeDisplay');
        if (roomCodeDisplay && this.roomData.roomCode) {
            roomCodeDisplay.addEventListener('click', () => {
                this.copyRoomCode();
            });
        }
    }

    // Conexão e sala
    connectToRoom() {
        if (!this.socketClient.connected) {
            this.updateConnectionStatus('Conectando...', false);
            this.socketClient.connect();
        }
    }

    joinSocketRoom() {
        const success = this.socketClient.joinRoom(this.roomData.id);
        if (!success) {
            StreamhiveApp.toast.show('Erro ao entrar na sala', 'error');
        }
    }

    handleRoomJoined(data) {
        this.isConnected = true;
        this.updateConnectionStatus('Conectado', true);

        // Carregar vídeo
        if (data.video_url) {
            this.videoPlayer.loadVideo(data.video_url);
        }

        // Carregar participantes
        this.participants = data.participants || {};
        this.updateParticipantsList();
        this.updateParticipantsCount();

        // Carregar mensagens do chat
        if (data.chat_messages) {
            this.chat.loadMessages(data.chat_messages);
        }

        // Sincronizar vídeo se necessário - aguardar vídeo carregar
        if (data.is_playing || data.current_time > 0) {
            // Aguardar o vídeo carregar antes de sincronizar
            const syncVideo = () => {
                if (this.isVideoLoaded) {
                    this.videoPlayer.sync({
                        action: data.is_playing ? 'play' : 'pause',
                        current_time: data.current_time,
                        is_playing: data.is_playing,
                        timestamp: data.timestamp
                    });
                } else {
                    // Tentar novamente em 100ms
                    setTimeout(syncVideo, 100);
                }
            };
            
            // Iniciar sincronização após pequeno delay
            setTimeout(syncVideo, 200);
        }
    }
    // Gerenciamento de participantes
    addParticipant(data) {
        this.participants[data.user_id] = {
            username: data.username,
            role: data.role,
            joined_at: Date.now() / 1000
        };
        this.updateParticipantsList();
    }

    removeParticipant(userId) {
        if (this.participants[userId]) {
            delete this.participants[userId];
            this.updateParticipantsList();
        }
    }

    updateParticipantsList() {
        const lists = [
            document.getElementById('participantsList'),
            document.getElementById('participantsListDesktop')
        ];

        lists.forEach(list => {
            if (!list) return;

            list.innerHTML = '';

            Object.entries(this.participants).forEach(([userId, participant]) => {
                const item = document.createElement('div');
                item.className = 'participant-item';
                item.dataset.userId = userId;

                const isCurrentUser = userId === this.currentUser.id;
                const canKick = this.roomData.isOwner && !isCurrentUser && participant.role !== 'owner';

                item.innerHTML = `
                    <div class="participant-avatar">
                        ${participant.username.charAt(0).toUpperCase()}
                    </div>
                    <div class="participant-info">
                        <div class="participant-name">
                            ${this.escapeHtml(participant.username)}
                            ${isCurrentUser ? ' (Você)' : ''}
                        </div>
                        <div class="participant-role">
                            ${this.getRoleDisplay(participant.role)}
                        </div>
                    </div>
                    ${canKick ? `
                        <div class="participant-actions">
                            <button class="participant-btn danger" onclick="roomPage.kickUser('${userId}')">
                                🚪
                            </button>
                        </div>
                    ` : ''}
                `;

                list.appendChild(item);
            });
        });
    }

    updateParticipantsCount() {
        const count = Object.keys(this.participants).length;
        const maxCount = this.roomData.maxParticipants;
        const countText = `${count}/${maxCount}`;

        // Atualizar todos os contadores
        const counters = [
            document.getElementById('participantsCount'),
            document.getElementById('participantsCountBadge'),
            document.getElementById('participantsCountBadgeDesktop')
        ];

        counters.forEach(counter => {
            if (counter) {
                if (counter.id === 'participantsCount') {
                    counter.textContent = `${countText} participantes`;
                } else {
                    counter.textContent = count.toString();
                }
            }
        });
    }

    updateConnectionStatus(status, isConnected) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;

        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('span');

        this.isConnected = isConnected;

        if (text) text.textContent = status;

        if (isConnected) {
            statusElement.style.background = 'rgba(34, 197, 94, 0.1)';
            statusElement.style.borderColor = 'rgba(34, 197, 94, 0.3)';
            statusElement.style.color = '#22c55e';
            if (dot) dot.style.background = '#22c55e';
        } else {
            statusElement.style.background = 'rgba(239, 68, 68, 0.1)';
            statusElement.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            statusElement.style.color = '#ef4444';
            if (dot) dot.style.background = '#ef4444';
        }
    }

    // Ações da sala
    async shareRoom() {
        const shareData = {
            title: `Sala: ${this.roomData.name}`,
            text: `Junte-se a mim na sala "${this.roomData.name}" no Streamhive!`,
            url: window.location.href
        };

        // Adicionar código da sala se for privada
        if (this.roomData.isPrivate && this.roomData.roomCode) {
            shareData.text += `\n\nCódigo da sala: ${this.roomData.roomCode}`;
        }

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                StreamhiveApp.toast.show('📤 Sala compartilhada!', 'success');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    this.fallbackShare(shareData);
                }
            }
        } else {
            this.fallbackShare(shareData);
        }
    }

    fallbackShare(shareData) {
        const shareText = this.roomData.isPrivate && this.roomData.roomCode 
            ? `${shareData.text}\n\n${shareData.url}`
            : shareData.url;

        const success = StreamhiveApp.utils.copyToClipboard(shareText);
        if (success) {
            StreamhiveApp.toast.show('🔗 Link da sala copiado!', 'success');
        } else {
            StreamhiveApp.toast.show('❌ Erro ao compartilhar', 'error');
        }
    }

    async copyRoomCode() {
        if (!this.roomData.roomCode) return;

        const success = await StreamhiveApp.utils.copyToClipboard(this.roomData.roomCode);
        if (success) {
            StreamhiveApp.toast.show('📋 Código da sala copiado!', 'success');
        } else {
            StreamhiveApp.toast.show('❌ Erro ao copiar código', 'error');
        }
    }

    toggleUserManagement() {
        // Implementar painel de gerenciamento futuro
        StreamhiveApp.toast.show('🛠️ Painel de gerenciamento em breve!', 'info');
    }

    kickUser(userId) {
        const participant = this.participants[userId];
        if (!participant) return;

        if (confirm(`Tem certeza que deseja expulsar ${participant.username}?`)) {
            const success = this.socketClient.kickUser(this.roomData.id, userId);
            if (!success) {
                StreamhiveApp.toast.show('Erro ao expulsar usuário', 'error');
            }
        }
    }

    confirmDeleteRoom() {
        const confirmText = `Tem certeza que deseja ENCERRAR a sala "${this.roomData.name}"?\n\nTodos os participantes serão removidos e a sala será deletada permanentemente.`;
        
        if (confirm(confirmText)) {
            const success = this.socketClient.deleteRoom(this.roomData.id);
            if (!success) {
                StreamhiveApp.toast.show('Erro ao encerrar sala', 'error');
            }
        }
    }

    confirmLeaveRoom() {
        if (this.roomData.isOwner) {
            this.confirmDeleteRoom();
        } else {
            if (confirm('Tem certeza que deseja sair desta sala?')) {
                this.leaveRoom();
            }
        }
    }

    leaveRoom() {
        try {
            this.socketClient.leaveRoom(this.roomData.id);
            window.location.href = '/dashboard';
        } catch (error) {
            console.error('Erro ao sair da sala:', error);
            window.location.href = '/dashboard';
        }
    }

    // Layout responsivo
    updateResponsiveLayout() {
        const isMobile = window.innerWidth <= 1024;
        const mobilePanel = document.getElementById('participantsPanelMobile');
        const desktopPanel = document.getElementById('participantsPanelDesktop');

        if (mobilePanel && desktopPanel) {
            if (isMobile) {
                mobilePanel.style.display = 'block';
                desktopPanel.style.display = 'none';
            } else {
                mobilePanel.style.display = 'none';
                desktopPanel.style.display = 'block';
            }
        }
    }

    // Utilitários
    getRoleDisplay(role) {
        const roles = {
            'owner': '👑 Proprietário',
            'moderator': '🛡️ Moderador',
            'participant': '👤 Participante'
        };
        return roles[role] || '👤 Participante';
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
    }

    // Cleanup
    cleanup() {
        if (this.socketClient) {
            this.socketClient.disconnect();
        }

        if (this.videoPlayer) {
            this.videoPlayer.destroy();
        }

        if (this.chat) {
            this.chat.destroy();
        }

        console.log('🏠 Sala desconectada e limpa');
    }

    // Getters
    get isOwner() {
        return this.roomData.isOwner;
    }

    get participantCount() {
        return Object.keys(this.participants).length;
    }
}

// Instância global
let roomPage;

// Função global para compatibilidade
function showComingSoon() {
    StreamhiveApp.toast.show('🚧 Funcionalidade em desenvolvimento!', 'info');
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        roomPage = new RoomPage();
        window.roomPage = roomPage; // Para debug e acesso global
    });
} else {
    roomPage = new RoomPage();
    window.roomPage = roomPage;
}

// Cleanup quando sair da página
window.addEventListener('beforeunload', () => {
    if (roomPage) {
        roomPage.cleanup();
    }
});