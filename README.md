# HOME SWEET HOME SOCOOL · Beyond Bot

Discord.js v14 bot with two systems: Verify (Name + SteamID + DiscordID, admin approval, automatic Verified role) and a horizontal Home Sweet Home SOCOOL Server-Status embed.

## Slash commands

- `/setup-verify` — post the Verify panel in the current channel.
- `/setup-status` — post the Server-Status panel in the current channel. Run once in the channel where the status should appear.
- `/set-status status:<ONLINE|OFFLINE|UNDER MAINTENANCE> version:<version>` — admin-only manual status/version update; edits the existing panel instead of sending a new message.
- `/server-status` — show the current status privately.

## Verify flow

1. Member presses Verify and submits Name, SteamID64, and DiscordID.
2. The request is sent to `ADMIN_CHANNEL_ID` with Approve and Reject buttons.
3. An authorized admin approves or rejects. Approval assigns `VERIFIED_ROLE_ID`.
4. If role assignment fails, the request remains pending and the bot reports the Discord error.

## Required environment variables

- `DISCORD_TOKEN` — bot token.
- `GUILD_ID` — Discord server ID where slash commands are registered.
- `ADMIN_CHANNEL_ID` — text channel ID receiving Verify requests.
- `VERIFIED_ROLE_ID` — role assigned after approval.
- `ADMIN_ROLE_IDS` — optional comma-separated admin role IDs. If empty, users with Administrator or Manage Roles can manage requests/status.
- `PENDING_FILE` — optional path for pending requests JSON. Defaults to `pending.json` in the project directory.
- `STATUS_FILE` — optional path for Server-Status JSON. Defaults to `server-status.json` in the project directory.

## Discord permissions and setup

Invite scopes: `bot` and `applications.commands`. Bot permissions: View Channels, Send Messages, Embed Links, Read Message History, and Manage Roles. Put the bot's highest role above the Verified role. The bot must be able to view/send messages in the Verify request channel and the status panel channel.

After deployment, run `/setup-verify` and `/setup-status` in the desired channels. Then use `/set-status` whenever the game status or version changes.

## Important: status source

The Server-Status panel in this version is **manually updated** with `/set-status`. It does not claim to detect the private game server automatically. Automatic ONLINE/OFFLINE detection requires a reachable health-check endpoint or a documented game-server query protocol/address.

## Railway Free persistence note

Railway deployments may use ephemeral filesystem storage depending on the service/volume configuration. The bot can run without a volume, but pending Verify requests and status panel configuration stored in JSON files may be lost on redeploy/restart. For reliable persistence, attach a Railway Volume and set `PENDING_FILE` and `STATUS_FILE` to paths inside its mount directory, or migrate storage to a database.

## Run locally

```bash
npm ci
cp .env.example .env
# Fill in .env
npm start
```

Do not commit `.env` or expose `DISCORD_TOKEN`.
