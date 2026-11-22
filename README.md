# HSHO Discord Verify Bot — BY NONGCHE

บอท Verify สำหรับ Discord **เขียนใหม่ทั้งหมด** (ไม่ได้นำโค้ดใครมาแก้)

**การทำงาน:** สมาชิกกดปุ่ม **Verify** → กรอก **Discord Name** + **SteamID** → บอทบันทึก SteamID ทั้งหมดลงไฟล์ภายในเครื่อง

> ไม่ต้องเชื่อม HSHO API (ตามที่คุณต้องการ)

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

---

## 2. ติดตั้งและรัน

```powershell
cd "C:\Users\Rinrada Muengchan\Downloads\HSHO_DISCORD_VERIFY_BOT"
npm install
npm test
```

ผลที่คาด: **24 passed, 0 failed** (ทดสอบฟอร์ม 3 ช่อง + ระบบเขียนไฟล์โดยไม่ต้องใช้ token จริง)

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

---

## 5. ใช้งานใน Discord

| คำสั่ง | ใครใช้ได้ | รายละเอียด |
|---|---|---|
| `/setup` | Manage Server | ส่ง panel พร้อมปุ่ม **Verify** ไปยังช่องที่ระบุ (หรือ `VERIFY_CHANNEL_ID`) |
| `/verify-stats` | Manage Server | ดูจำนวน SteamID, จำนวนไม่ซ้ำ, รายการล่าสุด 10 คน |
| `/verify-export` | Manage Server | ดาวน์โหลด `steamids.txt`, `verifications.csv`, `verifications.json` |

**ขั้นตอนของสมาชิก:**
1. กดปุ่ม ✅ **Verify**
2. หน้าต่างกรอกจะเปิดขึ้น มี **3 ช่อง**:
   - **Name** → ชื่อของผู้เล่น
   - **DiscordID** → บอทใส่ Discord ID ของคนกดปุ่มไว้ให้แล้ว (แก้ได้)
   - **SteamID** → ตัวเลข 15–20 หลัก (เช่น `76561198000000000`)
3. กด **ส่ง**
4. บอทตอบกลับแบบส่วนตัว: Name, DiscordID, SteamID, ลำดับที่ และยศที่ได้รับ (ถ้าตั้งค่า)

---

## 6. ตัวแปรใน `.env`

| ตัวแปร | ความหมาย |
|---|---|
| `DISCORD_TOKEN` | token บอท (บังคับ) |
| `CLIENT_ID` | Application ID (บังคับสำหรับ deploy คำสั่ง) |
| `GUILD_ID` | Server ID (บังคับสำหรับ deploy คำสั่ง) |
| `VERIFY_ROLE_ID` | ยศที่ให้หลัง verify (ว่าง = ไม่เพิ่มยศ) |
| `VERIFY_CHANNEL_ID` | ช่องที่ `/setup` ส่ง panel ไป (ว่าง = ช่องที่พิมพ์คำสั่ง) |
| `LOG_CHANNEL_ID` | ช่องส่ง log ทุกครั้งที่มีคน verify (ว่าง = ไม่ส่ง) |
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
│   │   └── interaction-create.js # button / modal / slash commands
│   ├── services/
│   │   └── verification.service.js # เขียนไฟล์ Name / DiscordID / SteamID (มี lock กันเขียนพร้อมกัน)
│   └── ui/
│       ├── panel.js          # Embed + ปุ่ม Verify
│       └── verify-modal.js   # ฟอร์ม 3 ช่อง Name / DiscordID / SteamID
├── scripts/
│   ├── deploy-commands.js
│   └── test-local.js
├── data/                         # สร้างตอนรัน (ถูก .gitignore)
├── .env / .env.example
└── README.md
```

---

## 8. เครดิต

เขียนและออกแบบโดย **BY NONGCHE**

โค้ดทั้งหมดสร้างขึ้นใหม่ ไม่ได้ copy/decode/แก้โค้ดของโปรเจกต์อื่น
