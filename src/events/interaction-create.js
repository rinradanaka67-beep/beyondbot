'use strict';
/**
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * รับ button / modal / slash command ทั้งหมด
 * flow: สมาชิกกรอก -> แอดมินอนุมัติ/ปฏิเสธ -> บันทึกไฟล์เฉพาะที่อนุมัติ
 */
const fs = require('node:fs/promises');
const {
  Events, EmbedBuilder, PermissionFlagsBits, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} = require('discord.js');

const { config } = require('../config');
const { buildPanel } = require('../ui/panel');
const { buildVerifyModal } = require('../ui/verify-modal');
const {
  buildApprovalPanel, buildApprovalList, buildDecidedPanel,
} = require('../ui/approval-panel');
const verification = require('../services/verification.service');
const pending = require('../services/pending.service');

const sanitize = (value) => String(value || '').replace(/@/g, '@\u200b');
const isAdmin = (interaction) => Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));

// กัน Discord ส่ง interaction เดิมซ้ำ (กดปุ่มเร็ว / retry) -> ตอบซ้ำได้ error 40060
const seenInteractions = new Map();
const isDuplicate = (interaction) => {
  const now = Date.now();
  if (seenInteractions.size > 1000) {
    for (const [id, at] of seenInteractions) if (now - at > 60_000) seenInteractions.delete(id);
  }
  if (seenInteractions.has(interaction.id)) return true;
  seenInteractions.set(interaction.id, now);
  return false;
};

async function replyError(interaction, message) {
  if (!interaction.isRepliable()) return;
  const payload = { content: `❌ ${message}`, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
    else await interaction.reply(payload);
  } catch { /* ignore */ }
}

async function resolveApprovalChannel(interaction, client) {
  for (const id of [config.approvalChannelId, config.verifyChannelId, config.logChannelId]) {
    if (!id) continue;
    try {
      const channel = await client.channels.fetch(id);
      if (channel?.isTextBased?.()) return channel;
    } catch { /* ignore invalid id */ }
  }
  return interaction.channel?.isTextBased?.() ? interaction.channel : null;
}

async function notifyMember(client, userId, content) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(content);
  } catch (error) {
    console.warn('[WARN] ส่ง DM ไม่ได้:', error.message);
  }
}

async function addRoleIfConfigured(guild, userId, steamId) {
  if (!config.verifyRoleId || !guild) return '';
  try {
    const member = await guild.members.fetch(userId);
    const role = await guild.roles.fetch(config.verifyRoleId);
    if (!role) return '\n⚠️ ไม่พบ Role ที่ตั้งค่าไว้ใน `.env`';
    await member.roles.add(role, `Verified SteamID ${steamId}`);
    return `\n🎭 เพิ่มยศ **${role.name}** แล้ว`;
  } catch (error) {
    console.warn('[WARN] เพิ่มยศไม่ได้:', error.message);
    return '\n⚠️ เพิ่มยศไม่ได้ (ตรวจสอบสิทธิ์บอทและลำดับยศ)';
  }
}

async function sendLog(interaction, entry, total) {
  if (!config.logChannelId) return;
  try {
    const channel = await interaction.client.channels.fetch(config.logChannelId);
    if (!channel?.isTextBased?.()) return;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('✅ New Verify (อนุมัติแล้ว)')
      .addFields(
        { name: 'Name', value: sanitize(entry.name), inline: false },
        { name: 'DiscordID', value: `\`${entry.discordId || '-'}\``, inline: false },
        { name: 'SteamID', value: `\`${entry.steamId}\``, inline: false },
        { name: 'ลำดับที่', value: String(total), inline: true },
      )
      .setFooter({ text: `${config.author} • Verify Log` })
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.warn('[WARN] ส่ง log ไม่ได้:', error.message);
  }
}

// ---------------- slash commands ----------------
async function handleSetup(interaction, client) {
  if (!isAdmin(interaction)) return replyError(interaction, 'ต้องมีสิทธิ์ **Manage Server** ก่อนใช้คำสั่งนี้');

  let target = interaction.options.getChannel('channel');
  if (!target && config.verifyChannelId) {
    try { target = await client.channels.fetch(config.verifyChannelId); } catch { /* ignore */ }
  }
  if (!target) target = interaction.channel;
  if (!target || !target.isTextBased?.()) return replyError(interaction, 'ไม่พบช่องข้อความที่ใช้ได้');

  await target.send(buildPanel());
  return interaction.reply({
    content: `✅ ส่ง panel Verify ไปที่ ${target.toString()} แล้ว`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleStats(interaction) {
  if (!isAdmin(interaction)) return replyError(interaction, 'ต้องมีสิทธิ์ **Manage Server** ก่อนใช้คำสั่งนี้');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const [stats, waiting] = await Promise.all([verification.stats(), pending.pendingCount()]);
  const preview = stats.lastRecords.length
    ? stats.lastRecords.map((r) => `${sanitize(r.name || '-')} | \`${r.discordId || '-'}\` | \`${r.steamId}\``).join('\n')
    : '(ยังไม่มีข้อมูล)';

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('📊 Verify Statistics')
    .addFields(
      { name: 'SteamID ที่อนุมัติแล้ว', value: String(stats.total), inline: true },
      { name: 'ไม่ซ้ำ', value: String(stats.unique), inline: true },
      { name: 'รออนุมัติ', value: String(waiting), inline: true },
      { name: 'ล่าสุด 10 รายการ (Name | DiscordID | SteamID)', value: preview, inline: false },
    )
    .setFooter({ text: `${config.author} • Verify System` })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

async function handlePendingList(interaction) {
  if (!isAdmin(interaction)) return replyError(interaction, 'ต้องมีสิทธิ์ **Manage Server** ก่อนใช้คำสั่งนี้');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const requests = await pending.listPending();
  if (!requests.length) return interaction.editReply({ content: 'ไม่มีคำขอ Verify ที่รออนุมัติครับ' });
  return interaction.editReply(buildApprovalList(requests));
}

async function handleExport(interaction) {
  if (!isAdmin(interaction)) return replyError(interaction, 'ต้องมีสิทธิ์ **Manage Server** ก่อนใช้คำสั่งนี้');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await verification.ensureStorage();

  const files = [];
  for (const file of [...verification.attachmentFiles(), { attachment: pending.FILE, name: 'pending.json' }]) {
    try { await fs.access(file.attachment); files.push(file); } catch { /* skip missing */ }
  }
  if (!files.length) return interaction.editReply({ content: 'ยังไม่มีไฟล์ข้อมูล Verify ครับ' });
  return interaction.editReply({ content: '📁 ไฟล์ข้อมูล Verify ทั้งหมด', files });
}

// ---------------- member flow ----------------
async function openModal(interaction) {
  if (interaction.replied || interaction.deferred) return undefined;
  const modal = buildVerifyModal({
    discordId: interaction.user.id,
    discordName: interaction.user.username,
  });
  await interaction.showModal(modal);
}

async function submitModal(interaction, client) {
  if (interaction.replied || interaction.deferred) return undefined;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const name = interaction.fields.getTextInputValue('verify_name').trim();
  const discordId = interaction.fields.getTextInputValue('verify_discord_id').trim();
  const steamId = interaction.fields.getTextInputValue('verify_steam_id').trim();

  if (!verification.isValidDiscordId(discordId)) {
    return interaction.editReply({
      content: '❌ DiscordID ไม่ถูกต้อง ต้องเป็นตัวเลข 15-20 หลัก (ปกติบอทใส่ให้แล้วในช่องนี้)',
    });
  }
  if (!verification.isValidSteamId(steamId)) {
    return interaction.editReply({
      content: '❌ SteamID ไม่ถูกต้อง ต้องเป็นตัวเลข 15-20 หลัก (เช่น `76561198000000000`)',
    });
  }

  const request = await pending.createPending({
    name: name || interaction.user.username,
    discordId,
    steamId,
    userId: interaction.user.id,
    username: interaction.user.username,
    guildId: interaction.guildId,
  });

  const channel = await resolveApprovalChannel(interaction, client);
  if (channel) {
    await channel.send(buildApprovalPanel(request));
  } else {
    console.warn('[WARN] ไม่พบช่องสำหรับส่งคำขออนุมัติ');
  }

  return interaction.editReply({
    content: [
      '📨 **ส่งข้อมูลให้แอดมินอนุมัติแล้ว**',
      `👤 Name : ${sanitize(name || interaction.user.username)}`,
      `🆔 DiscordID : \`${discordId}\``,
      `🎮 SteamID : \`${steamId}\``,
      `🗂️ รหัสคำขอ : \`${request.id}\``,
      '',
      'รอแอดมินกดอนุมัติครับ ผลจะแจ้งทาง DM',
    ].join('\n'),
  });
}

// ---------------- admin flow ----------------
async function handleApprove(interaction, id, client) {
  if (!isAdmin(interaction)) return replyError(interaction, 'เฉพาะแอดมินที่กดอนุมัติได้');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let result;
  try {
    result = await pending.decide(id, { approved: true, adminId: interaction.user.id });
  } catch (error) {
    if (error.message === 'ALREADY_DECIDED') return interaction.editReply({ content: '⚠️ คำขอนี้ถูกตัดสินไปแล้ว' });
    if (error.message === 'REQUEST_NOT_FOUND') return interaction.editReply({ content: '❌ ไม่พบคำขอนี้' });
    throw error;
  }

  const { request, record } = result;
  const roleMessage = await addRoleIfConfigured(interaction.guild, request.userId, request.steamId);

  if (interaction.message) {
    await interaction.message.edit(buildDecidedPanel(request, { approved: true, adminId: interaction.user.id })).catch(() => {});
  }

  await notifyMember(client, request.userId, [
    '✅ **Verify ได้รับการอนุมัติแล้ว**',
    `👤 Name : ${sanitize(request.name)}`,
    `🎮 SteamID : \`${request.steamId}\``,
    roleMessage.trim(),
  ].filter(Boolean).join('\n'));

  await sendLog(interaction, record.entry, record.total);
  return interaction.editReply({
    content: `✅ อนุมัติคำขอ \`${id}\` แล้ว ${sanitize(request.name)} — \`${request.steamId}\``,
  });
}

async function handleReject(interaction, id) {
  if (!isAdmin(interaction)) return replyError(interaction, 'เฉพาะแอดมินที่กดปฏิเสธได้');

  const modal = new ModalBuilder()
    .setCustomId(`verify_reject_modal:${id}`)
    .setTitle('ปฏิเสธ Verify');
  const reason = new TextInputBuilder()
    .setCustomId('verify_reject_reason')
    .setLabel('เหตุผล (ไม่บังคับ)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('เช่น SteamID ไม่ตรงกับข้อมูลในระบบ')
    .setRequired(false)
    .setMaxLength(500);
  modal.addComponents(new ActionRowBuilder().addComponents(reason));
  await interaction.showModal(modal);
}

async function handleRejectModal(interaction, id, client) {
  if (!isAdmin(interaction)) return replyError(interaction, 'เฉพาะแอดมินที่กดปฏิเสธได้');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const reason = interaction.fields.getTextInputValue('verify_reject_reason').trim() || 'ไม่ระบุเหตุผล';
  let result;
  try {
    result = await pending.decide(id, { approved: false, adminId: interaction.user.id, reason });
  } catch (error) {
    if (error.message === 'ALREADY_DECIDED') return interaction.editReply({ content: '⚠️ คำขอนี้ถูกตัดสินไปแล้ว' });
    if (error.message === 'REQUEST_NOT_FOUND') return interaction.editReply({ content: '❌ ไม่พบคำขอนี้' });
    throw error;
  }

  const { request } = result;
  if (interaction.message) {
    await interaction.message.edit(buildDecidedPanel(request, {
      approved: false, reason, adminId: interaction.user.id,
    })).catch(() => {});
  }

  await notifyMember(client, request.userId, [
    '❌ **Verify ไม่ได้รับการอนุมัติ**',
    `🗂️ รหัสคำขอ : \`${id}\``,
    `📝 เหตุผล : ${sanitize(reason)}`,
    '',
    'หากข้อมูลผิดพลาด สามารถกด Verify แล้วกรอกใหม่ได้ครับ',
  ].join('\n'));

  return interaction.editReply({
    content: `❌ ปฏิเสธคำขอ \`${id}\` แล้ว (${sanitize(reason)})`,
  });
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (isDuplicate(interaction)) return undefined;
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup') return handleSetup(interaction, client);
        if (interaction.commandName === 'verify-stats') return handleStats(interaction);
        if (interaction.commandName === 'verify-pending') return handlePendingList(interaction);
        if (interaction.commandName === 'verify-export') return handleExport(interaction);
        return undefined;
      }
      if (interaction.isButton()) {
        if (interaction.customId === 'verify_open') return openModal(interaction);
        if (interaction.customId.startsWith('verify_approve:')) {
          return handleApprove(interaction, interaction.customId.split(':')[1], client);
        }
        if (interaction.customId.startsWith('verify_reject:')) {
          return handleReject(interaction, interaction.customId.split(':')[1]);
        }
        return undefined;
      }
      if (interaction.isModalSubmit()) {
        if (interaction.customId === 'verify_modal') return submitModal(interaction, client);
        if (interaction.customId.startsWith('verify_reject_modal:')) {
          return handleRejectModal(interaction, interaction.customId.split(':')[1], client);
        }
        return undefined;
      }
      return undefined;
    } catch (error) {
      console.error('[ERROR] interaction:', error);
      return replyError(interaction, 'เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง');
    }
  },
};
