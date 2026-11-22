'use strict';
/**
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * ดึง Application ID จาก Discord ด้วย Bot Token ใน .env แล้วเขียนกลับใส่ CLIENT_ID ให้
 * (ไม่โชว์ token ออกมาในหน้าจอ)
 */
const fs = require('node:fs/promises');
const path = require('node:path');

const envPath = path.join(__dirname, '..', '.env');

const readEnvValue = (content, key) => {
  const line = content.split(/\r?\n/).find((l) => new RegExp(`^${key}\\s*=`, 'i').test(l));
  if (!line) return '';
  return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
};

async function main() {
  let content = await fs.readFile(envPath, 'utf8');
  const token = readEnvValue(content, 'DISCORD_TOKEN');

  if (!token || token.includes('ใส่_') || token.includes('your_bot_token')) {
    console.error('[FATAL] กรุณาใส่ DISCORD_TOKEN ในไฟล์ .env ก่อน แล้วรันคำสั่งนี้อีกครั้ง');
    process.exit(1);
  }

  console.log('[INFO] กำลังขอข้อมูลแอปจาก Discord API ...');
  const response = await fetch('https://discord.com/api/v10/applications/@me', {
    headers: { Authorization: `Bot ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try { message = JSON.parse(text)?.message || text; } catch { /* ignore */ }
    console.error(`[FATAL] Discord ปฏิเสธ token (HTTP ${response.status}): ${message}`);
    process.exit(1);
  }

  const app = await response.json();
  if (!app.id) throw new Error('Discord ไม่คืน application id');

  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((line) => /^CLIENT_ID\s*=/i.test(line));
  if (index === -1) lines.push(`CLIENT_ID=${app.id}`);
  else lines[index] = `CLIENT_ID=${app.id}`;
  await fs.writeFile(envPath, lines.join(eol), 'utf8');

  console.log('');
  console.log('  ✅ ดึง Application ID สำเร็จ');
  console.log(`     App name        : ${app.name}`);
  console.log(`     Application ID  : ${app.id}`);
  console.log(`     เขียนลง .env ที่ : CLIENT_ID=${app.id}`);
  console.log('');
  console.log('  ตอนนี้รันต่อได้เลย:');
  console.log('    npm run deploy:commands');
  console.log('    npm start');
  console.log('');
}

main().catch((error) => {
  console.error('[FATAL]', error.message);
  process.exit(1);
});
