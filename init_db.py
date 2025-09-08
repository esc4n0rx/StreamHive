# init_db.py
from database.connection import init_database
import logging

# Configuração de logging para ver a saída no terminal
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == '__main__':
    logger.info("Iniciando a criação das tabelas do banco de dados...")
    if init_database():
        logger.info("✅ Banco de dados e tabelas criados com sucesso!")
    else:
        logger.error("❌ Erro ao inicializar o banco de dados.")
