// Администраторская панель
class AdminView {
    constructor() {
        this.currentView = null;
    }

    render(params) {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        // Определяем, какую админ-страницу показывать
        const adminPath = params.path || '';

        if (adminPath === 'parkings' || adminPath === '') {
            this.renderParkings();
        } else {
            this.renderNotFound();
        }
    }

    renderParkings() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <a href="#" data-route="/admin" style="color: #3498db; text-decoration: none; font-size: 1rem;">
                    ← Назад
                </a>
            </div>
            <section class="video-section">
                <h2 class="video-title">Администраторская панель - Управление парковками</h2>
                <div style="padding: 2rem; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #666; font-size: 1.1rem;">
                        Здесь будет интерфейс для управления парковками.
                    </p>
                    <p style="color: #999; margin-top: 1rem;">
                        Функционал находится в разработке...
                    </p>
                </div>
            </section>
        `;
    }

    renderNotFound() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <a href="#" data-route="/admin/parkings" style="color: #3498db; text-decoration: none; font-size: 1rem;">
                    ← Назад к админ-панели
                </a>
            </div>
            <section class="video-section">
                <h2 class="video-title">Страница не найдена</h2>
                <div style="padding: 2rem; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #666; font-size: 1.1rem;">
                        Запрашиваемая страница не существует.
                    </p>
                </div>
            </section>
        `;
    }

    destroy() {
        // Очистка при необходимости
    }
}

export { AdminView };
window.AdminView = AdminView;

