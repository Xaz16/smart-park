if (typeof authService === 'undefined') {
    console.error('authService не загружен! Убедитесь, что services/auth.js подключен перед main.js');
}

// Импортируем все view классы
import './views/home.js';
import './views/parking.js';
import './views/admin.js';
import './views/service-admin.js';
import './views/service-admin-parkings.js';
import './views/service-admin-users.js';
import './views/service-admin-cameras.js';
import './views/parking-admin.js';

let currentView = null;
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

        const passwordInput = document.getElementById('authPassword');
        const passwordToggle = document.getElementById('passwordToggle');
        if (passwordInput && passwordToggle) {
            passwordInput.type = 'password';
            passwordToggle.textContent = '👁️';
            passwordToggle.title = 'Показать пароль';
        }
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

let globalParkingData = [];
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

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('authPassword');
    const passwordToggle = document.getElementById('passwordToggle');

    if (passwordInput && passwordToggle) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordToggle.textContent = '🙈';
            passwordToggle.title = 'Скрыть пароль';
        } else {
            passwordInput.type = 'password';
            passwordToggle.textContent = '👁️';
            passwordToggle.title = 'Показать пароль';
        }
    }
}

window.app = {
    API_HOST: APP_CONFIG.API_HOST,
    POLLING_INTERVAL: APP_CONFIG.POLLING_INTERVAL,
    toggleSidebar,
    toggleLoader,
    openAuthModal,
    closeAuthModal,
    togglePasswordVisibility,
    updateGlobalParkingList,
    getGlobalParkingData: () => globalParkingData
};

document.addEventListener('DOMContentLoaded', () => {
    router.route('/parking/:id', (params) => {
        if (currentView && currentView.destroy) {
            currentView.destroy();
        }
        currentView = new ParkingView();
        currentView.render(params);
    });

    router.route('/', (params) => {
        if (currentView && currentView.destroy) {
            currentView.destroy();
        }
        currentView = new HomeView();
        currentView.render();
    });

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
            // Пользователь не авторизован - показываем иконку входа и модальное окно
            authIcon.innerHTML = '🔑';
            authIcon.title = 'Войти';
            authIcon.style.cursor = 'pointer';
            authIcon.onclick = () => {
                openAuthModal();
            };
        }
    }

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

    window.addEventListener('auth-changed', () => {
        updateHeaderAuthStatus();
    });

    authService.getCurrentUser().then((user) => {
        updateHeaderAuthStatus();
        if (!user && authService.isAuthenticated()) {
            console.warn('Token is invalid, redirecting to home');
            router.navigate('/');
        }
    }).catch((error) => {
        console.error('Error checking current user:', error);
        updateHeaderAuthStatus();
    });

    router.start();
    updateHeaderAuthStatus();
});
