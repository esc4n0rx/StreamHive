/**
 * Streamhive - Dashboard
 * JavaScript específico para o dashboard
 */

class DashboardPage {
    constructor() {
        this.currentPage = 1;
        this.loadingMore = false;
        
        // Provider selection properties
        this.selectedProvider = null;
        this.providerCards = null;
        this.providerSection = null;
        this.configSection = null;
        this.urlSection = null;
        this.netflixNotice = null;
        this.backBtn = null;
        
        this.elements = {
            createRoomBtn: document.getElementById('createRoomBtn'),
            joinPrivateRoomBtn: document.getElementById('joinPrivateRoomBtn'),
            loadMoreRoomsBtn: document.getElementById('loadMoreRoomsBtn'),
            
            createRoomModal: document.getElementById('createRoomModal'),
            joinPrivateRoomModal: document.getElementById('joinPrivateRoomModal'),
            
            closeCreateRoomModal: document.getElementById('closeCreateRoomModal'),
            closeJoinPrivateRoomModal: document.getElementById('closeJoinPrivateRoomModal'),
            
            createRoomForm: document.getElementById('createRoomForm'),
            joinPrivateRoomForm: document.getElementById('joinPrivateRoomForm'),
            
            publicRoomsGrid: document.getElementById('publicRoomsGrid')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupProviderSelection();
        this.setupFormValidation();
        this.setupAutoRefresh();
        this.animateCards();
        this.updateStats();
        
        console.log('📊 Dashboard inicializado');
    }

    setupEventListeners() {
        // Botões principais
        this.elements.createRoomBtn?.addEventListener('click', () => {
            this.resetModal();
            StreamhiveApp.modal.open('createRoomModal');
        });
        this.elements.joinPrivateRoomBtn?.addEventListener('click', () => StreamhiveApp.modal.open('joinPrivateRoomModal'));
        
        // Botões para fechar modais
        this.elements.closeCreateRoomModal?.addEventListener('click', () => {
            this.resetModal();
            StreamhiveApp.modal.close('createRoomModal');
        });
        this.elements.closeJoinPrivateRoomModal?.addEventListener('click', () => StreamhiveApp.modal.close('joinPrivateRoomModal'));
        
        // Forms
        this.elements.createRoomForm?.addEventListener('submit', this.handleCreateRoom.bind(this));
        this.elements.joinPrivateRoomForm?.addEventListener('submit', this.handleJoinPrivateRoom.bind(this));
        
        // Botão carregar mais
        this.elements.loadMoreRoomsBtn?.addEventListener('click', this.loadMoreRooms.bind(this));
        
        // Botões de entrar em sala
        document.querySelectorAll('.join-room-btn').forEach(btn => {
            btn.addEventListener('click', this.handleJoinPublicRoom.bind(this));
        });
    }

    setupProviderSelection() {
        this.providerCards = document.querySelectorAll('.provider-card');
        this.providerSection = document.getElementById('providerSelection');
        this.configSection = document.getElementById('roomConfiguration');
        this.urlSection = document.getElementById('urlSection');
        this.netflixNotice = document.getElementById('netflixNotice');
        this.backBtn = document.getElementById('backToProvider');
        
        // Event listeners para cards
        this.providerCards.forEach(card => {
            card.addEventListener('click', (e) => this.selectProvider(e));
        });
        
        // Event listener para voltar
        if (this.backBtn) {
            this.backBtn.addEventListener('click', () => this.goBackToProvider());
        }
    }
    
    selectProvider(e) {
        const card = e.currentTarget;
        const provider = card.dataset.provider;
        
        // Se for Netflix, mostrar aviso e não prosseguir
        // if (provider === 'netflix') {
        //     toast.show('Netflix ainda não está disponível. Em breve!', 'warning');
        //     return;
        // }
        
        // Remover seleção anterior
        this.providerCards.forEach(c => c.classList.remove('selected'));
        
        // Adicionar seleção atual
        card.classList.add('selected');
        this.selectedProvider = provider;


         if (provider === 'netflix') {
        // Netflix: esconder URL, mostrar aviso informativo
        this.urlSection.classList.add('hidden');
        this.netflixNotice.classList.remove('hidden');
        this.netflixNotice.innerHTML = `
            <div class="netflix-info-notice">
                <div class="netflix-info-icon">🎬</div>
                <h3 class="netflix-info-title">Netflix Integrado</h3>
                <p class="netflix-info-text">
                    Sua sala será criada com acesso direto ao Netflix. 
                    Você poderá fazer login e navegar normalmente, enquanto seus amigos assistem em tempo real.
                </p>
            </div>
        `;
    } else {
        // Outros providers: mostrar URL, esconder Netflix notice
        this.urlSection.classList.remove('hidden');
        this.netflixNotice.classList.add('hidden');
    }
        
        // Aguardar animação e mostrar configuração
        setTimeout(() => {
            this.showConfiguration(provider);
        }, 300);
    }
    
    showConfiguration(provider) {
        // Esconder seleção de provider
        this.providerSection.classList.add('hidden');
        
        // Configurar campos baseado no provider
        this.configureForProvider(provider);
        
        // Mostrar configuração
        setTimeout(() => {
            this.configSection.classList.remove('hidden');
            
            // Focar no primeiro campo
            const firstInput = this.configSection.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        }, 150);
    }
    
    configureForProvider(provider) {
        const streamUrlField = document.getElementById('streamUrl');
        const urlLabel = this.urlSection.querySelector('.form-label');
        
        switch (provider) {
            case 'netflix':
                // Ocultar URL e mostrar notice
                this.urlSection.classList.add('hidden');
                this.netflixNotice.classList.remove('hidden');
                if (streamUrlField) {
                    streamUrlField.removeAttribute('required');
                    streamUrlField.value = 'netflix://placeholder';
                }
                break;
                
            case 'youtube':
                // Mostrar URL com label específico
                this.urlSection.classList.remove('hidden');
                this.netflixNotice.classList.add('hidden');
                if (urlLabel) {
                    urlLabel.textContent = 'URL do YouTube *';
                }
                if (streamUrlField) {
                    streamUrlField.setAttribute('required', '');
                    streamUrlField.placeholder = 'https://youtube.com/watch?v=...';
                    streamUrlField.value = '';
                }
                break;
                
            case 'external':
                // Mostrar URL com label genérico
                this.urlSection.classList.remove('hidden');
                this.netflixNotice.classList.add('hidden');
                if (urlLabel) {
                    urlLabel.textContent = 'URL de Transmissão *';
                }
                if (streamUrlField) {
                    streamUrlField.setAttribute('required', '');
                    streamUrlField.placeholder = 'https://exemplo.com/video.mp4';
                    streamUrlField.value = '';
                }
                break;
        }
    }
    
    goBackToProvider() {
        // Esconder configuração
        this.configSection.classList.add('hidden');
        
        // Mostrar seleção de provider
        setTimeout(() => {
            this.providerSection.classList.remove('hidden');
        }, 150);
    }
    
    resetModal() {
        // Resetar seleção
        this.selectedProvider = null;
        if (this.providerCards) {
            this.providerCards.forEach(card => card.classList.remove('selected'));
        }
        
        // Mostrar seleção e esconder configuração
        if (this.providerSection) {
            this.providerSection.classList.remove('hidden');
        }
        if (this.configSection) {
            this.configSection.classList.add('hidden');
        }
        
        // Limpar form
        const form = document.getElementById('createRoomForm');
        if (form) {
            form.reset();
            const maxParticipants = document.getElementById('maxParticipants');
            if (maxParticipants) {
                maxParticipants.value = '10';
            }
        }
    }

    setupFormValidation() {
        // Validação para nome da sala
        const roomNameInput = document.getElementById('roomName');
        if (roomNameInput) {
            roomNameInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                
                if (value.length >= 3 && value.length <= 100) {
                    e.target.classList.add('valid');
                    e.target.classList.remove('invalid');
                } else if (value.length > 0) {
                    e.target.classList.add('invalid');
                    e.target.classList.remove('valid');
                } else {
                    e.target.classList.remove('valid', 'invalid');
                }
            });
        }

        // Validação para URL de stream
        const streamUrlInput = document.getElementById('streamUrl');
        if (streamUrlInput) {
            streamUrlInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                const urlPattern = /^https?:\/\/.+/;
                
                if (urlPattern.test(value)) {
                    e.target.classList.add('valid');
                    e.target.classList.remove('invalid');
                } else if (value.length > 0) {
                    e.target.classList.add('invalid');
                    e.target.classList.remove('valid');
                } else {
                    e.target.classList.remove('valid', 'invalid');
                }
            });
        }

        // Validação para código de sala
        const roomCodeInput = document.getElementById('roomCode');
        if (roomCodeInput) {
            roomCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                
                if (e.target.value.length === 8) {
                    e.target.classList.add('valid');
                    e.target.classList.remove('invalid');
                } else if (e.target.value.length > 0) {
                    e.target.classList.add('invalid');
                    e.target.classList.remove('valid');
                } else {
                    e.target.classList.remove('valid', 'invalid');
                }
            });
        }

        // Contador de caracteres para descrição
        const descriptionInput = document.getElementById('roomDescription');
        if (descriptionInput) {
            const charCounter = document.createElement('div');
            charCounter.className = 'char-counter';
            charCounter.textContent = '0/500';
            
            descriptionInput.parentNode.appendChild(charCounter);
            
            descriptionInput.addEventListener('input', (e) => {
                const length = e.target.value.length;
                charCounter.textContent = `${length}/500`;
                
                if (length > 500) {
                    charCounter.style.color = 'var(--error-color)';
                    e.target.classList.add('invalid');
                } else {
                    charCounter.style.color = 'rgba(255, 255, 255, 0.6)';
                    e.target.classList.remove('invalid');
                }
            });
        }
    }

    setupAutoRefresh() {
        // Atualizar dados das salas a cada 30 segundos
        setInterval(() => {
            this.updateRoomStates();
        }, 30000);
    }

    updateRoomStates() {
        // Atualizar estados das salas existentes
        const roomCards = document.querySelectorAll('.room-card');
        
        roomCards.forEach(card => {
            const participantCount = card.querySelector('.participant-count');
            const maxParticipants = card.querySelector('.max-participants');
            const joinBtn = card.querySelector('.btn');
            
            if (participantCount && maxParticipants && joinBtn) {
                const current = parseInt(participantCount.textContent) || 0;
                const max = parseInt(maxParticipants.textContent) || 0;
                
                // Atualizar texto do botão baseado na lotação
                joinBtn.textContent = current >= max ? 'Lotada' : 'Entrar';
                joinBtn.disabled = current >= max;
            }
        });
    }

    async handleCreateRoom(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('createRoomSubmitBtn');
        
        // Verificar se estamos na tela de seleção
        if (!this.selectedProvider) {
            toast.show('Selecione uma plataforma de streaming primeiro', 'warning');
            return;
        }
        
        const formData = {
            name: document.getElementById('roomName').value.trim(),
            description: document.getElementById('roomDescription').value.trim(),
            stream_url: this.selectedProvider === 'netflix' ? 'https://www.netflix.com' : document.getElementById('streamUrl').value.trim(),
            max_participants: parseInt(document.getElementById('maxParticipants').value),
            password: document.getElementById('roomPassword').value.trim() || null,
            provider_type: this.selectedProvider // Adicionar provider
        };
        
        // Validações
        const errors = this.validateRoomData(formData);
        if (errors.length > 0) {
            toast.show(errors[0], 'error');
            return;
        }
        
        setButtonLoading(submitBtn, true);
        
        try {
            const response = await fetch('/api/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success !== false) {
                toast.show(data.message || 'Sala criada com sucesso!', 'success');
                modal.close('createRoomModal');
                
                // Redirecionar para a sala criada
                if (data.redirect) {
                    setTimeout(() => {
                        window.location.href = data.redirect;
                    }, 1500);
                } else if (data.room_id) {
                    setTimeout(() => {
                        window.location.href = `/room/${data.room_id}`;
                    }, 1500);
                }
            } else {
                throw new Error(data.message || 'Erro ao criar sala');
            }
            
        } catch (error) {
            console.error('Erro ao criar sala:', error);
            toast.show(error.message || 'Erro de conexão. Tente novamente.', 'error');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    }

    async handleJoinPrivateRoom(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('joinPrivateRoomSubmitBtn');
        const formData = {
            room_code: document.getElementById('roomCode').value.trim().toUpperCase(),
            password: document.getElementById('roomPasswordPrivate').value.trim() || null
        };
        
        if (!formData.room_code) {
            toast.show('Digite o código da sala', 'error');
            return;
        }
        
        if (formData.room_code.length !== 8) {
            toast.show('Código da sala deve ter 8 caracteres', 'error');
            return;
        }
        
        setButtonLoading(submitBtn, true);
        
        try {
            const response = await fetch('/api/rooms/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success !== false) {
                toast.show(data.message || 'Entrando na sala...', 'success');
                modal.close('joinPrivateRoomModal');
                
                // Redirecionar para a sala
                if (data.redirect) {
                    setTimeout(() => {
                        window.location.href = data.redirect;
                    }, 1500);
                }
            } else {
                throw new Error(data.message || 'Erro ao entrar na sala');
            }
            
        } catch (error) {
            console.error('Erro ao entrar na sala:', error);
            toast.show(error.message || 'Erro de conexão. Tente novamente.', 'error');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    }

    async handleJoinPublicRoom(e) {
        const btn = e.target;
        const roomId = btn.dataset.roomId;
        
        if (!roomId) return;
        
        setButtonLoading(btn, true);
        
        try {
            const response = await fetch(`/api/rooms/join/${roomId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success !== false) {
                toast.show('Entrando na sala...', 'success');
                
                setTimeout(() => {
                    window.location.href = data.redirect || `/room/${roomId}`;
                }, 1000);
            } else {
                throw new Error(data.message || 'Erro ao entrar na sala');
            }
            
        } catch (error) {
            console.error('Erro ao entrar na sala:', error);
            toast.show(error.message || 'Erro de conexão. Tente novamente.', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    }

    async loadMoreRooms() {
        if (this.loadingMore) return;
        
        const btn = this.elements.loadMoreRoomsBtn;
        if (!btn) return;
        
        this.loadingMore = true;
        setButtonLoading(btn, true);
        
        try {
            this.currentPage++;
            const response = await fetch(`/api/rooms?page=${this.currentPage}&limit=12`);
            const data = await response.json();
            
            if (response.ok && data.success && data.rooms.length > 0) {
                const grid = this.elements.publicRoomsGrid;
                
                data.rooms.forEach(room => {
                    const roomCard = this.createRoomCard(room);
                    grid.appendChild(roomCard);
                });
                
                if (!data.pagination.has_more) {
                    btn.style.display = 'none';
                }
                
                this.animateCards();
            } else {
                btn.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Erro ao carregar mais salas:', error);
            toast.show('Erro ao carregar salas', 'error');
        } finally {
            this.loadingMore = false;
            setButtonLoading(btn, false);
        }
    }

    createRoomCard(room) {
        const card = document.createElement('div');
        card.className = 'room-card';
        card.dataset.roomId = room.id;
        
        const isRoomFull = room.current_participants >= room.max_participants;
        
        card.innerHTML = `
            <div class="room-header">
                <h3 class="room-name">${this.escapeHtml(room.name)}</h3>
                <div class="room-participants">
                    <span class="participants-count">${room.current_participants}/${room.max_participants}</span>
                    <span class="participants-icon">👥</span>
                </div>
            </div>
            
            <div class="room-description">
                ${this.escapeHtml(room.description) || 'Sem descrição disponível'}
            </div>
            
            <div class="room-footer">
                <div class="room-owner">
                    <span class="owner-label">Por:</span>
                    <span class="owner-name">${this.escapeHtml(room.owner_username)}</span>
                </div>
                
                <button class="btn btn-primary btn-sm join-room-btn" 
                        data-room-id="${room.id}"
                        ${isRoomFull ? 'disabled' : ''}>
                    ${isRoomFull ? 'Lotada' : 'Entrar'}
                </button>
            </div>
        `;
        
        // Adicionar event listener ao botão
        const joinBtn = card.querySelector('.join-room-btn');
        if (joinBtn && !isRoomFull) {
            joinBtn.addEventListener('click', this.handleJoinPublicRoom.bind(this));
        }
        
        return card;
    }

    animateCards() {
        const cards = document.querySelectorAll('.room-card:not(.animated)');
        
        if (browserFeatures.supportsIntersectionObserver) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                            entry.target.classList.add('animated');
                        }, index * 100);
                    }
                });
            }, { threshold: 0.1 });
            
            cards.forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(card);
            });
        } else {
            // Fallback para navegadores sem IntersectionObserver
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                    card.classList.add('animated');
                }, index * 100);
            });
        }
    }

    validateRoomData(formData) {
        const errors = [];
        
        // Validar provider selecionado
        if (!this.selectedProvider) {
            errors.push('Selecione uma plataforma de streaming');
            return errors;
        }
        
        // Validações básicas
        if (!formData.name || formData.name.length < 3) {
            errors.push('Nome da sala deve ter pelo menos 3 caracteres');
        }
        
        if (formData.name && formData.name.length > 100) {
            errors.push('Nome da sala não pode ter mais de 100 caracteres');
        }
        
        // Validar URL apenas se necessário
        if (this.selectedProvider !== 'netflix') {
            if (!formData.stream_url || formData.stream_url.trim() === '') {
                errors.push('URL de transmissão é obrigatória');
            } else {
                try {
                    new URL(formData.stream_url);
                } catch {
                    errors.push('URL de transmissão inválida');
                }
            }
            
            // Validação específica do YouTube
            if (this.selectedProvider === 'youtube' && formData.stream_url) {
                const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
                if (!youtubeRegex.test(formData.stream_url)) {
                    errors.push('URL deve ser um link válido do YouTube');
                }
            }
        }
        
        if (formData.description && formData.description.length > 500) {
            errors.push('Descrição não pode ter mais de 500 caracteres');
        }
        
        if (!formData.max_participants || formData.max_participants < 2 || formData.max_participants > 50) {
            errors.push('Número de participantes deve estar entre 2 e 50');
        }
        
        if (formData.password && formData.password.length > 50) {
            errors.push('Senha não pode ter mais de 50 caracteres');
        }
        
        return errors;
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

    // Método para atualizar estatísticas do dashboard
    async updateStats() {
        try {
            const response = await fetch('/api/stats');
            
            if (response.ok) {
                const data = await response.json();
                const statElements = document.querySelectorAll('.stat-value');
                const stats = data.stats || {};
                
                if (statElements[0]) statElements[0].textContent = stats.total_users || 0;
                if (statElements[1]) statElements[1].textContent = stats.active_users || 0;
                if (statElements[2]) statElements[2].textContent = stats.users_today || 0;
            }
        } catch (error) {
            console.log('Erro ao atualizar estatísticas:', error);
        }
    }
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DashboardPage();
    });
} else {
    new DashboardPage();
}

// Exportar para uso global se necessário
window.DashboardPage = DashboardPage;