# StreamHive 🐝

**Sua sala de cinema, em qualquer lugar.**

StreamHive é uma plataforma de streaming social **open source**, construída com **Flask** e **WebSockets**, que permite assistir vídeos em perfeita sincronia com amigos, onde quer que estejam. Reúna sua equipe, escolha o que assistir e compartilhe reações em tempo real.

---

## 🚀 Recursos Principais

- 🎬 **Salas de Exibição Sincronizadas**: Play, pause e busca de vídeo são replicados instantaneamente para todos os participantes da sala.
- 🌐 **Suporte Multi-Plataforma**: Compatível com YouTube, Netflix (via WebView integrada) e links de streaming externo (MP4, HLS, etc.).
- 💬 **Chat em Tempo Real**: Converse e reaja com seus amigos através de um chat integrado em cada sala.
- 🔒 **Salas Públicas e Privadas**: Crie salas abertas para a comunidade ou proteja suas sessões com senha.
- 👑 **Controles do Dono da Sala**: O criador tem controle total, incluindo expulsar participantes e encerrar a sessão.
- 👤 **Dashboard de Usuário**: Gerencie suas salas, veja salas públicas ativas e entre em privadas via código.
- 📱 **Interface Responsiva**: Experiência otimizada para desktops, tablets e smartphones.

---

## 🛠️ Stack de Tecnologia

**Backend:** Python, Flask, Flask-SocketIO, Gunicorn, Eventlet, SQLite
**Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+), Jinja2

---

## 📂 Estrutura do Projeto

```
StreamHive/
│
├── app.py                  # Ponto de entrada principal da aplicação Flask
├── requirements.txt        # Dependências do Python
├── init_db.py              # Script para inicializar o banco de dados
├── proxy_server.py         # Servidor proxy para streams HTTP
│
├── database/
│   ├── connection.py       # Gerenciador de conexão com o SQLite
│   └── models.py           # Definição do schema do banco de dados
│
├── services/
│   ├── auth_service.py     # Lógica de autenticação e usuários
│   ├── room_service.py     # Lógica para criação e gerenciamento de salas
│   └── socket_service.py   # Lógica para comunicação via WebSockets
│
├── static/
│   ├── css/                # Arquivos de estilo (base, componentes, páginas)
│   ├── js/                 # Scripts (core, componentes, páginas, utils)
│   └── assets/             # Imagens e ícones
│
└── templates/
    ├── index.html          # Página inicial
    ├── dashboard.html      # Dashboard do usuário
    ├── room.html           # Página da sala de streaming
    └── ...                 # Outros templates HTML
```

---

## ⚙️ Guia de Instalação e Execução

### 1. Pré-requisitos

- Python **3.8+**
- **pip** (gerenciador de pacotes do Python)

### 2. Clonando o Repositório

```bash
git clone https://github.com/esc4n0rx/StreamHive.git
cd StreamHive
```

### 3. Configuração do Ambiente

#### a) Criar e ativar ambiente virtual

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

#### b) Instalar dependências

```bash
pip install -r requirements.txt
```

#### c) Configurar variáveis de ambiente

Crie um arquivo chamado **.env** na raiz do projeto e adicione:

```env
SECRET_KEY='sua_chave_secreta_super_segura_aqui'
```

> Gere uma chave segura executando:

```bash
python -c "import secrets; print(secrets.token_hex())"
```

### 4. Inicialização do Banco de Dados

```bash
python init_db.py
```

> Isso criará o arquivo **streamhive.db** e todas as tabelas necessárias.

### 5. Executando a Aplicação

#### Modo Desenvolvimento

```bash
python app.py
```

> O modo **debug** recarrega o servidor a cada alteração.

#### Modo Produção (recomendado)

```bash
gunicorn --worker-class eventlet -w 1 app:app
```

Após iniciar, a aplicação estará disponível em:
👉 **[http://127.0.0.1:7000](http://127.0.0.1:7000)**

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
