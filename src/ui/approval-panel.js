'use strict';
/** HSHO DISCORD VERIFY BOT BY NONGCHE - UI สำหรับแอดมินอนุมัติ/ปฏิเสธ */
const {
  EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder,
} = require('discord.js');
const { config } = require('../config');

const sanitize = (value) => String(value || '').replace(/@/g, '@\u200b');

function buildApprovalPanel(request) {
  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('🕓 Verify รออนุมัติ')
    .addFields(
      { name: 'Name', value: sanitize(request.name), inline: true },
      { name: 'DiscordID', value: `\`${request.discordId}\``, inline: true },
      { name: 'SteamID', value: `\`${request.steamId}\``, inline: false },
      { name: 'ผู้ขอ', value: `<@${request.userId}>`, inline: false },
      { name: 'รหัสคำขอ', value: `\`${request.id}\``, inline: true },
    )
    .setFooter({ text: `${config.author} • แอดมินกดปุ่มเพื่อตัดสินใจ` })
    .setTimestamp(new Date(request.at));

  const approve = new ButtonBuilder()
    .setCustomId(`verify_approve:${request.id}`)
    .setLabel('อนุมัติ')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success);

  const reject = new ButtonBuilder()
    .setCustomId(`verify_reject:${request.id}`)
    .setLabel('ปฏิเสธ')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Danger);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(approve, reject)],
  };
}

function buildApprovalList(requests) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🕓 คำขอ Verify ที่รออนุมัติ')
    .setDescription(requests.length ? `ทั้งหมด ${requests.length} รายการ` : 'ไม่มีคำขอที่รออยู่ตอนนี้')
    .setFooter({ text: `${config.author} • /verify-pending` })
    .setTimestamp();

  const rows = [];
  let row = new ActionRowBuilder();
  for (const request of requests.slice(0, 10)) {
    embed.addFields({
      name: `${request.id} — ${sanitize(request.name)}`,
      value: `DiscordID \`${request.discordId}\` | SteamID \`${request.steamId}\``,
      inline: false,
    });
    const approve = new ButtonBuilder()
      .setCustomId(`verify_approve:${request.id}`)
      .setLabel(`อนุมัติ ${request.id}`)
      .setStyle(ButtonStyle.Success);
    row.addComponents(approve);
    if (row.components.length === 2) { rows.push(row); row = new ActionRowBuilder(); }
  }
  if (rows.length < 5) rows.push(row);
  return { embeds: [embed], components: rows, pendingCount: requests.length };
}

function buildDecidedPanel(request, { approved, reason, adminId }) {
  const embed = new EmbedBuilder()
    .setColor(approved ? 0x57F287 : 0xED4245)
    .setTitle(approved ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธแล้ว')
    .addFields(
      { name: 'Name', value: sanitize(request.name), inline: true },
      { name: 'DiscordID', value: `\`${request.discordId}\``, inline: true },
      { name: 'SteamID', value: `\`${request.steamId}\``, inline: false },
      { name: 'ผู้ตัดสิน', value: `<@${adminId}>`, inline: true },
      ...(reason ? [{ name: 'เหตุผล', value: sanitize(reason), inline: false }] : []),
    )
    .setFooter({ text: `${config.author} • ตัดสินแล้ว` })
    .setTimestamp();
  return { embeds: [embed], components: [] };
}

module.exports = { buildApprovalPanel, buildApprovalList, buildDecidedPanel };
