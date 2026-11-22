'use strict';
/** HSHO DISCORD VERIFY BOT BY NONGCHE - ส่งแถวทดสอบไป Google Sheets จริง */
const sheets = require('../src/services/google-sheets.service');
const { config } = require('../src/config');

async function main() {
  if (!config.googleSheetsUrl) {
    console.error('[FATAL] ยังไม่ได้ใส่ GOOGLE_SHEETS_URL ใน .env');
    process.exit(1);
  }
  console.log(`[INFO] ทดสอบส่งข้อมูลไป ${config.googleSheetsUrl.slice(0, 60)}...`);
  const result = await sheets.testConnection();
  if (result.skipped) return console.error('[FATAL] ไม่ได้ตั้งค่า URL');
  if (result.ok === false) return console.error(`[FAIL] ${result.error}`);
  console.log('[OK] ส่งสำเร็จ ไปดูแถว status=connected ใน Google Sheets ได้เลย');
  return undefined;
}

main().catch((error) => {
  console.error('[FATAL]', error.message);
  process.exit(1);
});
