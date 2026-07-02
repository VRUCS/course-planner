/**
 * Public runtime configuration for the optional AI backend.
 * This file is safe to publish. Never put OPENROUTER_API_KEY or AI_API_TOKEN
 * here; authenticated users enter the access token for their browser session.
 */
window.APP_CONFIG = Object.freeze({
    backendUrl: '',
});
