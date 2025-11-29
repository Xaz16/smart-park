// Централизованные константы приложения
// Определяем API_HOST на основе текущего URL
(function () {
    'use strict';
    let defaultAPIHost = 'http://localhost:3000';

    try {
        if (typeof window !== 'undefined' && window.location && window.location.hostname) {
            if (window.location.hostname.includes('smartparkistu.ru') ||
                window.location.hostname === 'smartparkistu.ru') {
                defaultAPIHost = 'https://smartparkistu.ru';
            }
        }
    } catch (e) {
        console.warn('Could not determine API_HOST from location, using default:', e);
    }

    // Создаем глобальный объект конфигурации
    window.APP_CONFIG = {
        API_HOST: defaultAPIHost,
        POLLING_INTERVAL: 15000, // Интервал обновления данных парковки (в миллисекундах)
    };
})();

// Для обратной совместимости - создаем локальную константу
const APP_CONFIG = window.APP_CONFIG;

// Вспомогательная функция для получения API_HOST
// Использует приоритет: window.app.API_HOST > APP_CONFIG.API_HOST > дефолт
function getAPIHost() {
    if (window.app && window.app.API_HOST) {
        return window.app.API_HOST;
    }
    if (window.APP_CONFIG && window.APP_CONFIG.API_HOST) {
        return window.APP_CONFIG.API_HOST;
    }
    // Дефолтное значение
    return 'http://localhost:3000';
}

// Делаем функцию доступной глобально
window.getAPIHost = getAPIHost;
