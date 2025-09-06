/**
 * Streamhive - Video Player Component
 * Player de vídeo customizado com sincronização e suporte a múltiplos formatos
 */

class VideoPlayer {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            controls: true,
            autoplay: false,
            muted: false,
            volume: 0.8,
            playbackRate: 1,
            ...options
        };

        this.netflixWebView = null;
        this.isNetflixMode = false;   
    

        this.video = null;
        this.isOwner = false;
        this.isSyncing = false;
        this.videoUrl = '';
        this.videoType = '';
        this.youtubePlayer = null;
        this.hlsPlayer = null;
        
        this.eventHandlers = {
            'play': [],
            'pause': [],
            'seeked': [],
            'timeupdate': [],
            'loadedmetadata': [],
            'error': []
        };

        this.init();
    }

    init() {
        this.createPlayerHTML();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        
        console.log('🎬 Video Player inicializado');
    }

    createPlayerHTML() {
        this.container.innerHTML = `
            <div class="video-player-wrapper">
                <div class="video-container">
                    <!-- Container para YouTube -->
                    <div class="youtube-container hidden" id="youtubeContainer">
                        <div id="youtubePlayer"></div>
                    </div>
                    
                    <!-- Video element para outros formatos -->
                    <video 
                        class="video-element"
                        playsinline
                        webkit-playsinline
                        x5-playsinline
                        preload="metadata"
                        crossorigin="anonymous"
                    >
                        Seu navegador não suporta vídeo HTML5.
                    </video>
                    
                    <div class="video-overlay ${this.isOwner ? 'hidden' : ''}" id="videoOverlay">
                        <div class="overlay-message">
                            <div class="overlay-icon">🔒</div>
                            <div class="overlay-text">Apenas o dono pode controlar o vídeo</div>
                        </div>
                    </div>
                    
                    <div class="video-controls">
                        <div class="controls-left">
                            <button class="control-btn play-pause-btn" id="playPauseBtn">
                                <span class="icon-play">▶️</span>
                                <span class="icon-pause hidden">⏸️</span>
                            </button>
                            
                            <div class="volume-control">
                                <button class="control-btn volume-btn" id="volumeBtn">
                                    <span class="icon-volume">🔊</span>
                                    <span class="icon-mute hidden">🔇</span>
                                </button>
                                <input type="range" class="volume-slider" id="volumeSlider" 
                                       min="0" max="1" step="0.1" value="0.8">
                            </div>
                            
                            <div class="time-display">
                                <span id="currentTime">00:00</span>
                                <span class="time-separator">/</span>
                                <span id="duration">00:00</span>
                            </div>
                        </div>
                        
                        <div class="controls-center">
                            <div class="progress-container">
                                <input type="range" class="progress-slider" id="progressSlider" 
                                       min="0" max="100" step="0.1" value="0">
                                <div class="progress-track">
                                    <div class="progress-filled" id="progressFilled"></div>
                                    <div class="progress-buffered" id="progressBuffered"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="controls-right">
                            <div class="playback-rate">
                                <select class="rate-select" id="rateSelect">
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1" selected>1x</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="2">2x</option>
                                </select>
                            </div>
                            
                            <button class="control-btn fullscreen-btn" id="fullscreenBtn">
                                <span class="icon-fullscreen">⛶</span>
                                <span class="icon-exit-fullscreen hidden">⧉</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="video-info hidden" id="videoInfo">
                    <div class="info-item">
                        <span class="info-label">Status:</span>
                        <span class="info-value" id="videoStatus">Carregando...</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Tipo:</span>
                        <span class="info-value" id="videoType">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Resolução:</span>
                        <span class="info-value" id="videoResolution">-</span>
                    </div>
                </div>
                
                <div class="loading-indicator" id="loadingIndicator">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Carregando vídeo...</div>
                </div>
            </div>
        `;

        // Obter referências
        this.video = this.container.querySelector('.video-element');
        this.youtubeContainer = this.container.querySelector('#youtubeContainer');
        this.overlay = this.container.querySelector('.video-overlay');
        this.loadingIndicator = this.container.querySelector('#loadingIndicator');
        
        this.controls = {
            playPause: this.container.querySelector('#playPauseBtn'),
            volume: this.container.querySelector('#volumeBtn'),
            volumeSlider: this.container.querySelector('#volumeSlider'),
            progress: this.container.querySelector('#progressSlider'),
            progressFilled: this.container.querySelector('#progressFilled'),
            progressBuffered: this.container.querySelector('#progressBuffered'),
            currentTime: this.container.querySelector('#currentTime'),
            duration: this.container.querySelector('#duration'),
            rateSelect: this.container.querySelector('#rateSelect'),
            fullscreen: this.container.querySelector('#fullscreenBtn'),
            videoInfo: this.container.querySelector('#videoInfo'),
            videoStatus: this.container.querySelector('#videoStatus'),
            videoType: this.container.querySelector('#videoType'),
            videoResolution: this.container.querySelector('#videoResolution')
        };
    }

    setupEventListeners() {
        // Eventos do vídeo HTML5
        this.video.addEventListener('loadedmetadata', () => {
            this.controls.duration.textContent = this.formatTime(this.video.duration);
            this.controls.progress.max = this.video.duration;
            
            this.controls.videoResolution.textContent = `${this.video.videoWidth}x${this.video.videoHeight}`;
            this.controls.videoStatus.textContent = 'Pronto';
            this.hideLoadingIndicator();
            
            this.emit('loadedmetadata', {
                duration: this.video.duration,
                width: this.video.videoWidth,
                height: this.video.videoHeight
            });
        });

        this.video.addEventListener('timeupdate', () => {
            if (!this.isSyncing && this.videoType !== 'youtube') {
                this.updateProgress();
                this.emit('timeupdate', { currentTime: this.video.currentTime });
            }
        });

        this.video.addEventListener('play', () => {
            this.updatePlayButton(true);
            if (!this.isSyncing && this.isOwner && this.videoType !== 'youtube') {
                this.emit('play', { currentTime: this.video.currentTime });
            }
        });

        this.video.addEventListener('pause', () => {
            this.updatePlayButton(false);
            if (!this.isSyncing && this.isOwner && this.videoType !== 'youtube') {
                this.emit('pause', { currentTime: this.video.currentTime });
            }
        });

        this.video.addEventListener('seeked', () => {
            if (!this.isSyncing && this.isOwner && this.videoType !== 'youtube') {
                this.emit('seeked', { currentTime: this.video.currentTime });
            }
        });

        this.video.addEventListener('error', (e) => {
            console.error('Erro no vídeo HTML5:', e);
            this.showError('Erro ao carregar vídeo');
            this.emit('error', { error: e });
        });

        // Controles (apenas para owner)
        this.controls.playPause.addEventListener('click', () => {
            if (this.isOwner) {
                this.togglePlayPause();
            }
        });

        this.controls.progress.addEventListener('input', () => {
            if (this.isOwner) {
                this.seek(parseFloat(this.controls.progress.value));
            }
        });

        this.controls.volumeSlider.addEventListener('input', () => {
            this.setVolume(parseFloat(this.controls.volumeSlider.value));
        });

        this.controls.volume.addEventListener('click', () => {
            this.toggleMute();
        });

        this.controls.rateSelect.addEventListener('change', () => {
            if (this.isOwner) {
                this.setPlaybackRate(parseFloat(this.controls.rateSelect.value));
            }
        });

        this.controls.fullscreen.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Fullscreen change
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenButton();
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (this.isOwner) this.togglePlayPause();
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.toggleMute();
                    break;
                case 'KeyF':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.isOwner) this.seek(this.getCurrentTime() - 10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.isOwner) this.seek(this.getCurrentTime() + 10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.setVolume(Math.min(1, this.getVolume() + 0.1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.setVolume(Math.max(0, this.getVolume() - 0.1));
                    break;
            }
        });
    }

    // Carregar vídeo
    async loadVideo(url, type = 'auto') {
        this.videoType = this.detectVideoType(url,type);
        if (!url) {
            console.error('URL do vídeo não fornecida');
            return false;
        }

        if (this.videoType === 'netflix' || url.includes('netflix.com')) {
            this.loadNetflixWebView();
            return;
        }

        this.videoUrl = url;
        this.videoType = this.detectVideoType(url, type);
        
        console.log(`🎬 Carregando vídeo: ${url} (${this.videoType})`);
        
        this.showLoadingIndicator();
        this.controls.videoType.textContent = this.videoType.toUpperCase();
        this.controls.videoStatus.textContent = 'Carregando...';
        this.controls.videoInfo.classList.remove('hidden');
        
        try {
            switch (this.videoType) {
                case 'youtube':
                    return await this.loadYouTubeVideo(url);
                case 'hls':
                    return await this.loadHLSVideo(url);
                default:
                    return await this.loadDirectVideo(url);
            }
        } catch (error) {
            console.error('Erro ao carregar vídeo:', error);
            this.showError('Erro ao carregar vídeo');
            return false;
        }
    }

    loadNetflixWebView() {
        this.isNetflixMode = true;
        this.videoType = 'netflix';
        
        console.log('🎬 Carregando Netflix WebView');
        
        // Ocultar player tradicional
        if (this.video) {
            this.video.style.display = 'none';
        }
        if (this.youtubeContainer) {
            this.youtubeContainer.classList.add('hidden');
        }
        
        // Criar container Netflix se não existir
        let netflixContainer = this.container.querySelector('.netflix-webview-container');
        if (!netflixContainer) {
            netflixContainer = document.createElement('div');
            netflixContainer.className = 'netflix-webview-container';
            this.container.querySelector('.video-container').appendChild(netflixContainer);
        }
        
        // Inicializar Netflix WebView
        this.netflixWebView = new NetflixWebView(netflixContainer, {
            allowOwnerInteraction: this.isOwner,
            showControls: this.isOwner
        });
        
        // Configurar eventos
        this.setupNetflixEvents();
        
        // Ocultar overlay se for owner
        if (this.overlay) {
            this.overlay.style.display = this.isOwner ? 'none' : 'flex';
        }
        
        // Ocultar controles tradicionais para Netflix
        const videoControls = this.container.querySelector('.video-controls');
        if (videoControls) {
            videoControls.style.display = 'none';
        }
        
        this.hideLoadingIndicator();
        this.emit('loadedmetadata', { 
            type: 'netflix',
            provider: 'netflix'
        });
    }

        setupNetflixEvents() {
        if (!this.netflixWebView) return;
    
        // Configurar permissões
        this.netflixWebView.setOwner(this.isOwner);
    
        // Netflix carregado
        this.netflixWebView.on('ready', () => {
            console.log('🎬 Netflix WebView pronto');
            this.emit('loadedmetadata', { 
                type: 'netflix',
                duration: 0 // Netflix não fornece duração
            });
        });
    
        // Navegação (apenas para owner)
        this.netflixWebView.on('navigation', (data) => {
            if (this.isOwner) {
                console.log('🎬 Netflix navegação:', data.url);
                // Emitir evento de sincronização
                this.emit('netflix_navigation', data);
            }
        });
    
        // Erro
        this.netflixWebView.on('error', () => {
            console.error('🎬 Erro no Netflix WebView');
            this.emit('error', { 
                type: 'netflix',
                message: 'Erro ao carregar Netflix'
            });
        });
    }

// Adicionar método para sincronização Netflix:
    syncNetflix(data) {
        if (this.isNetflixMode && this.netflixWebView && !this.isOwner) {
            console.log('🎬 Sincronizando Netflix:', data);
            this.netflixWebView.syncNavigation(data);
        }
    }

    async loadYouTubeVideo(url) {
        // Extrair ID do YouTube
        const videoId = this.extractYouTubeId(url);
        if (!videoId) {
            throw new Error('ID do YouTube inválido');
        }

        // Carregar API do YouTube se não estiver carregada
        if (!window.YT) {
            await this.loadYouTubeAPI();
        }

        return new Promise((resolve, reject) => {
            // Mostrar container do YouTube
            this.video.style.display = 'none';
            this.youtubeContainer.classList.remove('hidden');

            // Criar player do YouTube
            this.youtubePlayer = new YT.Player('youtubePlayer', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    controls: 0, // Desabilitar controles do YouTube
                    disablekb: 1, // Desabilitar atalhos de teclado
                    fs: 0, // Desabilitar fullscreen do YouTube
                    rel: 0, // Não mostrar vídeos relacionados
                    showinfo: 0, // Não mostrar informações
                    iv_load_policy: 3, // Não mostrar anotações
                    modestbranding: 1, // Minimal branding
                    autoplay: 0,
                    mute: 0
                },
                events: {
                    onReady: (event) => {
                        console.log('🎬 YouTube player pronto');
                        this.setupYouTubeEvents();
                        this.hideLoadingIndicator();
                        this.controls.videoStatus.textContent = 'Pronto';
                        this.controls.videoResolution.textContent = 'YouTube';
                        
                        // Configurar duração
                        const duration = this.youtubePlayer.getDuration();
                        this.controls.duration.textContent = this.formatTime(duration);
                        this.controls.progress.max = duration;
                        
                        this.emit('loadedmetadata', {
                            duration: duration,
                            width: 'YouTube',
                            height: 'YouTube'
                        });
                        
                        resolve(true);
                    },
                    onStateChange: (event) => {
                        this.handleYouTubeStateChange(event);
                    },
                    onError: (event) => {
                        console.error('Erro no YouTube player:', event);
                        reject(new Error('Erro ao carregar vídeo do YouTube'));
                    }
                }
            });
        });
    }

    async loadHLSVideo(url) {
        // Verificar se HLS.js é necessário
        if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari nativo
            return this.loadDirectVideo(url);
        }

        // Carregar HLS.js se não estiver carregado
        if (!window.Hls) {
            await this.loadHLSLibrary();
        }

        if (Hls.isSupported()) {
            this.hlsPlayer = new Hls({
                enableWorker: true,
                lowLatencyMode: true
            });

            return new Promise((resolve, reject) => {
                this.hlsPlayer.loadSource(url);
                this.hlsPlayer.attachMedia(this.video);

                this.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log('🎬 HLS manifest carregado');
                    this.hideLoadingIndicator();
                    resolve(true);
                });

                this.hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
                    console.error('Erro HLS:', data);
                    if (data.fatal) {
                        reject(new Error('Erro fatal no HLS'));
                    }
                });
            });
        } else {
            throw new Error('HLS não suportado neste navegador');
        }
    }

    async loadDirectVideo(url) {
        // Determinar URL final
        let finalUrl = url;
        
        // Se for HTTP, usar proxy
        if (url.startsWith('http://')) {
            finalUrl = `/proxy/stream?url=${encodeURIComponent(url)}`;
            console.log('🔒 Usando proxy para URL HTTP');
        }
        
        // Mostrar vídeo HTML5
        this.youtubeContainer.classList.add('hidden');
        this.video.style.display = 'block';
        
        // Configurar vídeo
        this.video.src = finalUrl;
        
        return new Promise((resolve, reject) => {
            const handleLoad = () => {
                console.log('🎬 Vídeo direto carregado');
                this.hideLoadingIndicator();
                resolve(true);
            };

            const handleError = (e) => {
                console.error('Erro ao carregar vídeo direto:', e);
                reject(new Error('Erro ao carregar vídeo'));
            };

            this.video.addEventListener('loadedmetadata', handleLoad, { once: true });
            this.video.addEventListener('error', handleError, { once: true });
            
            // Timeout
            setTimeout(() => {
                reject(new Error('Timeout ao carregar vídeo'));
            }, 30000);
        });
    }

    // Métodos do YouTube
    setupYouTubeEvents() {
        // Atualizar progresso para YouTube
        this.youtubeUpdateInterval = setInterval(() => {
            if (this.youtubePlayer && this.youtubePlayer.getCurrentTime) {
                const currentTime = this.youtubePlayer.getCurrentTime();
                const duration = this.youtubePlayer.getDuration();
                
                this.controls.currentTime.textContent = this.formatTime(currentTime);
                this.controls.progress.value = currentTime;
                
                const progress = (currentTime / duration) * 100;
                this.controls.progressFilled.style.width = `${progress}%`;
                
                if (!this.isSyncing && this.isOwner) {
                    this.emit('timeupdate', { currentTime });
                }
            }
        }, 1000);
    }

    handleYouTubeStateChange(event) {
        const state = event.data;
        
        switch (state) {
            case YT.PlayerState.PLAYING:
                this.updatePlayButton(true);
                if (!this.isSyncing && this.isOwner) {
                    this.emit('play', { currentTime: this.youtubePlayer.getCurrentTime() });
                }
                break;
                
            case YT.PlayerState.PAUSED:
                this.updatePlayButton(false);
                if (!this.isSyncing && this.isOwner) {
                    this.emit('pause', { currentTime: this.youtubePlayer.getCurrentTime() });
                }
                break;
                
            case YT.PlayerState.ENDED:
                this.updatePlayButton(false);
                break;
        }
    }

    extractYouTubeId(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    }

    async loadYouTubeAPI() {
        return new Promise((resolve, reject) => {
            if (window.YT && window.YT.Player) {
                resolve();
                return;
            }

            window.onYouTubeIframeAPIReady = () => {
                console.log('🎬 YouTube API carregada');
                resolve();
            };

            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.onerror = () => reject(new Error('Erro ao carregar YouTube API'));
            document.head.appendChild(script);
        });
    }

    async loadHLSLibrary() {
        return new Promise((resolve, reject) => {
            if (window.Hls) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
            script.onload = () => {
                console.log('🎬 HLS.js carregada');
                resolve();
            };
            script.onerror = () => reject(new Error('Erro ao carregar HLS.js'));
            document.head.appendChild(script);
        });
    }

    detectVideoType(url, hint = 'auto') {
        if (hint !== 'auto') return hint;
        
        const urlLower = url.toLowerCase();

        if (urlLower.includes('netflix.com')) {
        return 'netflix';
        } else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
            return 'youtube';
        } else if (urlLower.includes('.m3u8') || urlLower.includes('m3u8')) {
            return 'hls';
        } else if (urlLower.includes('.mpd')) {
            return 'dash';
        } else if (urlLower.match(/\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)(\?|$)/)) {
            return 'video';
        } else {
            return 'stream';
        }
    }

    // Controles universais
    play() {
        if (this.videoType === 'youtube' && this.youtubePlayer) {
            this.youtubePlayer.playVideo();
        } else {
            return this.video.play().catch(error => {
                console.error('Erro ao reproduzir:', error);
                this.emit('error', { error });
            });
        }
    }

    pause() {
        if (this.videoType === 'youtube' && this.youtubePlayer) {
            this.youtubePlayer.pauseVideo();
        } else {
            this.video.pause();
        }
    }

    togglePlayPause() {
        if (this.getPaused()) {
            this.play();
        } else {
            this.pause();
        }
    }

    seek(time) {
        if (this.videoType === 'youtube' && this.youtubePlayer) {
            this.youtubePlayer.seekTo(time, true);
        } else if (time >= 0 && time <= this.video.duration) {
            this.video.currentTime = time;
        }
        this.updateProgress();
    }

    setVolume(volume) {
        volume = Math.max(0, Math.min(1, volume));
        
        if (this.videoType === 'youtube' && this.youtubePlayer) {
            this.youtubePlayer.setVolume(volume * 100);
        } else {
            this.video.volume = volume;
        }
        
        this.controls.volumeSlider.value = volume;
        this.updateVolumeButton();
    }

    toggleMute() {
        if (this.videoType === 'youtube' && this.youtubePlayer) {
            if (this.youtubePlayer.isMuted()) {
                this.youtubePlayer.unMute();
            } else {
                this.youtubePlayer.mute();
            }
        } else {
            this.video.muted = !this.video.muted;
        }
        this.updateVolumeButton();
    }

    setPlaybackRate(rate) {
        if (this.videoType === 'youtube' && this.youtubePlayer) {
            this.youtubePlayer.setPlaybackRate(rate);
        } else {
            this.video.playbackRate = rate;
        }
        this.controls.rateSelect.value = rate;
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.container.requestFullscreen();
        }
    }

    // Getters universais
    getCurrentTime() {
        if (this.videoType === 'youtube' && this.youtubePlayer) {
            return this.youtubePlayer.getCurrentTime() || 0;
        }
        return this.video.currentTime || 0;
    }

    getDuration() {
        if (this.videoType === 'youtube' && this.youtubePlayer) {
            return this.youtubePlayer.getDuration() || 0;
        }
        return this.video.duration || 0;
    }

    getPaused() {
        if (this.videoType === 'youtube' && this.youtubePlayer) {
            return this.youtubePlayer.getPlayerState() !== YT.PlayerState.PLAYING;
        }
        return this.video.paused;
    }

    getVolume() {
        if (this.videoType === 'youtube' && this.youtubePlayer) {
            return (this.youtubePlayer.getVolume() || 0) / 100;
        }
        return this.video.volume || 0;
    }

    getMuted() {
        if (this.videoType === 'youtube' && this.youtubePlayer) {
            return this.youtubePlayer.isMuted() || false;
        }
        return this.video.muted || false;
    }

    // Sincronização
    sync(data) {
        this.isSyncing = true;
        
        try {
            const { action, current_time, is_playing, time, timestamp } = data;
            
            console.log(`🔄 Sincronizando: ${action}`, data);
            
            switch (action) {
                case 'play':
                    const now = Date.now() / 1000;
                    const latency = now - timestamp;
                    const adjustedTime = current_time + latency;
                    
                    if (Math.abs(this.getCurrentTime() - adjustedTime) > 2) {
                        this.seek(adjustedTime);
                    }
                    
                    if (this.getPaused()) {
                        this.play();
                    }
                    break;
                    
                case 'pause':
                    this.seek(current_time);
                    if (!this.getPaused()) {
                        this.pause();
                    }
                    break;
                    
                case 'seek':
                    this.seek(time);
                    break;
            }
            
        } catch (error) {
            console.error('Erro na sincronização:', error);
        } finally {
            setTimeout(() => {
                this.isSyncing = false;
            }, 1000);
        }
    }

    // UI helpers
    showLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'flex';
        }
    }

    hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
    }

    showError(message) {
        this.hideLoadingIndicator();
        this.controls.videoStatus.textContent = message;
        this.container.classList.add('error');
    }

    updateProgress() {
        const currentTime = this.getCurrentTime();
        const duration = this.getDuration();
        
        if (duration) {
            const progress = (currentTime / duration) * 100;
            this.controls.progress.value = currentTime;
            this.controls.progressFilled.style.width = `${progress}%`;
        }
        
        this.controls.currentTime.textContent = this.formatTime(currentTime);
    }

    updatePlayButton(isPlaying) {
        const playIcon = this.controls.playPause.querySelector('.icon-play');
        const pauseIcon = this.controls.playPause.querySelector('.icon-pause');
        
        if (isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }

    updateVolumeButton() {
        const volumeIcon = this.controls.volume.querySelector('.icon-volume');
        const muteIcon = this.controls.volume.querySelector('.icon-mute');
        
        if (this.getMuted() || this.getVolume() === 0) {
            volumeIcon.classList.add('hidden');
            muteIcon.classList.remove('hidden');
        } else {
            volumeIcon.classList.remove('hidden');
            muteIcon.classList.add('hidden');
        }
    }

    updateFullscreenButton() {
        const fullscreenIcon = this.controls.fullscreen.querySelector('.icon-fullscreen');
        const exitFullscreenIcon = this.controls.fullscreen.querySelector('.icon-exit-fullscreen');
        
        if (document.fullscreenElement) {
            fullscreenIcon.classList.add('hidden');
            exitFullscreenIcon.classList.remove('hidden');
        } else {
            fullscreenIcon.classList.remove('hidden');
            exitFullscreenIcon.classList.add('hidden');
        }
    }

    setOwner(isOwner) {
    this.isOwner = isOwner;

    if (this.isNetflixMode && this.netflixWebView) {
        this.netflixWebView.setOwner(isOwner);
    }
    
    if (isOwner) {
        this.overlay.classList.add('hidden');
        this.container.classList.add('owner-controls');
        // Remover completamente o overlay para owners
        this.overlay.style.display = 'none';
    } else {
        this.overlay.classList.remove('hidden');
        this.container.classList.remove('owner-controls');
        // Garantir que overlay está disponível para participantes
        this.overlay.style.display = 'flex';
    }
    
    console.log(`🎬 Modo de controle: ${isOwner ? 'Owner' : 'Participante'}`);
}

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
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

        if (this.netflixWebView) {
            this.netflixWebView.destroy();
            this.netflixWebView = null;
        }
        // Limpar intervalos do YouTube
        if (this.youtubeUpdateInterval) {
            clearInterval(this.youtubeUpdateInterval);
        }

        // Destruir players
        if (this.youtubePlayer && this.youtubePlayer.destroy) {
            this.youtubePlayer.destroy();
        }

        if (this.hlsPlayer && this.hlsPlayer.destroy) {
            this.hlsPlayer.destroy();
        }

        // Limpar vídeo
        if (this.video) {
            this.video.pause();
            this.video.src = '';
        }
        
        this.eventHandlers = {};
        console.log('🎬 Video Player destruído');
    }

    // Getters para compatibilidade
    get currentTime() {
        return this.getCurrentTime();
    }

    get duration() {
        return this.getDuration();
    }

    get paused() {
        return this.getPaused();
    }

    get volume() {
        return this.getVolume();
    }

    get muted() {
        return this.getMuted();
    }
}

// Exportar
window.VideoPlayer = VideoPlayer;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoPlayer;
}