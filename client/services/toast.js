// Toast notification service
class ToastService {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Создаем контейнер для toast уведомлений
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 4000) {
        if (!this.container) {
            this.init();
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Иконка в зависимости от типа
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icons[type] || icons.info}</span>
                <span class="toast-message">${this.escapeHtml(message)}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        this.container.appendChild(toast);

        // Анимация появления
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);

        // Автоматическое удаление
        const autoRemove = setTimeout(() => {
            this.remove(toast);
        }, duration);

        // Остановка автоудаления при наведении
        toast.addEventListener('mouseenter', () => {
            clearTimeout(autoRemove);
        });

        // Возобновление автоудаления при уходе мыши
        toast.addEventListener('mouseleave', () => {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        });

        return toast;
    }

    remove(toast) {
        if (toast && toast.parentElement) {
            toast.classList.remove('toast-show');
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }
    }

    // Вспомогательные методы для разных типов уведомлений
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration || 6000);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    // Экранирование HTML для безопасности
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Создаем глобальный экземпляр
const toastService = new ToastService();

// Делаем доступным глобально
window.toast = toastService;

