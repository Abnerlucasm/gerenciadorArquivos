window.toastModule = {
    types: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },

    show: function(message, type = 'info', duration = 3000) {
        const toastContainer = this.getContainer();
        const toast = this.createToast(message, type);
        
        toastContainer.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Remover após duração
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    },

    getContainer: function() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    },

    createToast: function(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getIconForType(type);
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="${icon}"></i>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Adiciona evento de fechar
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });

        return toast;
    },

    getIconForType: function(type) {
        switch (type) {
            case this.types.SUCCESS:
                return 'fas fa-check-circle';
            case this.types.ERROR:
                return 'fas fa-exclamation-circle';
            case this.types.WARNING:
                return 'fas fa-exclamation-triangle';
            case this.types.INFO:
            default:
                return 'fas fa-info-circle';
        }
    }
}; 