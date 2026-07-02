# Back-end architecture

The FastAPI application is a separate deployment unit from the static client.
It exposes only health and server-controlled AI endpoints; no provider secret is
accepted from or returned to the browser.

## Request flow

```text
HTTP route -> Pydantic schema -> access policy -> AIChatService -> OpenRouterGateway
                  |                    |                |
              API contract       rate limiter      provider protocol
```

- `main.py` is the composition root and application factory.
- `api/routes/` contains transport-only endpoint functions.
- `api/schemas/` defines strict public request and response contracts.
- `application/ai_service.py` owns model policy and use-case orchestration;
  `application/ports.py` defines the provider interface it consumes.
- `infrastructure/openrouter.py` is the replaceable HTTP provider adapter.
- `dependencies.py` composes access policy and rate limiting.
- `domain/errors.py` defines transport-neutral application failures;
  `api/exception_handlers.py` maps them to sanitized API responses.
- `config.py` validates environment-driven settings at startup.

`AIChatService` depends on a `ChatProvider` protocol rather than a concrete
vendor. This dependency inversion permits an alternative provider or a test
double without changing routes or business policy.

The included in-memory rate limiter is thread-safe and intentionally scoped to
one process. A horizontally scaled production deployment should implement the
same limiter boundary with shared storage such as Redis.
