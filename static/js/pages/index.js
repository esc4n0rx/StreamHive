/**
 * Streamhive - Página Inicial
 * JavaScript específico para a home page
 */
class IndexPage {
    constructor() {
        this.elements = {
            loginBtn: document.getElementById('loginBtn'),
            registerBtn: document.getElementById('registerBtn'),
            getStartedBtn: document.getElementById('getStartedBtn'),
            
            loginModal: document.getElementById('loginModal'),
            registerModal: document.getElementById('registerModal'),
            
            closeLoginModal: document.getElementById('closeLoginModal'),
            closeRegisterModal: document.getElementById('closeRegisterModal'),
            
            switchToRegister: document.getElementById('switchToRegister'),
            switchToLogin: document.getElementById('switchToLogin'),
            
            loginForm: document.getElementById('loginForm'),
            registerForm: document.getElementById('registerForm')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.setupAnimations();
    }

    setupEventListeners() {
        this.elements.loginBtn?.addEventListener('click', () => StreamhiveApp.modal.open('loginModal'));
        this.elements.registerBtn?.addEventListener('click', () => StreamhiveApp.modal.open('registerModal'));
        this.elements.getStartedBtn?.addEventListener('click', () => StreamhiveApp.modal.open('registerModal'));

        this.elements.closeLoginModal?.addEventListener('click', () => StreamhiveApp.modal.close('loginModal'));
        this.elements.closeRegisterModal?.addEventListener('click', () => StreamhiveApp.modal.close('registerModal'));

        this.elements.switchToRegister?.addEventListener('click', () => StreamhiveApp.modal.switch('loginModal', 'registerModal'));
        this.elements.switchToLogin?.addEventListener('click', () => StreamhiveApp.modal.switch('registerModal', 'loginModal'));

        this.elements.loginForm?.addEventListener('submit', this.handleLogin.bind(this));
        this.elements.registerForm?.addEventListener('submit', this.handleRegister.bind(this));
    }

    setupFormValidation() {
        const registerUsername = document.getElementById('registerUsername');
        if (registerUsername) {
            registerUsername.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                
                if (value.length >= 3 && value.length <= 30) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                } else if (value.length > 0) {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                } else {
                    e.target.classList.remove('valid', 'invalid');
                }
            });
        }

        const registerEmail = document.getElementById('registerEmail');
        if (registerEmail) {
            registerEmail.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                
                if (emailRegex.test(value)) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                } else if (value.length > 0) {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                } else {
                    e.target.classList.remove('valid', 'invalid');
                }
            });
        }

        const registerPassword = document.getElementById('registerPassword');
        if (registerPassword) {
            registerPassword.addEventListener('input', (e) => {
                const value = e.target.value;
                
                if (value.length >= 6) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                } else if (value.length > 0) {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                } else {
                    e.target.classList.remove('valid', 'invalid');
                }
            });
        }

        const registerAge = document.getElementById('registerAge');
        if (registerAge) {
            registerAge.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                
                if (value >= 13 && value <= 120) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                } else if (e.target.value.length > 0) {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                } else {
                    e.target.classList.remove('valid', 'invalid');
                }
            });
        }
    }
    setupAnimations() {
        if (browserFeatures.supportsIntersectionObserver) {
            const cards = document.querySelectorAll('.feature-card');
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };
            
            const cardObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.classList.add('in-view');
                        }, index * 150);
                    }
                });
            }, observerOptions);
            
            cards.forEach(card => cardObserver.observe(card));
        }

        const header = document.querySelector('.fixed-header');
        if (header) {
            const throttledScrollHandler = StreamhiveApp.utils.throttle(() => {
                if (window.scrollY > 100) {
                    header.classList.add('header-scrolled');
                } else {
                    header.classList.remove('header-scrolled');
                }
            }, 16);

            window.addEventListener('scroll', throttledScrollHandler, { passive: true });
        }

        const links = document.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    const headerHeight = header ? header.offsetHeight : 0;
                    const targetPosition = target.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('loginSubmitBtn');
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        
        if (!username || !password) {
            StreamhiveApp.toast.show('Preencha todos os campos', 'error');
            return;
        }
        
        StreamhiveApp.setButtonLoading(submitBtn, true);
        
        try {
            const response = await StreamhiveApp.api.post('/login', {
                username,
                password
            });
            
            StreamhiveApp.toast.show(response.message, 'success');
            StreamhiveApp.modal.close('loginModal');
            
            setTimeout(() => {
                window.location.href = response.redirect;
            }, 1500);
            
        } catch (error) {
            console.error('Erro no login:', error);
            StreamhiveApp.toast.show(error.message || 'Erro de conexão. Tente novamente.', 'error');
        } finally {
            StreamhiveApp.setButtonLoading(submitBtn, false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('registerSubmitBtn');
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim().toLowerCase();
        const password = document.getElementById('registerPassword').value.trim();
        const age = parseInt(document.getElementById('registerAge').value);
        
        const validationErrors = this.validateRegistrationData({ username, email, password, age });
        if (validationErrors.length > 0) {
            StreamhiveApp.toast.show(validationErrors[0], 'error');
            return;
        }
        
        StreamhiveApp.setButtonLoading(submitBtn, true);
        
        try {
            const response = await StreamhiveApp.api.post('/register', {
                username,
                email,
                password,
                age
            });
            
            StreamhiveApp.toast.show(response.message, 'success');
            StreamhiveApp.modal.close('registerModal');
            
            setTimeout(() => {
                window.location.href = response.redirect;
            }, 1500);
            
        } catch (error) {
            console.error('Erro no registro:', error);
            StreamhiveApp.toast.show(error.message || 'Erro de conexão. Tente novamente.', 'error');
        } finally {
            StreamhiveApp.setButtonLoading(submitBtn, false);
        }
    }

    validateRegistrationData({ username, email, password, age }) {
        const errors = [];
        
        if (!username || !email || !password || !age) {
            errors.push('Preencha todos os campos');
        }
        
        if (username && username.length < 3) {
            errors.push('Nome de usuário deve ter pelo menos 3 caracteres');
        }
        
        if (password && password.length < 6) {
            errors.push('Senha deve ter pelo menos 6 caracteres');
        }
        
        if (age && age < 13) {
            errors.push('Idade mínima é 13 anos');
        }
        
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Email inválido');
        }
        
        return errors;
    }

    async loadDynamicStats() {
        try {
            const stats = await StreamhiveApp.api.get('/api/stats');
            
            const statElements = {
                users: document.querySelector('.stat-item:nth-child(1) .stat-number'),
                rooms: document.querySelector('.stat-item:nth-child(2) .stat-number'),
                sync: document.querySelector('.stat-item:nth-child(3) .stat-number')
            };
            
            if (stats.success && statElements.users) {
                this.animateNumber(statElements.users, stats.stats.total_users || 1000);
                this.animateNumber(statElements.rooms, stats.stats.total_rooms || 50);
            }
        } catch (error) {
            console.log('Erro ao carregar estatísticas:', error);
        }
    }

    animateNumber(element, target) {
        const start = 0;
        const duration = 2000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(progress * target);
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new IndexPage();
    });
} else {
    new IndexPage();
}