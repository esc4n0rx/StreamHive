/**
 * Streamhive - Dashboard
 * JavaScript específico para o dashboard
 */

class DashboardPage {
    constructor() {
        this.currentPage = 1;
        this.loadingMore = false;
        
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
       this.setupFormValidation();
       this.setupAutoRefresh();
       this.animateCards();
       
       console.log('📊 Dashboard inicializado');
   }

   setupEventListeners() {
       // Botões principais
       this.elements.createRoomBtn?.addEventListener('click', () => StreamhiveApp.modal.open('createRoomModal'));
       this.elements.joinPrivateRoomBtn?.addEventListener('click', () => StreamhiveApp.modal.open('joinPrivateRoomModal'));
       
       // Botões para fechar modais
       this.elements.closeCreateRoomModal?.addEventListener('click', () => StreamhiveApp.modal.close('createRoomModal'));
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
           this.setupCharacterCounter(descriptionInput, 500);
       }
   }

   setupCharacterCounter(input, maxLength) {
       let counter = input.parentNode.querySelector('.char-counter');
       if (!counter) {
           counter = document.createElement('div');
           counter.className = 'char-counter';
           counter.style.cssText = 'font-size: 0.75rem; color: rgba(255, 255, 255, 0.6); text-align: right; margin-top: 4px;';
           input.parentNode.appendChild(counter);
       }
       
       const updateCounter = () => {
           const current = input.value.length;
           counter.textContent = `${current}/${maxLength}`;
           
           if (current > maxLength * 0.9) {
               counter.style.color = '#ef4444';
           } else if (current > maxLength * 0.7) {
               counter.style.color = '#f59e0b';
           } else {
               counter.style.color = 'rgba(255, 255, 255, 0.6)';
           }
       };
       
       input.addEventListener('input', updateCounter);
       updateCounter();
   }

   setupAutoRefresh() {
       // Auto-refresh das salas públicas a cada 30 segundos
       setInterval(async () => {
           try {
               const response = await StreamhiveApp.api.get('/api/rooms', { page: 1, limit: 12 });
               
               if (response.success) {
                   this.updateRoomParticipants(response.rooms);
               }
           } catch (error) {
               // Silenciosamente falhar - não interromper UX
               console.log('Auto-refresh falhou:', error);
           }
       }, 30000);
   }

   updateRoomParticipants(rooms) {
       const currentCards = document.querySelectorAll('.room-card[data-room-id]');
       currentCards.forEach(card => {
           const roomId = parseInt(card.dataset.roomId);
           const updatedRoom = rooms.find(r => r.id === roomId);
           
           if (updatedRoom) {
               const participantsCount = card.querySelector('.participants-count');
               const joinBtn = card.querySelector('.join-room-btn');
               
               if (participantsCount) {
                   participantsCount.textContent = `${updatedRoom.current_participants}/${updatedRoom.max_participants}`;
               }
               
               if (joinBtn) {
                   const isNowFull = updatedRoom.current_participants >= updatedRoom.max_participants;
                   joinBtn.disabled = isNowFull;
                   joinBtn.textContent = isNowFull ? 'Lotada' : 'Entrar';
               }
           }
       });
   }

   async handleCreateRoom(e) {
       e.preventDefault();
       
       const submitBtn = document.getElementById('createRoomSubmitBtn');
       const formData = {
           name: document.getElementById('roomName').value.trim(),
           description: document.getElementById('roomDescription').value.trim(),
           stream_url: document.getElementById('streamUrl').value.trim(),
           max_participants: parseInt(document.getElementById('maxParticipants').value),
           password: document.getElementById('roomPassword').value.trim() || null
       };
       
       // Validações
       const errors = this.validateRoomData(formData);
       if (errors.length > 0) {
           StreamhiveApp.toast.show(errors[0], 'error');
           return;
       }
       
       StreamhiveApp.setButtonLoading(submitBtn, true);
       
       try {
           const response = await StreamhiveApp.api.post('/api/rooms', formData);
           
           StreamhiveApp.toast.show(response.message, 'success');
           StreamhiveApp.modal.close('createRoomModal');
           
           setTimeout(() => {
               window.location.href = response.redirect;
           }, 1500);
           
       } catch (error) {
           console.error('Erro ao criar sala:', error);
           StreamhiveApp.toast.show(error.message || 'Erro de conexão. Tente novamente.', 'error');
       } finally {
           StreamhiveApp.setButtonLoading(submitBtn, false);
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
           StreamhiveApp.toast.show('Digite o código da sala', 'error');
           return;
       }
       
       if (formData.room_code.length !== 8) {
           StreamhiveApp.toast.show('Código da sala deve ter 8 caracteres', 'error');
           return;
       }
       
       StreamhiveApp.setButtonLoading(submitBtn, true);
       
       try {
           const response = await StreamhiveApp.api.post('/api/rooms/join', formData);
           
           StreamhiveApp.toast.show(response.message, 'success');
           StreamhiveApp.modal.close('joinPrivateRoomModal');
           
           setTimeout(() => {
               window.location.href = response.redirect;
           }, 1500);
           
       } catch (error) {
           console.error('Erro ao entrar na sala:', error);
           StreamhiveApp.toast.show(error.message || 'Erro de conexão. Tente novamente.', 'error');
       } finally {
           StreamhiveApp.setButtonLoading(submitBtn, false);
       }
   }

   async handleJoinPublicRoom(e) {
       const btn = e.target;
       const roomId = btn.dataset.roomId;
       
       if (!roomId) return;
       
       StreamhiveApp.setButtonLoading(btn, true);
       
       try {
           const response = await StreamhiveApp.api.post('/api/rooms/join', {
               room_id: parseInt(roomId)
           });
           
           StreamhiveApp.toast.show(response.message, 'success');
           
           setTimeout(() => {
               window.location.href = response.redirect;
           }, 1500);
           
       } catch (error) {
           console.error('Erro ao entrar na sala:', error);
           StreamhiveApp.toast.show(error.message || 'Erro de conexão. Tente novamente.', 'error');
       } finally {
           StreamhiveApp.setButtonLoading(btn, false);
       }
   }

   async loadMoreRooms() {
       if (this.loadingMore) return;
       
       const btn = this.elements.loadMoreRoomsBtn;
       if (!btn) return;
       
       this.loadingMore = true;
       StreamhiveApp.setButtonLoading(btn, true);
       
       try {
           this.currentPage++;
           const response = await StreamhiveApp.api.get('/api/rooms', {
               page: this.currentPage,
               limit: 12
           });
           
           if (response.success && response.rooms.length > 0) {
               const grid = this.elements.publicRoomsGrid;
               
               response.rooms.forEach(room => {
                   const roomCard = this.createRoomCard(room);
                   grid.appendChild(roomCard);
               });
               
               if (!response.pagination.has_more) {
                   btn.style.display = 'none';
               }
               
               this.animateCards();
           } else {
               btn.style.display = 'none';
           }
           
       } catch (error) {
           console.error('Erro ao carregar mais salas:', error);
           StreamhiveApp.toast.show('Erro ao carregar salas', 'error');
       } finally {
           this.loadingMore = false;
           StreamhiveApp.setButtonLoading(btn, false);
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
       
       if (StreamhiveApp.browserFeatures.supportsIntersectionObserver) {
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
       
       if (!formData.name || formData.name.length < 3) {
           errors.push('Nome da sala deve ter pelo menos 3 caracteres');
       }
       
       if (!formData.stream_url) {
           errors.push('URL de transmissão é obrigatória');
       } else if (!/^https?:\/\/.+/.test(formData.stream_url)) {
           errors.push('URL de transmissão deve começar com http:// ou https://');
       }
       
       if (!formData.max_participants || formData.max_participants < 2 || formData.max_participants > 50) {
           errors.push('Número de participantes deve estar entre 2 e 50');
       }
       
       if (formData.password && formData.password.length < 4) {
           errors.push('Senha deve ter pelo menos 4 caracteres');
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
           const response = await StreamhiveApp.api.get('/api/stats');
           
           if (response.success) {
               const statElements = document.querySelectorAll('.stat-value');
               const stats = response.stats;
               
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