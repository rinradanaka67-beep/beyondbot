'use strict';
/** HSHO DISCORD VERIFY BOT BY NONGCHE - Verify panel UI */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { config } = require('../config');

function buildPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(config.panelTitle)
    .setDescription(config.panelDescription)
    .addFields(
      { name: '📝 ขั้นตอน', value: '1. กดปุ่ม **Verify**\n2. กรอก **Name**\n3. กรอก **DiscordID** (บอทใส่ให้แล้ว)\n4. กรอก **SteamID** (ตัวเลข 15-20 หลัก)\n5. กด **ส่ง**', inline: false },
      { name: '🔒 ข้อมูล', value: 'Name / DiscordID / SteamID จะถูกเก็บลงไฟล์ในโฟลเดอร์ `data/` ของเซิร์ฟเวอร์', inline: false },
    )
    .setFooter({ text: `${config.author} • Verify System` })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('verify_open')
    .setLabel('Verify')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);
  return { embeds: [embed], components: [row] };
}

module.exports = { buildPanel };
