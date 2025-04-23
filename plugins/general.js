import config from '../config.cjs';
import { formatDistanceToNow } from 'date-fns';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

const generalCommands = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const args = m.body.slice(prefix.length + cmd.length).trim().split(/ +/);
  const botName = config.BOT_NAME || 'EF-PRIME-MD';
  const ownerName = config.OWNER_NAME || 'Frank Kaumba';
  const botNumber = Matrix.user.id.split(':')[0].split('@')[0];
  const devNumber = '265993702468';

  const generalCmds = [
    'menu', 'help', 'info', 'owner', 'script',
    'runtime', 'uptime', 'stats', 'status', 'feedback',
    'donate', 'rules', 'privacy', 'terms', 'dev'
  ];

  if (!generalCmds.includes(cmd)) return;

  const uptimeSeconds = process.uptime();
  const days = Math.floor(uptimeSeconds / (3600 * 24));
  const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usedMemPercentage = ((usedMem / totalMem) * 100).toFixed(2);
  const cpuModel = os.cpus()[0].model;
  const cpuCores = os.cpus().length;
  const platform = os.platform();
  const arch = os.arch();

  const version = config.VERSION || '1.0.0';
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
  const dependencies = Object.keys(packageJson.dependencies || {}).length;

  switch (cmd) {
    case 'info': {
      const infoMsg = `*${botName} - Bot Info* ℹ️\n\n` +
        `*Bot Details:*\n` +
        `👾 *Name:* ${botName}\n` +
        `⚙️ *Version:* ${version}\n` +
        `📦 *Dependencies:* ${dependencies}\n` +
        `📱 *Platform:* <span class="math-inline">\{platform\} \(</span>{arch})\n` +
        `💻 *CPU:* ${cpuModel}\n` +
        `🧠 *CPU Cores:* ${cpuCores}\n\n` +

        `*System Stats:*\n` +
        `⏱️ *Uptime:* ${uptime}\n` +
        `🔋 *RAM Usage:* ${(usedMem / (1024 * 1024 * 1024)).toFixed(2)}GB / <span class="math-inline">\{\(totalMem / \(1024 \* 1024 \* 1024\)\)\.toFixed\(2\)\}GB \(</span>{usedMemPercentage}%)\n` +
        `💾 *Heap:* ${(process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2)}MB\n\n` +

        `*Developer Info:*\n` +
        `👨‍💻 *Creator:* ${ownerName}\n` +
        `🔗 *GitHub:* github.com/efkidgamerdev\n` +
        `📷 *Instagram:* efkidgamer\n\n` +

        `_Made with 🫶 by Frank_`;

      await Matrix.sendMessage(m.from, {
        text: infoMsg,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: `${botName} - Bot Information`,
            body: "Click here for more info",
            sourceUrl: "https://github.com/efkidgamerdev",
            mediaType: 1,
            renderLargerThumbnail: true
          },
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });
      break;
    }

    case 'owner': {
      const vcard = 'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        `FN:${ownerName}\n` +
        `ORG:${botName} Developer;\n` +
        `TEL;type=CELL;type=VOICE;waid=<span class="math-inline">\{botNumber\}\:\+</span>{botNumber}\n` +
        'END:VCARD';

      await Matrix.sendMessage(m.from, {
        contacts: {
          displayName: ownerName,
          contacts: [{ vcard }]
        },
        contextInfo: {
          externalAdReply: {
            title: `${botName} - Owner`,
            body: `Contact the developer`,
            sourceUrl: `https://wa.me/${botNumber}`,
            mediaType: 1,
          },
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });

      await Matrix.sendMessage(m.from, {
        text: `*${botName} - Owner Info* 👑\n\n` +
         `*Number:* @${botNumber}\n`,
        mentions: [`${botNumber}@s.whatsapp.net`],
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });
      break;
    }

    case 'script': {
      await Matrix.sendMessage(m.from, {
        text: `*${botName} - Source Code* 📂\n\n` +
          `*Repository:* github.com/efkidgamerdev/EF-PRIME-MD\n\n` +
          `*Version:* ${version}\n` +
          `*License:* MIT\n\n` +
          `_Star ⭐ the repository if you like the bot!_`,
        contextInfo: {
          externalAdReply: {
            title: `${botName} - GitHub Repository`,
            body: `View the source code`,
            sourceUrl: "https://github.com/efkidgamerdev/EF-PRIME-MD",
            mediaType: 1,
            renderLargerThumbnail: true
          },
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });
      break;
    }

    case 'runtime': case 'uptime': {
      await Matrix.sendMessage(m.from, {
        text: `*${botName} - Runtime Info* ⏱️\n\n` +
          `*Bot Uptime:* ${uptime}\n` +
          `*Started:* ${formatDistanceToNow(new Date(Date.now() - uptimeSeconds * 1000), { addSuffix: true })}\n` +
          `*RAM Usage:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
          `*CPU Load:* ${os.loadavg()[0].toFixed(2)}%`,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });
      break;
    }

    case 'stats': case 'status': {
      const { stdout: nodeVersion } = await execAsync('node -v');

      const networkInterfaces = os.networkInterfaces();
      const network = Object.keys(networkInterfaces)
        .filter(iface => !iface.includes('lo'))
        .map(iface => networkInterfaces[iface])[0];
      const ip = network ? network.find(n => n.family === 'IPv4')?.address : 'Unknown';

      const statsMsg = `*${botName} - System Status* 📊\n\n` +
        `*Bot Version:* ${version}\n` +
        `*Node.js:* ${nodeVersion.trim()}\n` +
        `*Platform:* <span class="math-inline">\{platform\} \(</span>{arch})\n` +
        `*Hostname:* ${os.hostname()}\n` +
        `*IP Address:* ${ip}\n\n` +

        `*System Resources:*\n` +
        `*CPU Model:* ${cpuModel}\n` +
        `*CPU Cores:* ${cpuCores}\n` +
        `*RAM Total:* ${(totalMem / (1024 * 1024 * 1024)).toFixed(2)}GB\n` +
        `*RAM Used:* <span class="math-inline">\{\(usedMem / \(1024 \* 1024 \* 1024\)\)\.toFixed\(2\)\}GB \(</span>{usedMemPercentage}%)\n` +
        `*Free RAM:* ${(freeMem / (1024 * 1024 * 1024)).toFixed(2)}GB\n\n` +

        `*Process Stats:*\n` +
        `*Heap Used:* ${(process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2)}MB\n` +
        `*External:* ${(process.memoryUsage().external / (1024 * 1024)).toFixed(2)}MB\n` +
        `*Uptime:* ${uptime}`;

      await Matrix.sendMessage(m.from, {
        text: statsMsg,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });
      break;
    }

    case 'feedback': {
      if (!args[0]) {
        await Matrix.sendMessage(m.from, {
          text: `*${botName} - Feedback* 💭\n\n` +
            `Please provide your feedback after the command.\n\n` +
            `*Example:* ${prefix}feedback I love this bot! Could you add more games?`,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363419090892208@newsletter',
              newsletterName: "EF-PRIME",
              serverMessageId: 143
            }
          }
        }, { quoted: m });
        return;
      }

      const feedback = args.join(' ');
      const userName = m.pushName || `@${m.sender.split('@')[0]}`;

      await Matrix.sendMessage(`${devNumber}@s.whatsapp.net`, {
        text: `*${botName} - User Feedback*\n\n` +
          `*From:* <span class="math-inline">\{userName\} \(</span>{m.sender})\n` +
          `*Group:* ${m.isGroup ? (await Matrix.groupMetadata(m.from)).subject : 'Private Chat'}\n` +
          `*Time:* ${new Date().toLocaleString()}\n\n` +
          `*Feedback:*\n${feedback}`,
        contextInfo: {
          mentionedJid: [m.sender],
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      });

      await Matrix.sendMessage(m.from, {
        text: `*${botName} - Feedback Submitted* ✅\n\n` +
          `Thank you for your feedback! We appreciate your input.\n\n` +
          `*Your feedback:*\n${feedback}`,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });
      break;
    }

    case 'donate': {
      const donateMsg = `*${botName} - Support the Developer* ❤️\n\n` +
        `If you enjoy using ${botName} and want to support its development, you can donate through:\n\n` +
        `*Airtel money:* ${config.MPESA_NUMBER || '265993702468'}\n` +
        `*TNM MPAMBQ:* ${config.PAYPAL || '265881791121'}\n\n` +
        `Your support helps keep the bot running and improving!\n` +
        `Thank you for your generosity! 🙏`;

      await Matrix.sendMessage(m.from, {
        text: donateMsg,
        contextInfo: {
          externalAdReply: {
            title: "Support EF-PRIME-MD Development",
            body: "Your donation helps keep the bot running",
            sourceUrl: `https://wa.me/265993702468?text=I%20want%20to%20donate%20to%20support%20the%20bot`,
            mediaType: 1,
          },
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });
      break;
    }

    case 'rules': {
      const rulesMsg = `*${botName} - Bot Rules* 📜\n\n` +
        `1. *No Spam:* Do not spam commands or messages.\n` +
        `2. *Respectful Usage:* Be respectful when using the bot.\n` +
        `3. *No Abuse:* Do not use the bot for harmful purposes.\n` +
        `4. *Privacy:* Respect others' privacy at all times.\n` +
        `5. *Report Bugs:* Report any bugs using ${prefix}feedback.\n` +
        `6. *TOS Compliance:* Usage must comply with WhatsApp's Terms of Service.\n` +
        `7. *No Illegal Content:* Do not request or share illegal content.\n` +
        `8. *No NSFW:* No adult or inappropriate content requests.\n` +
        `9. *Data Usage:* We don't store your messages or data.\n` +
        `10. *Fair Use:* Use commands reasonably to prevent rate limits.\n\n` +

        `Violation of these rules may result in being blocked from using the bot.\n` +
        `For any questions, contact the bot owner using ${prefix}owner.`;

      await Matrix.sendMessage(m.from, {
        text: rulesMsg,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });
      break;
    }

    case 'privacy': {
      const privacyMsg = `*${botName} - Privacy Policy* 🔒\n\n` +
        `*Data Collection:*\n` +
        `• We do not store your messages.\n` +
        `• User IDs are temporarily cached for command cooldowns.\n` +
        `• Usage statistics are anonymized.\n\n` +

        `*Data Sharing:*\n` +
        `• We do not share any user data with third parties.\n` +
        `• Feedback is only visible to the bot owner.\n\n` +

        `*Third-Party Services:*\n` +
        `• Some commands may use external APIs.\n` +
        `• Please refer to their respective privacy policies.\n\n` +

        `*Data Security:*\n` +
        `• We implement reasonable security measures.\n` +
        `• WhatsApp's end-to-end encryption secures your messages.\n\n` +

        `*Changes:*\n` +
        `• This policy may be updated occasionally.\n` +
        `• Significant changes will be announced.\n\n` +

        `For questions about this policy, please contact the bot owner using ${prefix}owner.`;

      await Matrix.sendMessage(m.from, {
        text: privacyMsg,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });
      break;
    }

    case 'terms': {
      const termsMsg = `*${botName} - Terms of Service* 📋\n\n` +
        `*Acceptance:*\n` +
        `By using this bot, you agree to these terms.\n\n` +

        `*Use License:*\n` +
        `• The bot is provided "as is" without warranties.\n` +
        `• You may not reverse engineer or modify the bot.\n\n` +

        `*Limitations:*\n` +
        `• The bot may be unavailable sometimes for maintenance.\n` +
        `• We reserve the right to modify or discontinue services.\n\n` +

        `*User Obligations:*\n` +
        `• Follow the bot rules (${prefix}rules).\n` +
        `• Do not use the bot for illegal activities.\n\n` +

        `*Termination:*\n` +
        `• We may terminate access for rule violations.\n` +
        `• You may stop using the bot at any time.\n\n` +

        `*Liability:*\n` +
        `• We are not liable for damages from bot usage.\n\n` +

        `*Changes:*\n` +
        `• These terms may be updated occasionally.\n` +
        `• Continued use implies acceptance of changes.\n\n` +

        `For questions about these terms, contact the bot owner using ${prefix}owner.`;

      await Matrix.sendMessage(m.from, {
        text: termsMsg,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });
      break;
    }

    case 'dev': {
      const devInfoMsg = `*${botName} - Developer Info* 👨‍💻\n\n` +
        `*Name:* ${ownerName}\n` +
        `*Contact:* @${botNumber}\n\n` +

        `*Social Media:*\n` +
        `*GitHub:* github.com/efkidgamerdev\n` +
        `*Instagram:* efkidgamer\n` +
        `*Facebook:* facebook.com/efkidtrapgamer\n\n` +

        `*Bot Projects:*\n` +
        `• EF-PRIME-MD (WhatsApp Bot)\n` +
        `• Other projects available on GitHub\n\n` +

        `Feel free to follow or reach out for collaborations!`;

      await Matrix.sendMessage(m.from, {
        text: devInfoMsg,
        contextInfo: {
          mentionedJid: [`${botNumber}@s.whatsapp.net`],
          externalAdReply: {
            title: "Developer Profile",
            body: "Check out more projects",
            sourceUrl: "https://github.com/efkidgamerdev",
            mediaType: 1,
          },
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "EF-PRIME",
            serverMessageId: 143
          }
        }
      }, { quoted: m });
      break;
    }
  }
};

export default generalCommands;