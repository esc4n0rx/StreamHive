"""
Streamhive Database Models
Modelos de dados para SQLite usando SQLAlchemy-style com sqlite3
"""

import sqlite3
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass


@dataclass
class User:
    """Modelo de usuário"""
    id: Optional[int] = None
    username: str = ""
    email: str = ""
    password_hash: str = ""
    age: int = 0
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    is_active: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte o usuário para dicionário"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'age': self.age,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_active': self.is_active
        }
    
    @classmethod
    def from_row(cls, row: sqlite3.Row) -> 'User':
        """Cria usuário a partir de uma linha do banco"""
        return cls(
            id=row['id'],
            username=row['username'],
            email=row['email'],
            password_hash=row['password_hash'],
            age=row['age'],
            created_at=datetime.fromisoformat(row['created_at']) if row['created_at'] else None,
            last_login=datetime.fromisoformat(row['last_login']) if row['last_login'] else None,
            is_active=bool(row['is_active'])
        )


@dataclass
class Room:
    """Modelo de sala de streaming"""
    id: Optional[int] = None
    name: str = ""
    description: str = ""
    stream_url: str = ""
    provider_type: str = "external"
    owner_id: int = 0
    is_private: bool = True
    password: Optional[str] = None
    max_participants: int = 10
    room_code: str = ""
    created_at: Optional[datetime] = None
    is_active: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte a sala para dicionário"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'stream_url': self.stream_url,
            'provider_type': self.provider_type,
            'owner_id': self.owner_id,
            'is_private': self.is_private,
            'password': self.password,
            'max_participants': self.max_participants,
            'room_code': self.room_code,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }


class DatabaseSchema:
    """Definições do schema do banco de dados"""
    
    @staticmethod
    def get_create_tables_sql() -> List[str]:
        """Retorna todas as queries de criação de tabelas"""
        return [
            # Tabela de usuários
            '''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                age INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                
                -- Constraints
                CHECK (age >= 13 AND age <= 120),
                CHECK (length(username) >= 3 AND length(username) <= 30),
                CHECK (length(email) >= 5 AND length(email) <= 254)
            )
            ''',
            
            # Tabela de salas
            '''
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                stream_url TEXT NOT NULL,
                provider_type TEXT DEFAULT 'external',
                owner_id INTEGER NOT NULL,
                is_private BOOLEAN DEFAULT 1,
                password TEXT,
                max_participants INTEGER DEFAULT 10,
                room_code TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                
                -- Foreign Keys
                FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
                
                -- Constraints
                CHECK (length(name) >= 3 AND length(name) <= 100),
                CHECK (max_participants >= 2 AND max_participants <= 50),
                CHECK (length(room_code) = 8)
            )
            ''',
            
            # Tabela de participantes de sala
            '''
            CREATE TABLE IF NOT EXISTS room_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                role TEXT DEFAULT 'participant',
                is_active BOOLEAN DEFAULT 1,
                
                -- Foreign Keys
                FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                
                -- Constraints
                CHECK (role IN ('owner', 'moderator', 'participant')),
                UNIQUE (room_id, user_id)
            )
            '''
        ]
    
    @staticmethod
    def get_create_indexes_sql() -> List[str]:
        """Retorna todas as queries de criação de índices"""
        return [
            # Índices para performance na tabela users
            'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login)',
            'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)',
            
            # Índices para performance na tabela rooms
            'CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner_id)',
            'CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_rooms_private ON rooms(is_private)',
            'CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(room_code)',
            
            # Índices para performance na tabela room_participants
            'CREATE INDEX IF NOT EXISTS idx_participants_room ON room_participants(room_id)',
            'CREATE INDEX IF NOT EXISTS idx_participants_user ON room_participants(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_participants_joined ON room_participants(joined_at)',
            'CREATE INDEX IF NOT EXISTS idx_participants_active ON room_participants(is_active)'
        ]
    
    @staticmethod
    def get_optimization_sql() -> List[str]:
        """Retorna queries de otimização do SQLite"""
        return [
            'PRAGMA journal_mode=WAL',
            'PRAGMA synchronous=NORMAL',
            'PRAGMA cache_size=10000',
            'PRAGMA temp_store=memory',
            'PRAGMA mmap_size=268435456'  # 256MB
        ]