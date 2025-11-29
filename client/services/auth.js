// Сервис для работы с авторизацией
class AuthService {
    constructor() {

        this.tokenKey = 'smart_park_token';
        this.userKey = 'smart_park_user';
        this.API_HOST = window.app?.API_HOST || 'http://localhost:3000';
    }

    // Сохранить токен и данные пользователя
    setAuth(token, user) {
        if (!token || !user) {
            console.error('setAuth: token or user is missing', { token, user });
            return;
        }
        try {
            localStorage.setItem(this.tokenKey, token);
            localStorage.setItem(this.userKey, JSON.stringify(user));
            console.log('Token saved to localStorage:', { tokenKey: this.tokenKey, hasToken: !!token });
            window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user, isAuthenticated: true } }));
        } catch (error) {
            console.error('Failed to save auth data to localStorage:', error);
        }
    }

    // Получить токен
    getToken() {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) {
            console.log('No token found in localStorage');
        }
        return token;
    }

    // Получить данные пользователя
    getUser() {
        const userStr = localStorage.getItem(this.userKey);
        return userStr ? JSON.parse(userStr) : null;
    }

    // Проверить, авторизован ли пользователь
    isAuthenticated() {
        return !!this.getToken();
    }

    // Проверить роль пользователя
    hasRole(role) {
        const user = this.getUser();
        return user && user.role === role;
    }

    // Проверить, является ли пользователь суперадмином
    isSuperAdmin() {
        return this.hasRole('service_admin');
    }

    // Проверить, является ли пользователь администратором парковки
    isParkingAdmin() {
        return this.hasRole('parking_administrator');
    }

    // Вход в систему
    async login(username, password) {
        try {
            const response = await fetch(`${this.API_HOST}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const result = await response.json();

            if (result.status === 'success' && result.data) {
                const { token, user } = result.data;
                console.log('Login successful, saving token...', { hasToken: !!token, username: user.username });
                this.setAuth(token, user);

                // Проверяем, что токен действительно сохранился
                const savedToken = this.getToken();
                if (!savedToken) {
                    console.error('Token was not saved properly!');
                    return {
                        success: false,
                        error: 'Ошибка сохранения токена'
                    };
                }

                return { success: true, user };
            } else {
                return {
                    success: false,
                    error: result.message || 'Ошибка авторизации'
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: 'Не удалось подключиться к серверу'
            };
        }
    }

    // Получить текущего пользователя с сервера
    async getCurrentUser() {
        const token = this.getToken();
        if (!token) {
            console.log('getCurrentUser: No token found');
            return null;
        }

        try {
            console.log('getCurrentUser: Fetching user data with token...');
            const response = await fetch(`${this.API_HOST}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('getCurrentUser: Token is invalid or expired (401), logging out');
                    this.logout();
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success' && result.data) {
                const user = result.data;
                // Обновляем данные пользователя
                try {
                    localStorage.setItem(this.userKey, JSON.stringify(user));
                    console.log('getCurrentUser: User data updated');
                } catch (error) {
                    console.error('Failed to save user data:', error);
                }
                return user;
            } else {
                // Токен невалиден, выходим
                console.warn('getCurrentUser: Invalid response, logging out');
                this.logout();
                return null;
            }
        } catch (error) {
            console.error('Get current user error:', error);
            // При сетевой ошибке не выходим из системы, просто возвращаем null
            // Пользователь останется авторизованным, если токен есть в localStorage
            return null;
        }
    }

    // Выход из системы
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user: null, isAuthenticated: false } }));
    }

    // Получить заголовки для авторизованных запросов
    getAuthHeaders() {
        const token = this.getToken();
        return token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        } : {
            'Content-Type': 'application/json',
        };
    }
}

// Создаем глобальный экземпляр
const authService = new AuthService();

// Утилита для отладки (можно вызвать в консоли браузера)
window.debugAuth = function () {
    const token = authService.getToken();
    const user = authService.getUser();
    console.log('=== Auth Debug Info ===');
    console.log('Token exists:', !!token);
    console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
    console.log('User:', user);
    console.log('Is authenticated:', authService.isAuthenticated());
    console.log('Is super admin:', authService.isSuperAdmin());
    console.log('Is parking admin:', authService.isParkingAdmin());
    console.log('LocalStorage token:', localStorage.getItem('smart_park_token') ? 'exists' : 'missing');
    console.log('LocalStorage user:', localStorage.getItem('smart_park_user') ? 'exists' : 'missing');
    return { token, user, isAuthenticated: authService.isAuthenticated() };
};

