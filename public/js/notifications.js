let notifications = [];
let lastCheckTime = new Date();
let notificationInterval = 30;
let notificationTimer;
let notificationListVisible = false;

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("Este navegador não suporta notificações.");
        return;
    }

    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission().then(function (permission) {
            if (permission === "granted") {
                console.log("Permissão para notificações concedida!");
            }
        });
    }
}

function sendSystemNotification(title, body) {
    const config = window.utils.loadLocalConfig();
    if (config && !config.systemNotifications) {
        return;
    }

    if (Notification.permission === "granted") {
        const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            tag: 'file-notification'
        });

        notification.onclick = function() {
            window.focus();
            this.close();
        };
    }
}

function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = $('.notification-badge');
    
    if (unreadCount > 0) {
        badge.text(unreadCount).show();
    } else {
        badge.hide();
    }
}

function updateNotificationList() {
    const container = $('#notificationItems');
    container.empty();

    if (notifications.length === 0) {
        container.append(`
            <div class="p-3 text-center text-muted">
                <i class="fas fa-bell-slash fa-2x mb-2"></i><br>
                Não há notificações
            </div>
        `);
        return;
    }

    // Separar notificações lidas e não lidas
    const unreadNotifications = notifications.filter(n => !n.read);
    const readNotifications = notifications.filter(n => n.read);

    // Mostrar notificações não lidas
    if (unreadNotifications.length > 0) {
        container.append('<div class="notification-section">Não lidas</div>');
        unreadNotifications.forEach(notification => {
            container.append(createNotificationItem(notification));
        });
    }

    // Mostrar notificações lidas
    if (readNotifications.length > 0) {
        container.append('<div class="notification-section">Lidas</div>');
        readNotifications.forEach(notification => {
            container.append(createNotificationItem(notification));
        });
    }
}

function createNotificationItem(notification) {
    return `
        <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
            <div class="notification-content">
                <div>${notification.message}</div>
                <div class="notification-time">${window.utils.formatDate(notification.time)}</div>
            </div>
            ${!notification.read ? `
                <button class="btn btn-sm btn-link mark-read-btn" onclick="window.notificationModule.markAsRead(${notification.id})">
                    <i class="fas fa-check"></i>
                </button>
            ` : ''}
        </div>
    `;
}

function checkNewFiles() {
    $.ajax({
        url: '/files',
        method: 'GET',
        success: function(files) {
            const allFiles = [...files.recentFiles, ...files.otherFiles];
            const newFiles = allFiles.filter(file => {
                const fileDate = new Date(file.creationDate);
                return fileDate > lastCheckTime;
            });

            if (newFiles.length > 0) {
                newFiles.forEach(file => {
                    notifications.unshift({
                        id: Date.now(),
                        message: `Novo arquivo: ${file.name}`,
                        time: new Date(),
                        read: false
                    });

                    sendSystemNotification(
                        'Novo Arquivo Detectado',
                        `${file.name} foi adicionado em ${window.utils.formatPath(file.path)}`
                    );
                });

                updateNotificationBadge();
                updateNotificationList();
            }

            lastCheckTime = new Date();
        }
    });
}

function updateNotificationInterval(minutes) {
    notificationInterval = minutes;
    if (notificationTimer) {
        clearInterval(notificationTimer);
    }
    notificationTimer = setInterval(checkNewFiles, minutes * 60 * 1000);
    
    // Adicionar informação sobre próxima verificação
    const nextCheck = new Date(Date.now() + minutes * 60 * 1000);
    
    if (window.APP_CONFIG.isDevelopment) {
        console.log(`Próxima verificação em: ${minutes} minutos (${formatDate(nextCheck)})`);
    }

    // Atualizar contador no DOM
    updateNextCheckCounter(nextCheck);
}

function formatTimeRemaining(date) {
    const now = new Date();
    const diff = date - now;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

function updateNextCheckCounter(nextCheck) {
    const counterElement = $('#nextCheckCounter');
    if (!counterElement.length) {
        // Criar elemento se não existir
        $('.container').prepend(`
            <div class="alert alert-info alert-dismissible fade show mb-3" role="alert">
                <small>
                    Próxima verificação em: <span id="nextCheckCounter"></span>
                    ${window.APP_CONFIG.isDevelopment ? ' (Intervalo: ' + notificationInterval + ' minutos)' : ''}
                </small>
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `);
    }

    // Atualizar contador a cada segundo
    setInterval(() => {
        $('#nextCheckCounter').text(formatTimeRemaining(nextCheck));
    }, 1000);
}

function toggleNotificationList() {
    const notificationList = $('#notificationList');
    
    if (notificationListVisible) {
        notificationList.removeClass('show').css('right', '-350px');
    } else {
        notificationList.addClass('show').css('right', '0');
        updateNotificationList(); // Atualiza a lista de notificações
    }
    
    notificationListVisible = !notificationListVisible;
}

// Adicione os event listeners
$(document).ready(function() {
    // Event listener para o botão de notificações
    $('#notificationBtn').click(function(e) {
        e.stopPropagation();
        toggleNotificationList();
    });

    // Fechar ao clicar fora
    $(document).click(function(e) {
        if (!$(e.target).closest('#notificationList, #notificationBtn').length) {
            $('#notificationList').removeClass('show').css('right', '-350px');
            notificationListVisible = false;
        }
    });

    // Prevenir que cliques dentro da lista fechem ela
    $('#notificationList').click(function(e) {
        e.stopPropagation();
    });

    // Marcar todas como lidas
    $('#markAllRead').click(function(e) {
        e.preventDefault();
        window.notificationModule.markAllAsRead();
    });

    // Limpar todas as notificações
    $('#clearNotifications').click(function(e) {
        e.preventDefault();
        window.notificationModule.clearNotifications();
    });
});

// Adicionar antes do export
function markAsRead(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        updateNotificationBadge();
        updateNotificationList();
        window.toastModule.show('Notificação marcada como lida', window.toastModule.types.SUCCESS);
    } else {
        console.error(`Notificação ${notificationId} não encontrada`);
    }
}

function markAllAsRead() {
    if (notifications.length > 0) {
        notifications.forEach(n => n.read = true);
        updateNotificationBadge();
        updateNotificationList();
        window.toastModule.show('Todas as notificações foram marcadas como lidas', window.toastModule.types.SUCCESS);
    }
}

function clearNotifications() {
    if (notifications.length > 0) {
        notifications = [];
        updateNotificationBadge();
        updateNotificationList();
        window.toastModule.show('Todas as notificações foram removidas', window.toastModule.types.SUCCESS);
    }
}

// Exportar funções
window.notificationModule = {
    notifications,
    lastCheckTime,
    notificationInterval,
    notificationTimer,
    requestNotificationPermission,
    sendSystemNotification,
    updateNotificationBadge,
    updateNotificationList,
    createNotificationItem,
    checkNewFiles,
    updateNotificationInterval,
    formatTimeRemaining,
    updateNextCheckCounter,
    markAsRead,
    markAllAsRead,
    clearNotifications
}; 