class AuthService {
    constructor() {
        this.tokenKey = 'smart_park_token';
        this.userKey = 'smart_park_user';
    }

    getAPIHost() {
        if (typeof window.getAPIHost === 'function') {
            return window.getAPIHost();
        }
        if (window.app && window.app.API_HOST) {
            return window.app.API_HOST;
        }
        return typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.API_HOST : 'https://smartparkistu.ru';
    }
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

    getToken() {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) {
            console.log('No token found in localStorage');
        }
        return token;
    }

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

    isSuperAdmin() {
        return this.hasRole('service_admin');
    }

    isParkingAdmin() {
        return this.hasRole('parking_administrator');
    }

    async login(username, password) {
        try {
            const API_HOST = this.getAPIHost();
            const response = await fetch(`${API_HOST}/api/auth/login`, {
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

    async getCurrentUser() {
        const token = this.getToken();
        if (!token) {
            console.log('getCurrentUser: No token found');
            return null;
        }

        try {
            const API_HOST = this.getAPIHost();
            console.log('getCurrentUser: Fetching user data with token from', API_HOST);
            const response = await fetch(`${API_HOST}/api/auth/me`, {
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

    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user: null, isAuthenticated: false } }));
    }

    getAuthHeaders() {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn('getAuthHeaders: No token available!');
        }

        return headers;
    }
}

// Создаем глобальный экземпляр
const authService = new AuthService();

// Экспортируем в глобальную область для обратной совместимости
window.authService = authService;

// Утилита для отладки (можно вызвать в консоли браузера)
window.debugAuth = function () {
    const token = authService.getToken();
    const user = authService.getUser();
    const apiHost = typeof getAPIHost === 'function' ? getAPIHost() : authService.getAPIHost();
    console.log('=== Auth Debug Info ===');
    console.log('API_HOST (from constants):', typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.API_HOST : 'not loaded');
    console.log('API_HOST (current):', apiHost);
    console.log('window.app.API_HOST:', window.app?.API_HOST);
    console.log('Token exists:', !!token);
    console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
    console.log('User:', user);
    console.log('Is authenticated:', authService.isAuthenticated());
    console.log('Is super admin:', authService.isSuperAdmin());
    console.log('Is parking admin:', authService.isParkingAdmin());
    console.log('LocalStorage token:', localStorage.getItem('smart_park_token') ? 'exists' : 'missing');
    console.log('LocalStorage user:', localStorage.getItem('smart_park_user') ? 'exists' : 'missing');
    return { token, user, isAuthenticated: authService.isAuthenticated(), apiHost };
};

