// Страница суперадминистратора (service_admin)
class ServiceAdminView {
    constructor() {
        this.user = null;
    }

    render(params) {
        this.user = authService.getUser();
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                <h1 style="color: #2c3e50; margin: 0;">Панель суперадминистратора</h1>
                <button onclick="window.logout()" style="padding: 0.5rem 1rem; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Выйти
                </button>
            </div>
            
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <p style="color: #666; margin-bottom: 0.5rem;">Пользователь: <strong>${this.user?.username || '—'}</strong></p>
                <p style="color: #666; margin: 0;">Роль: <strong>Суперадминистратор</strong></p>
            </div>

            <div class="admin-grid">
                <div class="admin-card" onclick="router.navigate('/service-admin/parkings')">
                    <div class="admin-card-icon">🚗</div>
                    <h3>Управление парковками</h3>
                    <p>Создание, редактирование и удаление парковок</p>
                </div>
                
                <div class="admin-card" onclick="router.navigate('/service-admin/users')">
                    <div class="admin-card-icon">👥</div>
                    <h3>Управление пользователями</h3>
                    <p>Создание и управление пользователями системы</p>
                </div>
                
                <div class="admin-card" onclick="toast.info('Функционал в разработке')">
                    <div class="admin-card-icon">📹</div>
                    <h3>Управление камерами</h3>
                    <p>Настройка и управление камерами</p>
                </div>
                
                <div class="admin-card" onclick="toast.info('Функционал в разработке')">
                    <div class="admin-card-icon">📊</div>
                    <h3>Статистика и отчеты</h3>
                    <p>Просмотр статистики по парковкам</p>
                </div>
            </div>
        `;
    }

    destroy() {
        // Очистка не требуется
    }
}

