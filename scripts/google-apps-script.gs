/**
 * ============================================================
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * ------------------------------------------------------------
 * วิธีใช้ (ทำครั้งเดียว):
 *  1. สร้าง Google Sheets เปล่า ๆ
 *  2. เมนู Extensions -> Apps Script
 *  3. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดนี้ลงไป
 *  4. แก้ SECRET ให้ตรงกับ GOOGLE_SHEETS_SECRET ในไฟล์ .env ของบอท
 *  5. กด Save (ไอคอนdisk)
 *  6. กด Deploy -> New deployment -> เลือก Web app
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  7. กด Deploy -> อนุญาต (Review permissions -> เลือกบัญชี -> Advanced -> Go to...)
 *  8. Copy Web app URL ไปใส่ GOOGLE_SHEETS_URL ใน .env แล้ว restart บอท
 * ============================================================
 */

const SHEET_NAME = 'Verify';
const SECRET = 'nongche-verify-2026'; // ต้องตรงกับ GOOGLE_SHEETS_SECRET ใน .env

const HEADERS = [
  'id', 'at', 'status', 'name', 'discord_id', 'steam_id',
  'discord_user_id', 'username', 'guild_id', 'decided_at', 'decided_by', 'reason',
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    if (!e || !e.postData || !e.postData.contents) {
      return respond({ ok: false, error: 'ไม่มีข้อมูล' });
    }

    // กันคนอื่นยิง webhook ใส่ชีตของคุณ
    const headers = e.postData.headers || {};
    const sentSecret = headers['X-Nongche-Secret'] || headers['x-nongche-secret'];
    if (SECRET && sentSecret !== SECRET) {
      return respond({ ok: false, error: 'Secret ไม่ถูกต้อง' });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return respond({ ok: false, error: 'JSON ไม่ถูกต้อง' });
    }
    if (!data.id) return respond({ ok: false, error: 'ไม่มี id' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    // สร้างหัวตารางถ้ายังว่าง
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.setFrozenRows(1);
      sheet.setFrozenColumns(1);
    }

    const values = HEADERS.map((key) => (data[key] === null || data[key] === undefined ? '' : data[key]));

    // หาแถวที่เคยส่งมาก่อนด้วย id -> ถ้ามีให้ update แทนการ append
    const lastRow = sheet.getLastRow();
    const ids = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().map((r) => String(r[0]))
      : [];
    const index = ids.indexOf(String(data.id));

    if (index >= 0) {
      const rowNumber = index + 2;
      sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([values]);
      return respond({ ok: true, updated: true, row: rowNumber });
    }

    sheet.appendRow(values);
    return respond({ ok: true, appended: true, row: sheet.getLastRow() });
  } catch (err) {
    return respond({ ok: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

/** ใช้ทดสอบเองใน Apps Script ได้: เลือกฟังก์ชัน setupSheet แล้วกด Run */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  Logger.log('สร้างหัวตารางแล้ว');
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
