# Frontend architecture

The frontend intentionally remains a build-free static application. Its
architecture separates policy from browser integration instead of introducing
a framework solely for structure.

## Layers

1. **Generated data** — `apps/web/generated/*.generated.js` files expose
   read-only browser wrappers generated from canonical JSON.
2. **Domain policy** — `course-domain.js` parses schedules/exams;
   `planner-domain.js`
   implements catalog queries, timetable derivation, curriculum state,
   conflict evaluation, and student-context generation. These files do not
   access the DOM, storage, or network.
3. **Adapters** — `planner-storage.js` owns browser persistence and `ai-client.js`
   owns the HTTP boundary to the backend. Both receive external dependencies
   through small interfaces.
4. **Page controllers/views** — files under `apps/web/scripts/pages/`
   translate user events into domain calls and render the resulting view.

This is a ports-and-adapters variation: business rules point inward and browser
APIs remain at the edge. In particular, the AI client no longer reads planner
DOM or global state. `student-planner.js` registers a context provider, allowing API
transport and student-context policy to change independently.

## State and failure policy

- Selection and curriculum progress are represented by `Set` values in memory.
- The persistence adapter validates expiry and course IDs when hydrating state.
- Corrupt or obsolete local data degrades to an empty state rather than
  preventing application startup.
- Interactive AI is disabled until the backend health endpoint explicitly
  enables it. Requests have timeouts and server failures are surfaced through
  accessible status or error messages.

## Testing

Pure domain and persistence behavior is tested with Node's built-in test
runner. Tests require neither a browser nor generated production data:

```sh
npm test
npm run lint
```

DOM scripts should remain thin. New rules belong in `scripts/domain/`;
browser APIs should enter through an adapter rather than being
called from those modules.
