"""
Streamhive Database Connection Manager
Gerenciador de conexões com o banco SQLite
"""

import sqlite3
import os
from typing import Optional, Dict, Any, List, Tuple
from contextlib import contextmanager
from .models import DatabaseSchema, User
import logging


class DatabaseManager:
    """Gerenciador principal do banco de dados"""
    
    def __init__(self, database_path: str = 'streamhive.db'):
        """
        Inicializa o gerenciador do banco
        
        Args:
            database_path: Caminho para o arquivo do banco SQLite
        """
        self.database_path = database_path
        self.logger = logging.getLogger(__name__)
        
    def initialize_database(self) -> bool:
        """
        Inicializa o banco de dados com todas as tabelas e índices
        
        Returns:
            bool: True se inicializado com sucesso
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Aplicar otimizações do SQLite
                for sql in DatabaseSchema.get_optimization_sql():
                    cursor.execute(sql)
                
                # Criar tabelas
                for sql in DatabaseSchema.get_create_tables_sql():
                    cursor.execute(sql)
                
                # Criar índices
                for sql in DatabaseSchema.get_create_indexes_sql():
                    cursor.execute(sql)
                
                conn.commit()
                self.logger.info("Banco de dados inicializado com sucesso")
                return True
                
        except Exception as e:
            self.logger.error(f"Erro ao inicializar banco: {e}")
            return False
    
    @contextmanager
    def get_connection(self):
        """
        Context manager para conexões com o banco
        
        Yields:
            sqlite3.Connection: Conexão ativa com o banco
        """
        conn = None
        try:
            conn = sqlite3.connect(self.database_path)
            conn.row_factory = sqlite3.Row
            
            # Aplicar otimizações para esta conexão
            for sql in DatabaseSchema.get_optimization_sql():
                conn.execute(sql)
            
            yield conn
            
        except Exception as e:
            if conn:
                conn.rollback()
            self.logger.error(f"Erro na conexão com banco: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def execute_query(self, query: str, params: Tuple = ()) -> Optional[List[sqlite3.Row]]:
        """
        Executa uma query SELECT
        
        Args:
            query: Query SQL
            params: Parâmetros da query
            
        Returns:
            Lista de resultados ou None se erro
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                return cursor.fetchall()
        except Exception as e:
            self.logger.error(f"Erro ao executar query: {e}")
            return None
    
    def execute_insert(self, query: str, params: Tuple = ()) -> Optional[int]:
        """
        Executa uma query INSERT
        
        Args:
            query: Query SQL
            params: Parâmetros da query
            
        Returns:
            ID do registro inserido ou None se erro
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            self.logger.error(f"Erro ao executar insert: {e}")
            return None
    
    def execute_update(self, query: str, params: Tuple = ()) -> bool:
        """
        Executa uma query UPDATE/DELETE
        
        Args:
            query: Query SQL
            params: Parâmetros da query
            
        Returns:
            True se executado com sucesso
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                conn.commit()
                return True
        except Exception as e:
            self.logger.error(f"Erro ao executar update: {e}")
            return False
    
    def get_database_stats(self) -> Dict[str, Any]:
        """
        Retorna estatísticas do banco de dados
        
        Returns:
            Dicionário com estatísticas
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Contagem de usuários
                cursor.execute("SELECT COUNT(*) as total FROM users")
                users_count = cursor.fetchone()['total']
                
                # Usuários ativos
                cursor.execute("SELECT COUNT(*) as active FROM users WHERE is_active = 1")
                active_users = cursor.fetchone()['active']
                
                # Usuários criados hoje
                cursor.execute("""
                    SELECT COUNT(*) as today 
                    FROM users 
                    WHERE date(created_at) = date('now')
                """)
                users_today = cursor.fetchone()['today']
                
                # Tamanho do banco
                cursor.execute("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
                db_size = cursor.fetchone()['size']
                
                return {
                    'total_users': users_count,
                    'active_users': active_users,
                    'users_today': users_today,
                    'database_size_bytes': db_size,
                    'database_size_mb': round(db_size / 1024 / 1024, 2)
                }
                
        except Exception as e:
            self.logger.error(f"Erro ao obter estatísticas: {e}")
            return {}
    
    def backup_database(self, backup_path: str) -> bool:
        """
        Cria um backup do banco de dados
        
        Args:
            backup_path: Caminho para o arquivo de backup
            
        Returns:
            True se backup criado com sucesso
        """
        try:
            # Criar diretório se não existir
            os.makedirs(os.path.dirname(backup_path), exist_ok=True)
            
            with sqlite3.connect(self.database_path) as source:
                with sqlite3.connect(backup_path) as backup:
                    source.backup(backup)
            
            self.logger.info(f"Backup criado: {backup_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Erro ao criar backup: {e}")
            return False
    
    def optimize_database(self) -> bool:
        """
        Otimiza o banco de dados (VACUUM, ANALYZE)
        
        Returns:
            True se otimizado com sucesso
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # VACUUM para desfragmentar
                cursor.execute("VACUUM")
                
                # ANALYZE para atualizar estatísticas
                cursor.execute("ANALYZE")
                
                self.logger.info("Banco de dados otimizado")
                return True
                
        except Exception as e:
            self.logger.error(f"Erro ao otimizar banco: {e}")
            return False


# Instância global do gerenciador
db_manager = DatabaseManager()


def get_db_manager() -> DatabaseManager:
    """
    Retorna a instância global do gerenciador de banco
    
    Returns:
        DatabaseManager: Instância do gerenciador
    """
    return db_manager


def init_database() -> bool:
    """
    Função de conveniência para inicializar o banco
    
    Returns:
        bool: True se inicializado com sucesso
    """
    return db_manager.initialize_database()