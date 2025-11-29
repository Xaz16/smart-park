class ConfirmService {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        if (!document.getElementById('confirm-container')) {
            this.container = document.createElement('div');
            this.container.id = 'confirm-container';
            this.container.className = 'confirm-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('confirm-container');
        }
    }

    show(message, options = {}) {
        return new Promise((resolve) => {
            if (!this.container) {
                this.init();
            }

            const {
                title = 'Подтверждение',
                confirmText = 'Да',
                cancelText = 'Отмена',
                confirmColor = '#27ae60',
                cancelColor = '#95a5a6',
                danger = false
            } = options;

            // Если это опасное действие, используем красный цвет для кнопки подтверждения
            const finalConfirmColor = danger ? '#e74c3c' : confirmColor;

            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            
            const dialog = document.createElement('div');
            dialog.className = 'confirm-dialog';
            
            dialog.innerHTML = `
                <div class="confirm-header">
                    <h3 class="confirm-title">${this.escapeHtml(title)}</h3>
                </div>
                <div class="confirm-body">
                    <p class="confirm-message">${this.escapeHtml(message)}</p>
                </div>
                <div class="confirm-footer">
                    <button class="confirm-button confirm-cancel" style="background: ${cancelColor};">
                        ${this.escapeHtml(cancelText)}
                    </button>
                    <button class="confirm-button confirm-ok" style="background: ${finalConfirmColor};">
                        ${this.escapeHtml(confirmText)}
                    </button>
                </div>
            `;

            // Обработчики событий
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const handleOverlayClick = (e) => {
                if (e.target === overlay) {
                    handleCancel();
                }
            };

            const cleanup = () => {
                overlay.removeEventListener('click', handleOverlayClick);
                dialog.querySelector('.confirm-ok').removeEventListener('click', handleConfirm);
                dialog.querySelector('.confirm-cancel').removeEventListener('click', handleCancel);
                overlay.classList.add('confirm-hide');
                setTimeout(() => {
                    overlay.remove();
                }, 200);
            };

            dialog.querySelector('.confirm-ok').addEventListener('click', handleConfirm);
            dialog.querySelector('.confirm-cancel').addEventListener('click', handleCancel);
            overlay.addEventListener('click', handleOverlayClick);

            overlay.appendChild(dialog);
            this.container.appendChild(overlay);

            // Анимация появления
            setTimeout(() => {
                overlay.classList.add('confirm-show');
            }, 10);
        });
    }

    // Вспомогательные методы для разных типов подтверждений
    async danger(message, options = {}) {
        return this.show(message, { ...options, danger: true, title: options.title || 'Внимание!' });
    }

    async warning(message, options = {}) {
        return this.show(message, { ...options, confirmColor: '#f39c12', title: options.title || 'Предупреждение' });
    }

    async info(message, options = {}) {
        return this.show(message, { ...options, confirmColor: '#3498db', title: options.title || 'Подтверждение' });
    }

    // Экранирование HTML для безопасности
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Создаем глобальный экземпляр
const confirmService = new ConfirmService();

// Делаем доступным глобально
window.confirmDialog = confirmService;

// Переопределяем стандартный confirm для обратной совместимости (опционально)
// window.confirm = async function(message) {
//     return await confirmService.show(message);
// };

