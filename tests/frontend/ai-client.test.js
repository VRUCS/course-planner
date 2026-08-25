'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '../../apps/web/scripts/adapters/ai-client.js'),
    'utf8',
);

function loadAI({ fetch }) {
    const sandbox = {
        window: {
            APP_CONFIG: { backendUrl: 'https://backend.example' },
            location: { hostname: 'planner.example' },
        },
        document: {
            addEventListener() {},
            getElementById() { return null; },
        },
        fetch,
        TextDecoder,
        TextEncoder,
        setTimeout,
        clearTimeout,
    };
    vm.runInNewContext(`${source}\nglobalThis.__AI = AI;`, sandbox);
    return sandbox.__AI;
}

test('AI health check degrades safely when AbortSignal.timeout is unavailable', async () => {
    const calls = [];
    const AI = loadAI({
        fetch: async (...args) => {
            calls.push(args);
            return { ok: false };
        },
    });

    await AI.checkHealth();
    assert.equal(AI.isInteractiveEnabled(), false);
    assert.equal(AI.isConfigured(), false);
    assert.equal('signal' in calls[0][1], false);
});

test('AI streaming keeps a final SSE chunk without a trailing newline', async () => {
    const AI = loadAI({
        fetch: async url => {
            if (url.endsWith('/health')) {
                return { ok: true, async json() { return { ai_interactive_enabled: true }; } };
            }
            return {
                ok: true,
                body: {
                    getReader() {
                        return {
                            done: false,
                            async read() {
                                if (this.done) return { done: true };
                                this.done = true;
                                return {
                                    done: false,
                                    value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"آخرین بخش"}}]}'),
                                };
                            },
                        };
                    },
                },
            };
        },
    });

    await AI.checkHealth();
    const chunks = [];
    for await (const chunk of AI.stream([])) chunks.push(chunk);
    assert.deepEqual(chunks, ['آخرین بخش']);
});
