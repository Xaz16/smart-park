// Главный файл приложения с роутингом
// Константы теперь в constants.js

// Убеждаемся, что authService доступен глобально
if (typeof authService === 'undefined') {
    console.error('authService не загружен! Убедитесь, что services/auth.js подключен перед main.js');
}

// Текущий активный view
let currentView = null;

// Глобальные функции для UI
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if (loader) {
        if (show) {
            loader.classList.remove('hidden');
        } else {
            loader.classList.add('hidden');
        }
    }
}

function openAuthModal() {
    const authModal = document.getElementById('authModal');
    const overlay = document.getElementById('overlay');
    if (authModal && overlay) {
        authModal.classList.add('active');
        overlay.classList.add('active');
    }
}

function closeAuthModal() {
    const authModal = document.getElementById('authModal');
    const overlay = document.getElementById('overlay');
    if (authModal && overlay) {
        authModal.classList.remove('active');
        overlay.classList.remove('active');
    }
}

// Глобальное хранилище данных парковок для сайдбара
let globalParkingData = [];

// Функция для обновления списка парковок в сайдбаре
function updateGlobalParkingList(parkingData) {
    globalParkingData = parkingData;
    const list = document.getElementById('parkingList');
    if (!list) return;

    list.innerHTML = '';

    if (!parkingData.length) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = 'Нет данных о парковках';
        emptyItem.style.cursor = 'default';
        list.appendChild(emptyItem);
        return;
    }

    parkingData.forEach((parking) => {
        const item = document.createElement('li');
        item.textContent = parking.title;
        item.onclick = () => {
            router.navigate(`/parking/${parking.id}`);
            if (window.app) {
                window.app.toggleSidebar();
            }
        };
        list.appendChild(item);
    });
}

// Экспортируем функции в глобальный объект для доступа из views
window.app = {
    API_HOST: APP_CONFIG.API_HOST,
    POLLING_INTERVAL: APP_CONFIG.POLLING_INTERVAL,
    toggleSidebar,
    toggleLoader,
    openAuthModal,
    closeAuthModal,
    updateGlobalParkingList,
    getGlobalParkingData: () => globalParkingData
};

// Инициализация роутера после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Регистрируем маршруты (важно: более специфичные маршруты должны быть зарегистрированы первыми)

    // Страница деталей парковки
    router.route('/parking/:id', (params) => {
        if (currentView && currentView.destroy) {
            currentView.destroy();
        }
        currentView = new ParkingView();
        currentView.render(params);
    });

    // Главная страница
    router.route('/', (params) => {
        if (currentView && currentView.destroy) {
            currentView.destroy();
        }
        currentView = new HomeView();
        currentView.render();
    });

    // Обработка кликов по overlay
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('active')) {
                toggleSidebar();
            }
            closeAuthModal();
        });
    }

    // Обработка формы авторизации
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('authUsername');
            const passwordInput = document.getElementById('authPassword');
            const errorDiv = document.getElementById('authError');

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            // Скрываем предыдущую ошибку
            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
            }

            if (!username || !password) {
                if (errorDiv) {
                    errorDiv.textContent = 'Заполните все поля';
                    errorDiv.style.display = 'block';
                }
                return;
            }

            // Показываем загрузку
            const submitBtn = authForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Вход...';

            // Выполняем вход
            const result = await authService.login(username, password);

            if (result.success) {
                closeAuthModal();
                // Очищаем форму
                usernameInput.value = '';
                passwordInput.value = '';

                // Перенаправляем в зависимости от роли
                updateHeaderAuthStatus();
                redirectByRole(result.user.role);
            } else {
                // Показываем ошибку
                if (errorDiv) {
                    errorDiv.textContent = result.error || 'Ошибка авторизации';
                    errorDiv.style.display = 'block';
                }
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // Обновление статуса авторизации в header
    function updateHeaderAuthStatus() {
        const user = authService.getUser();
        const authIcon = document.getElementById('authIcon');

        if (!authIcon) return;

        // Очищаем предыдущие обработчики
        authIcon.onclick = null;
        authIcon.className = 'auth-icon';

        if (user) {
            // Пользователь авторизован - делаем ссылку
            authIcon.innerHTML = `👤 ${user.username}`;
            authIcon.title = `Пользователь: ${user.username} (${user.role === 'service_admin' ? 'Суперадмин' : 'Администратор парковки'}). Клик для перехода в админку.`;
            authIcon.style.cursor = 'pointer';

            // Определяем маршрут в зависимости от роли
            authIcon.onclick = (e) => {
                e.preventDefault();
                if (user.role === 'service_admin') {
                    router.navigate('/service-admin');
                } else if (user.role === 'parking_administrator') {
                    router.navigate('/parking-admin');
                }
            };
        } else {
            // Пользователь не авторизован - показываем модальное окно
            authIcon.innerHTML = '👤';
            authIcon.title = 'Войти';
            authIcon.style.cursor = 'pointer';
            authIcon.onclick = () => {
                openAuthModal();
            };
        }
    }

    // Перенаправление в зависимости от роли
    function redirectByRole(role) {
        if (role === 'service_admin') {
            router.navigate('/service-admin');
        } else if (role === 'parking_administrator') {
            router.navigate('/parking-admin');
        } else {
            router.navigate('/');
        }
    }

    // Защита маршрутов
    function requireAuth(requiredRole = null) {
        return (params) => {
            if (!authService.isAuthenticated()) {
                router.navigate('/');
                openAuthModal();
                return;
            }

            if (requiredRole && !authService.hasRole(requiredRole)) {
                router.navigate('/');
                toast.warning('У вас нет доступа к этой странице');
                return;
            }
        };
    }

    // Функция для проверки авторизации суперадмина
    async function requireSuperAdmin() {
        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const user = await authService.getCurrentUser();

            if (!user || !authService.isSuperAdmin()) {
                if (window.app) {
                    window.app.toggleLoader(false);
                }
                router.navigate('/');
                if (user && !authService.isSuperAdmin()) {
                    toast.warning('Только суперадминистратор может получить доступ к этой странице');
                } else {
                    openAuthModal();
                }
                return null;
            }

            if (window.app) {
                window.app.toggleLoader(false);
            }

            return user;
        } catch (error) {
            console.error('Error checking super admin:', error);
            if (window.app) {
                window.app.toggleLoader(false);
            }
            return null;
        }
    }

    // Регистрируем защищенные маршруты для суперадмина
    // Подмаршруты должны быть зарегистрированы ПЕРЕД основным маршрутом
    router.route('/service-admin/parkings', async (params) => {
        const user = await requireSuperAdmin();
        if (!user) return;

        if (currentView && currentView.destroy) {
            currentView.destroy();
        }
        currentView = new ServiceAdminParkingsView();
        currentView.render(params);
    });

    router.route('/service-admin/users', async (params) => {
        const user = await requireSuperAdmin();
        if (!user) return;

        if (currentView && currentView.destroy) {
            currentView.destroy();
        }
        currentView = new ServiceAdminUsersView();
        currentView.render(params);
    });

    router.route('/service-admin/cameras', async (params) => {
        const user = await requireSuperAdmin();
        if (!user) return;

        if (currentView && currentView.destroy) {
            currentView.destroy();
        }
        currentView = new ServiceAdminCamerasView();
        currentView.render(params);
    });

    router.route('/service-admin/:path', async (params) => {
        const user = await requireSuperAdmin();
        if (!user) return;

        if (currentView && currentView.destroy) {
            currentView.destroy();
        }
        currentView = new AdminView();
        currentView.render(params);
    });

    router.route('/service-admin', async (params) => {
        const user = await requireSuperAdmin();
        if (!user) return;

        if (currentView && currentView.destroy) {
            currentView.destroy();
        }
        currentView = new ServiceAdminView();
        currentView.render(params);
    });

    router.route('/parking-admin', async (params) => {
        // Показываем лоадер во время проверки
        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            // Проверяем токен на сервере перед отображением
            const user = await authService.getCurrentUser();

            if (!user || !authService.isParkingAdmin()) {
                if (window.app) {
                    window.app.toggleLoader(false);
                }
                router.navigate('/');
                if (user && !authService.isParkingAdmin()) {
                    toast.warning('Только администратор парковки может получить доступ к этой странице');
                } else {
                    openAuthModal();
                }
                return;
            }

            // Скрываем лоадер перед рендерингом, так как ParkingAdminView сам управляет лоадером
            if (window.app) {
                window.app.toggleLoader(false);
            }

            if (currentView && currentView.destroy) {
                currentView.destroy();
            }
            currentView = new ParkingAdminView();
            currentView.render(params);
        } catch (error) {
            console.error('Error in parking-admin route:', error);
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    });

    // Обработка выхода
    window.logout = async function () {
        const confirmed = await confirmDialog.show('Вы уверены, что хотите выйти?', {
            title: 'Выход из системы',
            confirmText: 'Выйти',
            cancelText: 'Отмена'
        });

        if (confirmed) {
            authService.logout();
            updateHeaderAuthStatus();
            router.navigate('/');
        }
    };

    // Слушаем изменения авторизации
    window.addEventListener('auth-changed', () => {
        updateHeaderAuthStatus();
    });

    // Проверяем авторизацию при загрузке
    authService.getCurrentUser().then((user) => {
        updateHeaderAuthStatus();
        // Если пользователь был авторизован, но токен невалиден, перенаправляем на главную
        if (!user && authService.isAuthenticated()) {
            console.warn('Token is invalid, redirecting to home');
            router.navigate('/');
        }
    }).catch((error) => {
        console.error('Error checking current user:', error);
        updateHeaderAuthStatus();
    });

    // Обработка выхода через контекстное меню (правый клик) или через кнопку в админке
    // Основной клик теперь перенаправляет в админку (обрабатывается в updateHeaderAuthStatus)

    // Запускаем роутер после регистрации всех маршрутов
    router.start();
    updateHeaderAuthStatus();
});
