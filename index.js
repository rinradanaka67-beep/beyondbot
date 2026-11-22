'use strict';
/**
 * ============================================================
 *  HSHO DISCORD VERIFY BOT
 *  BY NONGCHE
 * ============================================================
 */
const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

const { config } = require('./src/config');
const verification = require('./src/services/verification.service');

async function main() {
  if (!config.token || config.token.includes('ใส่_')) {
    console.error('[FATAL] กรุณาใส่ DISCORD_TOKEN ในไฟล์ .env ก่อนรัน');
    process.exit(1);
  }

  await verification.ensureStorage();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });
  client.commands = new Collection();

  const eventsDir = path.join(__dirname, 'src', 'events');
  for (const file of fs.readdirSync(eventsDir).filter((f) => f.endsWith('.js'))) {
    const event = require(path.join(eventsDir, file));
    const handler = (...args) => event.execute(...args, client);
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
  }

  client.on('error', (error) => console.error('[DISCORD] error:', error));
  process.on('unhandledRejection', (reason) => console.error('[UNHANDLED]', reason));

  await client.login(config.token);
}

main().catch((error) => {
  console.error('[FATAL]', error);
  process.exit(1);
});
