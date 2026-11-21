# Beyond Verify Bot (Render)

Discord.js v14 verification bot: button -> modal -> admin approval/rejection -> assign verified role.

## Deploy to Render

1. Push this folder to a GitHub repository.
2. In Render choose **New + -> Blueprint** and select the repository containing `render.yaml`.
3. Render creates a **Background Worker** (not a Web Service).
4. Set these Environment variables in Render:
   - `DISCORD_TOKEN`: Bot token from Discord Developer Portal
   - `GUILD_ID`: Discord server ID
   - `ADMIN_CHANNEL_ID`: text channel ID for verification requests
   - `VERIFIED_ROLE_ID`: role ID assigned after approval
   - `ADMIN_ROLE_IDS`: optional comma-separated admin role IDs
5. Deploy. Logs should show `บอทออนไลน์ในชื่อ ...`.
6. In the Discord server run `/setup-verify` as an administrator.

## Discord Developer Portal

- Enable the bot and invite it to the server with `bot` and `applications.commands` scopes.
- Bot permissions: View Channels, Send Messages, Embed Links, Read Message History, Manage Roles.
- Put the bot's highest role above the Verified role and any roles it needs to assign.
- Copy IDs with Developer Mode enabled.

## Local run

```bash
npm install
cp .env.example .env
# Fill in .env, then:
npm start
```

## Persistent data on Render

`render.yaml` attaches a 1 GB Persistent Disk at `/var/data`; pending verification requests are stored at `/var/data/pending.json`.
Persistent Disks require a paid Render instance. If you deploy on a free instance without a disk, the bot may run but pending requests can be lost on restart/redeploy. Do not commit `.env` or your bot token to GitHub.

## Important

- This bot is a Background Worker and does not need an HTTP health-check server.
- Render Environment variables replace local `.env` values in production.
- If the bot says `Used disallowed intents`, review enabled intents in Discord Developer Portal. This bot currently only requests the `Guilds` intent.
