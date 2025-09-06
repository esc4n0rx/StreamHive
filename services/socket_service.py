"""
Streamhive Socket Service
Gerenciamento de WebSockets e sincronização de salas
"""

from flask import session, request
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from typing import Dict, Any, Optional, List
import logging
import time
import json
from datetime import datetime

from database.connection import get_db_manager
from services.room_service import get_room_service
from services.auth_service import get_auth_service

# Estrutura global para armazenar estado das salas
room_states: Dict[str, Dict[str, Any]] = {}
user_rooms: Dict[str, str] = {}  # user_id -> room_id


class SocketService:
    """Serviço de gerenciamento de WebSockets"""
    
    def __init__(self, socketio: SocketIO):
        """
        Inicializa o serviço de socket
        
        Args:
            socketio: Instância do Flask-SocketIO
        """
        self.socketio = socketio
        self.db = get_db_manager()
        self.room_service = get_room_service()
        self.auth_service = get_auth_service()
        self.logger = logging.getLogger(__name__)
        
        # Registrar event handlers
        self.register_handlers()
    
    def register_handlers(self):
        """Registra todos os event handlers do socket"""
        
        @self.socketio.on('connect')
        def handle_connect(auth):
            """Conexão do cliente"""
            try:
                # Verificar autenticação
                if 'user_id' not in session:
                    self.logger.warning("Conexão não autenticada rejeitada")
                    disconnect()
                    return False
                
                user_id = str(session['user_id'])
                username = session.get('username', 'Usuário')
                
                self.logger.info(f"Usuário {username} conectado via Socket.IO")
                
                emit('connected', {
                    'status': 'success',
                    'message': f'Conectado como {username}',
                    'user_id': user_id,
                    'username': username
                })
                
                return True
                
            except Exception as e:
                self.logger.error(f"Erro na conexão: {e}")
                disconnect()
                return False
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            """Desconexão do cliente"""
            try:
                if 'user_id' in session:
                    user_id = str(session['user_id'])
                    username = session.get('username', 'Usuário')
                    
                    # Remover usuário de qualquer sala
                    if user_id in user_rooms:
                        room_id = user_rooms[user_id]
                        self.handle_leave_room_internal(user_id, room_id)
                    
                    self.logger.info(f"Usuário {username} desconectado")
                    
            except Exception as e:
                self.logger.error(f"Erro na desconexão: {e}")
        
        @self.socketio.on('join_room')
        def handle_join_room(data):
            """Usuário entra em uma sala"""
            try:
                if 'user_id' not in session:
                    emit('error', {'message': 'Não autenticado'})
                    return
                
                user_id = str(session['user_id'])
                username = session.get('username', 'Usuário')
                room_id = str(data.get('room_id'))
                
                # Verificar se usuário tem permissão para estar na sala
                room_data = self.room_service.get_room_by_id(int(room_id))
                if not room_data:
                    emit('error', {'message': 'Sala não encontrada'})
                    return
                
                # Verificar se usuário é participante da sala
                participant_query = self.db.execute_query(
                    'SELECT role FROM room_participants WHERE room_id = ? AND user_id = ? AND is_active = 1',
                    (int(room_id), int(user_id))
                )
                
                if not participant_query:
                    emit('error', {'message': 'Sem permissão para esta sala'})
                    return
                
                user_role = participant_query[0]['role']
                
                # Sair de sala anterior se estiver em alguma
                if user_id in user_rooms:
                    old_room_id = user_rooms[user_id]
                    if old_room_id != room_id:
                        self.handle_leave_room_internal(user_id, old_room_id)
                
                # Entrar na nova sala
                join_room(room_id)
                user_rooms[user_id] = room_id
                
                # Inicializar estado da sala se não existir
                if room_id not in room_states:
                    room_states[room_id] = {
                        'video_url': room_data['stream_url'],
                        'current_time': 0,
                        'is_playing': False,
                        'last_update': time.time(),
                        'participants': {},
                        'chat_messages': []
                    }
                
                # Adicionar usuário aos participantes
                room_states[room_id]['participants'][user_id] = {
                    'username': username,
                    'role': user_role,
                    'joined_at': time.time()
                }
                
                # Notificar entrada do usuário
                emit('user_joined', {
                    'user_id': user_id,
                    'username': username,
                    'role': user_role,
                    'participants_count': len(room_states[room_id]['participants'])
                }, room=room_id)


                current_video_time = room_states[room_id]['current_time']

                if room_states[room_id]['is_playing']:
                    elapsed_time = time.time() - room_states[room_id]['last_update']
                    current_video_time += elapsed_time
                    
                    # Atualizar o estado da sala com o tempo atual
                    room_states[room_id]['current_time'] = current_video_time
                    room_states[room_id]['last_update'] = time.time()
                
                emit('room_state', {
                    'video_url': room_states[room_id]['video_url'],
                    'current_time': current_video_time,
                    'is_playing': room_states[room_id]['is_playing'],
                    'participants': room_states[room_id]['participants'],
                    'chat_messages': room_states[room_id]['chat_messages'][-50:],
                    'user_role': user_role,
                    'room_owner_id': room_data['owner_id'],
                    'timestamp': time.time()  # Adicionar timestamp para compensar latência
                })
                
                self.logger.info(f"Usuário {username} entrou na sala {room_id}")
                
            except Exception as e:
                self.logger.error(f"Erro ao entrar na sala: {e}")
                emit('error', {'message': 'Erro interno do servidor'})
        
        @self.socketio.on('leave_room')
        def handle_leave_room(data):
            """Usuário sai de uma sala"""
            try:
                if 'user_id' not in session:
                    return
                
                user_id = str(session['user_id'])
                room_id = str(data.get('room_id'))
                
                self.handle_leave_room_internal(user_id, room_id)
                
            except Exception as e:
                self.logger.error(f"Erro ao sair da sala: {e}")
        
        @self.socketio.on('video_action')
        def handle_video_action(data):
            """Controles de vídeo (play, pause, seek)"""
            try:
                if 'user_id' not in session:
                    emit('error', {'message': 'Não autenticado'})
                    return
                
                user_id = str(session['user_id'])
                room_id = str(data.get('room_id'))
                action = data.get('action')  # 'play', 'pause', 'seek'
                
                # Verificar se usuário está na sala
                if user_id not in user_rooms or user_rooms[user_id] != room_id:
                    emit('error', {'message': 'Você não está nesta sala'})
                    return
                
                # Verificar se usuário é owner
                room_data = self.room_service.get_room_by_id(int(room_id))
                if not room_data or str(room_data['owner_id']) != user_id:
                    emit('error', {'message': 'Apenas o dono pode controlar o vídeo'})
                    return
                
                # Aplicar ação
                if room_id in room_states:
                    current_time = time.time()
                    
                    if action == 'play':
                        room_states[room_id]['is_playing'] = True
                        room_states[room_id]['last_update'] = current_time
                        
                    elif action == 'pause':
                        # Atualizar tempo atual baseado no tempo decorrido
                        if room_states[room_id]['is_playing']:
                            elapsed = current_time - room_states[room_id]['last_update']
                            room_states[room_id]['current_time'] += elapsed
                        
                        room_states[room_id]['is_playing'] = False
                        room_states[room_id]['last_update'] = current_time
                        
                    elif action == 'seek':
                        seek_time = data.get('time', 0)
                        room_states[room_id]['current_time'] = seek_time
                        room_states[room_id]['last_update'] = current_time
                    
                    # Transmitir ação para todos na sala
                    emit('video_sync', {
                        'action': action,
                        'current_time': room_states[room_id]['current_time'],
                        'is_playing': room_states[room_id]['is_playing'],
                        'time': data.get('time') if action == 'seek' else None,
                        'timestamp': current_time
                    }, room=room_id)
                    
                    self.logger.info(f"Ação de vídeo '{action}' na sala {room_id} por usuário {user_id}")
                
            except Exception as e:
                self.logger.error(f"Erro na ação de vídeo: {e}")
                emit('error', {'message': 'Erro interno do servidor'})
        
        @self.socketio.on('chat_message')
        def handle_chat_message(data):
            """Mensagem do chat"""
            try:
                if 'user_id' not in session:
                    emit('error', {'message': 'Não autenticado'})
                    return
                
                user_id = str(session['user_id'])
                username = session.get('username', 'Usuário')
                room_id = str(data.get('room_id'))
                message = data.get('message', '').strip()
                
                # Validações
                if not message or len(message) > 500:
                    emit('error', {'message': 'Mensagem inválida'})
                    return
                
                # Verificar se usuário está na sala
                if user_id not in user_rooms or user_rooms[user_id] != room_id:
                    emit('error', {'message': 'Você não está nesta sala'})
                    return
                
                # Criar mensagem
                chat_message = {
                    'id': f"{user_id}_{int(time.time() * 1000)}",
                    'user_id': user_id,
                    'username': username,
                    'message': message,
                    'timestamp': time.time(),
                    'formatted_time': datetime.now().strftime('%H:%M')
                }
                
                # Adicionar à sala
                if room_id in room_states:
                    room_states[room_id]['chat_messages'].append(chat_message)
                    
                    # Manter apenas últimas 100 mensagens
                    if len(room_states[room_id]['chat_messages']) > 100:
                        room_states[room_id]['chat_messages'] = room_states[room_id]['chat_messages'][-100:]
                
                # Transmitir mensagem
                emit('new_message', chat_message, room=room_id)
                
                self.logger.info(f"Mensagem de chat na sala {room_id} por {username}")
                
            except Exception as e:
                self.logger.error(f"Erro na mensagem de chat: {e}")
                emit('error', {'message': 'Erro interno do servidor'})
        
        @self.socketio.on('kick_user')
        def handle_kick_user(data):
            """Owner expulsa usuário da sala"""
            try:
                if 'user_id' not in session:
                    emit('error', {'message': 'Não autenticado'})
                    return
                
                owner_id = str(session['user_id'])
                room_id = str(data.get('room_id'))
                target_user_id = str(data.get('user_id'))
                
                # Verificar se é owner
                room_data = self.room_service.get_room_by_id(int(room_id))
                if not room_data or str(room_data['owner_id']) != owner_id:
                    emit('error', {'message': 'Apenas o dono pode expulsar usuários'})
                    return
                
                # Não pode expulsar a si mesmo
                if owner_id == target_user_id:
                    emit('error', {'message': 'Você não pode expulsar a si mesmo'})
                    return
                
                # Remover usuário da sala no banco
                self.db.execute_update(
                    'UPDATE room_participants SET is_active = 0 WHERE room_id = ? AND user_id = ?',
                    (int(room_id), int(target_user_id))
                )
                
                # Remover do estado da sala
                if room_id in room_states and target_user_id in room_states[room_id]['participants']:
                    username = room_states[room_id]['participants'][target_user_id]['username']
                    del room_states[room_id]['participants'][target_user_id]
                    
                    # Notificar expulsão
                    emit('user_kicked', {
                        'user_id': target_user_id,
                        'username': username,
                        'message': f'{username} foi removido da sala'
                    }, room=room_id)
                    
                    # Desconectar usuário da sala
                    if target_user_id in user_rooms:
                        del user_rooms[target_user_id]
                
                self.logger.info(f"Usuário {target_user_id} expulso da sala {room_id} por {owner_id}")
                
            except Exception as e:
                self.logger.error(f"Erro ao expulsar usuário: {e}")
                emit('error', {'message': 'Erro interno do servidor'})
        
        @self.socketio.on('delete_room')
        def handle_delete_room(data):
            """Owner deleta a sala"""
            try:
                if 'user_id' not in session:
                    emit('error', {'message': 'Não autenticado'})
                    return
                
                owner_id = str(session['user_id'])
                room_id = str(data.get('room_id'))
                
                # Verificar se é owner
                room_data = self.room_service.get_room_by_id(int(room_id))
                if not room_data or str(room_data['owner_id']) != owner_id:
                    emit('error', {'message': 'Apenas o dono pode deletar a sala'})
                    return
                
                # Desativar sala no banco
                self.db.execute_update(
                    'UPDATE rooms SET is_active = 0 WHERE id = ?',
                    (int(room_id),)
                )
                
                # Remover todos os participantes
                self.db.execute_update(
                    'UPDATE room_participants SET is_active = 0 WHERE room_id = ?',
                    (int(room_id),)
                )
                
                # Notificar todos na sala
                emit('room_deleted', {
                    'message': 'A sala foi encerrada pelo proprietário',
                    'redirect': '/dashboard'
                }, room=room_id)
                
                # Limpar estado da sala
                if room_id in room_states:
                    del room_states[room_id]
                
                # Remover usuários do mapeamento
                users_to_remove = [uid for uid, rid in user_rooms.items() if rid == room_id]
                for user_id in users_to_remove:
                    del user_rooms[user_id]
                
                self.logger.info(f"Sala {room_id} deletada por {owner_id}")
                
            except Exception as e:
                self.logger.error(f"Erro ao deletar sala: {e}")
                emit('error', {'message': 'Erro interno do servidor'})
    
    def handle_leave_room_internal(self, user_id: str, room_id: str):
        """Lógica interna para usuário sair da sala"""
        try:
            if room_id in room_states and user_id in room_states[room_id]['participants']:
                username = room_states[room_id]['participants'][user_id]['username']
                del room_states[room_id]['participants'][user_id]
                
                # Notificar saída
                emit('user_left', {
                    'user_id': user_id,
                    'username': username,
                    'participants_count': len(room_states[room_id]['participants'])
                }, room=room_id)
            
            # Remover do mapeamento
            if user_id in user_rooms:
                del user_rooms[user_id]
            
            # Sair da sala do socket
            leave_room(room_id)
            
            self.logger.info(f"Usuário {user_id} saiu da sala {room_id}")
            
        except Exception as e:
            self.logger.error(f"Erro ao sair da sala internamente: {e}")


# Instância global (será inicializada no app.py)
socket_service = None


def get_socket_service() -> Optional[SocketService]:
    """
    Retorna a instância global do serviço de socket
    
    Returns:
        SocketService: Instância do serviço
    """
    return socket_service


def init_socket_service(socketio: SocketIO) -> SocketService:
    """
    Inicializa o serviço de socket
    
    Args:
        socketio: Instância do Flask-SocketIO
        
    Returns:
        SocketService: Instância inicializada
    """
    global socket_service
    socket_service = SocketService(socketio)
    return socket_service