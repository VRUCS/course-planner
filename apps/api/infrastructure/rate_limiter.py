"""Thread-safe rate-limiter infrastructure."""
from collections import defaultdict, deque
from dataclasses import dataclass, field
from threading import Lock
from time import monotonic

from apps.api.domain.errors import RateLimitExceededError


@dataclass(slots=True)
class InMemoryRateLimiter:
    """Thread-safe sliding-window limiter suitable for a single-process deployment."""

    _requests: dict[str, deque[float]] = field(
        default_factory=lambda: defaultdict(deque),
    )
    _lock: Lock = field(default_factory=Lock)

    def check(self, key: str, *, limit: int, window_seconds: int) -> None:
        now = monotonic()
        threshold = now - window_seconds
        with self._lock:
            bucket = self._requests[key]
            while bucket and bucket[0] <= threshold:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(1, int(bucket[0] + window_seconds - now) + 1)
                raise RateLimitExceededError(retry_after)
            bucket.append(now)

    def clear(self) -> None:
        with self._lock:
            self._requests.clear()
