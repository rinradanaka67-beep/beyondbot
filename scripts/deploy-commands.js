'use strict';
/**
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * ลงทะเบียน slash commands (guild commands = ใช้ได้ทันที)
 */
const {
  REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType,
} = require('discord.js');
const { config } = require('../src/config');

const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('ส่ง panel ปุ่ม Verify ไปยังช่องที่ระบุ')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) => option
      .setName('channel')
      .setDescription('ช่องที่จะส่ง panel (ถ้าไม่ระบุจะใช้ช่องที่พิมพ์คำสั่ง)')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('verify-stats')
    .setDescription('ดูจำนวน SteamID ที่กรอก Verify แล้ว (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('verify-export')
    .setDescription('ดาวน์โหลดไฟล์ SteamID ทั้งหมด (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
];

async function main() {
  if (!config.token || !config.clientId || !config.guildId) {
    console.error('[FATAL] ต้องใส่ DISCORD_TOKEN, CLIENT_ID และ GUILD_ID ใน .env');
    process.exit(1);
  }
  const rest = new REST().setToken(config.token);
  console.log(`[INFO] กำลังลงทะเบียน ${commands.length} คำสั่งใน guild ${config.guildId} ...`);
  const result = await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands },
  );
  console.log(`[OK] ลงทะเบียนสำเร็จ ${result.length} คำสั่ง:`);
  for (const command of result) console.log(`  /${command.name} - ${command.description}`);
}

main().catch((error) => {
  console.error('[FATAL]', error?.rawError || error);
  process.exit(1);
});
