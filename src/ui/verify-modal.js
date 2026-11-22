'use strict';
/** HSHO DISCORD VERIFY BOT BY NONGCHE - ฟอร์ม 3 ช่อง: Name / DiscordID / SteamID */
const {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} = require('discord.js');

function buildVerifyModal({ discordId = '', discordName = '' } = {}) {
  const modal = new ModalBuilder()
    .setCustomId('verify_modal')
    .setTitle('Verify • BY NONGCHE');

  const nameInput = new TextInputBuilder()
    .setCustomId('verify_name')
    .setLabel('Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('ชื่อของคุณ')
    .setMinLength(1)
    .setMaxLength(100)
    .setRequired(true);

  const discordInput = new TextInputBuilder()
    .setCustomId('verify_discord_id')
    .setLabel('DiscordID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Discord ID ของคุณ')
    .setMinLength(1)
    .setMaxLength(100)
    .setRequired(true);
  if (String(discordId || '').trim()) discordInput.setValue(String(discordId).trim().slice(0, 100));

  const steamInput = new TextInputBuilder()
    .setCustomId('verify_steam_id')
    .setLabel('SteamID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('76561198000000000')
    .setMinLength(15)
    .setMaxLength(20)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(discordInput),
    new ActionRowBuilder().addComponents(steamInput),
  );
  return modal;
}

module.exports = { buildVerifyModal };
