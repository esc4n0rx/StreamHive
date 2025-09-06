"""
Streamhive Validators
Funções de validação reutilizáveis
"""

import re
from typing import Union


def validate_email(email: str) -> bool:
    """
    Valida formato de email
    
    Args:
        email: Email a ser validado
        
    Returns:
        bool: True se email válido
    """
    if not email or not isinstance(email, str):
        return False
    
    # Padrão RFC 5322 simplificado
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    # Verificações adicionais
    if len(email) > 254:  # RFC 5321
        return False
    
    if '..' in email:  # Pontos consecutivos não permitidos
        return False
    
    if email.startswith('.') or email.endswith('.'):
        return False
    
    return re.match(pattern, email) is not None


def validate_username(username: str) -> bool:
    """
    Valida nome de usuário
    
    Args:
        username: Nome de usuário a ser validado
        
    Returns:
        bool: True se username válido
    """
    if not username or not isinstance(username, str):
        return False
    
    # Verificar comprimento
    if len(username) < 3 or len(username) > 30:
        return False
    
    # Permitir apenas letras, números e underscore
    pattern = r'^[a-zA-Z0-9_]+$'
    
    # Não pode começar ou terminar com underscore
    if username.startswith('_') or username.endswith('_'):
        return False
    
    # Não pode ter underscores consecutivos
    if '__' in username:
        return False
    
    return re.match(pattern, username) is not None


def validate_password(password: str) -> bool:
    """
    Valida senha
    
    Args:
        password: Senha a ser validada
        
    Returns:
        bool: True se senha válida
    """
    if not password or not isinstance(password, str):
        return False
    
    # Verificar comprimento
    if len(password) < 6 or len(password) > 128:
        return False
    
    # Não pode conter apenas espaços
    if password.strip() != password or not password.strip():
        return False
    
    return True


def validate_password_strong(password: str) -> bool:
    if not validate_password(password):
        return False
    
    # Critérios de senha forte
    has_upper = bool(re.search(r'[A-Z]', password))
    has_lower = bool(re.search(r'[a-z]', password))
    has_digit = bool(re.search(r'\d', password))
    has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
    
    # Pelo menos 3 dos 4 critérios
    criteria_met = sum([has_upper, has_lower, has_digit, has_special])
    
    return criteria_met >= 3 and len(password) >= 8


def validate_age(age: Union[int, str]) -> bool:
    """
    Valida idade
    
    Args:
        age: Idade a ser validada
        
    Returns:
        bool: True se idade válida
    """
    try:
        age_int = int(age)
        return 13 <= age_int <= 120
    except (ValueError, TypeError):
        return False


def validate_room_name(name: str) -> bool:
    """
    Valida nome de sala
    
    Args:
        name: Nome da sala a ser validado
        
    Returns:
        bool: True se nome válido
    """
    if not name or not isinstance(name, str):
        return False
    
    # Verificar comprimento
    if len(name.strip()) < 3 or len(name.strip()) > 100:
        return False
    
    # Não pode conter apenas espaços ou caracteres especiais
    if not re.search(r'[a-zA-Z0-9]', name):
        return False
    
    # Caracteres permitidos: letras, números, espaços, hífens, underscores
    pattern = r'^[a-zA-Z0-9\s\-_]+$'
    
    return re.match(pattern, name) is not None


def validate_room_password(password: str) -> bool:
    """
    Valida senha de sala
    
    Args:
        password: Senha da sala a ser validada
        
    Returns:
        bool: True se senha válida
    """
    if not password or not isinstance(password, str):
        return False
    
    # Verificar comprimento
    if len(password.strip()) < 4 or len(password.strip()) > 50:
        return False
    
    # Não pode conter apenas espaços
    if password.strip() != password or not password.strip():
        return False
    
    return True


def sanitize_string(text: str, max_length: int = 255) -> str:
    """
    Sanitiza string removendo caracteres perigosos
    
    Args:
        text: Texto a ser sanitizado
        max_length: Comprimento máximo
        
    Returns:
        str: Texto sanitizado
    """
    if not text or not isinstance(text, str):
        return ""
    
    # Remover caracteres de controle
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    
    # Limitar comprimento
    sanitized = sanitized[:max_length]
    
    # Remover espaços extras
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    
    return sanitized


def validate_url(url: str) -> bool:
    """
    Valida URL básica
    
    Args:
        url: URL a ser validada
        
    Returns:
        bool: True se URL válida
    """
    if not url or not isinstance(url, str):
        return False
    
    # Padrão mais flexível para URLs
    pattern = r'^https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.-])*)?(?:\?(?:[\w&=%.-])*)?(?:#(?:\w)*)?$'
    
    # Verificar se a URL tem um formato básico válido
    basic_check = re.match(r'^https?://.+', url)
    if not basic_check:
        return False
    
    return len(url) <= 2048


def validate_hex_color(color: str) -> bool:
    """
    Valida cor hexadecimal
    
    Args:
        color: Cor a ser validada
        
    Returns:
        bool: True se cor válida
    """
    if not color or not isinstance(color, str):
        return False
    
    pattern = r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
    
    return re.match(pattern, color) is not None


def validate_file_extension(filename: str, allowed_extensions: list) -> bool:
    """
    Valida extensão de arquivo
    
    Args:
        filename: Nome do arquivo
        allowed_extensions: Lista de extensões permitidas
        
    Returns:
        bool: True se extensão válida
    """
    if not filename or not isinstance(filename, str):
        return False
    
    if not allowed_extensions:
        return False
    
    # Extrair extensão
    if '.' not in filename:
        return False
    
    extension = filename.split('.')[-1].lower()
    
    return extension in [ext.lower() for ext in allowed_extensions]


def validate_phone_number(phone: str, country_code: str = 'BR') -> bool:
    """
    Valida número de telefone (básico)
    
    Args:
        phone: Número de telefone
        country_code: Código do país
        
    Returns:
        bool: True se telefone válido
    """
    if not phone or not isinstance(phone, str):
        return False
    
    # Remover caracteres não numéricos
    digits_only = re.sub(r'\D', '', phone)
    
    if country_code == 'BR':
        # Brasil: 10 ou 11 dígitos (com DDD)
        return len(digits_only) in [10, 11] and digits_only.startswith(('11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'))
    
    # Validação genérica: entre 8 e 15 dígitos
    return 8 <= len(digits_only) <= 15


def get_password_strength(password: str) -> dict:
    """
    Analisa força da senha
    
    Args:
        password: Senha a ser analisada
        
    Returns:
        dict: Análise da força da senha
    """
    if not password:
        return {
            'score': 0,
            'level': 'muito_fraca',
            'feedback': ['Senha é obrigatória']
        }
    
    score = 0
    feedback = []
    
    # Critérios de pontuação
    if len(password) >= 8:
        score += 1
    else:
        feedback.append('Use pelo menos 8 caracteres')
    
    if len(password) >= 12:
        score += 1
    else:
        feedback.append('Senhas com 12+ caracteres são mais seguras')
    
    if re.search(r'[a-z]', password):
        score += 1
    else:
        feedback.append('Adicione letras minúsculas')
    
    if re.search(r'[A-Z]', password):
        score += 1
    else:
        feedback.append('Adicione letras maiúsculas')
    
    if re.search(r'\d', password):
        score += 1
    else:
        feedback.append('Adicione números')
    
    if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        score += 1
    else:
        feedback.append('Adicione símbolos especiais')
    
    # Penalidades
    if re.search(r'(.)\1{2,}', password):  # Caracteres repetidos
        score -= 1
        feedback.append('Evite caracteres repetidos')
    
    if re.search(r'(012|123|234|345|456|567|678|789|890|abc|bcd|cde)', password.lower()):
        score -= 1
        feedback.append('Evite sequências óbvias')
    
    # Determinar nível
    if score <= 1:
        level = 'muito_fraca'
    elif score <= 2:
        level = 'fraca'
    elif score <= 4:
        level = 'media'
    elif score <= 5:
        level = 'forte'
    else:
        level = 'muito_forte'
    
    return {
        'score': max(0, score),
        'level': level,
        'feedback': feedback if feedback else ['Senha atende aos critérios básicos']
    }