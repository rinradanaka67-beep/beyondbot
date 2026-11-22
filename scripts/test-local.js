'use strict';
/**
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * ทดสอบฟอร์ม 3 ช่อง + การเขียนไฟล์ โดยไม่ต้องเชื่อม Discord จริง
 */
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const testDir = path.join(os.tmpdir(), `hsho-verify-test-${Date.now()}`);
process.env.DATA_DIR = testDir;

const verification = require('../src/services/verification.service');
const { buildPanel } = require('../src/ui/panel');
const { buildVerifyModal } = require('../src/ui/verify-modal');
const { config } = require('../src/config');

let passed = 0;
let failed = 0;
const check = (name, condition, detail) => {
  if (condition) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail !== undefined ? ` :: ${JSON.stringify(detail)}` : ''}`); }
};

async function main() {
  console.log('\n=== HSHO DISCORD VERIFY BOT - LOCAL TEST ===\n');

  await verification.ensureStorage();

  check('SteamID 17 หลักผ่าน', verification.isValidSteamId('76561198000000001') === true);
  check('SteamID มีตัวอักษรถูกปฏิเสธ', verification.isValidSteamId('795abc') === false);
  check('DiscordID ผ่าน', verification.isValidDiscordId('123456789012345678') === true);
  check('DiscordID ผิดรูปถูกปฏิเสธ', verification.isValidDiscordId('nongche#0001') === false);

  const first = await verification.record({
    name: 'NONGCHE',
    discordId: '123456789012345678',
    steamId: '79511111111111111',
    userId: '123456789012345678',
    username: 'nongche',
    guildId: '999999999999999999',
  });
  const second = await verification.record({
    name: 'Player Two',
    discordId: '876543210987654321',
    steamId: '79522222222222222',
    userId: '876543210987654321',
    username: 'playertwo',
    guildId: '999999999999999999',
  });

  check('ลำดับที่ 1', first.total === 1, first.total);
  check('ลำดับที่ 2', second.total === 2, second.total);
  check('record เก็บ Name', first.entry.name === 'NONGCHE', first.entry);
  check('record เก็บ DiscordID', first.entry.discordId === '123456789012345678', first.entry);

  const steamTxt = await fs.readFile(verification.FILES.steam, 'utf8');
  check('steamids.txt คั่นด้วย ", " ตามตัวอย่าง', steamTxt.trim() === '79511111111111111, 79522222222222222', steamTxt);

  const csv = await fs.readFile(verification.FILES.csv, 'utf8');
  check('CSV header มี 3 ช่องที่กรอก', csv.startsWith('timestamp,name,discord_id,steam_id,discord_user_id\n'), csv);
  check('CSV มี 2 แถวข้อมูล', csv.trim().split('\n').length === 3, csv.trim().split('\n').length);
  check('CSV มี Name + DiscordID', csv.includes('NONGCHE,123456789012345678,79511111111111111'), csv);

  const json = JSON.parse(await fs.readFile(verification.FILES.json, 'utf8'));
  check('JSON มี 2 records', json.length === 2, json.length);
  check('JSON เก็บ Name/DiscordID/SteamID', json[0].name === 'NONGCHE'
    && json[0].discordId === '123456789012345678'
    && json[0].steamId === '79511111111111111', json[0]);

  const stats = await verification.stats();
  check('stats.total = 2', stats.total === 2, stats.total);
  check('stats.unique = 2', stats.unique === 2, stats.unique);
  check('stats.lastRecords เรียงล่าสุดก่อน', stats.lastRecords[0].steamId === '79522222222222222', stats.lastRecords[0]);

  const panel = buildPanel();
  const embedJson = panel.embeds[0].toJSON();
  check('panel footer เป็น BY NONGCHE', embedJson.footer.text.includes('BY NONGCHE'), embedJson.footer);
  check('panel มีปุ่ม verify_open', panel.components[0].toJSON().components[0].custom_id === 'verify_open');
  check('panel บอกกรอก 3 ช่อง', embedJson.fields[0].value.includes('DiscordID'), embedJson.fields[0]);

  const modal = buildVerifyModal({ discordId: '123456789012345678' }).toJSON();
  const ids = modal.components.map((row) => row.components[0].custom_id);
  check('modal มี 3 ช่อง', ids.length === 3, ids);
  check('ช่อง modal ตรง Name/DiscordID/SteamID',
    JSON.stringify(ids) === JSON.stringify(['verify_name', 'verify_discord_id', 'verify_steam_id']), ids);
  check('DiscordID ถูกใส่ค่าไว้ล่วงหน้า',
    modal.components[1].components[0].value === '123456789012345678', modal.components[1]);

  check('dataDir ตั้งตาม env', config.dataDir === testDir, config.dataDir);

  await fs.rm(testDir, { recursive: true, force: true });
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error('TEST CRASHED:', error);
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  process.exit(1);
});
