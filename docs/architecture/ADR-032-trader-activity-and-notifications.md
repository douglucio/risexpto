# ADR-032 — Trader Activity and Notification Transparency

`BotEvent` is the activity timeline source for a Trader Instance and is exposed
through `GET /bots/:id/activity`, paginated in the follow-up UI. In-app
notifications are persisted and deduplicated by event type and structured
reason for a throttle window, preventing repeated WAITING notifications every
evaluation tick. Credentials are never included in event payloads.
