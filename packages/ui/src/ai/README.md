# UI

React components for the in-app AI assistant and chat surfaces.

| Subfolder | Role |
| --- | --- |
| `context/` | Agent screen context provider and serialization |
| `chat/` | Floating widget, composer, conversation, suggested prompts |
| `messages/` | Message bubbles, sources, form responses, context markers |
| `form/` | Render assistant-generated JSON forms (inputs + recap) |
| `tool-calls/` | Activity and choice tool-call cards |
| `attachments/` | Context tag attachments and picker |
| `shared/` | Error boundary and json-render strategy wiring |

Apps import specific files via `@groam/ui/ai/<area>/<file>`. Inside this package,
use `#tsx/ai/*` for TSX and `#src/ai/*` for TypeScript.
