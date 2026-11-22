# HSHO Discord Verify Bot — BY NONGCHE

บอท Verify สำหรับ Discord **เขียนใหม่ทั้งหมด** (ไม่ได้นำโค้ดใครมาแก้)

**การทำงาน:** สมาชิกกดปุ่ม **Verify** → กรอก **Name / DiscordID / SteamID** → **แอดมินกด อนุมัติ หรือ ปฏิเสธ** → เฉพาะรายการที่อนุมัติแล้วจะถูกบันทึก SteamID ลงไฟล์ **และ Google Sheets**

> ไม่ต้องเชื่อม HSHO API (ตามที่คุณต้องการ) · เซฟทั้งในเครื่อง **และ** Google Sheets (เลือกได้)

---

## 1. ไฟล์ที่ได้หลัง Verify

อยู่ที่ `data/` (ปรับได้ผ่าน `DATA_DIR` ใน `.env`)

### `data/steamids.txt`
SteamID ทุกตัวที่กรอกมา คั่นด้วย `, ` ตามตัวอย่างที่คุณบอก:

```
79511111111111111, 79522222222222222
```

### `data/verifications.csv`
ประวัติแบบอ่านง่าย เก็บครบทั้ง 3 ช่องที่ผู้เล่นกรอก:

```csv
timestamp,name,discord_id,steam_id,discord_user_id
2026-11-22T04:10:00.000Z,NONGCHE,123456789012345678,79511111111111111,123456789012345678
```

### `data/verifications.json`
ข้อมูลเดียวกันในรูปแบบ JSON (ใช้แสดงสถิติในบอท) เช่น
```json
{
  "name": "NONGCHE",
  "discordId": "123456789012345678",
  "steamId": "79511111111111111"
}
```

### `data/pending.json`
คำขอที่รออนุมัติ/ตัดสินแล้ว (status = `pending` / `approved` / `rejected`) พร้อมเหตุผลปฏิเสธ

> **เฉพาะคำขอที่แอดมินอนุมัติเท่านั้น** จะถูกเขียนลง `steamids.txt`, `verifications.csv`, `verifications.json`

---

## 1.1 เซฟลง Google Sheets (ไม่บังคับ)

บอทจะส่งข้อมูลไป Google Sheets ผ่าน **Apps Script Web App** (ไม่ต้องใช้ Service Account / OAuth / ไม่ต้อง install library เพิ่ม)

**ข้อมูลที่ขึ้น sheet** (1 แถวต่อ 1 คำขอ):

| คอลัมน์ | ความหมาย |
|---|---|
| `id` | รหัสคำขอ (ใช้อัปเดตแถวเดิม ไม่เพิ่มแถวซ้ำ) |
| `at` | เวลาที่กรอก |
| `status` | `pending` → `approved` / `rejected` |
| `name` | Name ที่ผู้เล่นกรอก |
| `discord_id` | DiscordID |
| `steam_id` | SteamID |
| `discord_user_id` | Discord user ID จริงของคนกดปุ่ม |
| `username` | ชื่อผู้ใช้ Discord ตอนกด |
| `guild_id` | Server ID |
| `decided_at` / `decided_by` / `reason` | ผลตัดสินของแอดมิน |

### ตั้งค่าครั้งเดียว (ทำตามลำดับ)

1. สร้าง **Google Sheets** เปล่า ๆ (ชื่ออะไรก็ได้)
2. เมนู **Extensions → Apps Script**
3. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดจากไฟล์ **`scripts/google-apps-script.gs`** ลงไป (กด **Save**)
4. ในโค้ดบรรทัด `const SECRET = 'nongche-verify-2026'` ต้อง **ตรงกับ** `GOOGLE_SHEETS_SECRET` ใน `.env`
5. กด **Deploy → New deployment** → เลือก **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. กด **Deploy** → ถ้าขึ้น Review permissions ให้เลือกบัญชี → **Advanced → Go to (ชื่อแอป) → Allow**
7. **Copy Web app URL** (ลงท้ายด้วย `/exec`) ไปใส่ใน `.env`:
   ```dotenv
   GOOGLE_SHEETS_URL=https://script.google.com/macros/s/...../exec
   GOOGLE_SHEETS_SECRET=nongche-verify-2026
   ```
8. ทดสอบการเชื่อมต่อ:
   ```powershell
   npm run sheets:test
   ```
   ถ้าขึ้น `[OK]` ให้ไปดูแถว `status = connected` ใน sheet ได้เลย
9. **Restart บอท** เพื่อโหลดค่าใหม่

### พฤติกรรมสำคัญ
- ถ้า **เว้น `GOOGLE_SHEETS_URL` ไว้ว่าง** → บอททำงานแบบเดิม (เซฟเฉพาะไฟล์ในเครื่อง)
- ถ้า **Google Sheets พัง/ช้า** → บอทจะ retry 3 ครั้งแล้ว log เตือน แต่ **การอนุมัติและไฟล์ในเครื่องยังทำงานปกติ** (ไม่มีทางเสียข้อมูล)
- ตอนสมาชิกกรอก → ได้แถว `pending` / ตอนแอดมินตัดสิน → **แถวเดิมถูกอัปเดต** เป็น `approved` หรือ `rejected`

---

## 2. ติดตั้งและรัน

```powershell
cd "C:\Users\Rinrada Muengchan\Downloads\HSHO_DISCORD_VERIFY_BOT"
npm install
npm test
```

ผลที่คาด: **37 passed + 15 passed** (ทดสอบฟอร์ม 3 ช่อง, ระบบเขียนไฟล์, อนุมัติ/ปฏิเสธ และ Google Sheets ด้วย mock webhook — ไม่ต้องใช้ token จริง)

---

## 3. ตั้งค่าบอทใน Discord

### 3.1 สร้างแอป/บอท
1. ไปที่ https://discord.com/developers/applications
2. **New Application** → ตั้งชื่อ เช่น `HSHO Verify`
3. แท็บ **Bot** → **Reset Token** → copy token ใส่ `DISCORD_TOKEN` ใน `.env`
4. แท็บ **General Information** → copy **Application ID** ใส่ `CLIENT_ID`

### 3.2 เปิด Developer Mode และ copy ID
1. Discord → User Settings → Advanced → เปิด **Developer Mode**
2. คลิกขวาเซิร์ฟเวอร์ → **Copy Server ID** ใส่ `GUILD_ID`
3. (ถ้าอยากให้เพิ่มยศ) คลิกขวายศ → **Copy Role ID** ใส่ `VERIFY_ROLE_ID`
   - ถ้าไม่ใส่ บอทจะบันทึก SteamID อย่างเดียว ไม่เพิ่มยศ

### 3.3 Invite บอท
ใน **OAuth2 → URL Generator** เลือก:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Manage Roles` (ถ้าใช้ยศ), `Send Messages`, `Embed Links`, `Use External Emojis`

เปิดลิงก์ที่ได้ เชิญเข้าเซิร์ฟเวอร์

> **สำคัญ:** ยศของบอทต้องอยู่ **สูงกว่า** ยศที่ต้องการให้ (ใน Server Settings → Roles)

---

## 4. ลงทะเบียนคำสั่ง + สตาร์ทบอท

### 4.1 ดึง Application ID อัตโนมัติ (ไม่ต้อง copy เอง)
ใส่ `DISCORD_TOKEN` ใน `.env` แล้วรัน:

```powershell
npm run fetch:app-id
```

สคริปต์จะเรียก Discord API แล้วเขียน `CLIENT_ID` ให้ใน `.env` อัตโนมัติ (ไม่โชว์ token ออกมา)

### 4.2 ลงทะเบียนคำสั่ง + สตาร์ท
```powershell
npm run deploy:commands
npm start
```

ถ้าขึ้น `Logged in as ...` แสดงว่าพร้อมใช้งาน ✅

> **สำคัญ:** เปิดบอท **แค่ 1 ตัว** ครับ ถ้ารัน `npm start` / `npm run dev` ซ้ำจะถูกบล็อก
> (มี lock กันอยู่) เพราะ 2 ตัวตอบ interaction เดียวกันจะเกิด error `40060` ครับ

---

## 5. ใช้งานใน Discord

| คำสั่ง | ใครใช้ได้ | รายละเอียด |
|---|---|---|
| `/setup` | Manage Server | ส่ง panel พร้อมปุ่ม **Verify** ไปยังช่องที่ระบุ (หรือ `VERIFY_CHANNEL_ID`) |
| `/verify-pending` | Manage Server | ดูคำขอที่รออนุมัติ พร้อมปุ่มอนุมัติ/ปฏิเสธ |
| `/verify-stats` | Manage Server | ดูจำนวน SteamID ที่อนุมัติแล้ว, ไม่ซ้ำ, จำนวนรออนุมัติ, รายการล่าสุด 10 คน |
| `/verify-export` | Manage Server | ดาวน์โหลด `steamids.txt`, `verifications.csv`, `verifications.json`, `pending.json` |

**ขั้นตอนของสมาชิก:**
1. กดปุ่ม ✅ **Verify**
2. หน้าต่างกรอกจะเปิดขึ้น มี **3 ช่อง**:
   - **Name** → ชื่อของผู้เล่น
   - **DiscordID** → บอทใส่ Discord ID ของคนกดปุ่มไว้ให้แล้ว (แก้ได้)
   - **SteamID** → ตัวเลข 15–20 หลัก (เช่น `76561198000000000`)
3. กด **ส่ง** → บอทตอบกลับแบบส่วนตัวว่า **ส่งให้แอดมินอนุมัติแล้ว** (ยังไม่บันทึกไฟล์)
4. รอผลทาง DM

**ขั้นตอนของแอดมิน:**
1. ที่ช่อง `APPROVAL_CHANNEL_ID` จะมีข้อความที่รออนุมัติพร้อมปุ่ม ✅ **อนุมัติ** / ❌ **ปฏิเสธ**
   - หรือพิมพ์ `/verify-pending` เพื่อดูรายการพร้อมปุ่มกด
2. กด **อนุมัติ** → SteamID ถูกเขียนลงไฟล์, เพิ่มยศ (ถ้าตั้งค่า), สมาชิกได้ DM แจ้งว่าผ่าน
3. กด **ปฏิเสธ** → ใส่เหตุผลได้ → ไม่เขียนไฟล์, สมาชิกได้ DM แจ้งเหตุผล
4. กดซ้ำไม่ได้ (ระบบกันอนุมัติซ้ำ)

---

## 6. ตัวแปรใน `.env`

| ตัวแปร | ความหมาย |
|---|---|
| `DISCORD_TOKEN` | token บอท (บังคับ) |
| `CLIENT_ID` | Application ID (บังคับสำหรับ deploy คำสั่ง) |
| `GUILD_ID` | Server ID (บังคับสำหรับ deploy คำสั่ง) |
| `VERIFY_ROLE_ID` | ยศที่ให้หลัง verify (ว่าง = ไม่เพิ่มยศ) |
| `VERIFY_CHANNEL_ID` | ช่องที่ `/setup` ส่ง panel ไป (ว่าง = ช่องที่พิมพ์คำสั่ง) |
| `APPROVAL_CHANNEL_ID` | **ช่องที่แอดมินกดอนุมัติ/ปฏิเสธ** (แนะนำเป็นห้องแอดมิน) |
| `LOG_CHANNEL_ID` | ช่องส่ง log ทุกครั้งที่มีคน verify (ว่าง = ไม่ส่ง) |
| `GOOGLE_SHEETS_URL` | Web app URL จาก Apps Script (ว่าง = ไม่ส่ง Sheets) |
| `GOOGLE_SHEETS_SECRET` | รหัสลับกันคนอื่นยิง webhook (ต้องตรงกับใน `.gs`) |
| `DATA_DIR` | ที่เก็บไฟล์ (default `./data`) |
| `PANEL_TITLE` / `PANEL_DESCRIPTION` | ข้อความบน embed |

---

## 7. โครงสร้างโปรเจกต์

```
HSHO_DISCORD_VERIFY_BOT/
├── index.js                      # login + โหลด event
├── src/
│   ├── config.js
│   ├── events/
│   │   ├── ready.js
│   │   └── interaction-create.js # button / modal / slash commands + อนุมัติ/ปฏิเสธ
│   ├── services/
│   │   ├── verification.service.js # เขียนไฟล์เฉพาะที่อนุมัติแล้ว
│   │   ├── pending.service.js      # คิวคำขอรออนุมัติ + กันกดซ้ำ
│   │   └── google-sheets.service.js # ส่งข้อมูลเข้า Google Sheets (retry + fail-safe)
│   └── ui/
│       ├── panel.js          # Embed + ปุ่ม Verify
│       ├── verify-modal.js   # ฟอร์ม 3 ช่อง Name / DiscordID / SteamID
│       └── approval-panel.js # ปุ่ม อนุมัติ/ปฏิเสธ สำหรับแอดมิน
├── scripts/
│   ├── deploy-commands.js
│   ├── fetch-app-id.js
│   ├── list-guilds.js
│   ├── send-panel.js
│   ├── google-apps-script.gs       # <- copy วางใน Apps Script
│   ├── test-connection.js
│   ├── test-local.js
│   └── test-sheets.js
├── data/                         # สร้างตอนรัน (ถูก .gitignore)
├── .env / .env.example
└── README.md
```

---

## 8. เครดิต

เขียนและออกแบบโดย **BY NONGCHE**

โค้ดทั้งหมดสร้างขึ้นใหม่ ไม่ได้ copy/decode/แก้โค้ดของโปรเจกต์อื่น
