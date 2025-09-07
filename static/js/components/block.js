/**
 * Streamhive - DevTools Blocker
 * Este script tenta detectar a abertura das ferramentas de desenvolvedor e redireciona o usuário.
 * AVISO: Esta é uma prática hostil ao usuário e pode ser facilmente contornada. Use com cautela.
 */
(function() {
    'use strict';

    // URL para onde o usuário será redirecionado
    const redirectUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    // Limite de tempo (em ms) para a detecção com 'debugger'
    const devToolsCheckThreshold = 100;

    // Estado para evitar loops de redirecionamento
    let isBlocking = false;

    /**
     * Função que executa o bloqueio e redirecionamento.
     */
    function blockAndRedirect() {
        if (isBlocking) return;
        isBlocking = true;

        // Tenta limpar o console para dificultar a depuração
        try {
            if (window.console) {
                console.clear();
                console.log('%c As ferramentas de desenvolvedor não são permitidas nesta página.', 'color:red; font-size:20px; font-weight:bold;');
            }
        } catch (e) {
            // Ignora erros
        }
        
        // Redireciona o usuário
        window.location.href = redirectUrl;
    }

    /**
     * Verifica as ferramentas de desenvolvedor usando a instrução 'debugger'.
     * Se as ferramentas estiverem abertas, a execução pausará no 'debugger',
     * e a diferença de tempo será significativa.
     */
    function checkWithDebugger() {
        const startTime = new Date().getTime();
        debugger;
        const endTime = new Date().getTime();

        if (endTime - startTime > devToolsCheckThreshold) {
            blockAndRedirect();
        }
    }

    /**
     * Verifica as ferramentas de desenvolvedor comparando as dimensões da janela.
     * Se as ferramentas estiverem ancoradas, haverá uma diferença notável.
     */
    function checkWindowDimensions() {
        const widthDifference = window.outerWidth - window.innerWidth;
        const heightDifference = window.outerHeight - window.innerHeight;

        if (widthDifference > 160 || heightDifference > 160) {
            blockAndRedirect();
        }
    }

    /**
     * Inicia os monitores de detecção.
     */
    function initializeBlocker() {
        // Verificação periódica
        setInterval(function() {
            checkWithDebugger();
            checkWindowDimensions();
        }, 1000);

        // Listener para atalhos de teclado comuns
        window.addEventListener('keydown', function(event) {
            // F12
            if (event.keyCode === 123) {
                event.preventDefault();
                blockAndRedirect();
            }
            // Ctrl+Shift+I (Windows/Linux)
            if (event.ctrlKey && event.shiftKey && event.keyCode === 73) {
                event.preventDefault();
                blockAndRedirect();
            }
            // Ctrl+Shift+J (Windows/Linux)
            if (event.ctrlKey && event.shiftKey && event.keyCode === 74) {
                event.preventDefault();
                blockAndRedirect();
            }
            // Cmd+Opt+I (Mac)
            if (event.metaKey && event.altKey && event.keyCode === 73) {
                event.preventDefault();
                blockAndRedirect();
            }
             // Cmd+Opt+J (Mac)
            if (event.metaKey && event.altKey && event.keyCode === 74) {
                event.preventDefault();
                blockAndRedirect();
            }
            // Ctrl+U
            if (event.ctrlKey && event.keyCode === 85) {
                event.preventDefault();
                blockAndRedirect();
            }
        });

        // Bloqueia o menu de contexto (clique direito)
        window.addEventListener('contextmenu', function(event) {
            event.preventDefault();
            blockAndRedirect();
        });
    }

    // Inicia o script quando o DOM estiver pronto
    document.addEventListener('DOMContentLoaded', initializeBlocker);

})();