# esc4n0rx/streamhive/StreamHive-c42f1d9ebdab96cebae0483324932de84199e1af/proxy_server.py

"""
Streamhive Proxy Server
Servidor proxy para evitar mixed content com URLs HTTP
"""

import requests
from flask import Response, request, stream_template
import logging
from urllib.parse import urlparse
from typing import Optional


class ProxyServer:
    """Servidor proxy para streaming"""
    
    def __init__(self):
        """Inicializa o servidor proxy"""
        self.logger = logging.getLogger(__name__)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def proxy_request(self, url: str) -> Optional[Response]:
        """
        Faz proxy de uma URL genérica, removendo cabeçalhos de segurança.
        
        Args:
            url: URL original para fazer proxy
            
        Returns:
            Response: Response do Flask ou None se erro
        """
        try:
            # Validar URL
            parsed_url = urlparse(url)
            if not parsed_url.scheme or not parsed_url.netloc:
                self.logger.error(f"URL inválida para proxy: {url}")
                return None
            
            # Fazer requisição com streaming
            response = self.session.get(url, stream=True, timeout=30, allow_redirects=True)
            
            if not response.ok:
                self.logger.error(f"Erro na requisição proxy para {url}: {response.status_code}")
                return None
            
            # Headers a serem removidos
            headers_to_remove = [
                'X-Frame-Options',
                'Content-Security-Policy',
                'Cross-Origin-Embedder-Policy'
            ]
            
            # Copiar e limpar cabeçalhos
            headers = dict(response.headers)
            for header in headers_to_remove:
                if header in headers:
                    del headers[header]
            
            # Garantir streaming
            def generate():
                try:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            yield chunk
                except Exception as e:
                    self.logger.error(f"Erro no streaming do proxy: {e}")
            
            return Response(generate(), status=response.status_code, headers=headers)
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Erro na requisição do proxy: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Erro genérico no proxy: {e}")
            return None
    
    def proxy_stream(self, url: str) -> Optional[Response]:
        """
        Faz proxy de uma URL de streaming
        
        Args:
            url: URL original para fazer proxy
            
        Returns:
            Response: Response do Flask ou None se erro
        """
        try:
            # Validar URL
            parsed_url = urlparse(url)
            if not parsed_url.scheme or not parsed_url.netloc:
                self.logger.error(f"URL inválida: {url}")
                return None
            
            # Fazer requisição com streaming
            response = self.session.get(
                url,
                stream=True,
                timeout=30,
                allow_redirects=True
            )
            
            if not response.ok:
                self.logger.error(f"Erro na requisição proxy: {response.status_code}")
                return None
            
            # Determinar tipo de conteúdo
            content_type = response.headers.get('Content-Type', 'application/octet-stream')
            
            # Headers para streaming
            headers = {
                'Content-Type': content_type,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Content-Type',
            }
            
            # Suporte a range requests
            if 'Range' in request.headers:
                headers['Accept-Ranges'] = 'bytes'
                range_header = request.headers.get('Range')
                
                # Repassar range request
                proxy_headers = {'Range': range_header}
                response = self.session.get(
                    url,
                    headers=proxy_headers,
                    stream=True,
                    timeout=30
                )
                
                if response.status_code == 206:
                    headers['Content-Range'] = response.headers.get('Content-Range', '')
                    headers['Content-Length'] = response.headers.get('Content-Length', '')
                    
                    return Response(
                        response.iter_content(chunk_size=8192),
                        status=206,
                        headers=headers
                    )
            
            # Stream normal
            def generate():
                try:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            yield chunk
                except Exception as e:
                    self.logger.error(f"Erro no streaming: {e}")
            
            return Response(generate(), headers=headers)
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Erro na requisição proxy: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Erro no proxy: {e}")
            return None
    
    def get_video_info(self, url: str) -> Optional[dict]:
        """
        Obtém informações sobre o vídeo
        
        Args:
            url: URL do vídeo
            
        Returns:
            dict: Informações do vídeo ou None
        """
        try:
            response = self.session.head(url, timeout=10, allow_redirects=True)
            
            if not response.ok:
                return None
            
            return {
                'content_type': response.headers.get('Content-Type', ''),
                'content_length': response.headers.get('Content-Length'),
                'accepts_ranges': response.headers.get('Accept-Ranges', ''),
                'url': response.url  # URL final após redirects
            }
            
        except Exception as e:
            self.logger.error(f"Erro ao obter info do vídeo: {e}")
            return None


# Instância global
proxy_server = ProxyServer()


def get_proxy_server() -> ProxyServer:
    """
    Retorna a instância global do servidor proxy
    
    Returns:
        ProxyServer: Instância do servidor
    """
    return proxy_server