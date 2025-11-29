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

    window.APP_CONFIG = {
        API_HOST: defaultAPIHost,
        POLLING_INTERVAL: 15000,
    };
})();

const APP_CONFIG = window.APP_CONFIG;

function getAPIHost() {
    if (window.app && window.app.API_HOST) {
        return window.app.API_HOST;
    }
    if (window.APP_CONFIG && window.APP_CONFIG.API_HOST) {
        return window.APP_CONFIG.API_HOST;
    }
    return 'http://localhost:3000';
}

window.getAPIHost = getAPIHost;
