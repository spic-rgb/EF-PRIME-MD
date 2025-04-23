import config from '../config.cjs';

// List of emojis for the game
const emojiList = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', 
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓'
];

// Object to store active games with more detailed information
const activeGames = {};

const findEmojiGame = async (m, gss) => {
  try {
    const prefix = config.PREFIX || '/';
    
    // Check if this is a game command
    if (m.body?.toLowerCase().startsWith(prefix + 'findemoji')) {
      console.log('[GAME] Starting Find Emoji game');
      
      // Choose random emoji
      const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
      console.log(`[GAME] Selected emoji: ${randomEmoji}`);
      
      // Send the game message
      const sentMsg = await gss.sendMessage(m.from, {
        text: `🎮 *FIND THE EMOJI GAME* 🎮\n\n` +
             `⟡─────────────────⟡\n` +
             `Find and send this emoji as a *reply* to this message: ${randomEmoji}\n` +
             `⏱️ You have 30 seconds!\n` +
             `⟡─────────────────⟡\n\n` +
             `> E F P R I M E I N C`,
        contextInfo: {
          mentionedJid: [m.sender],
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363419090892208@newsletter',
            newsletterName: "E F P R I M E I N C",
            serverMessageId: 144,
          },
        }
      }, { quoted: m });
      
      // Get bot's own JID for self-check
      const botNumber = gss.user.id;
      const botNumberWithoutDevice = botNumber.split(':')[0];
      
      // Store the game data
      activeGames[m.from] = {
        emoji: randomEmoji,
        startTime: Date.now(),
        messageId: sentMsg.key.id,
        botNumber: botNumber,
        botNumberWithoutDevice: botNumberWithoutDevice
      };
      
      // Setup message listener for this game
      const gameListener = async (event) => {
        try {
          const receivedMessage = event.messages[0];
          if (!receivedMessage) return;
          
          // Get game data
          const gameData = activeGames[m.from];
          if (!gameData) return; // Game no longer active
          
          // Check if this is a response in the same chat
          if (receivedMessage.key.remoteJid !== m.from) return;
          
          // Get sender info
          const sender = receivedMessage.key.participant || receivedMessage.key.remoteJid;
          const senderWithoutDevice = sender ? sender.split(':')[0] : '';
          
          // Ignore bot's own messages
          if (sender === gameData.botNumber || 
              senderWithoutDevice === gameData.botNumberWithoutDevice) {
            return;
          }
          
          // Check if this is a reply to our game message
          const quotedMsg = receivedMessage.message?.extendedTextMessage?.contextInfo;
          const quotedStanzaId = quotedMsg?.stanzaId;
          
          // Only process if it's a reply to our specific game message
          if (!quotedStanzaId || quotedStanzaId !== gameData.messageId) {
            console.log('[GAME] Ignored: Not a reply to game message');
            return;
          }
          
          const messageText = receivedMessage.message?.conversation || 
                              receivedMessage.message?.extendedTextMessage?.text || "";
          
          console.log(`[GAME] Received reply: "${messageText}" from ${sender}, looking for: ${gameData.emoji}`);
          
          // Check if message contains the correct emoji
          if (messageText.includes(gameData.emoji)) {
            const timeTaken = ((Date.now() - gameData.startTime) / 1000).toFixed(2);
            
            // Announce the winner
            await gss.sendMessage(m.from, {
              text: `🎮 *FIND THE EMOJI GAME* 🎮\n\n` +
                 `⟡─────────────────⟡\n` +
                 `🎉 CONGRATULATIONS! 🎉\n` +
                 `@${sender.split('@')[0]} found the emoji ${gameData.emoji} correctly!\n` +
                 `⏱️ Time: ${timeTaken} seconds\n` +
                 `⟡─────────────────⟡\n\n` +
                 `> E F P R I M E I N C`,
              contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: '120363419090892208@newsletter',
                  newsletterName: "E F P R I M E I N C",
                  serverMessageId: 144,
                },
              }
            });
            
            // End the game
            delete activeGames[m.from];
            gss.ev.off('messages.upsert', gameListener);
          } else {
            // Wrong emoji, but was a reply to our message
            await gss.sendMessage(m.from, {
              text: `Try again! That's not the correct emoji. You need to find: ${gameData.emoji}`,
              contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
              }
            }, { quoted: receivedMessage });
          }
        } catch (error) {
          console.error('[GAME LISTENER ERROR]', error);
        }
      };
      
      // Register the listener
      gss.ev.on('messages.upsert', gameListener);
      
      // Set a timeout to end the game
      setTimeout(() => {
        const gameData = activeGames[m.from];
        if (gameData && gameData.emoji === randomEmoji) {
          gss.sendMessage(m.from, {
            text: `🎮 *FIND THE EMOJI GAME* 🎮\n\n` +
                 `⟡─────────────────⟡\n` +
                 `⏱️ Time's up! Nobody found the emoji ${randomEmoji}.\n` +
                 `Better luck next time!\n` +
                 `⟡─────────────────⟡\n\n` +
                 `> E F P R I M E I N C`,
            contextInfo: {
              mentionedJid: [m.sender],
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363419090892208@newsletter',
                newsletterName: "E F P R I M E I N C",
                serverMessageId: 144,
              },
            }
          });
          
          // Remove listener when game ends
          gss.ev.off('messages.upsert', gameListener);
          delete activeGames[m.from];
        }
      }, 30000);
    }
    
  } catch (error) {
    console.error('[GAME ERROR]', error);
    m.reply('❌ *An error occurred while processing the game.*');
  }
};

export default findEmojiGame;