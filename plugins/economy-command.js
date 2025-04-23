import config from '../config.cjs';
import fs from 'fs/promises';
import path from 'path';

// Database path
const DB_DIR = './database';
const ECONOMY_DB = path.join(DB_DIR, 'economy.json');

// Default cooldown times in milliseconds
const COOLDOWNS = {
  daily: 24 * 60 * 60 * 1000,   // 24 hours
  weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
  monthly: 30 * 24 * 60 * 60 * 1000, // 30 days
  work: 1 * 60 * 60 * 1000,     // 1 hour
  crime: 2 * 60 * 60 * 1000,    // 2 hours
  rob: 3 * 60 * 60 * 1000,      // 3 hours
  mine: 30 * 60 * 1000,         // 30 minutes
  fish: 20 * 60 * 1000,         // 20 minutes
  hunt: 25 * 60 * 1000,         // 25 minutes
  chop: 15 * 60 * 1000,         // 15 minutes
  farm: 40 * 60 * 1000          // 40 minutes
};

// Job options with min and max earning potential
const JOBS = {
  work: { min: 100, max: 500, message: "You worked hard and earned" },
  crime: { min: 200, max: 1000, failChance: 0.3, fine: { min: 100, max: 300 }, message: "You committed a crime and got" },
  mine: { min: 50, max: 300, message: "You went mining and collected minerals worth" },
  fish: { min: 30, max: 200, message: "You went fishing and caught fish worth" },
  hunt: { min: 40, max: 250, message: "You went hunting and got animals worth" },
  chop: { min: 20, max: 150, message: "You chopped trees and got wood worth" },
  farm: { min: 60, max: 350, message: "You harvested your farm and sold produce for" }
};

// Load economy database
const loadEconomyDB = async () => {
  try {
    // Ensure database directory exists
    await fs.mkdir(DB_DIR, { recursive: true });
    
    // Try to read the database file
    const data = await fs.readFile(ECONOMY_DB, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Return empty object if file doesn't exist or has invalid JSON
    return {};
  }
};

// Save economy database
const saveEconomyDB = async (data) => {
  try {
    await fs.writeFile(ECONOMY_DB, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving economy database:', error);
    return false;
  }
};

// Get or create user's economic data
const getUserEconomy = async (userId) => {
  const db = await loadEconomyDB();
  
  if (!db[userId]) {
    db[userId] = {
      wallet: 0,
      bank: 0,
      lastDaily: 0,
      lastWeekly: 0,
      lastMonthly: 0,
      lastJob: {},
      inventory: []
    };
    await saveEconomyDB(db);
  }
  
  return db;
};

// Update user's economic data
const updateUserEconomy = async (userId, userData) => {
  const db = await loadEconomyDB();
  db[userId] = userData;
  return await saveEconomyDB(db);
};

// Format number with commas
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Get random amount between min and max
const getRandomAmount = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Check if a cooldown has passed
const isCooldownOver = (lastTime, cooldownTime) => {
  return Date.now() - lastTime >= cooldownTime;
};

// Format remaining cooldown time
const formatCooldown = (remainingMs) => {
  const seconds = Math.floor((remainingMs / 1000) % 60);
  const minutes = Math.floor((remainingMs / (1000 * 60)) % 60);
  const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  
  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  if (seconds > 0 || result === '') result += `${seconds}s`;
  
  return result;
};

// Common message options with forwarded newsletter info
const getMessageOptions = (m) => {
  return {
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
  };
};

const economy = async (m, Matrix) => {
  const prefix = config.PREFIX;
  
  // Check if message starts with prefix
  if (!m.body.startsWith(prefix)) return;
  
  // Parse command and arguments
  const fullCmd = m.body.slice(prefix.length).trim().toLowerCase();
  const [cmd, ...args] = fullCmd.split(' ');
  
  // Get user's economic data
  const userId = m.sender;
  const db = await getUserEconomy(userId);
  const user = db[userId];
  
  // Process economy commands
  switch (cmd) {
    case 'daily':
      // Daily reward command
      if (isCooldownOver(user.lastDaily, COOLDOWNS.daily)) {
        const reward = 1000;
        user.wallet += reward;
        user.lastDaily = Date.now();
        
        await updateUserEconomy(userId, user);
        
        await Matrix.sendMessage(m.from, {
          text: `💰 *Daily Reward*\n\nYou've claimed your daily reward of ${formatNumber(reward)} coins!\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
          contextInfo: { 
            mentionedJid: [userId],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363419090892208@newsletter',
              newsletterName: "EF-PRIME",
              serverMessageId: 143
            }
          }
        }, { quoted: m });
      } else {
        const remaining = user.lastDaily + COOLDOWNS.daily - Date.now();
        await Matrix.sendMessage(m.from, {
          text: `⏳ *Daily Reward Cooldown*\n\nYou've already claimed your daily reward. Please wait ${formatCooldown(remaining)} before claiming again.`,
          ...getMessageOptions(m)
        }, { quoted: m });
      }
      break;
      
    case 'weekly':
      // Weekly reward command
      if (isCooldownOver(user.lastWeekly, COOLDOWNS.weekly)) {
        const reward = 5000;
        user.wallet += reward;
        user.lastWeekly = Date.now();
        
        await updateUserEconomy(userId, user);
        
        await Matrix.sendMessage(m.from, {
          text: `💰 *Weekly Reward*\n\nYou've claimed your weekly reward of ${formatNumber(reward)} coins!\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
          ...getMessageOptions(m)
        }, { quoted: m });
      } else {
        const remaining = user.lastWeekly + COOLDOWNS.weekly - Date.now();
        await Matrix.sendMessage(m.from, {
          text: `⏳ *Weekly Reward Cooldown*\n\nYou've already claimed your weekly reward. Please wait ${formatCooldown(remaining)} before claiming again.`,
          ...getMessageOptions(m)
        }, { quoted: m });
      }
      break;
      
    case 'monthly':
      // Monthly reward command
      if (isCooldownOver(user.lastMonthly, COOLDOWNS.monthly)) {
        const reward = 20000;
        user.wallet += reward;
        user.lastMonthly = Date.now();
        
        await updateUserEconomy(userId, user);
        
        await Matrix.sendMessage(m.from, {
          text: `💰 *Monthly Reward*\n\nYou've claimed your monthly reward of ${formatNumber(reward)} coins!\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
          ...getMessageOptions(m)
        }, { quoted: m });
      } else {
        const remaining = user.lastMonthly + COOLDOWNS.monthly - Date.now();
        await Matrix.sendMessage(m.from, {
          text: `⏳ *Monthly Reward Cooldown*\n\nYou've already claimed your monthly reward. Please wait ${formatCooldown(remaining)} before claiming again.`,
          ...getMessageOptions(m)
        }, { quoted: m });
      }
      break;
      
    case 'work':
    case 'mine':
    case 'fish':
    case 'hunt':
    case 'chop':
    case 'farm':
    case 'crime':
      // Job commands
      const job = cmd;
      const jobInfo = JOBS[job];
      
      if (!user.lastJob[job] || isCooldownOver(user.lastJob[job], COOLDOWNS[job])) {
        // Check if crime is successful (only for crime job)
        if (job === 'crime' && Math.random() < jobInfo.failChance) {
          // Crime failed, apply fine
          const fine = getRandomAmount(jobInfo.fine.min, jobInfo.fine.max);
          user.wallet = Math.max(0, user.wallet - fine); // Ensure wallet doesn't go below 0
          user.lastJob[job] = Date.now();
          
          await updateUserEconomy(userId, user);
          
          await Matrix.sendMessage(m.from, {
            text: `🚨 *Crime Failed*\n\nYou were caught by the police and had to pay a fine of ${formatNumber(fine)} coins!\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
            ...getMessageOptions(m)
          }, { quoted: m });
        } else {
          // Job successful
          const earnings = getRandomAmount(jobInfo.min, jobInfo.max);
          user.wallet += earnings;
          user.lastJob[job] = Date.now();
          
          await updateUserEconomy(userId, user);
          
          await Matrix.sendMessage(m.from, {
            text: `💼 *${job.charAt(0).toUpperCase() + job.slice(1)}*\n\n${jobInfo.message} ${formatNumber(earnings)} coins!\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
            ...getMessageOptions(m)
          }, { quoted: m });
        }
      } else {
        const remaining = user.lastJob[job] + COOLDOWNS[job] - Date.now();
        await Matrix.sendMessage(m.from, {
          text: `⏳ *${job.charAt(0).toUpperCase() + job.slice(1)} Cooldown*\n\nYou're still tired from your last job. Please wait ${formatCooldown(remaining)} before working again.`,
          ...getMessageOptions(m)
        }, { quoted: m });
      }
      break;
      
    case 'balance':
    case 'wallet':
    case 'bank':
      // Balance command
      await Matrix.sendMessage(m.from, {
        text: `💰 *Balance Information*\n\n👤 User: @${userId.split('@')[0]}\n💵 Wallet: ${formatNumber(user.wallet)} coins\n🏦 Bank: ${formatNumber(user.bank)} coins\n💎 Total: ${formatNumber(user.wallet + user.bank)} coins`,
        ...getMessageOptions(m)
      }, { quoted: m });
      break;
      
    case 'deposit':
    case 'dep':
      // Deposit command
      const depositAmount = args[0]?.toLowerCase() === 'all' 
        ? user.wallet 
        : Math.min(parseInt(args[0]) || 0, user.wallet);
      
      if (isNaN(depositAmount) || depositAmount <= 0) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Amount*\n\nPlease specify a valid amount to deposit.\nExample: ${prefix}deposit 1000 or ${prefix}deposit all`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      if (depositAmount > user.wallet) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Insufficient Funds*\n\nYou don't have enough coins in your wallet.\nYour wallet balance: ${formatNumber(user.wallet)} coins`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      user.wallet -= depositAmount;
      user.bank += depositAmount;
      
      await updateUserEconomy(userId, user);
      
      await Matrix.sendMessage(m.from, {
        text: `🏦 *Deposit Successful*\n\nYou've deposited ${formatNumber(depositAmount)} coins into your bank account.\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
        ...getMessageOptions(m)
      }, { quoted: m });
      break;
      
    case 'withdraw':
    case 'with':
      // Withdraw command
      const withdrawAmount = args[0]?.toLowerCase() === 'all' 
        ? user.bank 
        : Math.min(parseInt(args[0]) || 0, user.bank);
      
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Amount*\n\nPlease specify a valid amount to withdraw.\nExample: ${prefix}withdraw 1000 or ${prefix}withdraw all`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      if (withdrawAmount > user.bank) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Insufficient Funds*\n\nYou don't have enough coins in your bank.\nYour bank balance: ${formatNumber(user.bank)} coins`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      user.bank -= withdrawAmount;
      user.wallet += withdrawAmount;
      
      await updateUserEconomy(userId, user);
      
      await Matrix.sendMessage(m.from, {
        text: `💵 *Withdrawal Successful*\n\nYou've withdrawn ${formatNumber(withdrawAmount)} coins from your bank account.\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
        ...getMessageOptions(m)
      }, { quoted: m });
      break;
      
    case 'rob':
      // Rob command
      if (!args[0]) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *No Target*\n\nPlease mention a user to rob.\nExample: ${prefix}rob @user`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      const targetId = args[0].includes('@') 
        ? args[0].replace('@', '').replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        : (m.mentionedJid && m.mentionedJid[0]);
      
      if (!targetId) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Target*\n\nPlease mention a valid user to rob.\nExample: ${prefix}rob @user`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      if (targetId === userId) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Target*\n\nYou cannot rob yourself!`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      if (!user.lastJob.rob || isCooldownOver(user.lastJob.rob, COOLDOWNS.rob)) {
        // Load target's economy data
        await getUserEconomy(targetId);
        const targetUser = db[targetId];
        
        if (!targetUser || targetUser.wallet < 100) {
          await Matrix.sendMessage(m.from, {
            text: `❌ *Poor Target*\n\nThis user doesn't have enough coins to rob! Find someone richer.`,
            ...getMessageOptions(m)
          }, { quoted: m });
          return;
        }
        
        // 60% chance to fail
        if (Math.random() < 0.6) {
          // Rob failed, apply fine
          const fine = getRandomAmount(100, 300);
          user.wallet = Math.max(0, user.wallet - fine); // Ensure wallet doesn't go below 0
          user.lastJob.rob = Date.now();
          
          await updateUserEconomy(userId, user);
          
          await Matrix.sendMessage(m.from, {
            text: `🚨 *Rob Failed*\n\nYou were caught trying to rob @${targetId.split('@')[0]} and had to pay a fine of ${formatNumber(fine)} coins!\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
            contextInfo: { 
              mentionedJid: [userId, targetId],
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363419090892208@newsletter',
                newsletterName: "EF-PRIME",
                serverMessageId: 143
              }
            }
          }, { quoted: m });
        } else {
          // Rob successful
          const stolenAmount = Math.floor(targetUser.wallet * 0.3); // Steal 30% of target's wallet
          
          targetUser.wallet -= stolenAmount;
          user.wallet += stolenAmount;
          user.lastJob.rob = Date.now();
          
          await updateUserEconomy(userId, user);
          await updateUserEconomy(targetId, targetUser);
          
          await Matrix.sendMessage(m.from, {
            text: `💰 *Rob Successful*\n\nYou successfully robbed @${targetId.split('@')[0]} and got ${formatNumber(stolenAmount)} coins!\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
            contextInfo: { 
              mentionedJid: [userId, targetId],
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363419090892208@newsletter',
                newsletterName: "EF-PRIME",
                serverMessageId: 143
              }
            }
          }, { quoted: m });
        }
      } else {
        const remaining = user.lastJob.rob + COOLDOWNS.rob - Date.now();
        await Matrix.sendMessage(m.from, {
          text: `⏳ *Rob Cooldown*\n\nYou're still being watched by the police. Please wait ${formatCooldown(remaining)} before attempting to rob again.`,
          ...getMessageOptions(m)
        }, { quoted: m });
      }
      break;
      
    case 'pay':
    case 'transfer':
      // Transfer command
      if (!args[0] || !args[1]) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Command*\n\nPlease specify a user and amount to transfer.\nExample: ${prefix}pay @user 1000`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      const transferTargetId = args[0].includes('@') 
        ? args[0].replace('@', '').replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        : (m.mentionedJid && m.mentionedJid[0]);
      
      if (!transferTargetId) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Target*\n\nPlease mention a valid user to transfer to.\nExample: ${prefix}pay @user 1000`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      if (transferTargetId === userId) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Target*\n\nYou cannot transfer coins to yourself!`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      const transferAmount = parseInt(args[1]);
      
      if (isNaN(transferAmount) || transferAmount <= 0) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Amount*\n\nPlease specify a valid amount to transfer.\nExample: ${prefix}pay @user 1000`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      if (transferAmount > user.wallet) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Insufficient Funds*\n\nYou don't have enough coins in your wallet.\nYour wallet balance: ${formatNumber(user.wallet)} coins`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      // Load target's economy data
      await getUserEconomy(transferTargetId);
      const transferTargetUser = db[transferTargetId];
      
      user.wallet -= transferAmount;
      transferTargetUser.wallet += transferAmount;
      
      await updateUserEconomy(userId, user);
      await updateUserEconomy(transferTargetId, transferTargetUser);
      
      await Matrix.sendMessage(m.from, {
        text: `💸 *Transfer Successful*\n\nYou transferred ${formatNumber(transferAmount)} coins to @${transferTargetId.split('@')[0]}.\n\nYour wallet: ${formatNumber(user.wallet)} coins\nYour bank: ${formatNumber(user.bank)} coins`,
        contextInfo: { 
          mentionedJid: [userId, transferTargetId],
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
      
    case 'leaderboard':
    case 'lb':
      // Leaderboard command
      const allUsers = Object.entries(db).filter(([id]) => id !== 'undefined' && id.includes('@'));
      
      // Sort users by total wealth (wallet + bank)
      const sortedUsers = allUsers.sort((a, b) => 
        (b[1].wallet + b[1].bank) - (a[1].wallet + a[1].bank)
      ).slice(0, 10); // Get top 10
      
      let leaderboardText = `🏆 *Economy Leaderboard* 🏆\n\n`;
      
      for (let i = 0; i < sortedUsers.length; i++) {
        const [id, userData] = sortedUsers[i];
        const total = userData.wallet + userData.bank;
        leaderboardText += `${i + 1}. @${id.split('@')[0]} - ${formatNumber(total)} coins\n`;
      }
      
      // Find user's rank
      const userRank = allUsers.findIndex(([id]) => id === userId) + 1;
      
      leaderboardText += `\nYour rank: #${userRank} with ${formatNumber(user.wallet + user.bank)} coins`;
      
      await Matrix.sendMessage(m.from, {
        text: leaderboardText,
        contextInfo: { 
          mentionedJid: [userId, ...sortedUsers.map(([id]) => id)],
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
      
    case 'heist':
      // Heist command - group activity
      if (!m.isGroup) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Group Only*\n\nThe heist command can only be used in groups!`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      // Check if heist is currently active for this group
      if (!db.heists) db.heists = {};
      
      if (db.heists[m.from] && db.heists[m.from].active) {
        // Heist already active, join it
        if (db.heists[m.from].participants.includes(userId)) {
          await Matrix.sendMessage(m.from, {
            text: `❌ *Already Joined*\n\nYou've already joined the heist!`,
            ...getMessageOptions(m)
          }, { quoted: m });
          return;
        }
        
        // Join the heist
        db.heists[m.from].participants.push(userId);
        await saveEconomyDB(db);
        
        await Matrix.sendMessage(m.from, {
          text: `🔫 *Heist Joined*\n\n@${userId.split('@')[0]} has joined the heist!\n\nTotal participants: ${db.heists[m.from].participants.length}\nTime remaining: ${formatCooldown(db.heists[m.from].endTime - Date.now())}`,
          contextInfo: { 
            mentionedJid: [userId],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363419090892208@newsletter',
              newsletterName: "EF-PRIME",
              serverMessageId: 143
            }
          }
        }, { quoted: m });
      } else {
        // Start a new heist
        if (!user.lastJob.heist || isCooldownOver(user.lastJob.heist, COOLDOWNS.heist)) {
          // Minimum 100 coins to join heist
          if (user.wallet < 100) {
            await Matrix.sendMessage(m.from, {
              text: `❌ *Insufficient Funds*\n\nYou need at least 100 coins in your wallet to start a heist!`,
              ...getMessageOptions(m)
            }, { quoted: m });
            return;
          }
          
          // Create new heist
          db.heists[m.from] = {
            active: true,
            startTime: Date.now(),
            endTime: Date.now() + 60000, // 60 seconds to join
            participants: [userId]
          };
          
          await saveEconomyDB(db);
          
          await Matrix.sendMessage(m.from, {
            text: `🏦 *Heist Started*\n\n@${userId.split('@')[0]} is planning a heist on the city bank!\n\nJoin the heist by typing *${prefix}heist*\n\nYou have 60 seconds to join!`,
            contextInfo: { 
              mentionedJid: [userId],
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363419090892208@newsletter',
                newsletterName: "EF-PRIME",
                serverMessageId: 143
              }
            }
          }, { quoted: m });
          
          // Set timeout to execute heist
          setTimeout(async () => {
            try {
              // Reload DB to get latest participants
              const currentDb = await loadEconomyDB();
              const heist = currentDb.heists[m.from];
              
              if (heist && heist.active) {
                // Execute heist
                let resultText = `🏦 *Heist Results*\n\n`;
                
                if (heist.participants.length < 2) {
                  resultText += `The heist failed because not enough people joined!\n\n`;
                  
                  // Apply penalty to starter
                  const starter = heist.participants[0];
                  const starterData = currentDb[starter];
                  const penalty = Math.min(starterData.wallet, 100);
                  
                  starterData.wallet -= penalty;
                  starterData.lastJob.heist = Date.now();
                  
                  resultText += `@${starter.split('@')[0]} lost ${formatNumber(penalty)} coins while trying to escape!`;
                  
                  await updateUserEconomy(starter, starterData);
                } else {
                  // Heist with enough participants
                  const successChance = Math.min(0.7, 0.3 + (heist.participants.length * 0.05));
                  
                  if (Math.random() < successChance) {
                    // Successful heist
                    resultText += `The heist was successful! You broke into the bank vault!\n\n`;
                    
                    // Calculate rewards based on participants
                    const baseReward = 1000;
                    const participantBonus = heist.participants.length * 200;
                    const totalReward = baseReward + participantBonus;
                    const rewardPerPerson = Math.floor(totalReward / heist.participants.length);
                    
                    // Distribute rewards
                    for (const participant of heist.participants) {
                      const participantData = currentDb[participant];
                      participantData.wallet += rewardPerPerson;
                      participantData.lastJob.heist = Date.now();
                      
                      resultText += `@${participant.split('@')[0]} got ${formatNumber(rewardPerPerson)} coins!\n`;
                      
                      await updateUserEconomy(participant, participantData);
                    }// Distribute rewards
                    for (const participant of heist.participants) {
                      const participantData = currentDb[participant];
                      participantData.wallet += rewardPerPerson;
                      participantData.lastJob.heist = Date.now();
                      
                      resultText += `@${participant.split('@')[0]} got ${formatNumber(rewardPerPerson)} coins!\n`;
                      
                      await updateUserEconomy(participant, participantData);
                    }
                  } else {
                    // Failed heist
                    resultText += `The heist failed! The police caught you!\n\n`;
                    
                    // Apply penalties
                    for (const participant of heist.participants) {
                      const participantData = currentDb[participant];
                      const penalty = Math.floor(participantData.wallet * 0.2); // 20% of wallet
                      
                      participantData.wallet = Math.max(0, participantData.wallet - penalty);
                      participantData.lastJob.heist = Date.now();
                      
                      resultText += `@${participant.split('@')[0]} paid a fine of ${formatNumber(penalty)} coins!\n`;
                      
                      await updateUserEconomy(participant, participantData);
                    }
                  }
                }
                
                // End heist
                currentDb.heists[m.from].active = false;
                await saveEconomyDB(currentDb);
                
                // Send results
                await Matrix.sendMessage(m.from, {
                  text: resultText,
                  contextInfo: { 
                    mentionedJid: heist.participants,
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                      newsletterJid: '120363419090892208@newsletter',
                      newsletterName: "EF-PRIME",
                      serverMessageId: 143
                    }
                  }
                });
              }
            } catch (error) {
              console.error('Error executing heist:', error);
            }
          }, 60000); // 60 seconds
        } else {
          const remaining = user.lastJob.heist + COOLDOWNS.heist - Date.now();
          await Matrix.sendMessage(m.from, {
            text: `⏳ *Heist Cooldown*\n\nYou're still being watched by the police. Please wait ${formatCooldown(remaining)} before planning another heist.`,
            ...getMessageOptions(m)
          }, { quoted: m });
        }
      }
      break;
      
    case 'shop':
      // Shop command
      const shopItems = [
        { id: 'fishing_rod', name: '🎣 Fishing Rod', price: 2500, description: 'Increases fishing earnings by 20%' },
        { id: 'pickaxe', name: '⛏️ Pickaxe', price: 3000, description: 'Increases mining earnings by 20%' },
        { id: 'hunting_rifle', name: '🔫 Hunting Rifle', price: 5000, description: 'Increases hunting earnings by 25%' },
        { id: 'axe', name: '🪓 Axe', price: 2000, description: 'Increases chopping earnings by 15%' },
        { id: 'seeds', name: '🌱 Seeds', price: 1500, description: 'Increases farming earnings by 15%' },
        { id: 'laptop', name: '💻 Laptop', price: 10000, description: 'Increases work earnings by 30%' },
        { id: 'lockpick', name: '🔐 Lockpick', price: 7500, description: 'Increases crime success rate by 10%' },
        { id: 'mask', name: '🎭 Mask', price: 5000, description: 'Reduces rob cooldown by 20%' }
      ];
      
      let shopText = `🛒 *EF-PRIME Economy Shop* 🛒\n\n`;
      
      for (const item of shopItems) {
        shopText += `${item.name}\n`;
        shopText += `💰 Price: ${formatNumber(item.price)} coins\n`;
        shopText += `📝 Description: ${item.description}\n`;
        shopText += `🔑 ID: ${item.id}\n\n`;
      }
      
      shopText += `To buy an item, type *${prefix}buy <item_id>*\n`;
      shopText += `To view your inventory, type *${prefix}inventory*`;
      
      await Matrix.sendMessage(m.from, {
        text: shopText,
        ...getMessageOptions(m)
      }, { quoted: m });
      break;
      
    case 'buy':
      // Buy command
      if (!args[0]) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Command*\n\nPlease specify an item to buy.\nExample: ${prefix}buy fishing_rod\nView available items with ${prefix}shop`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      const itemId = args[0].toLowerCase();
      
      // Shop items definition
      const buyShopItems = [
        { id: 'fishing_rod', name: '🎣 Fishing Rod', price: 2500, description: 'Increases fishing earnings by 20%' },
        { id: 'pickaxe', name: '⛏️ Pickaxe', price: 3000, description: 'Increases mining earnings by 20%' },
        { id: 'hunting_rifle', name: '🔫 Hunting Rifle', price: 5000, description: 'Increases hunting earnings by 25%' },
        { id: 'axe', name: '🪓 Axe', price: 2000, description: 'Increases chopping earnings by 15%' },
        { id: 'seeds', name: '🌱 Seeds', price: 1500, description: 'Increases farming earnings by 15%' },
        { id: 'laptop', name: '💻 Laptop', price: 10000, description: 'Increases work earnings by 30%' },
        { id: 'lockpick', name: '🔐 Lockpick', price: 7500, description: 'Increases crime success rate by 10%' },
        { id: 'mask', name: '🎭 Mask', price: 5000, description: 'Reduces rob cooldown by 20%' }
      ];
      
      const item = buyShopItems.find(i => i.id === itemId);
      
      if (!item) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Item*\n\nThe item "${itemId}" does not exist in our shop.\nView available items with ${prefix}shop`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      if (user.wallet < item.price) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Insufficient Funds*\n\nYou need ${formatNumber(item.price)} coins to buy ${item.name}.\nYour wallet: ${formatNumber(user.wallet)} coins`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      // Initialize inventory if it doesn't exist
      if (!user.inventory) user.inventory = [];
      
      // Check if user already has this item
      const existingItem = user.inventory.find(i => i.id === item.id);
      
      if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
      } else {
        user.inventory.push({
          id: item.id,
          name: item.name,
          description: item.description,
          quantity: 1
        });
      }
      
      // Deduct price from wallet
      user.wallet -= item.price;
      
      await updateUserEconomy(userId, user);
      
      await Matrix.sendMessage(m.from, {
        text: `🛍️ *Purchase Successful*\n\nYou bought ${item.name} for ${formatNumber(item.price)} coins!\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
        ...getMessageOptions(m)
      }, { quoted: m });
      break;
      
    case 'inventory':
    case 'inv':
      // Inventory command
      if (!user.inventory || user.inventory.length === 0) {
        await Matrix.sendMessage(m.from, {
          text: `📦 *Inventory Empty*\n\nYou don't have any items in your inventory.\nBuy items from the shop with ${prefix}shop and ${prefix}buy commands.`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      let inventoryText = `📦 *Your Inventory* 📦\n\n`;
      
      for (const item of user.inventory) {
        inventoryText += `${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}\n`;
        inventoryText += `📝 ${item.description}\n\n`;
      }
      
      await Matrix.sendMessage(m.from, {
        text: inventoryText,
        ...getMessageOptions(m)
      }, { quoted: m });
      break;
      
    case 'use':
      // Use item command
      if (!args[0]) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Command*\n\nPlease specify an item to use.\nExample: ${prefix}use fishing_rod\nView your items with ${prefix}inventory`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      const useItemId = args[0].toLowerCase();
      
      // Check if user has this item
      if (!user.inventory || user.inventory.length === 0) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Inventory Empty*\n\nYou don't have any items in your inventory.`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      const useItem = user.inventory.find(i => i.id === useItemId);
      
      if (!useItem) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Item Not Found*\n\nYou don't have the item "${useItemId}" in your inventory.\nView your items with ${prefix}inventory`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      // Apply item effects (simplified version - in a real implementation you'd apply actual bonuses)
      await Matrix.sendMessage(m.from, {
        text: `🔧 *Item Used*\n\nYou used ${useItem.name}!\n\nThe item's effect is active and will apply to your next relevant activity.`,
        ...getMessageOptions(m)
      }, { quoted: m });
      break;
      
    case 'gamble':
    case 'bet':
      // Gambling command
      if (!args[0]) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Command*\n\nPlease specify an amount to gamble.\nExample: ${prefix}gamble 1000 or ${prefix}gamble all`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      const betAmount = args[0]?.toLowerCase() === 'all' 
        ? user.wallet 
        : Math.min(parseInt(args[0]) || 0, user.wallet);
      
      if (isNaN(betAmount) || betAmount <= 0) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Amount*\n\nPlease specify a valid amount to gamble.\nExample: ${prefix}gamble 1000 or ${prefix}gamble all`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      if (betAmount > user.wallet) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Insufficient Funds*\n\nYou don't have enough coins in your wallet.\nYour wallet balance: ${formatNumber(user.wallet)} coins`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      // 45% chance to win
      if (Math.random() < 0.45) {
        // Win
        const winnings = Math.floor(betAmount * 1.8); // 1.8x multiplier
        user.wallet = user.wallet - betAmount + winnings;
        
        await updateUserEconomy(userId, user);
        
        await Matrix.sendMessage(m.from, {
          text: `🎉 *Gambling Win*\n\nYou bet ${formatNumber(betAmount)} coins and won ${formatNumber(winnings)} coins!\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
          ...getMessageOptions(m)
        }, { quoted: m });
      } else {
        // Lose
        user.wallet -= betAmount;
        
        await updateUserEconomy(userId, user);
        
        await Matrix.sendMessage(m.from, {
          text: `😢 *Gambling Loss*\n\nYou bet ${formatNumber(betAmount)} coins and lost them all!\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
          ...getMessageOptions(m)
        }, { quoted: m });
      }
      break;
      
    case 'slots':
      // Slots command
      if (!args[0]) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Command*\n\nPlease specify an amount to bet on slots.\nExample: ${prefix}slots 1000 or ${prefix}slots all`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      const slotsBetAmount = args[0]?.toLowerCase() === 'all' 
        ? user.wallet 
        : Math.min(parseInt(args[0]) || 0, user.wallet);
      
      if (isNaN(slotsBetAmount) || slotsBetAmount <= 0) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Invalid Amount*\n\nPlease specify a valid amount to bet on slots.\nExample: ${prefix}slots 1000 or ${prefix}slots all`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      if (slotsBetAmount > user.wallet) {
        await Matrix.sendMessage(m.from, {
          text: `❌ *Insufficient Funds*\n\nYou don't have enough coins in your wallet.\nYour wallet balance: ${formatNumber(user.wallet)} coins`,
          ...getMessageOptions(m)
        }, { quoted: m });
        return;
      }
      
      // Slot machine symbols
      const symbols = ['🍒', '🍋', '🍇', '🍉', '💰', '💎', '7️⃣'];
      
      // Generate random slots
      const slot1 = symbols[Math.floor(Math.random() * symbols.length)];
      const slot2 = symbols[Math.floor(Math.random() * symbols.length)];
      const slot3 = symbols[Math.floor(Math.random() * symbols.length)];
      
      // Determine win/loss
      let winnings = 0;
      let resultMessage = '';
      
      if (slot1 === slot2 && slot2 === slot3) {
        // Jackpot - 3 matching symbols
        const multiplier = slot1 === '7️⃣' ? 10 : (slot1 === '💎' ? 7 : (slot1 === '💰' ? 5 : 3));
        winnings = Math.floor(slotsBetAmount * multiplier);
        resultMessage = `JACKPOT! 🎉 You won ${formatNumber(winnings)} coins!`;
      } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
        // Small win - 2 matching symbols
        winnings = Math.floor(slotsBetAmount * 1.5);
        resultMessage = `Small win! You got ${formatNumber(winnings)} coins!`;
      } else {
        // Loss - no matching symbols
        winnings = 0;
        resultMessage = `You lost ${formatNumber(slotsBetAmount)} coins!`;
      }
      
      // Update wallet
      user.wallet = user.wallet - slotsBetAmount + winnings;
      
      await updateUserEconomy(userId, user);
      
      await Matrix.sendMessage(m.from, {
        text: `🎰 *Slots Machine*\n\n${slot1} | ${slot2} | ${slot3}\n\n${resultMessage}\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
        ...getMessageOptions(m)
      }, { quoted: m });
      break;
      
    case 'daily-claim':
    case 'claim':
      // Claim command - alias for daily
      if (isCooldownOver(user.lastDaily, COOLDOWNS.daily)) {
        const reward = 1000;
        user.wallet += reward;
        user.lastDaily = Date.now();
        
        await updateUserEconomy(userId, user);
        
        await Matrix.sendMessage(m.from, {
          text: `💰 *Daily Reward*\n\nYou've claimed your daily reward of ${formatNumber(reward)} coins!\n\nWallet: ${formatNumber(user.wallet)} coins\nBank: ${formatNumber(user.bank)} coins`,
          ...getMessageOptions(m)
        }, { quoted: m });
      } else {
        const remaining = user.lastDaily + COOLDOWNS.daily - Date.now();
        await Matrix.sendMessage(m.from, {
          text: `⏳ *Daily Reward Cooldown*\n\nYou've already claimed your daily reward. Please wait ${formatCooldown(remaining)} before claiming again.`,
          ...getMessageOptions(m)
        }, { quoted: m });
      }
      break;
      
    case 'help':
      // Economy help command
      if (args[0]?.toLowerCase() === 'economy' || ['help', 'economy'].includes(cmd)) {
        const helpText = `💰 *Economy Commands Help* 💰\n\n` +
          `${prefix}daily - Claim daily reward\n` +
          `${prefix}weekly - Claim weekly reward\n` +
          `${prefix}monthly - Claim monthly reward\n` +
          `${prefix}work - Work to earn coins\n` +
          `${prefix}crime - Attempt a crime for coins (risky)\n` +
          `${prefix}mine - Mine for coins\n` +
          `${prefix}fish - Fish for coins\n` +
          `${prefix}hunt - Hunt for coins\n` +
          `${prefix}chop - Chop trees for coins\n` +
          `${prefix}farm - Farm for coins\n` +
          `${prefix}balance - Check your balance\n` +
          `${prefix}deposit <amount/all> - Deposit coins to bank\n` +
          `${prefix}withdraw <amount/all> - Withdraw coins from bank\n` +
          `${prefix}rob @user - Rob another user\n` +
          `${prefix}pay @user <amount> - Transfer coins to user\n` +
          `${prefix}leaderboard - View economy leaderboard\n` +
          `${prefix}heist - Start or join a group heist\n` +
          `${prefix}shop - View shop items\n` +
          `${prefix}buy <item_id> - Buy an item\n` +
          `${prefix}inventory - View your inventory\n` +
          `${prefix}use <item_id> - Use an item\n` +
          `${prefix}gamble <amount/all> - Gamble your coins\n` +
          `${prefix}slots <amount/all> - Play the slots machine\n` +
          `${prefix}help economy - Show this help message`;
        
        await Matrix.sendMessage(m.from, {
          text: helpText,
          ...getMessageOptions(m)
        }, { quoted: m });
      }
      break;
  }
};

export default economy;
