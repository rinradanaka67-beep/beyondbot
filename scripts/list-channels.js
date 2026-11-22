'use strict';
/** HSHO DISCORD VERIFY BOT BY NONGCHE - ดูรายชื่อช่องในเซิร์ฟเวอร์ */
const fs = require('node:fs/promises');
const path = require('node:path');

const envPath = path.join(__dirname, '..', '.env');

async function main() {
  const content = await fs.readFile(envPath, 'utf8');
  const get = (key) => {
    const line = content.split(/\r?\n/).find((l) => new RegExp(`^${key}\\s*=`, 'i').test(l));
    return line ? line.slice(line.indexOf('=') + 1).trim() : '';
  };
  const token = get('DISCORD_TOKEN');
  const guildId = get('GUILD_ID');
  if (!token || !guildId) {
    console.error('[FATAL] ต้องมี DISCORD_TOKEN และ GUILD_ID ใน .env');
    process.exit(1);
  }

  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${token}` },
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(`[FATAL] HTTP ${response.status}: ${data.message || JSON.stringify(data)}`);
    process.exit(1);
  }
  console.log('ช่องข้อความในเซิร์ฟเวอร์:');
  for (const channel of data.filter((c) => c.type === 0)) {
    console.log(`  #${channel.name}  ->  ${channel.id}`);
  }
}

main().catch((error) => {
  console.error('[FATAL]', error.message);
  process.exit(1);
});
