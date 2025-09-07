/**
 * Streamhive - Validadores Frontend
 * Funções de validação para uso no frontend
 */
const Validators = {
    email(email) {
        if (!email || typeof email !== 'string') return false;
        
        const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        if (email.length > 254) return false;
        if (email.includes('..')) return false;
        if (email.startsWith('.') || email.endsWith('.')) return false;
        
        return pattern.test(email);
    },

    username(username) {
        if (!username || typeof username !== 'string') return false;
        
        if (username.length < 3 || username.length > 30) return false;
        
        const pattern = /^[a-zA-Z0-9_]+$/;
        if (username.startsWith('_') || username.endsWith('_')) return false;
        if (username.includes('__')) return false;
        
        return pattern.test(username);
    },

    password(password) {
        if (!password || typeof password !== 'string') return false;
        
        if (password.length < 6 || password.length > 128) return false;
        if (password.trim() !== password || !password.trim()) return false;
        
        return true;
    },

    age(age) {
        const ageNum = parseInt(age);
        return !isNaN(ageNum) && ageNum >= 13 && ageNum <= 120;
    },


    roomName(name) {
        if (!name || typeof name !== 'string') return false;
        
        const trimmed = name.trim();
        if (trimmed.length < 3 || trimmed.length > 100) return false;
        if (!/[a-zA-Z0-9]/.test(trimmed)) return false;
        
        const pattern = /^[a-zA-Z0-9\s\-_]+$/;
        return pattern.test(trimmed);
    },

    url(url) {
        if (!url || typeof url !== 'string') return false;
        
        const pattern = /^https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w/_.])*)?(?:\?(?:[\w&=%.])*)?(?:#(?:\w)*)?$/;
        
        return pattern.test(url) && url.length <= 2048;
    },

    roomCode(code) {
        if (!code || typeof code !== 'string') return false;
        
        return code.length === 8 && /^[A-Z0-9]+$/.test(code);
    },

   roomPassword(password) {
       if (!password || typeof password !== 'string') return false;
       
       const trimmed = password.trim();
       if (trimmed.length < 4 || trimmed.length > 50) return false;
       if (trimmed !== password || !trimmed) return false;
       
       return true;
   },

   passwordStrength(password) {
       if (!password) {
           return {
               score: 0,
               level: 'muito_fraca',
               feedback: ['Senha é obrigatória']
           };
       }

       let score = 0;
       const feedback = [];

       if (password.length >= 8) {
           score += 1;
       } else {
           feedback.push('Use pelo menos 8 caracteres');
       }

       if (password.length >= 12) {
           score += 1;
       } else {
           feedback.push('Senhas com 12+ caracteres são mais seguras');
       }

       if (/[a-z]/.test(password)) {
           score += 1;
       } else {
           feedback.push('Adicione letras minúsculas');
       }

       if (/[A-Z]/.test(password)) {
           score += 1;
       } else {
           feedback.push('Adicione letras maiúsculas');
       }

       if (/\d/.test(password)) {
           score += 1;
       } else {
           feedback.push('Adicione números');
       }

       if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
           score += 1;
       } else {
           feedback.push('Adicione símbolos especiais');
       }

       if (/(.)\1{2,}/.test(password)) {
           score -= 1;
           feedback.push('Evite caracteres repetidos');
       }

       if (/(012|123|234|345|456|567|678|789|890|abc|bcd|cde)/.test(password.toLowerCase())) {
           score -= 1;
           feedback.push('Evite sequências óbvias');
       }

       let level;
       if (score <= 1) {
           level = 'muito_fraca';
       } else if (score <= 2) {
           level = 'fraca';
       } else if (score <= 4) {
           level = 'media';
       } else if (score <= 5) {
           level = 'forte';
       } else {
           level = 'muito_forte';
       }

       return {
           score: Math.max(0, score),
           level,
           feedback: feedback.length ? feedback : ['Senha atende aos critérios básicos']
       };
   },

   maxParticipants(num) {
       const participants = parseInt(num);
       return !isNaN(participants) && participants >= 2 && participants <= 50;
   },

   // Sanitização de string
   sanitizeString(text, maxLength = 255) {
       if (!text || typeof text !== 'string') return '';
       

       let sanitized = text.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
       

       sanitized = sanitized.substring(0, maxLength);
       

       sanitized = sanitized.replace(/\s+/g, ' ').trim();
       
       return sanitized;
   },


   validateForm(formData, rules) {
       const errors = [];
       
       Object.keys(rules).forEach(field => {
           const value = formData[field];
           const rule = rules[field];
           

           if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
               errors.push(`${rule.label || field} é obrigatório`);
               return;
           }
           
           if (value && rule.validator && !rule.validator(value)) {
               errors.push(rule.message || `${rule.label || field} é inválido`);
           }
       });
       
       return {
           isValid: errors.length === 0,
           errors
       };
   }
};

if (typeof window !== 'undefined') {
   window.Validators = Validators;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = Validators;
}