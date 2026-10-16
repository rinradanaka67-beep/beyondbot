const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  EmbedBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  REST,
  Routes
} = require('discord.js');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('🤖 Bot Discord is running and alive 24/7!');
});

app.get('/api/check-whitelist', async (req, res) => {
    const discordId = req.query.discordId;

    if (!discordId) {
        return res.status(400).json({ whitelisted: false, message: 'Missing discordId parameter' });
    }

    try {
        const response = await axios.get(GOOGLE_SHEET_API_URL);
        const data = response.data; 

        let rows = [];
        if (Array.isArray(data)) {
            rows = data;
        } else if (data && Array.isArray(data.data)) {
            rows = data.data;
        } else if (data && typeof data === 'object') {
            rows = [data];
        }

        let isFound = rows.some(item => {
            if (!item) return false;
            const sheetDiscordId = String(
                item.DiscordId || 
                item['Discord ID'] || 
                item.discordId || 
                item['discord id'] || ''
            ).trim();

            return sheetDiscordId === String(discordId).trim();
        });

        console.log(`[API Check] Discord ID: ${discordId} \vert{} Whitelist Status:${isFound}`);
        return res.json({ whitelisted: isFound });
    } catch (error) {
        console.error('[API Error] ไม่สามารถดึงข้อมูลจาก Google Sheet ได้:', error.message);
        return res.status(500).json({ whitelisted: false, error: error.message });
    }
});

app.listen(PORT, () => {
  console.log(`🌐 Web server & API is running on port ${PORT}`);
});

const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyWCMlDFBEiS0X_J2ZEkQLN_-8kFPZ6U-xV4n9ckpt9KZnFU9ztQV8BfujBX3nHE4In/exec';
const BOT_TOKEN = process.env.BOT_TOKEN;

let configData = {
  verifiedRoleId: '', 

  verifyTitle: '🔒 Verifiy ',
  verifyDesc: 'กดปุ่มด้านล่างเพื่อเลือกภาษาในการลงทะเบียน และคลิกดูคู่มือการหาข้อมูล Steam ID / Discord ID ได้เลยค่า',
  verifyImage: '', 
  verifyColor1: '#5b1d8d',
  verifyColor2: '#6e2255',

};

const userMessageHistory = new Map(); 
const userVerifyHistory = new Map(); 
const spamOffenseCount = new Map();  

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

client.once('ready', async () => {
  console.log(`✅ บอทออนไลน์แล้วในชื่อ: ${client.user.tag}`);

  const commands = [
    {
      name: 'setup-verify',
      description: 'ตั้งค่าส่งปุ่ม Verify ไปยังห้องที่ต้องการ',
      default_member_permissions: PermissionFlagsBits.Administrator.toString(),
    },
    {
      name: 'setup-embed',
      description: 'สร้างข้อความ Embed ประกาศทั่วไปส่งไปยังห้องที่ต้องการ',
      default_member_permissions: PermissionFlagsBits.Administrator.toString(),
    },
    {
      name: 'config-panel',
      description: 'เปิดแผงควบคุมตั้งค่าระบบและยศอัตโนมัติ',
      default_member_permissions: PermissionFlagsBits.Administrator.toString(),
    },
    {
      name: 'check-whitelist',
      description: 'ตรวจสอบข้อมูลการลงทะเบียน Whitelist',
      options: [
        {
          name: 'input',
          type: 3,
          description: 'กรอก Steam ID, Discord ID หรือชื่อ Steam ที่ต้องการค้นหา',
          required: true
        }
      ]
    }
  ];

  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    console.log('🎉 ลงทะเบียนคำสั่ง Slash Commands ทั้งหมดสำเร็จ!');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการลงทะเบียนคำสั่ง:', error);
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

  const userId = message.author.id;
  const content = message.content.trim();
  const currentTime = Date.now();

  if (!userMessageHistory.has(userId)) {
    userMessageHistory.set(userId, { content, count: 1, time: currentTime });
    return;
  }

  const userData = userMessageHistory.get(userId);

  if (userData.content === content && (currentTime - userData.time < 5000)) {
    userData.count += 1;
    userData.time = currentTime;

    if (userData.count >= 3) {
      try {
        await message.delete().catch(() => {});

        let offenses = spamOffenseCount.get(userId) || 0;
        offenses++;
        spamOffenseCount.set(userId, offenses);

        const timeoutMinutes = 5 * Math.pow(2, offenses - 1);
        const timeoutDuration = timeoutMinutes * 60 * 1000;

        await message.member.timeout(timeoutDuration, `Anti-Spam: ส่งข้อความซ้ำกันเกินกำหนด (ทำผิดครั้งที่ ${offenses})`);

        const warningMsg = await message.channel.send(`⚠️ <@${userId}> **คุณถูก Timeout ${timeoutMinutes} นาที เนื่องจากสแปมข้อความซ้ำกันครับ!**`);
        setTimeout(() => warningMsg.delete().catch(() => {}), 7000);

        userMessageHistory.delete(userId);
        return;
      } catch (err) {
        console.error('❌ ไม่สามารถ Timeout สมาชิกได้:', err);
      }
    }
  } else {
    userMessageHistory.set(userId, { content, count: 1, time: currentTime });
  }
});

client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.get(configData.welcomeChannelId);
  if (!channel) return;

  const parsedTitle = (configData.welcomeTitle || 'Welcome')
    .replace('{server}', member.guild.name)
    .replace('{username}', member.user.username);

  const parsedDescription = (configData.welcomeDesc || 'Welcome to the server!')
    .replace('{user}', `<@${member.id}>`)
    .replace('{username}', member.user.username)
    .replace('{server}', member.guild.name)
    .replace('{memberCount}', member.guild.memberCount.toString());

  const primaryEmbed = new EmbedBuilder()
    .setTitle(parsedTitle)
    .setDescription(parsedDescription)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setColor(configData.welcomeColor1 || '#00FFCC')
    .setTimestamp();

  if (configData.welcomeImage && configData.welcomeImage.trim() !== '') {
    primaryEmbed.setImage(configData.welcomeImage.trim());
  }

  const secondaryEmbed = new EmbedBuilder()
    .setDescription(`✨ Welcome to ${member.guild.name} User ID:${member.id}`)
    .setColor(configData.welcomeColor2 || '#3399FF');

  await channel.send({ content: `✨ ยินดีต้อนรับสมาชิกใหม่ <@${member.id}> ครับ!`, embeds: [primaryEmbed, secondaryEmbed] });
});

client.on('guildMemberRemove', async member => {
  const channel = member.guild.channels.cache.get(configData.goodbyeChannelId);
  if (!channel) return;

  const parsedTitle = (configData.goodbyeTitle || 'Goodbye')
    .replace('{server}', member.guild.name)
    .replace('{username}', member.user.username);

  const parsedDescription = (configData.goodbyeDesc || 'Goodbye!')
    .replace('{user}', member.user.username)
    .replace('{username}', member.user.username)
    .replace('{server}', member.guild.name)
    .replace('{memberCount}', member.guild.memberCount.toString());

  const primaryEmbed = new EmbedBuilder()
    .setTitle(parsedTitle)
    .setDescription(parsedDescription)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setColor(configData.goodbyeColor1 || '#FF3366')
    .setTimestamp();

  if (configData.goodbyeImage && configData.goodbyeImage.trim() !== '') {
    primaryEmbed.setImage(configData.goodbyeImage.trim());
  }

  const secondaryEmbed = new EmbedBuilder()
    .setDescription(`👋 ${member.user.username} has left the server`)
    .setColor(configData.goodbyeColor2 || '#FF9900');

  await channel.send({ embeds: [primaryEmbed, secondaryEmbed] });
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton() || interaction.isModalSubmit()) {
    if (interaction.member && interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    } else {
      const userId = interaction.user.id;
      const currentTime = Date.now();
      const lastClick = userVerifyHistory.get(userId) || 0;

      if (currentTime - lastClick < 2000) {
        let verifySpamCount = (userVerifyHistory.get(userId + '_spam') || 0) + 1;
        userVerifyHistory.set(userId + '_spam', verifySpamCount);

        if (verifySpamCount >= 3) {
          try {
            let offenses = spamOffenseCount.get(userId) || 0;
            offenses++;
            spamOffenseCount.set(userId, offenses);

            const timeoutMinutes = 5 * Math.pow(2, offenses - 1);
            const timeoutDuration = timeoutMinutes * 60 * 1000;

            await interaction.member.timeout(timeoutDuration, `Anti-Spam: สแปมกดปุ่ม Verify รัวๆ`);
            userVerifyHistory.delete(userId);
            userVerifyHistory.delete(userId + '_spam');

            return interaction.reply({ content: `⚠️ **คุณถูก Timeout ${timeoutMinutes} นาที เนื่องจากการสแปมคลิกปุ่มรัวๆ ครับ!**`, ephemeral: true });
          } catch (err) {
            console.error('❌ ไม่สามารถ Timeout คนสแปมปุ่มได้:', err);
          }
        }
      } else {
        userVerifyHistory.set(userId + '_spam', 1);
      }
      userVerifyHistory.set(userId, currentTime);
    }
  }

  if (interaction.isChatInputCommand() && interaction.commandName === 'check-whitelist') {
    await interaction.deferReply({ ephemeral: true });

    const searchInput = interaction.options.getString('input').trim();

    try {
      const response = await axios.get(`${GOOGLE_SHEET_API_URL}?action=check&query=${encodeURIComponent(searchInput)}`);

      if (response.data && response.data.found) {
        const data = response.data.data;

        const resultEmbed = new EmbedBuilder()
          .setTitle('✅ พบข้อมูลในระบบ Whitelist')
          .setColor('#2ecc71')
          .addFields(
            { name: '👤 ชื่อใน Steam', value: data.steamName || 'ไม่ระบุ', inline: true },
            { name: '🎮 Steam ID', value: data.steamId || 'ไม่ระบุ', inline: true },
            { name: '💬 Discord Tag', value: data.discordTag || 'ไม่ระบุ', inline: true },
            { name: '🆔 Discord ID', value: data.discordId || 'ไม่ระบุ', inline: false },
            { name: '📅 วันที่ลงทะเบียน', value: data.timestamp || 'ไม่ระบุ', inline: false }
          )
          .setFooter({ text: 'Whitelist Lookup System' })
          .setTimestamp();

        await interaction.editReply({ embeds: [resultEmbed] });
      } else {
        const notFoundEmbed = new EmbedBuilder()
          .setTitle('❌ ไม่พบข้อมูลในระบบ')
          .setDescription(`ไม่พบข้อมูลที่ตรงกับคำค้นหา: \`${searchInput}\``)
          .setColor('#e74c3c');

        await interaction.editReply({ embeds: [notFoundEmbed] });
      }
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการค้นหา:', error);
      await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล Google Sheets' });
    }
  }

  if (interaction.isChatInputCommand() && interaction.commandName === 'setup-embed') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('📢 สร้างข้อความ Embed ประกาศ')
      .setDescription('กรุณาเลือก **ห้อง (Channel)** ที่ต้องการส่งข้อความ Embed ประกาศไปแสดงครับ')
      .setColor('#e74c3c');

    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('select_embed_channel')
      .setPlaceholder('คลิกเพื่อเลือกห้องสำหรับส่ง Embed...')
      .addChannelTypes(ChannelType.GuildText);

    const row = new ActionRowBuilder().addComponents(channelSelect);

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (interaction.isChannelSelectMenu() && interaction.customId === 'select_embed_channel') {
    const selectedChannelId = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`modal_custom_embed_${selectedChannelId}`)
      .setTitle('📝 กรอกรายละเอียด Embed');

    const titleInput = new TextInputBuilder().setCustomId('e_title').setLabel('หัวข้อ (Title)').setStyle(TextInputStyle.Short).setRequired(true);
    const descInput = new TextInputBuilder().setCustomId('e_desc').setLabel('เนื้อหาคำอธิบาย').setStyle(TextInputStyle.Paragraph).setRequired(true);
    const imageInput = new TextInputBuilder().setCustomId('e_image').setLabel('ลิงก์รูปภาพ Banner (ถ้ามี)').setStyle(TextInputStyle.Short).setRequired(false);
    const colorInput = new TextInputBuilder().setCustomId('e_color').setLabel('โค้ดสี Hex').setStyle(TextInputStyle.Short).setValue('#3498db').setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(imageInput),
      new ActionRowBuilder().addComponents(colorInput)
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_custom_embed_')) {
    const targetChannelId = interaction.customId.replace('modal_custom_embed_', '');
    const targetChannel = interaction.guild.channels.cache.get(targetChannelId);

    if (!targetChannel) {
      return interaction.reply({ content: '❌ ไม่พบห้องที่คุณเลือก', ephemeral: true });
    }

    const title = interaction.fields.getTextInputValue('e_title');
    const desc = interaction.fields.getTextInputValue('e_desc');
    const image = interaction.fields.getTextInputValue('e_image');
    const color = interaction.fields.getTextInputValue('e_color');

    const customEmbed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(desc)
      .setColor(color.startsWith('#') ? color : '#3498db')
      .setTimestamp();

    if (image && image.trim() !== '') {
      customEmbed.setImage(image.trim());
    }

    await targetChannel.send({ embeds: [customEmbed] });
    return interaction.reply({ content: `✅ **ส่งข้อความ Embed ไปที่ห้อง ${targetChannel} เรียบร้อยแล้วครับ!**`, ephemeral: true });
  }

  if (interaction.isChatInputCommand() && interaction.commandName === 'config-panel') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้!', ephemeral: true });
    }

    const roleStatus = configData.verifiedRoleId ? `<@&${configData.verifiedRoleId}>` : '❌ ยังไม่ได้ตั้งค่า';

    const panelEmbed = new EmbedBuilder()
      .setTitle('👑 Admin Management Suite & Customization')
      .setDescription('เลือกปุ่มด้านล่างเพื่อปรับแต่งการตั้งค่าระบบต่างๆ ได้สดๆ ทันที!')
      .setColor('#9b59b6')
      .addFields(
        { name: '🎖️ ยศหลัง Verify สำเร็จ', value: roleStatus, inline: false },
        { name: '🔒 ระบบ Verify ปัจจุบัน', value: `หัวข้อ: ${configData.verifyTitle}`, inline: false },
        { name: '✨ ระบบ Welcome ปัจจุบัน', value: `ห้อง: <#${configData.welcomeChannelId}>\nหัวข้อ: ${configData.welcomeTitle}`, inline: false },
        { name: '👋 ระบบ Goodbye ปัจจุบัน', value: `ห้อง: <#${configData.goodbyeChannelId}>\nหัวข้อ: ${configData.goodbyeTitle}`, inline: false }
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('edit_role').setLabel('🎖️ ตั้งค่ายศอัตโนมัติ').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('edit_verify').setLabel('⚙️ ตั้งค่า Verify Card').setStyle(ButtonStyle.Primary),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('edit_welcome').setLabel('⚙️ ตั้งค่า Welcome').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('edit_goodbye').setLabel('⚙️ ตั้งค่า Goodbye').setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({ embeds: [panelEmbed], components: [row1, row2], ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'edit_role') {
    const modal = new ModalBuilder().setCustomId('modal_config_role').setTitle('🎖️ ตั้งค่ายศอัตโนมัติ');
    const roleInput = new TextInputBuilder().setCustomId('role_id_input').setLabel('Role ID (ไอดีของยศ)').setStyle(TextInputStyle.Short).setValue(configData.verifiedRoleId).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(roleInput));
    return interaction.showModal(modal);
  }

  if (interaction.isButton() && interaction.customId === 'edit_verify') {
    const modal = new ModalBuilder().setCustomId('modal_config_verify').setTitle('🔒 ตั้งค่าการ์ด Verify');
    const titleInput = new TextInputBuilder().setCustomId('v_title').setLabel('หัวข้อ (Title)').setStyle(TextInputStyle.Short).setValue(configData.verifyTitle).setRequired(true);
    const descInput = new TextInputBuilder().setCustomId('v_desc').setLabel('คำอธิบาย (Description)').setStyle(TextInputStyle.Paragraph).setValue(configData.verifyDesc).setRequired(true);
    const imageInput = new TextInputBuilder().setCustomId('v_image').setLabel('ลิงก์รูปภาพ Banner').setStyle(TextInputStyle.Short).setValue(configData.verifyImage).setRequired(false);
    const color1Input = new TextInputBuilder().setCustomId('v_c1').setLabel('สีหลัก Hex').setStyle(TextInputStyle.Short).setValue(configData.verifyColor1).setRequired(true);
    const color2Input = new TextInputBuilder().setCustomId('v_c2').setLabel('สีรอง Hex').setStyle(TextInputStyle.Short).setValue(configData.verifyColor2).setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(imageInput),
      new ActionRowBuilder().addComponents(color1Input),
      new ActionRowBuilder().addComponents(color2Input)
    );
    return interaction.showModal(modal);
  }

  if (interaction.isButton() && interaction.customId === 'edit_welcome') {
    const modal = new ModalBuilder().setCustomId('modal_config_welcome').setTitle('✨ ตั้งค่าระบบ Welcome');
    const titleInput = new TextInputBuilder().setCustomId('w_title').setLabel('หัวข้อ (Title)').setStyle(TextInputStyle.Short).setValue(configData.welcomeTitle).setRequired(true);
    const descInput = new TextInputBuilder().setCustomId('w_desc').setLabel('คำอธิบาย').setStyle(TextInputStyle.Paragraph).setValue(configData.welcomeDesc).setRequired(true);
    const imageInput = new TextInputBuilder().setCustomId('w_image').setLabel('ลิงก์รูปภาพ Banner').setStyle(TextInputStyle.Short).setValue(configData.welcomeImage).setRequired(true);
    const color1Input = new TextInputBuilder().setCustomId('w_c1').setLabel('สีหลัก Hex').setStyle(TextInputStyle.Short).setValue(configData.welcomeColor1).setRequired(true);
    const color2Input = new TextInputBuilder().setCustomId('w_c2').setLabel('สีรอง Hex').setStyle(TextInputStyle.Short).setValue(configData.welcomeColor2).setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(imageInput),
      new ActionRowBuilder().addComponents(color1Input),
      new ActionRowBuilder().addComponents(color2Input)
    );
    return interaction.showModal(modal);
  }

  if (interaction.isButton() && interaction.customId === 'edit_goodbye') {
    const modal = new ModalBuilder().setCustomId('modal_config_goodbye').setTitle('👋 ตั้งค่าระบบ Goodbye');
    const titleInput = new TextInputBuilder().setCustomId('g_title').setLabel('หัวข้อ (Title)').setStyle(TextInputStyle.Short).setValue(configData.goodbyeTitle).setRequired(true);
    const descInput = new TextInputBuilder().setCustomId('g_desc').setLabel('คำอธิบาย').setStyle(TextInputStyle.Paragraph).setValue(configData.goodbyeDesc).setRequired(true);
    const imageInput = new TextInputBuilder().setCustomId('g_image').setLabel('ลิงก์รูปภาพ Banner').setStyle(TextInputStyle.Short).setValue(configData.goodbyeImage).setRequired(true);
    const color1Input = new TextInputBuilder().setCustomId('g_c1').setLabel('สีหลัก Hex').setStyle(TextInputStyle.Short).setValue(configData.goodbyeColor1).setRequired(true);
    const color2Input = new TextInputBuilder().setCustomId('g_c2').setLabel('สีรอง Hex').setStyle(TextInputStyle.Short).setValue(configData.goodbyeColor2).setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(imageInput),
      new ActionRowBuilder().addComponents(color1Input),
      new ActionRowBuilder().addComponents(color2Input)
    );
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_config_role') {
    configData.verifiedRoleId = interaction.fields.getTextInputValue('role_id_input').trim();
    await interaction.reply({ content: `✅ **บันทึกตั้งค่ายศอัตโนมัติสำเร็จ!** (Role ID: \`${configData.verifiedRoleId}\`)`, ephemeral: true });
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_config_verify') {
    configData.verifyTitle = interaction.fields.getTextInputValue('v_title');
    configData.verifyDesc = interaction.fields.getTextInputValue('v_desc');
    configData.verifyImage = interaction.fields.getTextInputValue('v_image');
    configData.verifyColor1 = interaction.fields.getTextInputValue('v_c1');
    configData.verifyColor2 = interaction.fields.getTextInputValue('v_c2');
    await interaction.reply({ content: '✅ **อัปเดตและบันทึกการตั้งค่าการ์ด Verify สำเร็จ!**', ephemeral: true });
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_config_welcome') {
    configData.welcomeTitle = interaction.fields.getTextInputValue('w_title');
    configData.welcomeDesc = interaction.fields.getTextInputValue('w_desc');
    configData.welcomeImage = interaction.fields.getTextInputValue('w_image');
    configData.welcomeColor1 = interaction.fields.getTextInputValue('w_c1');
    configData.welcomeColor2 = interaction.fields.getTextInputValue('w_c2');
    await interaction.reply({ content: '✅ **อัปเดตและบันทึกการตั้งค่าระบบ Welcome สำเร็จเรียบร้อย!**', ephemeral: true });
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_config_goodbye') {
    configData.goodbyeTitle = interaction.fields.getTextInputValue('g_title');
    configData.goodbyeDesc = interaction.fields.getTextInputValue('g_desc');
    configData.goodbyeImage = interaction.fields.getTextInputValue('g_image');
    configData.goodbyeColor1 = interaction.fields.getTextInputValue('g_c1');
    configData.goodbyeColor2 = interaction.fields.getTextInputValue('g_c2');
    await interaction.reply({ content: '✅ **อัปเดตและบันทึกการตั้งค่าระบบ Goodbye สำเร็จเรียบร้อย!**', ephemeral: true });
  }

  if (interaction.isChatInputCommand() && interaction.commandName === 'setup-verify') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('⚙️ ตั้งค่าระบบ Whitelist Verification')
      .setDescription('กรุณาเลือก **ห้อง (Channel)** ที่ต้องการให้บอทส่งปุ่มลงทะเบียน Whitelist ไปแสดงครับ')
      .setColor('#3498db');

    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('select_verify_channel')
      .setPlaceholder('คลิกเพื่อเลือกห้องสำหรับตั้งค่า Verify...')
      .addChannelTypes(ChannelType.GuildText);

    const row = new ActionRowBuilder().addComponents(channelSelect);
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (interaction.isChannelSelectMenu() && interaction.customId === 'select_verify_channel') {
    const selectedChannelId = interaction.values[0];
    const targetChannel = interaction.guild.channels.cache.get(selectedChannelId);

    if (!targetChannel) {
      return interaction.update({ content: '❌ ไม่พบห้องที่คุณเลือก', components: [] });
    }

    configData.welcomeChannelId = selectedChannelId; 

    const verifyEmbed1 = new EmbedBuilder().setTitle(configData.verifyTitle).setDescription(configData.verifyDesc).setColor(configData.verifyColor1);
    if (configData.verifyImage && configData.verifyImage.trim() !== '') verifyEmbed1.setImage(configData.verifyImage.trim());

    const verifyEmbed2 = new EmbedBuilder().setDescription('✨ Secure Whitelist Verification System').setColor(configData.verifyColor2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify_th').setLabel('🇹🇭 ภาษาไทย').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('verify_en').setLabel('🇬🇧 English').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('how_to_guide').setLabel('📖 คู่มือการหาข้อมูล (Guide)').setStyle(ButtonStyle.Secondary)
    );

    await targetChannel.send({ embeds: [verifyEmbed1, verifyEmbed2], components: [row] });
    await interaction.update({ content: `✅ **ส่งปุ่มลงทะเบียน Whitelist ไปที่ห้อง ${targetChannel} เรียบร้อยแล้วครับ!**`, components: [] });
  }

  if (interaction.isButton() && interaction.customId === 'how_to_guide') {
    const guideEmbedTh = new EmbedBuilder()
      .setTitle('🇹🇭 คู่มือการหาข้อมูล (Thai Guide)')
      .setDescription('**1. Steam Name:** ชื่อโปรไฟล์ Steam\n**2. Steam ID:** คัดลอก URL โปรไฟล์มาใส่เลข 17 หลัก\n**3. Discord User ID:** เปิด Developer Mode แล้วคลิกขวา Copy ID')
      .setColor('#3498db');
    return interaction.reply({ embeds: [guideEmbedTh], ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'verify_th') {
    const modal = new ModalBuilder().setCustomId('modal_th').setTitle('ลงทะเบียน Whitelist (ภาษาไทย)');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('steam_name_input').setLabel('ชื่อใน Steam').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('steam_id_input').setLabel('Steam ID (17 หลัก)').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('discord_id_input').setLabel('Discord User ID').setStyle(TextInputStyle.Short).setValue(interaction.user.id).setRequired(true))
    );
    await interaction.showModal(modal);
  }

  if (interaction.isButton() && interaction.customId === 'verify_en') {
    const modal = new ModalBuilder().setCustomId('modal_en').setTitle('Whitelist Registration (English)');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('steam_name_input').setLabel('Steam Profile Name').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('steam_id_input').setLabel('Steam ID (17-digit)').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('discord_id_input').setLabel('Discord User ID').setStyle(TextInputStyle.Short).setValue(interaction.user.id).setRequired(true))
    );
    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && (interaction.customId === 'modal_th' || interaction.customId === 'modal_en')) {
    await interaction.deferReply({ ephemeral: true });

    const isThai = interaction.customId === 'modal_th';
    const steamName = interaction.fields.getTextInputValue('steam_name_input');
    const steamId = interaction.fields.getTextInputValue('steam_id_input');
    const discordId = interaction.fields.getTextInputValue('discord_id_input');
    const discordTag = interaction.user.tag;

    try {
      const response = await axios.post(GOOGLE_SHEET_API_URL, { steamName, steamId, discordId, discordTag });

      if (response.data.status === 'success') {
        try {
          const member = await interaction.guild.members.fetch(interaction.user.id);
          if (member && configData.verifiedRoleId) {
            await member.roles.add(configData.verifiedRoleId);
          }
        } catch (roleError) {
          console.error('❌ ไม่สามารถเพิ่มยศให้ผู้เล่นได้:', roleError);
        }

        const msg = isThai ? '🎉 **ลงทะเบียน Whitelist สำเร็จ!** บันทึกข้อมูลและรับยศเรียบร้อยแล้วครับ' : '🎉 **Registration successful!** Data saved and role assigned.';
        await interaction.editReply({ content: msg });
      } else if (response.data.status === 'already_exists') {
        const msg = isThai ? '⚠️ **คุณได้ลงทะเบียนไปแล้ว!** ข้อมูลนี้มีในระบบแล้ว' : '⚠️ **Already registered!** Data already exists.';
        await interaction.editReply({ content: msg });
      } else {
        await interaction.editReply({ content: isThai ? '❌ เกิดข้อผิดพลาดจากระบบ' : '❌ System error.' });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: isThai ? '❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้' : '❌ Failed to connect database.' });
    }
  }
});

client.login(BOT_TOKEN);