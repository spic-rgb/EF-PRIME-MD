import config from '../config.cjs';

const setDescription = async (m, gss) => {
  try {
    const botNumber = await gss.decodeJid(gss.user.id);
    const prefix = config.PREFIX;
const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
const text = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['setdescription', 'setdesc', 'setgroupbio'];

    if (!validCommands.includes(cmd)) return;

    if (!m.isGroup) return m.reply("*❌ command can only be used in groups*");
    const groupMetadata = await gss.groupMetadata(m.from);
    const participants = groupMetadata.participants;
    const botAdmin = participants.find(p => p.id === botNumber)?.admin;
    const senderAdmin = participants.find(p => p.id === m.sender)?.admin;

    if (!botAdmin) return m.reply("*❌only bot owner can use the command*");
    if (!senderAdmin) return m.reply("*❌only bot owner can use the command*");

    if (!text) return m.reply("*❌ description must be set to use the command*");

    await gss.groupUpdateDescription(m.from, text);
    m.reply(`Group Description Has Been Set To: ${text}`);
  } catch (error) {
    console.error('Error:', error);
    m.reply('An error occurred while processing the command.');
  }
};

export default setDescription;
