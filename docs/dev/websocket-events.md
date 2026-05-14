# Repository WebSocket Events

The server exposes a single WebSocket that broadcasts every repository
state change so the UI can stay in sync without polling.

## Endpoint

```
GET /api/events/ws?token=<JWT>
```

- The `token` query parameter is required (browsers cannot send an
  `Authorization` header on a WebSocket handshake). Use the same JWT as
  for HTTP requests.
- The connection is closed with code `1008` if the token is missing or
  invalid.
- A 30 s server-side ping/pong heartbeat drops zombie sockets.

## Message contract

Every server-to-client message is a JSON object:

```ts
interface RepositoryEvent<T = unknown> {
  repository: string;   // projectId; "" or "*" for global events
  eventType: string;    // see registry below
  eventDetail: T;       // free-form, typed by eventType
  ts: number;           // server epoch ms
}
```

The contract is intentionally generic. Adding a new event = picking a
new `eventType` string and emitting it on the server bus. No schema
migration is needed.

## Event-type registry

| Category   | Event type             | Detail (typical)                                    |
|------------|------------------------|-----------------------------------------------------|
| Project    | `project.created`      | `{ project }`                                       |
| Project    | `project.updated`      | `{ project }`                                       |
| Project    | `project.deleted`      | `{}`                                                |
| Lifecycle  | `git.<op>.started`     | `{ project: { id, name } }`                         |
| Lifecycle  | `git.<op>.completed`   | op-specific (e.g. `{ branch }` for checkout)        |
| Lifecycle  | `git.<op>.failed`      | `{ message }`                                       |
| Status     | `git.status.changed`   | `{ status: ProjectStatus }` (fat snapshot)          |
| File       | `file.created`         | `{ parentPath, fileName }`                          |
| File       | `file.updated`         | `{ path }`                                          |
| File       | `file.deleted`         | `{ path }`                                          |
| File       | `file.renamed`         | `{ oldPath, newPath }`                              |

`<op>` is one of: `clone`, `pull`, `push`, `commit`, `checkout`,
`reset`, `branch.create`, `branch.delete`.

The fat `git.status.changed` payload lets the UI update without a
follow-up HTTP roundtrip — the periodic `ProjectsSync` loop remains as
a low-frequency reconciliation safety net.

## Server side

- Bus: `src/events/EventBus.ts` (Node `EventEmitter`, single shared
  instance).
- Broadcaster: `src/events/WebSocketRoutes.ts` (one shared subscription
  fans out to all open sockets).
- Helper: `src/projects/ProjectOperationEvents.ts#RunWithEvents` wraps
  every git operation with `started` / `completed` / `failed`
  broadcasts and a status refresh on success.

## Web side

- Client: `services/RepositoryEventsService.ts` — singleton WebSocket
  with exponential reconnect and `on(eventType | "*", handler)` API.
- Plugin: `plugins/repository-events.client.ts` — connects on app
  startup, reconnects on `AUTH_UPDATED`, disconnects on unload.
- Stores:
  - `stores/GitProjectsStore.ts` — applies `git.status.changed` and
    `project.*` events.
  - `stores/RepositoryEventsStore.ts` — tracks per-repository
    in-flight operations to drive UI affordances (spinners).

Components subscribe directly when they need fine-grained reactions
(see [pages/code/index.vue](../../sourcecode-editor-web/pages/code/index.vue)
for `file.*` handling on the active project).
