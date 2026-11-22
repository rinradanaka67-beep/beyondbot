'use strict';
/**
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * ทดสอบ Google Sheets integration ด้วย mock webhook ในเครื่อง (ไม่ต้องใช้ Google จริง)
 */
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const testDir = path.join(os.tmpdir(), `hsho-sheets-test-${Date.now()}`);
const received = [];

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    received.push({
      secret: req.headers['x-nongche-secret'],
      contentType: req.headers['content-type'],
      data: JSON.parse(body),
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, appended: true }));
  });
});

let passed = 0;
let failed = 0;
const check = (name, condition, detail) => {
  if (condition) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail !== undefined ? ` :: ${JSON.stringify(detail)}` : ''}`); }
};

async function main() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.DATA_DIR = testDir;
  process.env.GOOGLE_SHEETS_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.GOOGLE_SHEETS_SECRET = 'test-secret';

  const sheets = require('../src/services/google-sheets.service');
  const pending = require('../src/services/pending.service');
  const { config } = require('../src/config');

  console.log('\n=== HSHO GOOGLE SHEETS TEST ===\n');

  check('โหลด URL จาก env', config.googleSheetsUrl === process.env.GOOGLE_SHEETS_URL);
  check('toRow ครบ 12 คอลัมน์', Object.keys(sheets.toRow({
    id: 'x', at: '', status: 'pending', name: '', discordId: '', steamId: '',
    userId: '', username: '', guildId: null, decidedAt: null, decidedBy: null, reason: null,
  })).length === sheets.HEADERS.length);

  const request = await pending.createPending({
    name: 'Sheet Tester', discordId: '123456789012345678',
    steamId: '79555555555555555', userId: '123456789012345678',
    username: 'sheettest', guildId: '999999999999999999',
  });
  check('ส่ง pending ไป Sheets 1 ครั้ง', received.length === 1, received.length);
  check('payload status = pending', received[0]?.data.status === 'pending', received[0]?.data);
  check('payload มี SteamID', received[0]?.data.steam_id === '79555555555555555');
  check('ส่ง secret ไปด้วย', received[0]?.secret === 'test-secret', received[0]?.secret);
  check('ส่ง JSON content-type', received[0]?.contentType === 'application/json');

  await pending.decide(request.id, { approved: true, adminId: 'admin-001' });
  check('อนุมัติ -> ส่ง update ไป Sheets', received.length === 2, received.length);
  check('update ใช้ id เดิม', received[1]?.data.id === request.id);
  check('update status = approved', received[1]?.data.status === 'approved', received[1]?.data);
  check('update มี decided_by', received[1]?.data.decided_by === 'admin-001');

  const rejected = await pending.createPending({
    name: 'Reject Me', discordId: '876543210987654321',
    steamId: '79566666666666666', userId: '876543210987654321',
    username: 'rejectme', guildId: '999999999999999999',
  });
  await pending.decide(rejected.id, { approved: false, adminId: 'admin-001', reason: 'ทดสอบ' });
  check('ปฏิเสธ -> status = rejected', received.at(-1)?.data.status === 'rejected');
  check('ปฏิเสธ -> มีเหตุผล', received.at(-1)?.data.reason === 'ทดสอบ');

  // ไฟล์ในเครื่องต้องยังเซฟอยู่เสมอ แม้ส่ง Sheets แล้ว
  const steamTxt = await fs.readFile(path.join(testDir, 'steamids.txt'), 'utf8');
  check('ไฟล์ steamids.txt ยังเขียนอยู่', steamTxt.includes('79555555555555555'), steamTxt);
  check('ไม่เขียน SteamID ของคนถูกปฏิเสธ', !steamTxt.includes('79566666666666666'), steamTxt);

  await fs.rm(testDir, { recursive: true, force: true });
  await new Promise((resolve) => server.close(resolve));
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error('TEST CRASHED:', error);
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  server.close();
  process.exit(1);
});
