// Variáveis globais
const isDevelopment = window.APP_CONFIG.isDevelopment;
let testFeaturesEnabled = window.APP_CONFIG.testFeaturesEnabled;

// Configuração de todos os event listeners
function setupEventListeners() {

    // Evento para abrir o modal de downloads em andamento
    $('#viewDownloadsBtn').click(function() {
        $('#downloadsModal').modal('show');
        updateDownloadsList(); // Atualiza a lista ao abrir o modal
    });

    // Evento para o botão de download
    $('#confirmDownload').click(function() {
        const fileName = $('#fileName').val();
        if (!fileName) {
            window.toastModule.show('Erro: Nome do arquivo não definido.', window.toastModule.types.ERROR);
            return;
        }

        // Fechar o modal de download
        $('#downloadModal').modal('hide');

        // Iniciar o download
        window.utils.downloadFile(fileName);
    });

    // Evento para abrir o modal de download
    $(document).on('click', '[data-toggle="modal"][data-target="#downloadModal"]', function() {
        const fileName = $(this).data('filename');
        $('#fileName').val(fileName);
        $('#fileNameDisplay').text(fileName);
    });

    // Toggle do menu de notificações
    $('#notificationBtn').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const notificationList = $('#notificationList');
        const isVisible = notificationList.hasClass('show');
        
        if (isVisible) {
            notificationList.removeClass('show');
            notificationList.css('right', '-350px');
        } else {
            notificationList.addClass('show');
            notificationList.css('right', '0');
            window.notificationModule.updateNotificationList();
        }
    });

    // Fechar ao clicar fora
    $(document).on('click', function(e) {
        if (!$(e.target).closest('#notificationList, #notificationBtn').length) {
            $('#notificationList').removeClass('show').css('right', '-350px');
        }
    });

    // Prevenir que cliques dentro da barra lateral a fechem
    $('#notificationList').on('click', function(e) {
        e.stopPropagation();
    });

    // Botão de fechar na barra lateral
    $('#closeNotifications').on('click', function() {
        $('#notificationList').removeClass('show').css('right', '-350px');
    });

    // Adicionar novo filtro pelo botão
    $('#addFilterBtn').click(function() {
        const filterInput = $('#filterInput');
        const filter = filterInput.val().trim();
        
        if (filter) {
            addFilterPill(filter);
            filterInput.val('');
        }
    });

    // Adicionar novo filtro com Enter
    $('#filterInput').keypress(function(e) {
        if (e.which === 13) { // Enter key
            e.preventDefault();
            const filter = $(this).val().trim();
            
            if (filter) {
                addFilterPill(filter);
                $(this).val('');
            }
        }
    });

    // Remover filtro
    $(document).on('click', '#filterPills .close', function() {
        $(this).closest('.badge').remove();
    });

    // Salvar configurações
    $('#saveConfigBtn').click(function() {
        // Coleta todos os dados do formulário
        const config = {
            searchPaths: Array.from($('#searchPaths .badge')).map(badge => 
                $(badge).contents().first().text().trim()
            ),
            filters: Array.from($('#filterPills .badge')).map(badge => 
                $(badge).contents().first().text().trim()
            ),
            filterType: $("#filterType").val(),
            extensions: $("input[name='extensions']:checked").map(function() {
                return $(this).val();
            }).get(),
            sortBy: $("#sortBy").val(),
            sortOrder: $("#sortOrder").val(),
            notificationInterval: parseInt($("#notificationInterval").val()),
            systemNotifications: $("#systemNotifications").prop('checked')
        };

        // Salvar localmente
        window.utils.saveLocalConfig(config);

        // Enviar para o servidor
        $.ajax({
            url: '/config',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(config),
            success: function() {
                $('#configModal').modal('hide');
                
                // Atualiza o intervalo de notificações se foi alterado
                if (config.notificationInterval) {
                    window.notificationModule.updateNotificationInterval(config.notificationInterval);
                }

                // Recarrega a lista de arquivos com as novas configurações
                loadFiles();
                
                // Mostra mensagem de sucesso
                window.toastModule.show('Configurações salvas com sucesso!', window.toastModule.types.SUCCESS);
            },
            error: function(xhr, status, error) {
                console.error('Erro ao salvar configurações:', error);
                window.toastModule.show('Erro ao salvar configurações: ' + error, window.toastModule.types.ERROR);
            }
        });
    });

    // Botão de teste de notificação
    $('#testNotificationBtn').click(function() {
        if (!isDevelopment) return;
        
        // Cria uma notificação de teste
        const mockNotification = {
            id: Date.now(),
            message: `Notificação de teste - ${new Date().toLocaleTimeString()}`,
            time: new Date(),
            read: false
        };

        // Adiciona à lista de notificações
        window.notificationModule.notifications.unshift(mockNotification);

        // Atualiza o badge e a lista
        window.notificationModule.updateNotificationBadge();
        window.notificationModule.updateNotificationList();

        // Mostra notificação do sistema
        window.notificationModule.sendSystemNotification(
            'Notificação de Teste',
            'Esta é uma notificação de teste do sistema.'
        );

        // Mostra toast de confirmação
        window.toastModule.show('Notificação de teste enviada!', window.toastModule.types.SUCCESS);
    });

    // Adicionar novo caminho pelo botão
    $('#addPathBtn').click(function() {
        const pathInput = $('#searchPathInput');
        const path = pathInput.val().trim();
        
        if (path) {
            addPathPill(path);
            pathInput.val('');
        }
    });

    // Adicionar novo caminho com Enter
    $('#searchPathInput').keypress(function(e) {
        if (e.which === 13) { // Enter key
            e.preventDefault();
            const path = $(this).val().trim();
            
            if (path) {
                addPathPill(path);
                $(this).val('');
            }
        }
    });

    // Remover caminho
    $(document).on('click', '#searchPaths .close', function() {
        $(this).closest('.badge').remove();
    });
}

// Função para adicionar pílula de filtro
function addFilterPill(filter) {
    const pill = `
        <span class="badge badge-info mr-2 mb-2 p-2">
            ${filter}
            <button type="button" class="close ml-2" aria-label="Remover">
                <span aria-hidden="true">&times;</span>
            </button>
        </span>
    `;
    $('#filterPills').append(pill);
}

// Função para adicionar pílula de caminho
function addPathPill(path) {
    const pill = `
        <span class="badge badge-primary mr-2 mb-2 p-2">
            ${path}
            <button type="button" class="close ml-2" aria-label="Remover">
                <span aria-hidden="true">&times;</span>
            </button>
        </span>
    `;
    $('#searchPaths').append(pill);
}

// Função para carregar arquivos
function loadFiles() {
    const limit = parseInt($('#fileLimit').val(), 10) || 25; // valor padrão se não houver seleção
    
    window.toastModule.show('Carregando arquivos...', window.toastModule.types.INFO);
    
    $.ajax({
        url: '/files?limit=' + limit,
        method: 'GET',
        success: function(files) {
            $('#recentFiles').empty();
            $('#otherFiles').empty();

            // Arquivos recentes
            if (files.recentFiles.length > 0) {
                files.recentFiles.forEach(file => {
                    $('#recentFiles').append(createFileCard(file, true));
                });
            } else {
                $('#recentFiles').append('<p class="col">Nenhum arquivo recente encontrado.</p>');
            }

            // Outros arquivos
            if (files.otherFiles.length > 0) {
                files.otherFiles.forEach(file => {
                    $('#otherFiles').append(createFileCard(file, false));
                });
            } else {
                $('#otherFiles').append('<p class="col">Nenhum outro arquivo encontrado.</p>');
            }

            window.toastModule.show('Arquivos carregados com sucesso!', window.toastModule.types.SUCCESS);
        },
        error: function(error) {
            console.error('Erro ao carregar arquivos:', error);
            window.toastModule.show('Erro ao carregar arquivos.', window.toastModule.types.ERROR);
        }
    });
}

// Função auxiliar para criar o card do arquivo
function createFileCard(file, isRecent) {
    return `
        <div class="col-md-4">
            <div class="card mb-4">
                <div class="card-body text-center">
                    ${window.utils.getFileIcon(file)}
                    <h5 class="card-title">${file.name}</h5>
                    <p class="card-text">
                        <small class="text-muted">
                            Criado em: ${window.utils.formatDate(file.creationDate)}<br>
                            Última modificação: ${window.utils.formatDate(file.lastModified)}<br>
                            <span class="badge badge-light">${window.utils.formatPath(file.path)}</span>
                        </small>
                    </p>
                    <button class="btn btn-success" data-filename="${file.name}" data-toggle="modal" data-target="#downloadModal">
                        <i class="fas fa-download"></i> Baixar
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Inicialização
$(document).ready(function() {

    // Solicitar permissão para notificações
    window.notificationModule.requestNotificationPermission();

    // Configurar eventos
    setupEventListeners();

    // Verificar novos arquivos imediatamente
    window.notificationModule.checkNewFiles();
});
