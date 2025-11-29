class Router {
    constructor() {
        this.routes = [];
        this.currentRoute = null;
        this.currentParams = {};
        this.init();
    }

    init() {
        window.addEventListener('popstate', (e) => {
            this.handleRoute();
        });

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                this.navigate(route);
            }
        });

        // Обработка начального маршрута будет вызвана после регистрации всех маршрутов
    }

    // Метод для запуска обработки начального маршрута
    start() {
        this.handleRoute();
    }

    // Регистрация маршрута
    route(path, handler) {
        this.routes.push({
            path: this.parsePath(path),
            handler: handler
        });
    }

    // Парсинг пути в регулярное выражение
    parsePath(path) {
        const parts = path.split('/').filter(p => p);
        // Обработка корневого пути
        if (parts.length === 0) {
            return {
                pattern: /^\/$/,
                paramNames: []
            };
        }
        const regexParts = parts.map(part => {
            if (part.startsWith(':')) {
                return '([^/]+)';
            }
            return part;
        });
        return {
            pattern: new RegExp('^/' + regexParts.join('/') + '$'),
            paramNames: parts.filter(p => p.startsWith(':')).map(p => p.slice(1))
        };
    }

    // Навигация
    navigate(path) {
        try {
            window.history.pushState({}, '', path);
            this.handleRoute();
        } catch (error) {
            if (error.name === 'SecurityError') {
                console.error('Ошибка: History API не работает с file:// протоколом.');
                console.error('Пожалуйста, запустите dev-сервер:');
                console.error('  npm install && npm run dev');
                console.error('Или используйте Python: python3 -m http.server 8000');
                // Fallback: просто обновляем контент без изменения URL
                this.handleRoute();
            } else {
                throw error;
            }
        }
    }

    // Обработка текущего маршрута
    handleRoute() {
        const path = window.location.pathname;

        for (const route of this.routes) {
            const match = path.match(route.path.pattern);
            if (match) {
                const params = {};
                route.path.paramNames.forEach((name, index) => {
                    params[name] = match[index + 1];
                });

                this.currentRoute = route;
                this.currentParams = params;
                route.handler(params);
                return;
            }
        }

        // Если маршрут не найден, редирект на главную
        if (path !== '/') {
            this.navigate('/');
        }
    }

    // Получить текущие параметры
    getParams() {
        return this.currentParams;
    }

    // Получить текущий путь
    getCurrentPath() {
        return window.location.pathname;
    }
}

// Создаем глобальный экземпляр роутера
const router = new Router();

// Экспортируем в глобальную область для обратной совместимости
window.router = router;

