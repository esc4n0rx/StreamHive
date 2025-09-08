/**
 * Streamhive - Sala de Streaming Completa
 * JavaScript para interface completa da sala com vídeo e chat
 */
class RoomPage {
    constructor() {
        this.roomData = window.roomData || {};
        this.currentUser = window.currentUser || {};Preciso

        this.elements = {
            fabChat: document.getElementById('fabChat'),
            chatNotificationBadge: document.getElementById('chatNotificationBadge'),
            participantsBtn: document.getElementById('participantsBtn'),
            participantsCountBadge: document.getElementById('participantsCountBadge'),
            shareBtn: document.getElementById('shareRoomBtn'),
            manageUsersBtn: document.getElementById('manageUsersBtn'),
            deleteRoomBtn: document.getElementById('deleteRoomBtn'),
        };
        
        this.socketClient = null;
        this.videoPlayer = null;
        this.chat = null;
        
        this.participants = {};
        this.isConnected = false;
        this.isVideoLoaded = false;
        this.isChatOpen = false;
        this.chatNotifications = 0;
        
        this.init();
    }

    init() {
        this.setupComponents();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupRoomCodeCopy();
        this.updateResponsiveLayout();
        
        this.connectToRoom();
    ;
    }

    setupComponents() {

        this.socketClient = new SocketClient();
        this.setupSocketEvents();
        

        this.videoPlayer = new VideoPlayer('#videoPlayerContainer', {
            controls: true,
            autoplay: false,
            muted: false
        });
        this.setupVideoEvents();
        
        this.chat = new Chat('#chatModalContainer', {
            maxMessages: 100,
            autoScroll: true,
            showTimestamps: true,
            maxMessageLength: 500
        });
        this.setupChatEvents();
        
        this.videoPlayer.setOwner(this.roomData.isOwner);
        this.chat.setCurrentUser(this.currentUser);
    }

    setupSocketEvents() {
        this.socketClient.on('connected', () => {
            this.updateConnectionStatus('Conectado', true);
            this.joinSocketRoom();
        });

        this.socketClient.on('netflix_sync', (data) => {
            if (!this.roomData.isOwner && this.videoPlayer) {
                this.videoPlayer.syncNetflix(data);
            }
        });

        this.socketClient.on('disconnected', () => {
            this.updateConnectionStatus('Desconectado', false);
        });

        this.socketClient.on('room_joined', (data) => {
            this.handleRoomJoined(data);
        });

        this.socketClient.on('video_sync', (data) => {
            this.videoPlayer.sync(data);
        });

        this.socketClient.on('new_message', (data) => {
            this.chat.receiveMessage(data);
            if (!this.isChatOpen) {
                this.chatNotifications++;
                this.updateChatNotificationBadge();
            }
        });

        this.socketClient.on('user_joined', (data) => {
            this.addParticipant(data);
            this.updateParticipantsCount();
        });

        this.socketClient.on('user_left', (data) => {
            this.removeParticipant(data.user_id);
            this.updateParticipantsCount();
        });

        this.socketClient.on('user_kicked', (data) => {
            this.removeParticipant(data.user_id);
            this.updateParticipantsCount();
            
            if (data.user_id === this.currentUser.id) {
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
            }
        });

        this.socketClient.on('room_deleted', (data) => {
        });

        this.socketClient.on('error', (data) => {
            console.error('❌ Erro do socket:', data);
        });
    }

    openParticipantsModal() {
        StreamhiveApp.modal.open('participantsModal');
    }

    openChatModal() {
        this.isChatOpen = true;
        this.chatNotifications = 0;
        this.updateChatNotificationBadge();
        StreamhiveApp.modal.open('chatModal');
        
        const modalElement = document.getElementById('chatModal');
        const observer = new MutationObserver(() => {
            if (modalElement.classList.contains('hidden')) {
                this.isChatOpen = false;
                observer.disconnect();
            }
        });
        observer.observe(modalElement, { attributes: true, attributeFilter: ['class'] });
    }
    
    updateChatNotificationBadge() {
        const badge = this.elements.chatNotificationBadge;
        if (this.chatNotifications > 0) {
            badge.textContent = this.chatNotifications > 9 ? '9+' : this.chatNotifications;
            badge.classList.add('visible');
        } else {
            badge.classList.remove('visible');
        }
    }


    setupVideoEvents() {
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

        this.videoPlayer.on('netflix_navigation', (data) => {
            if (this.roomData.isOwner) {
                this.socketClient.sendNetflixSync(this.roomData.id, data);
            }
        });

        this.videoPlayer.on('loadedmetadata', (data) => {
        this.isVideoLoaded = true;
        
        if (data.type === 'netflix') {
        }
    });

        this.videoPlayer.on('error', (data) => {
            console.error('🎬 Erro no vídeo:', data);
            StreamhiveApp.toast.show('Erro ao carregar vídeo', 'error');
        });
    }

    setupChatEvents() {
        this.chat.on('message_sent', (data) => {
            this.socketClient.sendMessage(this.roomData.id, data.message);
        });

        this.chat.on('message_received', (data) => {
        });
    }

    setupEventListeners() {

        if (this.elements.participantsBtn) {
            this.elements.participantsBtn.addEventListener('click', () => this.openParticipantsModal());
        }
        if (this.elements.shareBtn) {
            this.elements.shareBtn.addEventListener('click', () => this.shareRoom());
        }

         if (this.elements.fabChat) {
            this.elements.fabChat.addEventListener('click', () => this.openChatModal());
        }


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
        window.addEventListener('resize', () => {
            this.updateResponsiveLayout();
        });

        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
            } else {
                if (!this.isConnected) {
                    this.connectToRoom();
                }
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (this.chat && this.chat.isInputFocused) {
                return;
            }
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
        if (data.video_url) {
            this.videoPlayer.loadVideo(data.video_url);
        }

        this.participants = data.participants || {};
        this.updateParticipantsList();
        this.updateParticipantsCount();

        if (data.chat_messages) {
            this.chat.loadMessages(data.chat_messages);
        }
        if (data.is_playing || data.current_time > 0) {
            const syncVideo = () => {
                if (this.isVideoLoaded) {
                    this.videoPlayer.sync({
                        action: data.is_playing ? 'play' : 'pause',
                        current_time: data.current_time,
                        is_playing: data.is_playing,
                        timestamp: data.timestamp
                    });
                } else {
                    setTimeout(syncVideo, 100);
                }
            };
            
            setTimeout(syncVideo, 200);
        }
    }
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
        const list = document.getElementById('participantsModalList');
        if (!list) return;

        list.innerHTML = '';

        Object.entries(this.participants).forEach(([userId, participant]) => {
            const item = document.createElement('div');
            item.className = 'participant-item';
            item.dataset.userId = userId;

            const isCurrentUser = String(userId) === String(this.currentUser.id);
            const canKick = this.roomData.isOwner && !isCurrentUser && participant.role !== 'owner';

            item.innerHTML = `
                <div class="participant-avatar">${participant.username.charAt(0).toUpperCase()}</div>
                <div class="participant-info">
                    <div class="participant-name">
                        ${this.escapeHtml(participant.username)} ${isCurrentUser ? ' (Você)' : ''}
                    </div>
                    <div class="participant-role">${this.getRoleDisplay(participant.role)}</div>
                </div>
                ${canKick ? `<div class="participant-actions">
                                <button class="participant-btn danger" onclick="roomPage.kickUser('${userId}')">Expulsar</button>
                            </div>` : ''}
            `;
            list.appendChild(item);
        });
    }


    updateParticipantsCount() {
        const count = Object.keys(this.participants).length;
        if (this.elements.participantsCountBadge) {
            this.elements.participantsCountBadge.textContent = count;
        }
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

    async shareRoom() {
        const shareData = {
            title: `Sala: ${this.roomData.name}`,
            text: `Junte-se a mim na sala "${this.roomData.name}" no Streamhive!`,
            url: window.location.href
        };

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
    }

    get isOwner() {
        return this.roomData.isOwner;
    }

    get participantCount() {
        return Object.keys(this.participants).length;
    }
}


let roomPage;

function showComingSoon() {
    StreamhiveApp.toast.show('🚧 Funcionalidade em desenvolvimento!', 'info');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        roomPage = new RoomPage();
        window.roomPage = roomPage; 
    });
} else {
    roomPage = new RoomPage();
    window.roomPage = roomPage;
}

window.addEventListener('beforeunload', () => {
    if (roomPage) {
        roomPage.cleanup();
    }
});