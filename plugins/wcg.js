import config from '../config.cjs';

// Object to store active games with state information
const activeGames = {};

const wordChainGame = async (m, gss) => {
  try {
    const prefix = config.PREFIX || '/';
    
    // Check if this is a game command
    if (m.body?.toLowerCase().startsWith(prefix + 'wcg') || m.body?.toLowerCase().startsWith(prefix + 'wordchain')) {
      console.log('[GAME] Starting Word Chain Game');
      
      // Initial starter words
      const starterWords = [
        'apple', 'banana', 'computer', 'dolphin', 'elephant', 
        'football', 'guitar', 'horizon', 'internet', 'jungle',
        'kitchen', 'lemon', 'mountain', 'notebook', 'orange'
      ];
      
      // Registration phase message
      const registrationMsg = await gss.sendMessage(m.from, {
        text: `🎮 *WORD CHAIN GAME - REGISTRATION* 🎮\n\n` +
             `⟡─────────────────⟡\n` +
             `Reply to this message with *join* to enter the game!\n` +
             `Registration is open for 30 seconds.\n\n` +
             `Once registered, players will take turns continuing the word chain.\n` +
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
      
      // Store the game data for registration phase
      activeGames[m.from] = {
        phase: 'registration',
        registrationMessageId: registrationMsg.key.id,
        players: [],
        playerNames: [],
        botNumber: botNumber,
        botNumberWithoutDevice: botNumberWithoutDevice
      };
      
      // Setup registration listener
      const registrationListener = async (event) => {
        try {
          const receivedMessage = event.messages[0];
          if (!receivedMessage) return;
          
          // Get game data
          const gameData = activeGames[m.from];
          if (!gameData || gameData.phase !== 'registration') return;
          
          // Check if this is a response in the same chat
          if (receivedMessage.key.remoteJid !== m.from) return;
          
          // Get sender info
          const sender = receivedMessage.key.participant || receivedMessage.key.remoteJid;
          const senderWithoutDevice = sender ? sender.split(':')[0] : '';
          const senderName = sender.split('@')[0];
          
          // Ignore bot's own messages
          if (sender === gameData.botNumber || 
              senderWithoutDevice === gameData.botNumberWithoutDevice) {
            return;
          }
          
          // Check if this is a reply to our registration message
          const quotedMsg = receivedMessage.message?.extendedTextMessage?.contextInfo;
          const quotedId = quotedMsg?.stanzaId;
          
          // Only process if it's a reply to our registration message
          if (!quotedId || quotedId !== gameData.registrationMessageId) {
            return;
          }
          
          const messageText = receivedMessage.message?.conversation || 
                            receivedMessage.message?.extendedTextMessage?.text || "";
          
          // Check if the message is "join"
          if (messageText.trim().toLowerCase() === 'join') {
            // Check if player is already registered
            if (gameData.players.includes(sender)) {
              await gss.sendMessage(m.from, {
                text: `@${senderName}, you are already registered for the game!`,
                contextInfo: {
                  mentionedJid: [sender],
                  forwardingScore: 999,
                  isForwarded: true
                }
              }, { quoted: receivedMessage });
              return;
            }
            
            // Add player to the game
            gameData.players.push(sender);
            gameData.playerNames.push(senderName);
            
            await gss.sendMessage(m.from, {
              text: `✅ @${senderName} has joined the Word Chain Game! (${gameData.players.length} players)`,
              contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
              }
            });
          }
        } catch (error) {
          console.error('[GAME REGISTRATION ERROR]', error);
        }
      };
      
      // Register the registration listener
      gss.ev.on('messages.upsert', registrationListener);
      
      // Set a timeout to end registration and start the game
      setTimeout(() => {
        const gameData = activeGames[m.from];
        if (gameData && gameData.phase === 'registration') {
          // Remove registration listener
          gss.ev.off('messages.upsert', registrationListener);
          
          // Check if we have enough players
          if (gameData.players.length < 2) {
            gss.sendMessage(m.from, {
              text: `🎮 *WORD CHAIN GAME* 🎮\n\n` +
                   `⟡─────────────────⟡\n` +
                   `Not enough players joined (${gameData.players.length}/2).\n` +
                   `Game canceled. Try again later!\n` +
                   `⟡─────────────────⟡\n\n` +
                   `> E F P R I M E I N C`,
              contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: '120363419090892208@newsletter',
                  newsletterName: "E F P R I M E I N C",
                  serverMessageId: 144,
                },
              }
            });
            
            delete activeGames[m.from];
            return;
          }
          
          // Choose random starter word
          const starterWord = starterWords[Math.floor(Math.random() * starterWords.length)];
          const lastLetter = starterWord.charAt(starterWord.length - 1);
          console.log(`[GAME] Starter word: ${starterWord}, last letter: ${lastLetter}`);
          
          // Update game data for main phase
          gameData.phase = 'playing';
          gameData.currentWord = starterWord;
          gameData.currentLetter = lastLetter;
          gameData.startTime = Date.now();
          gameData.currentPlayerIndex = 0;
          gameData.currentPlayer = gameData.players[0];
          gameData.round = 1;
          gameData.scores = {};
          gameData.history = [starterWord];
          
          // Initialize scores for all players
          for (const player of gameData.players) {
            gameData.scores[player] = 0;
          }
          
          // Send game start message
          const playerMentions = gameData.players.map(player => `@${player.split('@')[0]}`).join(', ');
          const nextPlayerName = gameData.playerNames[0];
          
          const gameStartMsg = gss.sendMessage(m.from, {
            text: `🎮 *WORD CHAIN GAME STARTED* 🎮\n\n` +
                 `⟡─────────────────⟡\n` +
                 `Players: ${playerMentions}\n\n` +
                 `Starting word: *${starterWord}*\n` +
                 `Next player: @${nextPlayerName}\n\n` +
                 `Reply with a word that starts with the letter *${lastLetter.toUpperCase()}*\n` +
                 `⏱️ You have 30 seconds for your turn!\n` +
                 `⟡─────────────────⟡\n\n` +
                 `> E F P R I M E I N C`,
            contextInfo: {
              mentionedJid: gameData.players,
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363419090892208@newsletter',
                newsletterName: "E F P R I M E I N C",
                serverMessageId: 144,
              },
            }
          }).then(msg => {
            gameData.lastMessageId = msg.key.id;
          });
          
          // Setup game listener
          const gameListener = async (event) => {
            try {
              const receivedMessage = event.messages[0];
              if (!receivedMessage) return;
              
              // Get game data
              const gameData = activeGames[m.from];
              if (!gameData || gameData.phase !== 'playing') return;
              
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
              const quotedId = quotedMsg?.stanzaId;
              
              // Only process if it's a reply to our last game message
              if (!quotedId || quotedId !== gameData.lastMessageId) {
                return;
              }
              
              // Check if it's the turn of the correct player
              if (sender !== gameData.currentPlayer) {
                const currentPlayerName = gameData.playerNames[gameData.currentPlayerIndex];
                await gss.sendMessage(m.from, {
                  text: `❌ It's not your turn! It's @${currentPlayerName}'s turn.`,
                  contextInfo: {
                    mentionedJid: [gameData.currentPlayer],
                    forwardingScore: 999,
                    isForwarded: true
                  }
                }, { quoted: receivedMessage });
                return;
              }
              
              const messageText = receivedMessage.message?.conversation || 
                                receivedMessage.message?.extendedTextMessage?.text || "";
              
              // Extract the first word from the message
              const submittedWord = messageText.trim().toLowerCase().split(/\s+/)[0];
              
              // Check if the word starts with the correct letter
              if (submittedWord.charAt(0) === gameData.currentLetter) {
                // Check if the word has been used before
                if (gameData.history.includes(submittedWord)) {
                  await gss.sendMessage(m.from, {
                    text: `❌ The word "${submittedWord}" has already been used! Try again with a different word starting with "${gameData.currentLetter.toUpperCase()}"`,
                    contextInfo: {
                      mentionedJid: [sender],
                      forwardingScore: 999,
                      isForwarded: true
                    }
                  }, { quoted: receivedMessage });
                  return;
                }
                
                // Word is valid - update game state
                const newLastLetter = submittedWord.charAt(submittedWord.length - 1);
                gameData.history.push(submittedWord);
                gameData.currentWord = submittedWord;
                gameData.currentLetter = newLastLetter;
                gameData.scores[sender]++;
                
                // Move to next player
                gameData.currentPlayerIndex = (gameData.currentPlayerIndex + 1) % gameData.players.length;
                gameData.currentPlayer = gameData.players[gameData.currentPlayerIndex];
                const nextPlayerName = gameData.playerNames[gameData.currentPlayerIndex];
                gameData.round++;
                
                // Send confirmation message
                const sentMsg = await gss.sendMessage(m.from, {
                  text: `🎮 *WORD CHAIN GAME* 🎮\n\n` +
                       `⟡─────────────────⟡\n` +
                       `✅ Word played: *${submittedWord}*\n\n` +
                       `Next player: @${nextPlayerName}\n` +
                       `You must use a word that starts with *${newLastLetter.toUpperCase()}*\n` +
                       `Round: ${gameData.round} | Words used: ${gameData.history.length}\n` +
                       `⏱️ 30 seconds for your turn!\n` +
                       `⟡─────────────────⟡\n\n` +
                       `> E F P R I M E I N C`,
                  contextInfo: {
                    mentionedJid: [gameData.currentPlayer],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                      newsletterJid: '120363419090892208@newsletter',
                      newsletterName: "E F P R I M E I N C",
                      serverMessageId: 144,
                    },
                  }
                });
                
                // Update last message ID for tracking replies
                gameData.lastMessageId = sentMsg.key.id;
                
                // Reset the turn timer
                clearTimeout(gameData.timeout);
                
                // Set a new timeout for the next turn
                gameData.timeout = setTimeout(() => {
                  if (activeGames[m.from]?.phase === 'playing') {
                    const currentPlayerName = gameData.playerNames[gameData.currentPlayerIndex];
                    
                    // Generate leaderboard
                    let leaderboard = "";
                    const sortedPlayers = Object.entries(gameData.scores)
                      .map(([player, score]) => {
                        const playerName = gameData.players.indexOf(player);
                        return [player, gameData.playerNames[playerName], score];
                      })
                      .sort((a, b) => b[2] - a[2]);
                    
                    sortedPlayers.forEach(([player, name, score], index) => {
                      leaderboard += `${index + 1}. @${name}: ${score} points\n`;
                    });
                    
                    // Game ended - current player didn't respond in time
                    gss.sendMessage(m.from, {
                      text: `🎮 *WORD CHAIN GAME OVER* 🎮\n\n` +
                           `⟡─────────────────⟡\n` +
                           `⏱️ Time's up! @${currentPlayerName} didn't respond in time.\n` +
                           `Last word: *${gameData.currentWord}*\n` +
                           `Game lasted ${gameData.round - 1} rounds!\n\n` +
                           `📊 LEADERBOARD:\n${leaderboard}\n` +
                           `⟡─────────────────⟡\n\n` +
                           `> E F P R I M E I N C`,
                      contextInfo: {
                        mentionedJid: gameData.players,
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
                    clearTimeout(gameData.timeout);
                    gss.ev.off('messages.upsert', gameListener);
                    delete activeGames[m.from];
                  }
                }, 30000);
                
              } else {
                // Wrong starting letter
                await gss.sendMessage(m.from, {
                  text: `❌ Your word "${submittedWord}" doesn't start with the letter "${gameData.currentLetter.toUpperCase()}"! Try again.`,
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
          
          // Register the game listener
          gss.ev.on('messages.upsert', gameListener);
          
          // Set a timeout for the first turn
          gameData.timeout = setTimeout(() => {
            if (activeGames[m.from]?.phase === 'playing' && activeGames[m.from]?.round === 1) {
              const currentPlayerName = gameData.playerNames[gameData.currentPlayerIndex];
              
              gss.sendMessage(m.from, {
                text: `🎮 *WORD CHAIN GAME OVER* 🎮\n\n` +
                     `⟡─────────────────⟡\n` +
                     `⏱️ Time's up! @${currentPlayerName} didn't respond in time.\n` +
                     `Starting word was: *${gameData.currentWord}*\n` +
                     `Game ended without any valid plays.\n` +
                     `⟡─────────────────⟡\n\n` +
                     `> E F P R I M E I N C`,
                contextInfo: {
                  mentionedJid: gameData.players,
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
              gss.ev.off('messages.upsert', gameListener);
              clearTimeout(activeGames[m.from].timeout);
              delete activeGames[m.from];
            }
          }, 30000);
        }
      }, 30000); // 30 seconds for registration
    }
    
  } catch (error) {
    console.error('[GAME ERROR]', error);
    m.reply('❌ *An error occurred while processing the game.*');
  }
};

export default wordChainGame;