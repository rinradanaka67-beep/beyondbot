'use strict';
/** HSHO DISCORD VERIFY BOT BY NONGCHE - ดูรายชื่อเซิร์ฟเวอร์ที่บอทอยู่ */
const fs = require('node:fs/promises');
const path = require('node:path');

const envPath = path.join(__dirname, '..', '.env');

async function main() {
  const content = await fs.readFile(envPath, 'utf8');
  const line = content.split(/\r?\n/).find((l) => /^DISCORD_TOKEN\s*=/i.test(l));
  const token = line ? line.slice(line.indexOf('=') + 1).trim() : '';
  if (!token || token.includes('ใส่_')) {
    console.error('[FATAL] ยังไม่ได้ใส่ DISCORD_TOKEN ใน .env');
    process.exit(1);
  }

  const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bot ${token}` },
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(`[FATAL] HTTP ${response.status}: ${data.message || JSON.stringify(data)}`);
    process.exit(1);
  }
  if (!data.length) {
    console.log('บอทยังไม่ได้อยู่ในเซิร์ฟเวอร์ไหนเลย → เชิญบอทเข้าเซิร์ฟเวอร์ก่อนครับ');
    return;
  }
  console.log('เซิร์ฟเวอร์ที่บอทอยู่:');
  for (const guild of data) console.log(`  ${guild.name}  ->  ${guild.id}`);
}

main().catch((error) => {
  console.error('[FATAL]', error.message);
  process.exit(1);
});
