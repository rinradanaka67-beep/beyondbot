'use strict';
/**
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * รับ button / modal / slash command ทั้งหมด
 */
const fs = require('node:fs/promises');
const {
  Events, EmbedBuilder, PermissionFlagsBits, MessageFlags,
} = require('discord.js');

const { config } = require('../config');
const { buildPanel } = require('../ui/panel');
const { buildVerifyModal } = require('../ui/verify-modal');
const verification = require('../services/verification.service');

const sanitize = (value) => String(value || '').replace(/@/g, '@\u200b');
const isAdmin = (interaction) => Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));

async function replyError(interaction, message) {
  if (!interaction.isRepliable()) return;
  const payload = { content: `❌ ${message}`, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
    else await interaction.reply(payload);
  } catch { /* ignore */ }
}

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

  const stats = await verification.stats();
  const preview = stats.lastRecords.length
    ? stats.lastRecords.map((r) => `${sanitize(r.name || '-')} | \`${r.discordId || '-'}\` | \`${r.steamId}\``).join('\n')
    : '(ยังไม่มีข้อมูล)';

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('📊 Verify Statistics')
    .addFields(
      { name: 'SteamID ทั้งหมด', value: String(stats.total), inline: true },
      { name: 'ไม่ซ้ำ', value: String(stats.unique), inline: true },
      { name: 'ล่าสุด 10 รายการ (Name | DiscordID | SteamID)', value: preview, inline: false },
    )
    .setFooter({ text: `${config.author} • Verify System` })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

async function handleExport(interaction) {
  if (!isAdmin(interaction)) return replyError(interaction, 'ต้องมีสิทธิ์ **Manage Server** ก่อนใช้คำสั่งนี้');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await verification.ensureStorage();

  const files = [];
  for (const file of verification.attachmentFiles()) {
    try { await fs.access(file.attachment); files.push(file); } catch { /* skip missing */ }
  }
  if (!files.length) return interaction.editReply({ content: 'ยังไม่มีไฟล์ข้อมูล Verify ครับ' });
  return interaction.editReply({ content: '📁 ไฟล์ข้อมูล Verify ทั้งหมด', files });
}

async function openModal(interaction) {
  const modal = buildVerifyModal({
    discordId: interaction.user.id,
    discordName: interaction.user.username,
  });
  await interaction.showModal(modal);
}

async function sendLog(interaction, entry, total) {
  if (!config.logChannelId) return;
  try {
    const channel = await interaction.client.channels.fetch(config.logChannelId);
    if (!channel?.isTextBased?.()) return;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('✅ New Verify')
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

async function submitModal(interaction) {
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

  const result = await verification.record({
    name: name || interaction.user.username,
    discordId,
    steamId,
    userId: interaction.user.id,
    username: interaction.user.username,
    guildId: interaction.guildId,
  });

  let roleMessage = '';
  if (config.verifyRoleId) {
    try {
      const guild = interaction.guild;
      const member = await guild.members.fetch(interaction.user.id);
      const role = await guild.roles.fetch(config.verifyRoleId);
      if (!role) roleMessage = '\n⚠️ ไม่พบ Role ที่ตั้งค่าไว้ใน `.env`';
      else {
        await member.roles.add(role, `Verified SteamID ${steamId}`);
        roleMessage = `\n🎭 เพิ่มยศ **${role.name}** แล้ว`;
      }
    } catch (error) {
      console.warn('[WARN] เพิ่มยศไม่ได้:', error.message);
      roleMessage = '\n⚠️ เพิ่มยศไม่ได้ (ตรวจสอบสิทธิ์บอทและลำดับยศ)';
    }
  }

  await interaction.editReply({
    content: [
      '✅ **Verify สำเร็จ**',
      `👤 Name : ${sanitize(name || interaction.user.username)}`,
      `🆔 DiscordID : \`${discordId}\``,
      `🎮 SteamID : \`${steamId}\``,
      `📊 ลำดับที่ ${result.total} (ไม่ซ้ำ ${result.unique})`,
      roleMessage.trim(),
    ].filter(Boolean).join('\n'),
  });

  await sendLog(interaction, result.entry, result.total);
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup') return handleSetup(interaction, client);
        if (interaction.commandName === 'verify-stats') return handleStats(interaction);
        if (interaction.commandName === 'verify-export') return handleExport(interaction);
        return undefined;
      }
      if (interaction.isButton() && interaction.customId === 'verify_open') return openModal(interaction);
      if (interaction.isModalSubmit() && interaction.customId === 'verify_modal') return submitModal(interaction);
      return undefined;
    } catch (error) {
      console.error('[ERROR] interaction:', error);
      return replyError(interaction, 'เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง');
    }
  },
};
