'use strict';
/** HSHO DISCORD VERIFY BOT BY NONGCHE */
const { Events, ActivityType } = require('discord.js');
const { config } = require('../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log('');
    console.log('  ==================================================');
    console.log('   HSHO DISCORD VERIFY BOT');
    console.log('   BY NONGCHE');
    console.log('  --------------------------------------------------');
    console.log(`   Logged in : ${client.user.tag}`);
    console.log(`   Guilds    : ${client.guilds.cache.size}`);
    console.log(`   Data dir  : ${config.dataDir}`);
    console.log(`   Role      : ${config.verifyRoleId || '(ไม่ได้ตั้งค่า)'} `);
    console.log('  ==================================================');
    console.log('');

    client.user.setPresence({
      status: 'online',
      activities: [{ name: 'HSHO Verify | BY NONGCHE', type: ActivityType.Playing }],
    });
  },
};
