import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import config from '../config.cjs';

const ensureDbExists = async () => {
  try {
    await fs.mkdir('./database', { recursive: true });
  } catch (error) {
    console.error('error creating database directory:', error);
  }
};

const getUserData = async (userId) => {
  try {
    const filePath = path.join('./database', `${userId}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { 
      userId, 
      balance: 1000, 
      lastDaily: null,
      inventory: []
    };
  }
};

const saveUserData = async (userData) => {
  try {
    const filePath = path.join('./database', `${userData.userId}.json`);
    await fs.writeFile(filePath, JSON.stringify(userData, null, 2));
    return true;
  } catch (error) {
    console.error('error saving user data:', error);
    return false;
  }
};

const activeQuizzes = new Map();

const fetchQuizQuestions = async (limit = 5) => {
  try {
    const response = await axios.get(`https://kaiz-apis.gleeze.com/api/quiz?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('error fetching quiz questions:', error);
    throw new Error('failed to fetch quiz questions');
  }
};

const calculateReward = (difficulty) => {
  switch(difficulty.toLowerCase()) {
    case 'easy': return 100;
    case 'medium': return 250;
    case 'hard': return 500;
    default: return 200;
  }
};

const formatQuestion = (question, index, total) => {
  const { question: text, category, difficulty, choices } = question;
  
  let choicesText = '';
  Object.entries(choices).forEach(([key, value]) => {
    choicesText += `   ${key}. ${value}\n`;
  });
  
  return `╭───「 🧠 QUIZ ${index+1}/${total} 」──╮\n` +
         `│\n` +
         `│ 📝 Question:\n` +
         `│ ${text}\n` +
         `│\n` +
         `│ 🧩 Category: ${category}\n` +
         `│ 🏋️ Difficulty: ${difficulty.toUpperCase()}\n` +
         `│\n` +
         `│ 🔢 Options (reply with the correct alphabet):\n` +
         `${choicesText}` +
         `│\n` +
         `│ 💰 Reward: ${calculateReward(difficulty)} credits\n` +
         `│ ⏱️ Time: 30 seconds\n` +
         `│\n` +
         `╰─────────────────────╯\n\n` +
         `Reply with letter only (A/B/C/D)`;
};

const formatQuizResult = (isCorrect, reward, balance, correctAnswer) => {
  if (isCorrect) {
    return `╭───「 ✅ CORRECT! 」───╮\n` +
           `│\n` +
           `│ 💰 ${reward} credits added\n` +
           `│ 💼 Balance: ${balance} credits\n` +
           `│\n` +
           `╰───────────────────╯`;
  } else {
    return `╭───「 ❌ INCORRECT! 」─╮\n` +
           `│\n` +
           `│ ✓ Correct answer: ${correctAnswer}\n` +
           `│\n` +
           `╰───────────────────╯`;
  }
};

const formatQuizSummary = (correct, total, prefix) => {
  let grade = '';
  const percentage = (correct / total) * 100;
  
  if (percentage >= 90) grade = 'S';
  else if (percentage >= 80) grade = 'A';
  else if (percentage >= 70) grade = 'B';
  else if (percentage >= 60) grade = 'C';
  else if (percentage >= 50) grade = 'D';
  else grade = 'F';
  
  return `╭──「 🏆 QUIZ COMPLETED 」─╮\n` +
         `│\n` +
         `│ 📊 Final Score: ${correct}/${total} (${percentage.toFixed(0)}%)\n` +
         `│ 🎖️ Grade: ${grade}\n` +
         `│\n` +
         `│ Type ${prefix}quiz to start a new quiz\n` +
         `│\n` +
         `╰─────────────────────╯`;
};

const quiz = async (m, gss) => {
  try {
    await ensureDbExists();
    
    const botNumber = await gss.decodeJid(gss.user.id);
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const args = m.body.slice(prefix.length + cmd.length).trim().split(' ');
    
    const validCommands = ['quiz', 'trivia', 'q'];
    if (!validCommands.includes(cmd)) return;
    
    const userId = m.sender.split('@')[0];
    const subCommand = args[0]?.toLowerCase();
    
    switch (subCommand) {
      case 'help':
        return m.reply(`╭───「 🤖 QUIZ SYSTEM ──╮\n` +
                      `│\n` +
                      `│ Commands:\n` +
                      `│ • ${prefix}${cmd} - Start standard quiz (5 questions)\n` +
                      `│ • ${prefix}${cmd} start [1-10] - Custom question count\n` +
                      `│ • ${prefix}${cmd} help - Display this guide\n` +
                      `│\n` +
                      `│ Rewards:\n` +
                      `│ • EASY: 100 credits\n` +
                      `│ • MEDIUM: 250 credits\n` +
                      `│ • HARD: 500 credits\n` +
                      `│\n` +
                      `│ Answer by typing just the letter (A/B/C/D)\n` +
                      `│\n` +
                      `╰─────────────────╯`);
        
      case 'start':
        const questionCount = parseInt(args[1]) || 5;
        if (questionCount < 1 || questionCount > 10) {
          return m.reply(`⚠️ Invalid question count. Must be between 1-10.`);
        }
        
      default:
        if (activeQuizzes.has(userId)) {
          return m.reply(`⚠️ You already have an active quiz session.\n\nComplete current quiz or wait for timeout.`);
        }
        
        await gss.sendMessage(m.from, { react: { text: "🧠", key: m.key } });
        await m.reply(`🤖 loading quiz questions...\nPreparing assessment protocol...`);
        
        try {
          const questionCount = parseInt(args[1]) || 5;
          const limitedCount = Math.min(Math.max(questionCount, 1), 10);
          const quizData = await fetchQuizQuestions(limitedCount);
          
          if (!quizData || !quizData.questions || quizData.questions.length === 0) {
            await gss.sendMessage(m.from, { react: { text: "❌", key: m.key } });
            return m.reply(`⚠️ Knowledge database unreachable. Try again later.`);
          }
          
          const newQuiz = {
            questions: quizData.questions,
            currentIndex: 0,
            correct: 0,
            active: true,
            timer: null
          };
          
          activeQuizzes.set(userId, newQuiz);
          
          const firstQuestion = formatQuestion(newQuiz.questions[0], 0, newQuiz.questions.length);
          
          await gss.sendMessage(m.from, { react: { text: "✅", key: m.key } });
          
          const sentMsg = await gss.sendMessage(m.from, {
            text: firstQuestion,
            contextInfo: {
              mentionedJid: [m.sender],
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363419090892208@newsletter',
                newsletterName: "EF-PRIME",
                serverMessageId: 144,
              }
            }
          });
          
          const answerListener = async (event) => {
            try {
              const receivedMessage = event.messages[0];
              if (!receivedMessage || receivedMessage.key.remoteJid !== m.from) return;
              
              const sender = receivedMessage.key.participant || receivedMessage.key.remoteJid;
              if (sender !== m.sender) return;
              
              const messageContent = receivedMessage.message?.conversation || 
                                    receivedMessage.message?.extendedTextMessage?.text || "";
              
              if (messageContent.length === 1) {
                const answer = messageContent.toUpperCase();
                const validAnswers = ['A', 'B', 'C', 'D'];
                
                if (validAnswers.includes(answer)) {
                  const currentQuestion = newQuiz.questions[newQuiz.currentIndex];
                  const isCorrect = answer === currentQuestion.correct_answer;
                  
                  clearTimeout(newQuiz.timer);
                  
                  await gss.sendMessage(m.from, { react: { text: isCorrect ? "✅" : "❌", key: receivedMessage.key } });
                  
                  let responseMessage = '';
                  if (isCorrect) {
                    const reward = calculateReward(currentQuestion.difficulty);
                    
                    const userData = await getUserData(userId);
                    userData.balance += reward;
                    await saveUserData(userData);
                    
                    responseMessage = formatQuizResult(true, reward, userData.balance);
                    
                    newQuiz.correct++;
                  } else {
                    responseMessage = formatQuizResult(false, 0, 0, currentQuestion.correct_answer);
                  }
                  
                  newQuiz.currentIndex++;
                  
                  if (newQuiz.currentIndex < newQuiz.questions.length) {
                    await gss.sendMessage(m.from, {
                      text: responseMessage,
                      contextInfo: {
                        mentionedJid: [m.sender],
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                          newsletterJid: '120363419090892208@newsletter',
                          newsletterName: "EF-PRIME",
                          serverMessageId: 144,
                        }
                      }
                    });
                    
                    setTimeout(async () => {
                      const nextQuestion = newQuiz.questions[newQuiz.currentIndex];
                      const formattedQuestion = formatQuestion(nextQuestion, newQuiz.currentIndex, newQuiz.questions.length);
                      
                      await gss.sendMessage(m.from, {
                        text: formattedQuestion,
                        contextInfo: {
                          mentionedJid: [m.sender],
                          forwardingScore: 999,
                          isForwarded: true,
                          forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363419090892208@newsletter',
                            newsletterName: "EF-PRIME",
                            serverMessageId: 144,
                          }
                        }
                      });
                      
                      newQuiz.timer = setTimeout(() => {
                        handleTimeout(gss, m, userId, newQuiz);
                      }, 30000);
                    }, 2000);
                  } else {
                    activeQuizzes.delete(userId);
                    gss.ev.off('messages.upsert', answerListener);
                    
                    responseMessage += `\n\n${formatQuizSummary(newQuiz.correct, newQuiz.questions.length, prefix)}`;
                    
                    await gss.sendMessage(m.from, {
                      text: responseMessage,
                      contextInfo: {
                        mentionedJid: [m.sender],
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                          newsletterJid: '120363419090892208@newsletter',
                          newsletterName: "EF-PRIME",
                          serverMessageId: 144,
                        }
                      }
                    });
                  }
                }
              }
            } catch (error) {
              console.error('Error in answer listener:', error);
            }
          };
          
          const handleTimeout = async (gss, m, userId, quiz) => {
            const currentQuestion = quiz.questions[quiz.currentIndex];
            
            await gss.sendMessage(m.from, {
              text: `╭───「 ⏱️ TIME EXPIRED 」──╮\n` +
                    `│\n` +
                    `│ Question ${quiz.currentIndex + 1} timed out!\n` +
                    `│ ✓ Correct answer: ${currentQuestion.correct_answer}\n` +
                    `│\n` +
                    `│ Quiz terminated. Type ${prefix}quiz to start again\n` +
                    `│\n` +
                    `╰───────────────────╯`,
              contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: '120363419090892208@newsletter',
                  newsletterName: "EF-PRIME",
                  serverMessageId: 144,
                }
              }
            });
            
            activeQuizzes.delete(userId);
            gss.ev.off('messages.upsert', answerListener);
          };
          
          gss.ev.on('messages.upsert', answerListener);
          
          newQuiz.timer = setTimeout(() => {
            handleTimeout(gss, m, userId, newQuiz);
          }, 30000);
          
          setTimeout(() => {
            if (activeQuizzes.has(userId)) {
              activeQuizzes.delete(userId);
              gss.ev.off('messages.upsert', answerListener);
            }
          }, 300000);
          
        } catch (error) {
          console.error('Quiz error:', error);
          await gss.sendMessage(m.from, { react: { text: "❌", key: m.key } });
          return m.reply(`⚠️ System error encountered. Quiz protocol offline.`);
        }
    }
  } catch (error) {
    console.error('Error:', error);
    m.reply('⚠️ System error encountered. Quiz protocol temporarily offline.');
  }
};

export default quiz;