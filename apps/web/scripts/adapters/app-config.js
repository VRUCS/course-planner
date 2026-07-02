/**
 * Public runtime configuration for the optional AI backend.
 * This file is safe to publish. Never put OPENROUTER_API_KEY or any other
 * secret here; whether AI is available is decided entirely on the server.
 */
window.APP_CONFIG = Object.freeze({
    backendUrl: '',
});
