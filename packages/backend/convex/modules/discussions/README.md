# Discussions

Shared chats are one domain. Outside this folder, import the classes:

```ts
import { Messages } from '#convex/modules/discussions/messages/index';
import { Discussions } from '#convex/modules/discussions/threads/index';
```

| Class | Responsibility |
| --- | --- |
| `Messages` | Text, request ids, and message shape |
| `Discussions` | Threads, members, send/list, and assistant replies |
| `DiscussionAccess` | Membership gate used by `Discussions` |
| `DiscussionAssistant` | Action that streams one claimed assistant reply |

`DiscussionMedia` pins library files onto messages and stays inside this folder.
Public adapters stay under `routes/discussions`.
