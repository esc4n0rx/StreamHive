"""
Streamhive Authentication Service
Serviço de autenticação e gerenciamento de usuários
"""

from typing import Optional, Dict, Any, Tuple
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import sqlite3
import logging

from database.connection import get_db_manager
from database.models import User
from utils.validators import validate_email, validate_username, validate_password, validate_age


class AuthService:
    """Serviço de autenticação"""
    
    def __init__(self):
        """Inicializa o serviço de autenticação"""
        self.db = get_db_manager()
        self.logger = logging.getLogger(__name__)
    
    def register_user(self, username: str, email: str, password: str, age: int) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Registra um novo usuário
        
        Args:
            username: Nome de usuário
            email: Email do usuário
            password: Senha em texto plano
            age: Idade do usuário
            
        Returns:
            Tuple[bool, str, Optional[Dict]]: (sucesso, mensagem, dados_usuario)
        """
        try:
            # Validações
            validation_result = self._validate_registration_data(username, email, password, age)
            if not validation_result[0]:
                return validation_result
            
            # Verificar se usuário ou email já existem
            existing_user = self._check_existing_user(username, email)
            if existing_user:
                return False, existing_user, None
            
            # Hash da senha
            password_hash = generate_password_hash(
                password, 
                method='pbkdf2:sha256', 
                salt_length=16
            )
            
            # Inserir usuário
            user_id = self.db.execute_insert(
                '''
                INSERT INTO users (username, email, password_hash, age)
                VALUES (?, ?, ?, ?)
                ''',
                (username, email.lower(), password_hash, age)
            )
            
            if not user_id:
                return False, "Erro interno ao criar conta", None
            
            # Buscar usuário criado
            user = self.get_user_by_id(user_id)
            if not user:
                return False, "Erro ao recuperar dados do usuário", None
            
            self.logger.info(f"Usuário registrado: {username} (ID: {user_id})")
            
            return True, f"Bem-vindo ao Streamhive, {username}!", user.to_dict()
            
        except sqlite3.IntegrityError as e:
            error_msg = str(e).lower()
            if 'username' in error_msg:
                return False, "Nome de usuário já existe", None
            elif 'email' in error_msg:
                return False, "Email já está em uso", None
            else:
                return False, "Erro ao criar conta", None
                
        except Exception as e:
            self.logger.error(f"Erro no registro: {e}")
            return False, "Erro interno do servidor", None
    
    def login_user(self, username: str, password: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Autentica um usuário
        
        Args:
            username: Nome de usuário
            password: Senha em texto plano
            
        Returns:
            Tuple[bool, str, Optional[Dict]]: (sucesso, mensagem, dados_usuario)
        """
        try:
            # Validações básicas
            if not username or not password:
                return False, "Nome de usuário e senha são obrigatórios", None
            
            if len(username.strip()) < 3:
                return False, "Nome de usuário inválido", None
            
            # Buscar usuário
            user = self.get_user_by_username(username.strip())
            if not user:
                return False, "Nome de usuário ou senha incorretos", None
            
            # Verificar se conta está ativa
            if not user.is_active:
                return False, "Conta desativada", None
            
            # Verificar senha
            if not check_password_hash(user.password_hash, password):
                return False, "Nome de usuário ou senha incorretos", None
            
            # Atualizar último login
            self._update_last_login(user.id)
            
            self.logger.info(f"Login realizado: {username} (ID: {user.id})")
            
            return True, f"Bem-vindo de volta, {user.username}!", user.to_dict()
            
        except Exception as e:
            self.logger.error(f"Erro no login: {e}")
            return False, "Erro interno do servidor", None
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Busca usuário por ID
        
        Args:
            user_id: ID do usuário
            
        Returns:
            User ou None se não encontrado
        """
        try:
            rows = self.db.execute_query(
                'SELECT * FROM users WHERE id = ? AND is_active = 1',
                (user_id,)
            )
            
            if rows:
                return User.from_row(rows[0])
            return None
            
        except Exception as e:
            self.logger.error(f"Erro ao buscar usuário por ID: {e}")
            return None
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """
        Busca usuário por nome de usuário
        
        Args:
            username: Nome de usuário
            
        Returns:
            User ou None se não encontrado
        """
        try:
            rows = self.db.execute_query(
                'SELECT * FROM users WHERE username = ? AND is_active = 1',
                (username,)
            )
            
            if rows:
                return User.from_row(rows[0])
            return None
            
        except Exception as e:
            self.logger.error(f"Erro ao buscar usuário por username: {e}")
            return None
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Busca usuário por email
        
        Args:
            email: Email do usuário
            
        Returns:
            User ou None se não encontrado
        """
        try:
            rows = self.db.execute_query(
                'SELECT * FROM users WHERE email = ? AND is_active = 1',
                (email.lower(),)
            )
            
            if rows:
                return User.from_row(rows[0])
            return None
            
        except Exception as e:
            self.logger.error(f"Erro ao buscar usuário por email: {e}")
            return None
    
    def update_user_password(self, user_id: int, new_password: str) -> Tuple[bool, str]:
        """
        Atualiza a senha de um usuário
        
        Args:
            user_id: ID do usuário
            new_password: Nova senha em texto plano
            
        Returns:
            Tuple[bool, str]: (sucesso, mensagem)
        """
        try:
            # Validar nova senha
            if not validate_password(new_password):
                return False, "Senha deve ter entre 6 e 128 caracteres"
            
            # Hash da nova senha
            password_hash = generate_password_hash(
                new_password,
                method='pbkdf2:sha256',
                salt_length=16
            )
            
            # Atualizar no banco
            success = self.db.execute_update(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                (password_hash, user_id)
            )
            
            if success:
                self.logger.info(f"Senha atualizada para usuário ID: {user_id}")
                return True, "Senha atualizada com sucesso"
            else:
                return False, "Erro ao atualizar senha"
                
        except Exception as e:
            self.logger.error(f"Erro ao atualizar senha: {e}")
            return False, "Erro interno do servidor"
    
    def deactivate_user(self, user_id: int) -> Tuple[bool, str]:
        """
        Desativa uma conta de usuário
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Tuple[bool, str]: (sucesso, mensagem)
        """
        try:
            success = self.db.execute_update(
                'UPDATE users SET is_active = 0 WHERE id = ?',
                (user_id,)
            )
            
            if success:
                self.logger.info(f"Usuário desativado ID: {user_id}")
                return True, "Conta desativada com sucesso"
            else:
                return False, "Erro ao desativar conta"
                
        except Exception as e:
            self.logger.error(f"Erro ao desativar usuário: {e}")
            return False, "Erro interno do servidor"
    
    def get_user_stats(self) -> Dict[str, Any]:
        """
        Retorna estatísticas de usuários
        
        Returns:
            Dicionário com estatísticas
        """
        try:
            return self.db.get_database_stats()
        except Exception as e:
            self.logger.error(f"Erro ao obter estatísticas: {e}")
            return {}
    
    def _validate_registration_data(self, username: str, email: str, password: str, age: int) -> Tuple[bool, str, None]:
        """
        Valida dados de registro
        
        Args:
            username: Nome de usuário
            email: Email
            password: Senha
            age: Idade
            
        Returns:
            Tuple[bool, str, None]: (válido, mensagem_erro, None)
        """
        # Validar campos obrigatórios
        if not all([username, email, password]) or age is None:
            return False, "Todos os campos são obrigatórios", None
        
        # Validar username
        if not validate_username(username):
            return False, "Nome de usuário deve ter 3-30 caracteres e conter apenas letras, números e underscore", None
        
        # Validar email
        if not validate_email(email):
            return False, "Email inválido", None
        
        # Validar senha
        if not validate_password(password):
            return False, "Senha deve ter entre 6 e 128 caracteres", None
        
        # Validar idade
        if not validate_age(age):
            return False, "Idade deve estar entre 13 e 120 anos", None
        
        return True, "", None
    
    def _check_existing_user(self, username: str, email: str) -> Optional[str]:
        """
        Verifica se usuário ou email já existem
        
        Args:
            username: Nome de usuário
            email: Email
            
        Returns:
            Mensagem de erro ou None se não existe
        """
        try:
            # Verificar username
            if self.get_user_by_username(username):
                return "Nome de usuário já existe"
            
            # Verificar email
            if self.get_user_by_email(email):
                return "Email já está em uso"
            
            return None
            
        except Exception:
            return "Erro ao verificar dados existentes"
    
    def _update_last_login(self, user_id: int) -> bool:
        """
        Atualiza o timestamp do último login
        
        Args:
            user_id: ID do usuário
            
        Returns:
            True se atualizado com sucesso
        """
        try:
            return self.db.execute_update(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                (user_id,)
            )
        except Exception as e:
            self.logger.error(f"Erro ao atualizar last_login: {e}")
            return False


# Instância global do serviço
auth_service = AuthService()


def get_auth_service() -> AuthService:
    """
    Retorna a instância global do serviço de autenticação
    
    Returns:
        AuthService: Instância do serviço
    """
    return auth_service