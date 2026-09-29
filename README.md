# Kin Messenger SDK

`@kknagda488/kin-sdk` embeds the Kin customer Messenger. Email, phone, WhatsApp, SMS, Slack, Discord, Telegram, social messaging, and meetings connect through the Kin backend and provider settings; they are not transports implemented by this browser SDK.

## Install from npm

```sh
npm install @kknagda488/kin-sdk
```

```ts
import Kin from '@kknagda488/kin-sdk';
import '@kknagda488/kin-sdk/dist/style.css';

Kin({
  // Use the widget key from Kin Settings → Messenger → Install.
  organization_id: 'YOUR_WIDGET_KEY',
  // Set this to the public Kin API URL in deployed websites.
  endpoint: 'https://YOUR_KIN_API/api/v1',
  bottom_tabs: ['home', 'messages', 'help'],
});
```

The key must be a widget key allowed for the website's origin. `organization_id` is the legacy option name; it is sent as the widget key and does not accept a database organization UUID. The SDK defaults to `http://localhost:8000/api/v1` for local development, so set `endpoint` for every deployed site.

## Development with the local SDK

Run the frontend through the Kin AI Compose setup. Its frontend service mounts `../sdk` and copies that local package into the frontend's `node_modules` on startup, so source changes are exercised without publishing an npm release. Rebuild the SDK bundle when needed:

```sh
cd kin-agent/sdk
npm run build
```

For frontend work outside Compose, build this package and install the local folder into the frontend with `npm install --no-save ../../sdk`. The checked-in frontend dependency remains the published package version for clean installs; it is not the development source used by Compose.

## Public API

The default export initializes the widget. Named exports include `show`, `hide`, `shutdown`, `update`, `startConversation`, `startMeeting`, `startTour`, `onShow`, and `onHide`. `startConversation(text)` opens the chat with a prefilled message; `startMeeting()` loads the next available meeting slots; `startTour(id?)` starts a published product tour without opening Messenger. `onShow` and `onHide` return unsubscribe functions.

`update({ user_id, name, email })` updates the visitor context held by the browser SDK. Do not use these client values as proof of identity; authenticate users on your own site and avoid treating a widget-supplied identity as verified.

The web SDK creates a stable anonymous visitor ID and device ID in first-party local storage and a same-site `kin_anonymous_*` cookie. A browser-tab session ID is kept in `sessionStorage`. It sends a small `/gateway/ping` on initialization, while the page is active, and when the tab becomes visible. The ping includes the current page without query/hash parameters, page title, referrer path, SDK version, and optional identity values. Visitor rows are workspace-scoped and appear in Inbox when the visitor starts a conversation. Clear the site's storage/cookie to reset an anonymous visitor.

The widget loads its greeting, enabled spaces, theme values, launcher setting, published help articles, and published product tours from the workspace Messenger content endpoint. Customer and teammate messages synchronize through the shared Inbox; meeting cards included in Inbox messages render in the widget.

## Product tours

Create and review tours in Kin Settings → Channels → Product tours. Sync website content and upload frontend context first if you want AI to draft product-specific steps. AI drafts remain unpublished until an administrator reviews and publishes them. Published tours can start automatically on their configured URL path, from the Messenger Home card, or from the host application:

```ts
import Kin, { startTour } from '@kknagda488/kin-sdk';

Kin({ organization_id: 'YOUR_WIDGET_KEY' });
startTour('PUBLISHED_TOUR_ID');
```

Steps can spotlight a CSS selector. Steps with no selector, or a selector not found on the page, display as a centered guide card. Check selectors on the actual deployed pages before publishing.

## Capture frontend context for product tours

The SDK running in a browser cannot read a site's source repository. Install the CLI in the application repository or run it in CI to create a bounded `FRONTEND_CONTEXT.md` from tracked frontend files, with common credential lines redacted:

```sh
npx --yes @kknagda488/kin-sdk kin-context --output .kin/FRONTEND_CONTEXT.md
```

To update the workspace's private, indexed authoring context, configure `KIN_API_URL`, `KIN_WORKSPACE` (workspace slug), and `KIN_API_TOKEN` (an owner/admin access token), then run:

```sh
npx --yes @kknagda488/kin-sdk kin-context --upload
```

The upload is a private `frontend_context` source, is upserted per repository, and its chunks are excluded from customer-facing Q&A and Messenger Help. The Markdown file can also be uploaded from Knowledge. Keep the API token in CI secrets; do not commit it or generated frontend context. Run the script on a trusted runner because it reads application source.

Example GitHub Actions step:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npx --yes @kknagda488/kin-sdk kin-context --upload
  env:
    KIN_API_URL: ${{ vars.KIN_API_URL }}
    KIN_WORKSPACE: ${{ vars.KIN_WORKSPACE }}
    KIN_API_TOKEN: ${{ secrets.KIN_API_TOKEN }}
```

This supplies private source context for authoring; it does not automatically inspect a deployed page's selectors or publish a product tour.

## Limitations

- The SDK has no authenticated mechanism for signing in a customer or proving a supplied `user_id`.
- Browser-side content and session storage are scoped by widget key and browser origin.
- Voice recording is sent as an attachment; the backend currently does not provide a speech transcription pipeline for that attachment.
- Provider-specific channel setup, OAuth, and external provider callbacks are managed in Kin settings/backend, not in this SDK.
