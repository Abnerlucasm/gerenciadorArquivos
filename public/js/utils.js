let downloadInProgress = false; 
window.downloadsInProgress = []; 

// Funções utilitárias compartilhadas
window.utils = {

    loadLocalConfig: function() {
        const savedConfig = localStorage.getItem('userConfig');
        return savedConfig ? JSON.parse(savedConfig) : null;
    },

    saveLocalConfig: function(config) {
        localStorage.setItem('userConfig', JSON.stringify(config));
    },

    formatDate: function(date) {
        // Verifica se date é uma string ou número e tenta convertê-lo em um objeto Date
        if (typeof date === 'string' || typeof date === 'number') {
            date = new Date(date);
        }

        // Verifica se date é um objeto Date válido
        if (!(date instanceof Date) || isNaN(date)) {
            console.error('Data inválida:', date);
            return 'Data inválida';
        }

    
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    },

    formatPath: function(fullPath) {
        const parts = fullPath.split('\\');
        if (parts.length >= 2) {
            return '...' + parts.slice(-2).join('\\');
        }
        return fullPath;
    },

    getFileIcon: function(file) {
        // Se tiver um ícone extraído do sistema, usa ele
        if (file.icon) {
            return `<img src="${file.icon}" alt="Ícone" class="file-icon">`;
        }
        
        // Caso contrário, usa os ícones do Font Awesome
        const extension = file.name.split('.').pop().toLowerCase();
        switch (extension) {
            case 'exe':
                return '<i class="fas fa-cog fa-2x mb-2"></i>';
            case 'ear':
                return '<i class="fas fa-archive fa-2x mb-2"></i>';
            case 'bat':
                return '<i class="fas fa-terminal fa-2x mb-2"></i>';
            case 'pdf':
                return '<i class="fas fa-file-pdf fa-2x mb-2"></i>';
            case 'xls':
            case 'xlsx':
                return '<i class="fas fa-file-excel fa-2x mb-2"></i>';
            case 'doc':
            case 'docx':
                return '<i class="fas fa-file-word fa-2x mb-2"></i>';
            case 'txt':
                return '<i class="fas fa-file-alt fa-2x mb-2"></i>';
            case 'dll':
                return '<i class="fas fa-cogs fa-2x mb-2"></i>';
            case 'zip':
            case 'rar':
            case '7z':
                return '<i class="fas fa-file-archive fa-2x mb-2"></i>';
            case 'csv':
                return '<i class="fas fa-file-csv fa-2x mb-2"></i>';
            case 'xml':
            case 'json':
                return '<i class="fas fa-file-code fa-2x mb-2"></i>';
            case 'log':
                return '<i class="fas fa-clipboard-list fa-2x mb-2"></i>';
            case 'ini':
            case 'cfg':
                return '<i class="fas fa-sliders-h fa-2x mb-2"></i>';
            case 'msi':
                return '<i class="fas fa-box fa-2x mb-2"></i>';
            default:
                return '<i class="fas fa-file fa-2x mb-2"></i>';
        }
    },

    downloadFile: async function(fileName) {
        try {
            // Verifica se já existe um download em andamento
            if (window.downloadsInProgress.some(d => d.name === fileName)) {
                window.toastModule.show('Download já em andamento. Por favor, aguarde.', window.toastModule.types.WARNING);
                return;
            }

            // Adiciona o arquivo à lista de downloads em andamento com a estrutura correta
            const downloadInfo = {
                name: fileName,
                progress: 0,
                status: 'Iniciando',
                timeLeft: 'Calculando...'
            };
            window.downloadsInProgress.push(downloadInfo);
            updateDownloadsList();

            // Mostra o container de progresso
            document.getElementById('loadingContainer').style.display = 'block';
            const progressValue = document.getElementById('progressValue');
            const estimatedTime = document.getElementById('estimatedTime');
            const waitButton = document.getElementById('waitButton');
            progressValue.textContent = '0%';
            estimatedTime.textContent = 'Estimativa: 0s';
            waitButton.style.display = 'block';

            // Mensagens de carregamento
            const messages = [
                "Baixando... Por favor, aguarde.",
                "Estamos quase lá...",
                "Aguarde um momento...",
                "Preparando seu download...",
                "Carregando seu arquivo..."
            ];

            let messageIndex = 0;
            const loadingMessage = document.getElementById('loadingMessage');

            // Função para atualizar a mensagem
            const updateMessage = () => {
                loadingMessage.textContent = messages[messageIndex];
                messageIndex = (messageIndex + 1) % messages.length;
            };

            // Inicia com a primeira mensagem
            updateMessage();

            // Configura o intervalo para trocar as mensagens
            const messageInterval = setInterval(updateMessage, 3000);

            const response = await fetch(`/download/${encodeURIComponent(fileName)}`);
            const reader = response.body.getReader();
            const contentLength = response.headers.get('Content-Length');
            const total = parseInt(contentLength, 10);
            let loaded = 0;
            let startTime = Date.now();

            const chunks = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                loaded += value.length;

                // Calcula e atualiza o progresso
                const percentage = total ? Math.round((loaded / total) * 100) : 0;
                progressValue.textContent = `${percentage}%`;
                document.querySelector('.progress-circle').style.setProperty('--progress', `${percentage}%`);

                // Atualiza a cor do percentual
                if (percentage > 50) {
                    progressValue.classList.add('filled');
                    progressValue.classList.remove('empty');
                } else {
                    progressValue.classList.add('empty');
                    progressValue.classList.remove('filled');
                }

                // Calcula o tempo estimado
                const elapsedTime = (Date.now() - startTime) / 1000;
                const estimatedTotalTime = total ? (elapsedTime / loaded) * total : 0;
                const remainingTime = Math.round(estimatedTotalTime - elapsedTime);

                // Atualiza o progresso no modal de downloads
                const downloadIndex = window.downloadsInProgress.findIndex(d => d.name === fileName);
                if (downloadIndex !== -1) {
                    window.downloadsInProgress[downloadIndex] = {
                        name: fileName,
                        progress: percentage,
                        status: percentage === 100 ? 'Concluído' : 'Em andamento',
                        timeLeft: remainingTime > 0 ? `${remainingTime}s` : 'Finalizando...'
                    };
                    
                    // Força a atualização da interface
                    updateDownloadsList();
                }

                // Atualiza o tempo estimado na interface
                estimatedTime.textContent = `Estimativa: ${remainingTime > 0 ? remainingTime + 's' : 'Finalizando...'}`;
            }

            // Limpa o intervalo de mensagens
            clearInterval(messageInterval);

            // Cria e inicia o download
            const blob = new Blob(chunks);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Notifica sucesso
            window.toastModule.show('Download concluído com sucesso!', window.toastModule.types.SUCCESS);

        } catch (error) {
            console.error('Erro no download:', error);
            window.toastModule.show('Erro ao baixar o arquivo.', window.toastModule.types.ERROR);
        } finally {
            // Limpa a interface
            document.getElementById('loadingContainer').style.display = 'none';
            // Remove o arquivo da lista de downloads
            window.downloadsInProgress = window.downloadsInProgress.filter(d => d.name !== fileName);
            updateDownloadsList();
        }
    }
}; 

function continueInBackground() {
    // Oculta a barra de carregamento e o efeito de desfoque
    document.getElementById('loadingContainer').style.display = 'none'; // Esconde a barra de carregamento
    showToast("O download continuará em segundo plano."); // Substituindo o alert por um toast
}

document.addEventListener('DOMContentLoaded', () => {
    // Função para alternar a barra lateral
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) { // Verifica se o elemento existe
            if (sidebar.style.display === 'none' || sidebar.style.display === '') {
                sidebar.style.display = 'block'; // Abre a barra lateral
            } else {
                sidebar.style.display = 'none'; // Fecha a barra lateral
            }
        } else {
            console.error('Elemento sidebar não encontrado.');
        }
    };
});

function formatDate(date) {
    // Verifica se date é uma string ou número e tenta convertê-lo em um objeto Date
    if (typeof date === 'string' || typeof date === 'number') {
        date = new Date(date);
    }

    // Verifica se date é um objeto Date válido
    if (!(date instanceof Date) || isNaN(date)) {
        console.error('Data inválida:', date);
        return 'Data inválida'; 
    }

    // Exemplo de formatação de data
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

// Anexando a função ao objeto window para torná-la global
window.formatDate = formatDate;

function markAsRead(notificationId) {
    const notification = document.getElementById(`notification-${notificationId}`);
    if (notification) {
        notification.classList.add('read'); // Adiciona uma classe para indicar que a notificação foi lida
        console.log(`Notificação ${notificationId} marcada como lida.`);
    } else {
        console.error(`Notificação ${notificationId} não encontrada.`);
    }
}

// Anexando a função ao objeto window para torná-la global
window.markAsRead = markAsRead;

function clearNotifications() {
    const notificationsContainer = document.getElementById('notifications');
    if (notificationsContainer) {
        notificationsContainer.innerHTML = ''; // Limpa todas as notificações
        console.log('Todas as notificações foram limpas.');
    } else {
        console.error('Container de notificações não encontrado.');
    }
}

function markAllAsRead() {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notification => {
        const notificationId = notification.id.split('-')[1]; // Extrai o ID da notificação
        markAsRead(notificationId); // Chama a função markAsRead para cada notificação
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) { // Verifica se o elemento existe
        toast.textContent = message;
        toast.style.display = 'block';

        // Esconde o toast após 3 segundos
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    } else {
        console.error('Elemento toast não encontrado.'); // Log de erro se o elemento não existir
    }
}

function openModal() {
    document.getElementById('downloadModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('downloadModal').style.display = 'none';
}

window.updateDownloadsList = function() {
    const downloadsList = $('#downloadsList');
    downloadsList.empty();
    
    console.log('Estado atual dos downloads:', window.downloadsInProgress);

    // Atualiza o badge de downloads
    const downloadBadge = $('#viewDownloadsBtn .download-badge');
    if (window.downloadsInProgress.length > 0) {
        downloadBadge.text(window.downloadsInProgress.length).show();
        $('#viewDownloadsBtn').show();

        // Renderiza cada download
        window.downloadsInProgress.forEach(download => {
            console.log('Renderizando download:', download); // Debug

            downloadsList.append(`
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-file-download text-primary mr-2"></i>
                            <span class="font-weight-bold">${download.name}</span>
                        </div>
                    </td>
                    <td class="text-center">
                        <div class="d-inline-flex align-items-center">
                            <div class="progress-circle" style="width: 35px; height: 35px;">
                                <svg viewBox="0 0 36 36" class="circular-chart">
                                    <path d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#eee"
                                        stroke-width="3"
                                    />
                                    <path d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#2196F3"
                                        stroke-width="3"
                                        stroke-dasharray="${download.progress || 0}, 100"
                                    />
                                </svg>
                                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 10px;">
                                    ${download.progress || 0}%
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <span class="badge badge-${download.status === 'Concluído' ? 'success' : 'primary'} mr-2">
                                ${download.status || 'Aguardando'}
                            </span>
                            <small class="text-muted">${download.timeLeft || 'Calculando...'}</small>
                        </div>
                    </td>
                </tr>
            `);
        });
    } else {
        downloadBadge.hide();
        $('#viewDownloadsBtn').hide();
        downloadsList.append(`
            <tr>
                <td colspan="3" class="text-center py-4">
                    <i class="fas fa-download fa-2x mb-3 text-muted"></i>
                    <p class="text-muted mb-0">Nenhum download em andamento</p>
                </td>
            </tr>
        `);
    }
};