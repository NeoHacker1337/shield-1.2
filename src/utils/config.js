export const API_CONFIG = {
    BASE_URL: 'https://app.nativeapp.com.my/api',  // Always Production

    TIMEOUT: 10000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
};

// Export individual values for easy access
export const BASE_URL = API_CONFIG.BASE_URL;
export const API_TIMEOUT = API_CONFIG.TIMEOUT;
export const DEFAULT_HEADERS = API_CONFIG.HEADERS;
