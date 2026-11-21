require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');

const {
  DISCORD_TOKEN,
  GUILD_ID,
  ADMIN_CHANNEL_ID,
  VERIFIED_ROLE_ID,
  ADMIN_ROLE_IDS = '',
} = process.env;

for (const [k, v] of Object.entries({ DISCORD_TOKEN, GUILD_ID, ADMIN_CHANNEL_ID, VERIFIED_ROLE_ID })) {
  if (!v || !v.trim()) {
    console.error(`❌ ขาดค่า ${k} กรุณาตั้งค่าใน Environment ของ Render หรือไฟล์ .env`);
    process.exit(1);
  }
}
for (const [k, v] of Object.entries({ GUILD_ID, ADMIN_CHANNEL_ID, VERIFIED_ROLE_ID })) {
  if (!/^\\d{17,20}$/.test(v)) {
    console.error(`❌ ค่า ${k} ต้องเป็น Discord ID ตัวเลข 17-20 หลัก`);
    process.exit(1);
  }
}

const adminRoleIds = ADMIN_ROLE_IDS.split(',').map((s) => s.trim()).filter(Boolean);

// ---------- เก็บคำขอที่รออยู่ (กันกดซ้ำ + ทนต่อการรีสตาร์ท) ----------
// Render: ตั้ง PENDING_FILE=/var/data/pending.json และผูก Persistent Disk ที่ /var/data
// Local: ใช้ pending.json ในโฟลเดอร์โปรเจกต์
const DB_FILE = process.env.PENDING_FILE || path.join(__dirname, 'pending.json');

function loadDb() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('อ่านฐานข้อมูลคำขอไม่สำเร็จ:', err.message);
    }
    return {};
  }
}

function saveDb(db) {
  const dir = path.dirname(DB_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tempFile, DB_FILE);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ---------- ตัวช่วย ----------
const isAdmin = (member) =>
  member.permissions.has(PermissionFlagsBits.Administrator) ||
  (adminRoleIds.length
    ? adminRoleIds.some((id) => member.roles.cache.has(id))
    : member.permissions.has(PermissionFlagsBits.ManageRoles));

const isSteamId64 = (s) => /^7656119\d{10}$/.test(s);
const isSnowflake = (s) => /^\d{17,20}$/.test(s);

function requestEmbed(data, status = 'pending', by = null) {
  const colors = { pending: 0xf1c40f, approved: 0x2ecc71, rejected: 0xe74c3c };
  const titles = {
    pending: '📝 คำขอ Verify ใหม่',
    approved: '✅ อนุมัติแล้ว',
    rejected: '❌ ปฏิเสธแล้ว',
  };
  const embed = new EmbedBuilder()
    .setTitle(titles[status])
    .setColor(colors[status])
    .addFields(
      { name: 'ผู้ใช้', value: `<@${data.userId}> (${data.userTag})`, inline: false },
      { name: 'Name', value: data.name, inline: true },
      {
        name: 'SteamID',
        value: `[${data.steamId}](https://steamcommunity.com/profiles/${data.steamId})`,
        inline: true,
      },
      { name: 'DiscordID', value: data.discordId, inline: true },
    )
    .setTimestamp();
  if (data.discordId !== data.userId) {
    embed.addFields({
      name: '⚠️ คำเตือน',
      value: 'DiscordID ที่กรอก ไม่ตรงกับบัญชีที่ส่งคำขอ',
    });
  }
  if (by) embed.setFooter({ text: `โดย ${by}` });
  return embed;
}

// ---------- สร้าง Slash Command ----------
client.once('clientReady', async () => {
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.commands.set([
    new SlashCommandBuilder()
      .setName('setup-verify')
      .setDescription('ส่งแผงปุ่ม Verify ลงในห้องนี้')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
  ]);
  console.log(`บอทออนไลน์ในชื่อ ${client.user.tag}`);
});

// ---------- จัดการ Interaction ----------
client.on('interactionCreate', async (i) => {
  try {
    // /setup-verify
    if (i.isChatInputCommand() && i.commandName === 'setup-verify') {
      const embed = new EmbedBuilder()
        .setTitle('🔐 ยืนยันตัวตน')
        .setDescription(
          'กดปุ่มด้านล่างเพื่อกรอกข้อมูล **Name / SteamID / DiscordID**\nหลังจากนั้นรอแอดมินตรวจสอบและอนุมัติ คุณจะได้รับยศอัตโนมัติ',
        )
        .setColor(0x5865f2);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_open').setLabel('ยืนยันตัวตน').setStyle(ButtonStyle.Primary).setEmoji('✅'),
      );
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      await i.channel.send({ embeds: [embed], components: [row] });
      return i.editReply({ content: 'ส่งแผง Verify เรียบร้อย' });
    }

    // ผู้เล่นกดปุ่ม "ยืนยันตัวตน" -> เปิดฟอร์ม
    if (i.isButton() && i.customId === 'verify_open') {
      if (i.member.roles.cache.has(VERIFIED_ROLE_ID)) {
        return i.reply({ content: 'ยืนยันตัวตนไปแล้ว ✅', flags: MessageFlags.Ephemeral });
      }
      const db = loadDb();
      if (db[i.user.id]) {
        return i.reply({
          content: 'คุณมีคำขอที่รอแอดมินตรวจสอบอยู่แล้ว กรุณารอสักครู่ ⏳',
          flags: MessageFlags.Ephemeral,
        });
      }
      const modal = new ModalBuilder().setCustomId('verify_form').setTitle('ฟอร์มยืนยันตัวตน');
      const field = (id, label, placeholder, max) =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setPlaceholder(placeholder)
            .setStyle(TextInputStyle.Short)
            .setMinLength(2)
            .setMaxLength(max)
            .setRequired(true),
        );
      modal.addComponents(
        field('name', 'Name (ชื่อในเกม/ชื่อเรียก)', 'เช่น John', 32),
        field('steamId', 'SteamID (SteamID64 17 หลัก)', '76561198XXXXXXXXX', 17),
        field('discordId', 'DiscordID (ตัวเลข)', 'คลิกขวาที่โปรไฟล์ > Copy User ID', 20),
      );
      return i.showModal(modal);
    }

    // ผู้เล่นส่งฟอร์ม
    if (i.isModalSubmit() && i.customId === 'verify_form') {
      const name = i.fields.getTextInputValue('name').trim();
      const steamId = i.fields.getTextInputValue('steamId').trim();
      const discordId = i.fields.getTextInputValue('discordId').trim();

      if (!isSteamId64(steamId)) {
        return i.reply({
          content: '❌ SteamID ไม่ถูกต้อง ต้องเป็น SteamID64 (ตัวเลข 17 หลัก ขึ้นต้นด้วย 7656119)\nหาได้จาก https://steamid.io',
          flags: MessageFlags.Ephemeral,
        });
      }
      if (!isSnowflake(discordId)) {
        return i.reply({
          content: '❌ DiscordID ไม่ถูกต้อง ต้องเป็นตัวเลข 17-20 หลัก',
          flags: MessageFlags.Ephemeral,
        });
      }

      const db = loadDb();
      if (db[i.user.id]) {
        return i.reply({ content: 'คุณมีคำขอที่รออยู่แล้ว ⏳', flags: MessageFlags.Ephemeral });
      }

      const data = { userId: i.user.id, userTag: i.user.tag, name, steamId, discordId };
      await i.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const channel = await client.channels.fetch(ADMIN_CHANNEL_ID);
        if (!channel || !channel.isTextBased() || !channel.send) {
          throw new Error('ADMIN_CHANNEL_ID ไม่ใช่ห้องข้อความที่บอทส่งข้อความได้');
        }
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`approve:${i.user.id}`).setLabel('อนุมัติ').setStyle(ButtonStyle.Success).setEmoji('✅'),
          new ButtonBuilder().setCustomId(`reject:${i.user.id}`).setLabel('ปฏิเสธ').setStyle(ButtonStyle.Danger).setEmoji('❌'),
        );
        const msg = await channel.send({ embeds: [requestEmbed(data)], components: [row] });

        db[i.user.id] = { ...data, messageId: msg.id };
        saveDb(db);
        return i.editReply({ content: 'ส่งคำขอเรียบร้อย ✅ กรุณารอแอดมินตรวจสอบ' });
      } catch (err) {
        console.error('ส่งคำขอ Verify ไม่สำเร็จ:', err);
        return i.editReply({ content: '❌ ส่งคำขอไม่สำเร็จ กรุณาแจ้งแอดมินตรวจสอบการตั้งค่า ADMIN_CHANNEL_ID และสิทธิ์บอท' });
      }
    }

    // แอดมินกดอนุมัติ / ปฏิเสธ
    if (i.isButton() && (i.customId.startsWith('approve:') || i.customId.startsWith('reject:'))) {
      if (!isAdmin(i.member)) {
        return i.reply({ content: '⛔ คุณไม่มีสิทธิ์กดปุ่มนี้', flags: MessageFlags.Ephemeral });
      }

      const [action, userId] = i.customId.split(':');
      const db = loadDb();
      const data = db[userId];
      if (!data) {
        return i.reply({ content: 'คำขอนี้ถูกจัดการไปแล้ว', flags: MessageFlags.Ephemeral });
      }

      await i.deferUpdate();
      const adminTag = i.user.tag;

      if (action === 'approve') {
        const member = await i.guild.members.fetch(userId).catch(() => null);
        if (!member) {
          delete db[userId];
          saveDb(db);
          return i.editReply({
            embeds: [requestEmbed(data, 'rejected', `${adminTag} (ผู้ใช้ออกจากเซิร์ฟเวอร์แล้ว)`)],
            components: [],
          });
        }
        try {
          await member.roles.add(VERIFIED_ROLE_ID, `Verify อนุมัติโดย ${adminTag}`);
        } catch (err) {
          console.error(err);
          return i.followUp({
            content: '❌ ให้ยศไม่สำเร็จ ตรวจสอบว่ายศของบอทอยู่สูงกว่ายศ Verified และมีสิทธิ์ Manage Roles',
            flags: MessageFlags.Ephemeral,
          });
        }
        await member.send('✅ คุณได้รับการยืนยันตัวตนแล้ว ยินดีต้อนรับ!').catch(() => {});
        delete db[userId];
        saveDb(db);
        return i.editReply({ embeds: [requestEmbed(data, 'approved', adminTag)], components: [] });
      }

      // reject
      const member = await i.guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member.send('❌ คำขอยืนยันตัวตนของคุณถูกปฏิเสธ กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง').catch(() => {});
      }
      delete db[userId];
      saveDb(db);
      return i.editReply({ embeds: [requestEmbed(data, 'rejected', adminTag)], components: [] });
    }
  } catch (err) {
    console.error(err);
    if (i.isRepliable() && !i.replied && !i.deferred) {
      i.reply({ content: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

client.login(DISCORD_TOKEN).catch((err) => {
  console.error('❌ เข้าสู่ระบบ Discord ไม่สำเร็จ ตรวจสอบ DISCORD_TOKEN:', err.message);
  process.exit(1);
});
