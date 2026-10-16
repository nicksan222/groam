# ChatGPT as Groam’s sole AI provider

Status: implementation authorized by the user. Local web, desktop, and tunneled self-hosted runtimes implemented; shared hosted authorization remains unavailable pending an approved OpenAI plan-usage contract.

## Intended outcome

Replace OpenAI API keys, Anthropic, Google, OpenRouter, and compatible hosts with one personal “Continue with ChatGPT” connection across the web, desktop, and self-hosted app. Eligible requests use the initiating user’s authorized ChatGPT plan. Retain Groam’s existing application accounts and sessions; connecting an AI provider does not replace application login.

## Approach

Use one ChatGPT credential and inference contract with deployment-specific authorization entry points. A desktop/local runtime performs the documented public-client OAuth flow. Shared hosted deployments use a separately approved OpenAI registration and plan-usage contract. Self-hosted VMs use the documented local authorization and protected credential transfer procedure where applicable.

A website identity registration alone does not establish permission to use ChatGPT plans. Do not send public dynamic registration to a remote callback or pretend hosted plan access is available without approval. If hosted approval is unavailable, show an explicit unavailable state for that deployment.

## Authorization and credentials

The local runtime starts a loopback listener on 127.0.0.1 before opening the system browser. Persist a stable opaque host identifier. Generate fresh state, nonce, and PKCE values for each attempt. New registrations use dynamic_agent_client; exchange codes with the issued client ID. Verify ID-token signature, issuer, audience, expiry, nonce, and granted plan-usage scopes before activating the connection. Bind completion to the initiating Groam user. Keep tokens out of browser storage, URLs, logs, and public Convex query responses.

Store protected credentials per Groam user and verified ChatGPT identity/registration. Refresh tokens in the trusted runtime with serialized refreshes and persist rotated tokens. Disconnect removes usable credentials; reauthorization failures prompt reconnection. Account changes cannot silently replace a different user’s connection.

For a hosted service, final callback handling, token storage, requested scopes, and inference configuration must follow the contract supplied with its approved registration. Do not infer that contract from identity-only examples.

## Inference and ownership

Replace deployment-first and organization-shared key resolution with the initiating user’s ChatGPT connection. Preserve the user identity through assistant chat, reviews, issue agents, and background work. Missing, expired, disconnected, or disallowed credentials stop the request with an actionable status; there is no developer-funded fallback.

Use the authorized account’s model catalog and the documented eligible Responses API contract. Force non-stored conversion in the SDK before it builds conversation history; force streaming and non-stored requests on the wire. Translate system messages to developer messages, strip preview-unsupported request fields, and group local function/custom tools into namespaces. Preserve supported web search subject to account/model policy. Preserve existing streaming and tool execution through the existing agent adapter. Validate supported request features before retaining current options such as web search. Background work retains its initiating user rather than using another group member’s credentials.

## Settings and schema

Replace provider selection, key inputs, custom base URLs, deployment-key notices, and organization AI credentials with personal ChatGPT connection status, Continue with ChatGPT, reconnect, and disconnect. Show the required first-use explanation that eligible usage counts against the connected ChatGPT plan and can be managed in ChatGPT settings. Distinguish consent denial, unavailable plan usage, limits, expired authorization, and deployment unavailability.

This is an unused project, so remove the former provider schema, APIs, registry, environment synchronization, compatibility flags, and migration infrastructure outright. Store only ChatGPT connections, profiles, transactions, and host metadata for AI authorization. Keep user-account deletion cleanup for personal ChatGPT records. No compatibility tables, rejection endpoints, or upgrade migrations are needed.

## Validation

Cover state/nonce/PKCE and callback validation, account binding, scope validation, token refresh rotation and concurrency, disconnect, credential isolation, and refusal to fall back to old keys. Cover streaming/tool calls with mocked Responses requests, model catalog handling, settings states, and background ownership. Run package typechecks, relevant integration/browser checks, and the repository quality gate. A real sign-in smoke test requires an eligible human account; hosted smoke testing additionally requires the approved hosted registration.

## Alternatives considered

- A single public dynamic-registration flow for every deployment is unsuitable: its documented callback is loopback and does not establish hosted service approval.
- Retaining old providers as fallbacks conflicts with the requested single provider and could continue spending deployment funds.

## Information required before implementation is finalized

No approved hosted registration or plan-usage contract was supplied. Shared hosted connections therefore remain unavailable. The application does not claim that an identity-only registration enables plan usage. To enable a future shared hosted deployment, obtain OpenAI approval and integrate its supplied contract; do not reuse the public loopback flow.

## Sources

- https://developers.openai.com/siwc/token-sharing-open-source
- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms
- https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference
- https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
- https://developers.openai.com/siwc/website
