"""
Streamhive - Aplicação Principal
Plataforma de streaming social sincronizado
"""

from flask import Flask, render_template, request, redirect, url_for, session, jsonify, make_response
from flask_socketio import SocketIO
from datetime import datetime, timedelta
import os
import logging

# Imports locais
from database.connection import init_database
from services.auth_service import get_auth_service
from services.room_service import get_room_service
from services.socket_service import init_socket_service
from proxy_server import get_proxy_server
from utils.validators import sanitize_string

# Configuração da aplicação
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'streamhive-secret-key-2024')

# Configurações de segurança
app.config['SESSION_COOKIE_SECURE'] = False  # True em produção com HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# Inicializar Socket.IO
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True,
    async_mode='threading'
)

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Instância dos serviços
auth_service = get_auth_service()
room_service = get_room_service()
proxy_server = get_proxy_server()

# Inicializar serviço de socket
socket_service = init_socket_service(socketio)


@app.route('/')
def index():
    """Página inicial com cache headers otimizado"""
    try:
        response = make_response(render_template('index.html'))
        response.headers['Cache-Control'] = 'public, max-age=3600'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        return response
    except Exception as e:
        logger.error(f"Erro na página inicial: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@app.route('/register', methods=['POST'])
def register():
    """Endpoint para registro de usuário"""
    try:
        # Verificar Content-Type
        if not request.is_json:
            return jsonify({
                'success': False, 
                'message': 'Content-Type deve ser application/json'
            }), 400
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False, 
                'message': 'Dados JSON inválidos'
            }), 400
        
        # Extrair e sanitizar dados
        username = sanitize_string(data.get('username', '').strip(), 30)
        email = sanitize_string(data.get('email', '').strip().lower(), 254)
        password = data.get('password', '').strip()
        
        try:
            age = int(data.get('age', 0))
        except (ValueError, TypeError):
            return jsonify({
                'success': False, 
                'message': 'Idade deve ser um número válido'
            }), 400
        
        # Registrar usuário através do serviço
        success, message, user_data = auth_service.register_user(username, email, password, age)
        
        if success:
            # Criar sessão
            session.permanent = True
            session['user_id'] = user_data['id']
            session['username'] = user_data['username']
            session['created_at'] = datetime.now().isoformat()
            
            logger.info(f"Usuário registrado com sucesso: {username}")
            
            return jsonify({
                'success': True,
                'message': message,
                'redirect': url_for('dashboard')
            }), 201
        else:
            status_code = 409 if 'já existe' in message or 'já está em uso' in message else 400
            return jsonify({
                'success': False,
                'message': message
            }), status_code
            
    except Exception as e:
        logger.error(f"Erro no registro: {e}")
        return jsonify({
            'success': False, 
            'message': 'Erro interno do servidor'
        }), 500


@app.route('/login', methods=['POST'])
def login():
    """Endpoint para login de usuário"""
    try:
        # Verificar Content-Type
        if not request.is_json:
            return jsonify({
                'success': False, 
                'message': 'Content-Type deve ser application/json'
            }), 400
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False, 
                'message': 'Dados JSON inválidos'
            }), 400
        
        # Extrair e sanitizar dados
        username = sanitize_string(data.get('username', '').strip(), 30)
        password = data.get('password', '').strip()
        
        # Autenticar usuário através do serviço
        success, message, user_data = auth_service.login_user(username, password)
        
        if success:
            # Criar sessão
            session.permanent = True
            session['user_id'] = user_data['id']
            session['username'] = user_data['username']
            session['login_at'] = datetime.now().isoformat()
            
            logger.info(f"Login realizado com sucesso: {username}")
            
            return jsonify({
                'success': True,
                'message': message,
                'redirect': url_for('dashboard')
            })
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 401
            
    except Exception as e:
        logger.error(f"Erro no login: {e}")
        return jsonify({
            'success': False, 
            'message': 'Erro interno do servidor'
        }), 500


@app.route('/logout')
def logout():
    """Logout do usuário"""
    try:
        username = session.get('username', 'Usuário')
        user_id = session.get('user_id')
        
        # Limpar sessão
        session.clear()
        
        logger.info(f"Logout realizado: {username} (ID: {user_id})")
        
        # Redirecionar para home
        response = make_response(redirect(url_for('index')))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response
        
    except Exception as e:
        logger.error(f"Erro no logout: {e}")
        return redirect(url_for('index'))


@app.route('/dashboard')
def dashboard():
    """Dashboard do usuário"""
    try:
        # Verificar autenticação
        if 'user_id' not in session:
            return redirect(url_for('index'))
        
        user_id = session['user_id']
        username = session.get('username', 'Usuário')
        
        # Buscar dados atualizados do usuário
        user = auth_service.get_user_by_id(user_id)
        if not user:
            session.clear()
            return redirect(url_for('index'))
        
        # Buscar salas públicas
        public_rooms = room_service.get_public_rooms(limit=12)
        
        # Buscar salas do usuário
        user_rooms = room_service.get_user_rooms(user_id)
        
        # Preparar dados para o template
        dashboard_data = {
            'user': user.to_dict(),
            'stats': auth_service.get_user_stats(),
            'public_rooms': public_rooms,
            'user_rooms': user_rooms
        }
        
        # Renderizar dashboard
        html_content = render_template('dashboard.html', **dashboard_data)
        response = make_response(html_content)
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        
        return response
        
    except Exception as e:
        logger.error(f"Erro no dashboard: {e}")
        return redirect(url_for('index'))


@app.route('/room/<int:room_id>')
def room_view(room_id):
    """Visualização da sala"""
    try:
        # Verificar autenticação
        if 'user_id' not in session:
            return redirect(url_for('index'))
        
        user_id = session['user_id']
        
        # Buscar dados da sala
        room = room_service.get_room_by_id(room_id)
        if not room:
            return redirect(url_for('dashboard'))
        
        # Verificar se usuário está na sala
        participant_query = room_service.db.execute_query(
            'SELECT role FROM room_participants WHERE room_id = ? AND user_id = ? AND is_active = 1',
            (room_id, user_id)
        )
        
        if not participant_query:
            return redirect(url_for('dashboard'))
        
        user_role = participant_query[0]['role']

        # Adicionar informações do provedor para o template
        provider_details = {
            'external': {'name': 'Externo', 'icon': '🔗'},
            'youtube': {'name': 'YouTube', 'icon': '📺'},
            'netflix': {'name': 'Netflix', 'icon': '🎬'}
        }
        provider_info = provider_details.get(room['provider_type'], provider_details['external'])
        
        # Preparar dados para o template
        room_data = {
            'room': room,
            'user_id': user_id,
            'user_role': user_role,
            'is_owner': room['owner_id'] == user_id,
            'provider_info': provider_info  # Nova informação
        }
        
        # Renderizar template da sala
        html_content = render_template('room.html', **room_data)
        response = make_response(html_content)
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        
        return response
        
    except Exception as e:
        logger.error(f"Erro na visualização da sala: {e}")
        return redirect(url_for('dashboard'))


# Rotas do proxy
@app.route('/proxy/stream')
def proxy_stream():
    """Proxy para streams HTTP"""
    try:
        url = request.args.get('url')
        if not url:
            return jsonify({'error': 'URL não fornecida'}), 400
        
        # Verificar se usuário está autenticado
        if 'user_id' not in session:
            return jsonify({'error': 'Não autenticado'}), 401
        
        # Fazer proxy do stream
        response = proxy_server.proxy_stream(url)
        if response:
            return response
        else:
            return jsonify({'error': 'Erro no proxy'}), 500
            
    except Exception as e:
        logger.error(f"Erro no proxy: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@app.route('/api/video/info')
def api_video_info():
    """API para obter informações do vídeo"""
    try:
        # Verificar autenticação
        if 'user_id' not in session:
            return jsonify({'error': 'Não autenticado'}), 401
        
        url = request.args.get('url')
        if not url:
            return jsonify({'error': 'URL não fornecida'}), 400
        
        # Obter informações do vídeo
        info = proxy_server.get_video_info(url)
        if info:
            return jsonify({
                'success': True,
                'info': info
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Não foi possível obter informações do vídeo'
            }), 400
            
    except Exception as e:
        logger.error(f"Erro ao obter info do vídeo: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


# Rotas da API existentes (mantidas)
@app.route('/api/rooms', methods=['GET'])
def api_get_rooms():
    """API para listar salas públicas"""
    try:
        # Verificar autenticação
        if 'user_id' not in session:
            return jsonify({'error': 'Não autenticado'}), 401
        
        # Parâmetros de paginação
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 12)), 50)
        offset = (page - 1) * limit
        
        # Buscar salas públicas
        rooms = room_service.get_public_rooms(limit=limit, offset=offset)
        
        return jsonify({
            'success': True,
            'rooms': rooms,
            'pagination': {
                'page': page,
                'limit': limit,
                'has_more': len(rooms) == limit
            }
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar salas: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@app.route('/api/rooms', methods=['POST'])
def api_create_room():
    """API para criar nova sala"""
    try:
        # Verificar autenticação
        if 'user_id' not in session:
            return jsonify({'error': 'Não autenticado'}), 401
        
        # Verificar Content-Type
        if not request.is_json:
            return jsonify({
                'success': False, 
                'message': 'Content-Type deve ser application/json'
            }), 400
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False, 
                'message': 'Dados JSON inválidos'
            }), 400
        
        user_id = session['user_id']
        
        # Extrair e sanitizar dados
        name = sanitize_string(data.get('name', '').strip(), 100)
        description = sanitize_string(data.get('description', '').strip(), 500)
        stream_url = data.get('stream_url', '').strip()
        provider_type = data.get('provider_type', 'external').strip()

        if provider_type == 'netflix':
            stream_url = 'https://www.netflix.com'
        else:
            stream_url = data.get('stream_url', '').strip()
        
        try:
            max_participants = int(data.get('max_participants', 10))
        except (ValueError, TypeError):
            return jsonify({
                'success': False, 
                'message': 'Número de participantes deve ser um número válido'
            }), 400
        
        # Senha (opcional)
        password = data.get('password', '').strip() if data.get('password') else None
        
        # Criar sala através do serviço
        success, message, room_data = room_service.create_room(
            name=name,
            description=description,
            stream_url=stream_url,
            max_participants=max_participants,
            password=password,
            owner_id=user_id,
            provider_type=provider_type
        )
        
        if success:
            logger.info(f"Sala {provider_type} criada: {name} por usuário {user_id}")
            
            return jsonify({
                'success': True,
                'message': message,
                'room': room_data,
                'redirect': url_for('room_view', room_id=room_data['id'])
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
            
    except Exception as e:
        logger.error(f"Erro ao criar sala: {e}")
        return jsonify({
            'success': False, 
            'message': 'Erro interno do servidor'
        }), 500


@app.route('/api/rooms/join', methods=['POST'])
def api_join_room():
    """API para entrar em uma sala"""
    try:
        # Verificar autenticação
        if 'user_id' not in session:
            return jsonify({'error': 'Não autenticado'}), 401
        
        # Verificar Content-Type
        if not request.is_json:
            return jsonify({
                'success': False, 
                'message': 'Content-Type deve ser application/json'
            }), 400
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False, 
                'message': 'Dados JSON inválidos'
            }), 400
        
        user_id = session['user_id']
        
        # Extrair dados
        room_id = data.get('room_id')
        room_code = data.get('room_code', '').strip()
        password = data.get('password', '').strip() if data.get('password') else None
        
        # Buscar sala por ID ou código
        if room_id:
            try:
                room_id = int(room_id)
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'message': 'ID da sala inválido'
                }), 400
        elif room_code:
            room = room_service.get_room_by_code(room_code)
            if not room:
                return jsonify({
                    'success': False,
                    'message': 'Sala não encontrada'
                }), 404
            room_id = room['id']
        else:
            return jsonify({
                'success': False,
                'message': 'ID ou código da sala é obrigatório'
            }), 400
        
        # Entrar na sala através do serviço
       # Entrar na sala através do serviço
        success, message, room_data = room_service.join_room(
            room_id=room_id,
            user_id=user_id,
            password=password
        )
        
        if success:
            logger.info(f"Usuário {user_id} entrou na sala {room_id}")
            
            return jsonify({
                'success': True,
                'message': message,
                'room': room_data,
                'redirect': url_for('room_view', room_id=room_id)
            })
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
            
    except Exception as e:
        logger.error(f"Erro ao entrar na sala: {e}")
        return jsonify({
            'success': False, 
            'message': 'Erro interno do servidor'
        }), 500


@app.route('/api/user/profile')
def user_profile():
    """API para obter perfil do usuário"""
    try:
        # Verificar autenticação
        if 'user_id' not in session:
            return jsonify({'error': 'Não autenticado'}), 401
        
        user_id = session['user_id']
        
        # Buscar usuário
        user = auth_service.get_user_by_id(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter perfil: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@app.route('/health')
def health_check():
    """Health check endpoint para Docker"""
    try:
        # Verificar se a aplicação está funcionando
        return jsonify({
            'status': 'healthy',
            'app': 'Streamhive',
            'version': '1.0.0',
            'timestamp': datetime.now().isoformat(),
            'uptime': 'ok',
            'database': 'connected'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 503

@app.route('/api/stats')
def api_stats():
    """API para estatísticas da plataforma"""
    try:
        stats = auth_service.get_user_stats()
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


# Error Handlers
@app.errorhandler(404)
def not_found(error):
    """Página 404 personalizada"""
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Endpoint não encontrado'}), 404
    
    try:
        response = make_response(render_template('404.html'))
        response.headers['Cache-Control'] = 'public, max-age=3600'
        return response, 404
    except:
        return jsonify({'error': 'Página não encontrada'}), 404


@app.errorhandler(500)
def server_error(error):
    """Página 500 personalizada"""
    logger.error(f'Erro 500: {str(error)}')
    
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Erro interno do servidor'}), 500
    
    try:
        response = make_response(render_template('500.html'))
        response.headers['Cache-Control'] = 'no-cache'
        return response, 500
    except:
        return jsonify({'error': 'Erro interno do servidor'}), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    """Erro de payload muito grande"""
    return jsonify({'error': 'Dados enviados muito grandes'}), 413


@app.errorhandler(429)
def ratelimit_handler(error):
    """Erro de rate limit"""
    return jsonify({'error': 'Muitas requisições. Tente novamente em alguns minutos.'}), 429


# Context Processors
@app.context_processor
def inject_global_vars():
    """Injeta variáveis globais nos templates"""
    return {
        'app_name': 'Streamhive',
        'app_version': '1.0.0',
        'current_year': datetime.now().year,
        'is_authenticated': 'user_id' in session,
        'current_user': session.get('username', ''),
        'debug_mode': app.debug
    }


# Filters personalizados
@app.template_filter('datetime_format')
def datetime_format(value, format='%d/%m/%Y %H:%M'):
    """Formata datetime para template"""
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value)
        except:
            return value
    
    if isinstance(value, datetime):
        return value.strftime(format)
    return value



if __name__ == '__main__':
    # Inicializar banco de dados
    if init_database():
        logger.info("✅ Banco de dados inicializado com sucesso")
    else:
        logger.error("❌ Erro ao inicializar banco de dados")
        exit(1)
    
    # Configurações para Docker/Produção
    port = int(os.environ.get('PORT', 7000))
    debug = os.environ.get('FLASK_ENV', 'production') != 'production'
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=debug,
        allow_unsafe_werkzeug=debug
    )