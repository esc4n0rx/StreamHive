"""
Streamhive Room Service
Serviço de gerenciamento de salas
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
import sqlite3
import logging
import secrets
import string

from database.connection import get_db_manager
from database.models import Room, User
from utils.validators import validate_room_name, sanitize_string, validate_url


class RoomService:
    """Serviço de gerenciamento de salas"""
    
    def __init__(self):
        """Inicializa o serviço de salas"""
        self.db = get_db_manager()
        self.logger = logging.getLogger(__name__)
    
    def create_room(self, name: str, description: str, stream_url: str, 
                   max_participants: int, password: Optional[str], owner_id: int) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Cria uma nova sala
        
        Args:
            name: Nome da sala
            description: Descrição da sala
            stream_url: URL de transmissão
            max_participants: Número máximo de participantes
            password: Senha da sala (None para sala pública)
            owner_id: ID do proprietário
            
        Returns:
            Tuple[bool, str, Optional[Dict]]: (sucesso, mensagem, dados_sala)
        """
        try:
            # Validações
            validation_result = self._validate_room_data(name, description, stream_url, max_participants, password)
            if not validation_result[0]:
                return validation_result
            
            # Sanitizar dados
            name = sanitize_string(name.strip(), 100)
            description = sanitize_string(description.strip(), 500)
            stream_url = stream_url.strip()
            
            # Verificar se usuário existe
            owner_query = self.db.execute_query('SELECT id FROM users WHERE id = ? AND is_active = 1', (owner_id,))
            if not owner_query:
                return False, "Usuário não encontrado", None
            
            # Gerar código único da sala
            room_code = self._generate_room_code()
            
            # Inserir sala
            room_id = self.db.execute_insert(
                '''
                INSERT INTO rooms (name, description, stream_url, max_participants, password, owner_id, room_code, is_private)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (name, description, stream_url, max_participants, password, owner_id, room_code, bool(password))
            )
            
            if not room_id:
                return False, "Erro ao criar sala", None
            
            # Adicionar owner como participante
            participant_id = self.db.execute_insert(
                '''
                INSERT INTO room_participants (room_id, user_id, role)
                VALUES (?, ?, 'owner')
                ''',
                (room_id, owner_id)
            )
            
            if not participant_id:
                # Rollback - deletar sala criada
                self.db.execute_update('DELETE FROM rooms WHERE id = ?', (room_id,))
                return False, "Erro ao adicionar participante", None
            
            # Buscar sala criada
            room = self.get_room_by_id(room_id)
            if not room:
                return False, "Erro ao recuperar dados da sala", None
            
            self.logger.info(f"Sala criada: {name} (ID: {room_id}) por usuário {owner_id}")
            
            return True, f"Sala '{name}' criada com sucesso!", room
            
        except Exception as e:
            self.logger.error(f"Erro ao criar sala: {e}")
            return False, "Erro interno do servidor", None
    
    def get_public_rooms(self, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Busca salas públicas ativas
        
        Args:
            limit: Limite de resultados
            offset: Offset para paginação
            
        Returns:
            Lista de salas públicas
        """
        try:
            query = '''
                SELECT 
                    r.*,
                    u.username as owner_username,
                    COUNT(rp.id) as current_participants
                FROM rooms r
                LEFT JOIN users u ON r.owner_id = u.id
                LEFT JOIN room_participants rp ON r.id = rp.room_id AND rp.is_active = 1
                WHERE r.is_active = 1 AND r.is_private = 0
                GROUP BY r.id
                ORDER BY r.created_at DESC
                LIMIT ? OFFSET ?
            '''
            
            rows = self.db.execute_query(query, (limit, offset))
            
            if not rows:
                return []
            
            rooms = []
            for row in rows:
                room_data = dict(row)
                room_data['created_at'] = room_data['created_at']
                rooms.append(room_data)
            
            return rooms
            
        except Exception as e:
            self.logger.error(f"Erro ao buscar salas públicas: {e}")
            return []
    
    def get_room_by_id(self, room_id: int) -> Optional[Dict[str, Any]]:
        """
        Busca sala por ID
        
        Args:
            room_id: ID da sala
            
        Returns:
            Dados da sala ou None
        """
        try:
            query = '''
                SELECT 
                    r.*,
                    u.username as owner_username,
                    COUNT(rp.id) as current_participants
                FROM rooms r
                LEFT JOIN users u ON r.owner_id = u.id
                LEFT JOIN room_participants rp ON r.id = rp.room_id AND rp.is_active = 1
                WHERE r.id = ? AND r.is_active = 1
                GROUP BY r.id
            '''
            
            rows = self.db.execute_query(query, (room_id,))
            
            if rows:
                return dict(rows[0])
            return None
            
        except Exception as e:
            self.logger.error(f"Erro ao buscar sala por ID: {e}")
            return None
    
    def get_room_by_code(self, room_code: str) -> Optional[Dict[str, Any]]:
        """
        Busca sala por código
        
        Args:
            room_code: Código da sala
            
        Returns:
            Dados da sala ou None
        """
        try:
            query = '''
                SELECT 
                    r.*,
                    u.username as owner_username,
                    COUNT(rp.id) as current_participants
                FROM rooms r
                LEFT JOIN users u ON r.owner_id = u.id
                LEFT JOIN room_participants rp ON r.id = rp.room_id AND rp.is_active = 1
                WHERE r.room_code = ? AND r.is_active = 1
                GROUP BY r.id
            '''
            
            rows = self.db.execute_query(query, (room_code,))
            
            if rows:
                return dict(rows[0])
            return None
            
        except Exception as e:
            self.logger.error(f"Erro ao buscar sala por código: {e}")
            return None
    
    def join_room(self, room_id: int, user_id: int, password: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Usuário entra em uma sala
        
        Args:
            room_id: ID da sala
            user_id: ID do usuário
            password: Senha da sala (se privada)
            
        Returns:
            Tuple[bool, str, Optional[Dict]]: (sucesso, mensagem, dados_sala)
        """
        try:
            # Buscar sala
            room = self.get_room_by_id(room_id)
            if not room:
                return False, "Sala não encontrada", None
            
            # Verificar se sala está ativa
            if not room['is_active']:
                return False, "Sala não está disponível", None
            
            # Verificar senha se sala privada
            if room['is_private'] and room['password'] != password:
                return False, "Senha incorreta", None
            
            # Verificar se sala está lotada
            if room['current_participants'] >= room['max_participants']:
                return False, "Sala está lotada", None
            
            # Verificar se usuário já está na sala
            existing_participant = self.db.execute_query(
                'SELECT id FROM room_participants WHERE room_id = ? AND user_id = ? AND is_active = 1',
                (room_id, user_id)
            )
            
            if existing_participant:
                return True, "Você já está nesta sala", room
            
            # Adicionar participante
            participant_id = self.db.execute_insert(
                '''
                INSERT INTO room_participants (room_id, user_id, role)
                VALUES (?, ?, 'participant')
                ''',
                (room_id, user_id)
            )
            
            if not participant_id:
                return False, "Erro ao entrar na sala", None
            
            # Buscar sala atualizada
            updated_room = self.get_room_by_id(room_id)
            
            self.logger.info(f"Usuário {user_id} entrou na sala {room_id}")
            
            return True, f"Bem-vindo à sala '{room['name']}'!", updated_room
            
        except Exception as e:
            self.logger.error(f"Erro ao entrar na sala: {e}")
            return False, "Erro interno do servidor", None
    
    def leave_room(self, room_id: int, user_id: int) -> Tuple[bool, str]:
        """
        Usuário sai de uma sala
        
        Args:
            room_id: ID da sala
            user_id: ID do usuário
            
        Returns:
            Tuple[bool, str]: (sucesso, mensagem)
        """
        try:
            # Desativar participação
            success = self.db.execute_update(
                'UPDATE room_participants SET is_active = 0 WHERE room_id = ? AND user_id = ?',
                (room_id, user_id)
            )
            
            if success:
                self.logger.info(f"Usuário {user_id} saiu da sala {room_id}")
                return True, "Você saiu da sala"
            else:
                return False, "Erro ao sair da sala"
                
        except Exception as e:
            self.logger.error(f"Erro ao sair da sala: {e}")
            return False, "Erro interno do servidor"
    
    def get_user_rooms(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Busca salas do usuário (criadas ou participando)
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Lista de salas do usuário
        """
        try:
            query = '''
                SELECT DISTINCT
                    r.*,
                    u.username as owner_username,
                    COUNT(rp2.id) as current_participants,
                    rp.role as user_role
                FROM rooms r
                LEFT JOIN users u ON r.owner_id = u.id
                LEFT JOIN room_participants rp ON r.id = rp.room_id AND rp.user_id = ? AND rp.is_active = 1
                LEFT JOIN room_participants rp2 ON r.id = rp2.room_id AND rp2.is_active = 1
                WHERE r.is_active = 1 AND (r.owner_id = ? OR rp.id IS NOT NULL)
                GROUP BY r.id
                ORDER BY r.created_at DESC
            '''
            
            rows = self.db.execute_query(query, (user_id, user_id))
            
            if not rows:
                return []
            
            rooms = []
            for row in rows:
                room_data = dict(row)
                rooms.append(room_data)
            
            return rooms
            
        except Exception as e:
            self.logger.error(f"Erro ao buscar salas do usuário: {e}")
            return []
    
    def _validate_room_data(self, name: str, description: str, stream_url: str, 
                       max_participants: int, password: Optional[str]) -> Tuple[bool, str, None]:
        """
        Valida dados da sala
        """
        # Validar nome
        if not validate_room_name(name):
            return False, "Nome da sala deve ter entre 3 e 100 caracteres", None
        
        # Validar descrição
        if len(description.strip()) > 500:
            return False, "Descrição muito longa (máximo 500 caracteres)", None
        
        # Validar URL - verificação mais flexível
        if not stream_url or len(stream_url.strip()) < 10:
            return False, "URL de transmissão é obrigatória", None
        
        # Verificar se começa com http/https
        if not stream_url.strip().startswith(('http://', 'https://')):
            return False, "URL deve começar com http:// ou https://", None
        
        # Validar max participants
        if not isinstance(max_participants, int) or max_participants < 2 or max_participants > 50:
            return False, "Número de participantes deve estar entre 2 e 50", None
        
        # Validar senha se fornecida
        if password is not None and (len(password.strip()) < 4 or len(password.strip()) > 50):
            return False, "Senha deve ter entre 4 e 50 caracteres", None
        
        return True, "", None
        
    def _generate_room_code(self) -> str:
        """
        Gera código único para a sala
        
        Returns:
            Código da sala
        """
        while True:
            # Gerar código alfanumérico de 8 caracteres
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            
            # Verificar se código já existe
            existing = self.db.execute_query('SELECT id FROM rooms WHERE room_code = ?', (code,))
            if not existing:
                return code


# Instância global do serviço
room_service = RoomService()


def get_room_service() -> RoomService:
    """
    Retorna a instância global do serviço de salas
    
    Returns:
        RoomService: Instância do serviço
    """
    return room_service