// config.js - Optimus Prime Bot Configuration
// Author: Frank kaumba dev

const fs = require("fs");
require("dotenv").config();
const config = {

  SESSION_ID: process.env.SESSION_ID || "EF-PRIME;;;eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiSVB1NjM5dm5reWtZWkQ0eHBYTGNQRHlvcGVKdmdqSmVlSkhaZE5iVUQxTT0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiNldjR0JaWncwaEI1bnlEOGI0b1FLRnVMaWpRUTV3TkFiREE0amFySjVEVT0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiI0UDJONFh5TWZuc044OVVrVk5rZTNkbHdmckg2dFR4dmJIQ0l4cUxvTUdzPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJsQzQ0MEZTOGhuK1E4OTVVUlRhTWxxZ1JrSmk1NzJWd2l3Q0VtZldndHlnPSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IlNDdWFRYlhCSzdobngrb0FtNTVKT3Yva3VON2grZk5HV3NPM0pSYmMzRU09In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkhWU3VhUHNWSXlJUDZUL3Q1alpnTEx4WjZCOG9sUzBqc2lLRTNnVmF1ajg9In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiR1BNQUVlWnlpUStJK2Mxd3hjOGFWWi8rTlVibCs3eFJJN0xhQzBhNzQzaz0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoid2ZrT3I2UE5rYjJGcUhtODNOd1lJWFdpRVZiWVhJSnk2RDh4ckQ5ejYxYz0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkYwQ2txRUgzRCtRUm0rMzI1UytNcnRQY2MyMTlFeTQ4L3BWYloxRzJhMUN3S0ExQ2k4eTJZQU5GNTFlMUpTdklrY1NkcnlFeGpzS2VJd0tiNkgvSmh3PT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6MTMsImFkdlNlY3JldEtleSI6InArbG90VHBIY3V6L0ZTUE9zU29SSS9iUFAzNmNDdjNOVlJXdjU0Z1VYM0k9IiwicHJvY2Vzc2VkSGlzdG9yeU1lc3NhZ2VzIjpbXSwibmV4dFByZUtleUlkIjozMSwiZmlyc3RVbnVwbG9hZGVkUHJlS2V5SWQiOjMxLCJhY2NvdW50U3luY0NvdW50ZXIiOjAsImFjY291bnRTZXR0aW5ncyI6eyJ1bmFyY2hpdmVDaGF0cyI6ZmFsc2V9LCJkZXZpY2VJZCI6IlVoZXhsM3hSVGI2ZjhsYWZDMnlCZUEiLCJwaG9uZUlkIjoiOTIzZGU2NDYtY2YzNi00OWM2LWEwNzUtZjVkOWQxYjZlOTNkIiwiaWRlbnRpdHlJZCI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6Im5EUzNYSjZhVXI1NTRkVHNlVU0vVTlJendpaz0ifSwicmVnaXN0ZXJlZCI6dHJ1ZSwiYmFja3VwVG9rZW4iOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJsUXRUVWhwVU9RNjRlQ2VjV0pUbURHTmdGdjA9In0sInJlZ2lzdHJhdGlvbiI6e30sInBhaXJpbmdDb2RlIjoiUlNaS1ZCWVMiLCJtZSI6eyJpZCI6IjI2Mzc3ODg1ODI0NjoxNkBzLndoYXRzYXBwLm5ldCIsIm5hbWUiOiLLouG1mOG1lsqz4bWJ4bWQ4bWJIOG2nMqw4bWDy6IifSwiYWNjb3VudCI6eyJkZXRhaWxzIjoiQ0tmWmpiQUVFTmk5azhFR0dCUWdBQ2dBIiwiYWNjb3VudFNpZ25hdHVyZUtleSI6Im9jOC9TbUpPSUxIbHM2R1hXOXN3c1k1TEZoTElVeVlvbTh1QnlOL3ovaDg9IiwiYWNjb3VudFNpZ25hdHVyZSI6InZvbll1VTV3SHQxL0tqVm1CaHlRUE1JQXpVc1dwZW1JWjNpNmtsbTJ1RWdObmh1QmV0Y3V2cDdkUks2b29ZdG84eG9TQWRkUHI3L21QeHR6ZlFBVkJBPT0iLCJkZXZpY2VTaWduYXR1cmUiOiJpWkVLZndkdmZ6d0VkaC9UL0JBZ1hIakJnL3R0K3cyVlhMVm5WbGRFaWh6RUd1elRQd3RHcUxuM0ZDRjZURndGSWE4bzQ0V1BXOUJYdjk1NTZValhqZz09In0sInNpZ25hbElkZW50aXRpZXMiOlt7ImlkZW50aWZpZXIiOnsibmFtZSI6IjI2Mzc3ODg1ODI0NjoxNkBzLndoYXRzYXBwLm5ldCIsImRldmljZUlkIjowfSwiaWRlbnRpZmllcktleSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkJhSFBQMHBpVGlDeDViT2hsMXZiTUxHT1N4WVN5Rk1tS0p2TGdjamY4LzRmIn19XSwicGxhdGZvcm0iOiJzbWJhIiwibGFzdEFjY291bnRTeW5jVGltZXN0YW1wIjoxNzQ3MjQ2ODIxLCJteUFwcFN0YXRlS2V5SWQiOiJBQUFBQUlIWiJ9",
  PREFIX: process.env.PREFIX || '.',
  
  // Message Protection
  ANTI_DELETE: process.env.ANTI_DELETE !== undefined ? process.env.ANTI_DELETE === 'true' : false, 
  AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN !== undefined ? process.env.AUTO_STATUS_SEEN === 'true' : false, 
  AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY !== undefined ? process.env.AUTO_STATUS_REPLY === 'true' : false,
  STATUS_READ_MSG: process.env.STATUS_READ_MSG || '',
  
  // Communication Protocols
  AUTO_DL: process.env.AUTO_DL !== undefined ? process.env.AUTO_DL === 'true' : false,
  AUTO_READ: process.env.AUTO_READ !== undefined ? process.env.AUTO_READ === 'false' : false,
  AUTO_TYPING: process.env.AUTO_TYPING !== undefined ? process.env.AUTO_TYPING === 'false' : false,
  AUTO_RECORDING: process.env.AUTO_RECORDING !== undefined ? process.env.AUTO_RECORDING === 'false' : false,
  ALWAYS_ONLINE: process.env.ALWAYS_ONLINE !== undefined ? process.env.ALWAYS_ONLINE === 'false' : false,
  AUTO_REACT: process.env.AUTO_REACT !== undefined ? process.env.AUTO_REACT === 'false' : false,
  
  // Defensive Systems
  AUTO_BLOCK: process.env.AUTO_BLOCK !== undefined ? process.env.AUTO_BLOCK === 'false' : true,
  REJECT_CALL: process.env.REJECT_CALL !== undefined ? process.env.REJECT_CALL === 'false' : false, 
  NOT_ALLOW: process.env.NOT_ALLOW !== undefined ? process.env.NOT_ALLOW === 'false' : true,
  
  // Command Mode
  MODE: process.env.MODE || "public",
  
  // Alliance Info
  OWNER_NAME: process.env.OWNER_NAME || "Frank kaumba",
  OWNER_NUMBER: process.env.OWNER_NUMBER || "263778858246",
  GEMINI_KEY: process.env.GEMINI_KEY || "AIzaSyA3-FskH71WtIQbzrhMA7WAC4Th2zqSNiE",
  WELCOME: process.env.WELCOME !== undefined ? process.env.WELCOME === 'true' : false, 
};

module.exports = config;
