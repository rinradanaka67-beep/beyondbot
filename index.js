'use strict';
/**
 * ============================================================
 *  HSHO DISCORD VERIFY BOT
 *  BY NONGCHE
 * ============================================================
 */
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

const { config } = require('./src/config');
const verification = require('./src/services/verification.service');

// กันรันบอทซ้ำ (2 ตัวตอบ interaction เดียวกัน -> error 40060)
// ใช้ port ท้องถิ่นเป็น lock: ปิดโปรเซสเมื่อไหร่ lock จะหลุดเอง
const LOCK_PORT = Number(process.env.BOT_LOCK_PORT || 60999);
const lockServer = net.createServer();
async function acquireSingleInstanceLock() {
  await new Promise((resolve, reject) => {
    lockServer.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error('มีบอทอีกตัวรันอยู่แล้ว — อย่ารัน npm start ซ้ำ (ปิดตัวเก่าก่อน หรือตรวจสอบ ProcessId)'));
      } else reject(error);
    });
    lockServer.listen(LOCK_PORT, '127.0.0.1', resolve);
  });
}

async function main() {
  if (!config.token || config.token.includes('ใส่_')) {
    console.error('[FATAL] กรุณาใส่ DISCORD_TOKEN ในไฟล์ .env ก่อนรัน');
    process.exit(1);
  }

  await acquireSingleInstanceLock();
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
  console.error(`[FATAL] ${error?.message || error}`);
  process.exit(1);
});
