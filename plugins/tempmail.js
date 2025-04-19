import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import config from '../config.cjs';

const ensureDbExists = async () => {
  try {
    await fs.mkdir('./database', { recursive: true });
  } catch (error) {
    console.error('Error creating database directory:', error);
  }
};

const getUserTempMail = async (userId) => {
  try {
    const filePath = path.join('./database', 'tempmail.json');
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const tempmails = JSON.parse(data);
      return tempmails[userId] || null;
    } catch (error) {
      await fs.writeFile(filePath, JSON.stringify({}), 'utf8');
      return null;
    }
  } catch (error) {
    console.error('Error getting user tempmail:', error);
    return null;
  }
};

const saveUserTempMail = async (userId, emailData) => {
  try {
    const filePath = path.join('./database', 'tempmail.json');
    let tempmails = {};
    try {
      const data = await fs.readFile(filePath, 'utf8');
      tempmails = JSON.parse(data);
    } catch (error) {
      tempmails = {};
    }
    tempmails[userId] = emailData;
    await fs.writeFile(filePath, JSON.stringify(tempmails, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving user tempmail:', error);
    return false;
  }
};

const formatEmailMessage = (message) => {
  if (!message) return "No content available";
  
  const { from, subject, date, textBody, htmlBody } = message;
  
  let content = textBody || "";
  if (!content && htmlBody) {
    content = htmlBody
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, '');
  }
  
  if (content.length > 800) {
    content = content.substring(0, 797) + "...";
  }
  
  return `┏━━━❮ 📧 𝐄𝐌𝐀𝐈𝐋 ❯━━━┓
   
 👤 *From:* ${from || "Unknown"}
 📑 *Subject:* ${subject || "No subject"}
 🕒 *Date:* ${date || "Unknown"}
   
 📝 *Content:*
 ${content || "No content"}
   
┗━━━━━━━━━━━━━┛`;
};

const tempmail = async (m, Matrix) => {
  try {
    await ensureDbExists();
    
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase() : '';
    
    if (cmd !== 'tempmail') return;
    
    const args = m.body.slice(prefix.length + cmd.length).trim().split(/ +/);
    const subCommand = args[0]?.toLowerCase();
    const userId = m.sender.split('@')[0];
    
    await Matrix.sendMessage(m.from, { react: { text: "📧", key: m.key } });
    
    switch (subCommand) {
      case 'create':
        try {
          const response = await axios.get('https://apis-keith.vercel.app/tempmail');
          
          if (response.data && response.data.status && response.data.result && response.data.result.length >= 3) {
            const [email, id, expiry] = response.data.result;
            
            const expiryDate = new Date(expiry);
            const now = new Date();
            const diffMs = expiryDate - now;
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            const emailData = {
              email,
              id,
              expiry
            };
            
            await saveUserTempMail(userId, emailData);
            
            const message = `┏━━━❮ 📧 𝐓𝐄𝐌𝐏𝐌𝐀𝐈𝐋 ❯━━━┓
   
 📬 *${email}*
 ⏳ Expires in: ${diffHrs}h ${diffMins}m
   
 ✨ *Commands:*
 ➤ ${prefix}tempmail inbox
 ➤ ${prefix}tempmail info
 ➤ ${prefix}tempmail delete
   
┗━━━━━━━━━━━━━┛`;
            
            await Matrix.sendMessage(m.from, {
              text: message,
              contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: '120363419090892208@newsletter',
                  newsletterName: "TEMPMAIL",
                  serverMessageId: 144,
                }
              }
            }, { quoted: m });
          } else {
            throw new Error('Invalid API response format');
          }
        } catch (error) {
          console.error('Error creating tempmail:', error);
          await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
          return m.reply('⚠️ Failed to create temporary email.');
        }
        break;
        
      case 'inbox':
      case 'check':
        try {
          const emailData = await getUserTempMail(userId);
          
          if (!emailData) {
            return m.reply(`⚠️ No active email. Use ${prefix}tempmail create`);
          }
          
          const response = await axios.get(`https://apis-keith.vercel.app/get_inbox_tempmail?q=${emailData.id}`);
          
          if (response.data && response.data.status) {
            const messages = response.data.result || [];
            
            if (messages.length === 0) {
              await Matrix.sendMessage(m.from, {
                text: `┏━━━❮ 📭 𝐄𝐌𝐏𝐓𝐘 ❯━━━┓
   
 📧 *${emailData.email}*
 👾 No messages yet!
   
 Waiting for incoming emails...
   
┗━━━━━━━━━━━━━┛`,
                contextInfo: {
                  mentionedJid: [m.sender],
                  forwardingScore: 999,
                  isForwarded: true,
                  forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363419090892208@newsletter',
                    newsletterName: "TEMPMAIL",
                    serverMessageId: 144,
                  }
                }
              }, { quoted: m });
            } else {
              const summary = `┏━━━❮ 📬 𝐈𝐍𝐁𝐎𝐗 [${messages.length}] ❯━━━┓
   
 📧 *${emailData.email}*
   
${messages.map((msg, i) => ` ${i+1}. From: ${msg.from || 'Unknown'}\n    📑: ${msg.subject || 'No subject'}`).join('\n\n')}
   
 📖 Reply: ${prefix}tempmail read [#]
   
┗━━━━━━━━━━━━━┛`;
              
              await Matrix.sendMessage(m.from, {
                text: summary,
                contextInfo: {
                  mentionedJid: [m.sender],
                  forwardingScore: 999,
                  isForwarded: true,
                  forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363419090892208@newsletter',
                    newsletterName: "TEMPMAIL",
                    serverMessageId: 144,
                  }
                }
              }, { quoted: m });
            }
          } else {
            throw new Error('Invalid API response format');
          }
        } catch (error) {
          console.error('Error checking inbox:', error);
          await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
          return m.reply('⚠️ Failed to check inbox.');
        }
        break;
        
      case 'read':
        try {
          const emailData = await getUserTempMail(userId);
          if (!emailData) {
            return m.reply(`⚠️ No active email. Use ${prefix}tempmail create`);
          }
          
          const messageIndex = parseInt(args[1]) - 1;
          if (isNaN(messageIndex) || messageIndex < 0) {
            return m.reply(`⚠️ Specify a valid message number`);
          }
          
          const response = await axios.get(`https://apis-keith.vercel.app/get_inbox_tempmail?q=${emailData.id}`);
          
          if (response.data && response.data.status) {
            const messages = response.data.result || [];
            
            if (messageIndex >= messages.length) {
              return m.reply(`⚠️ Message #${messageIndex + 1} not found. You have ${messages.length} message(s).`);
            }
            
            const message = messages[messageIndex];
            const formattedMessage = formatEmailMessage(message);
            
            await Matrix.sendMessage(m.from, {
              text: formattedMessage,
              contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: '120363419090892208@newsletter',
                  newsletterName: "TEMPMAIL",
                  serverMessageId: 144,
                }
              }
            }, { quoted: m });
          } else {
            throw new Error('Invalid API response format');
          }
        } catch (error) {
          console.error('Error reading message:', error);
          await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
          return m.reply('⚠️ Failed to read message.');
        }
        break;
        
      case 'info':
        try {
          const emailData = await getUserTempMail(userId);
          
          if (!emailData) {
            return m.reply(`⚠️ No active email. Use ${prefix}tempmail create`);
          }
          
          const expiryDate = new Date(emailData.expiry);
          const now = new Date();
          const diffMs = expiryDate - now;
          
          if (diffMs <= 0) {
            await m.reply(`⚠️ Email expired. Create a new one.`);
            await saveUserTempMail(userId, null);
            return;
          }
          
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          
          const message = `┏━━━❮ 📧 𝐈𝐍𝐅𝐎 ❯━━━┓
   
 📬 *${emailData.email}*
 ✅ Status: Active
 ⏳ Expires: ${diffHrs}h ${diffMins}m
   
 ➤ ${prefix}tempmail inbox
 ➤ ${prefix}tempmail delete
   
┗━━━━━━━━━━━━━┛`;
          
          await Matrix.sendMessage(m.from, {
            text: message,
            contextInfo: {
              mentionedJid: [m.sender],
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363419090892208@newsletter',
                newsletterName: "TEMPMAIL",
                serverMessageId: 144,
              }
            }
          }, { quoted: m });
        } catch (error) {
          console.error('Error getting tempmail info:', error);
          await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
          return m.reply('⚠️ Failed to get email info.');
        }
        break;
        
      case 'delete':
        try {
          const emailData = await getUserTempMail(userId);
          
          if (!emailData) {
            return m.reply(`⚠️ No active email.`);
          }
          
          await saveUserTempMail(userId, null);
          
          await Matrix.sendMessage(m.from, {
            text: `┏━━━❮ ❌ 𝐃𝐄𝐋𝐄𝐓𝐄𝐃 ❯━━━┓
   
 Email deleted successfully.
 📧 ${emailData.email}
   
 Create new: ${prefix}tempmail create
   
┗━━━━━━━━━━━━━┛`,
            contextInfo: {
              mentionedJid: [m.sender],
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363419090892208@newsletter',
                newsletterName: "TEMPMAIL",
                serverMessageId: 144,
              }
            }
          }, { quoted: m });
        } catch (error) {
          console.error('Error deleting tempmail:', error);
          await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
          return m.reply('⚠️ Failed to delete email.');
        }
        break;
        
      default:
        const userEmail = await getUserTempMail(userId);
        
        const helpMessage = `┏━━━❮ 📧 𝐓𝐄𝐌𝐏𝐌𝐀𝐈𝐋 ❯━━━┓
   
${userEmail ? ` 📬 *${userEmail.email}*\n` : ' No active email.\n'}   
 ✨ *Commands:*
 ➤ ${prefix}tempmail create
 ➤ ${prefix}tempmail inbox
 ➤ ${prefix}tempmail read [#]
 ➤ ${prefix}tempmail info
 ➤ ${prefix}tempmail delete
   
┗━━━━━━━━━━━━━┛`;
        
        await Matrix.sendMessage(m.from, {
          text: helpMessage,
          contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363419090892208@newsletter',
              newsletterName: "TEMPMAIL",
              serverMessageId: 144,
            }
          }
        }, { quoted: m });
    }
  } catch (error) {
    console.error('Error in tempmail command:', error);
    m.reply('⚠️ An error occurred processing your request.');
  }
};

export default tempmail;