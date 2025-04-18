import { serialize, decodeJid } from '../lib/Serializer.js';
import path from 'path';
import fs from 'fs/promises';
import config from '../config.cjs';
import { smsg } from '../lib/myfunc.cjs';
import { handleAntilink } from './antilink.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEVELOPER_NUMBER = "265993702468@s.whatsapp.net";
const DEVELOPER_REACTION = "🖥️";

export const getGroupAdmins = (participants) => {
    return participants.filter(p => p.admin === "superadmin" || p.admin === "admin").map(p => p.id);
};

const sudoFilePath = path.join(__dirname, '..', 'database', 'sudo.json');
let sudoCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 60000;

const initSudoFile = async () => {
    try {
        await fs.access(sudoFilePath);
    } catch (error) {
        const dbDir = path.dirname(sudoFilePath);
        try {
            await fs.access(dbDir);
        } catch {
            await fs.mkdir(dbDir, { recursive: true });
        }
        await fs.writeFile(sudoFilePath, JSON.stringify({ users: [], sudoMode: false }, null, 2));
    }
};

const getSudoData = async () => {
    const now = Date.now();
    if (sudoCache && now - lastCacheTime < CACHE_TTL) {
        return sudoCache;
    }
    await initSudoFile();
    const data = await fs.readFile(sudoFilePath, 'utf8');
    sudoCache = JSON.parse(data);
    lastCacheTime = now;
    return sudoCache;
};

const saveSudoData = async (data) => {
    await fs.writeFile(sudoFilePath, JSON.stringify(data, null, 2));
    sudoCache = data;
    lastCacheTime = Date.now();
};

const isSudoUser = async (userId) => {
    const data = await getSudoData();
    return data.users.includes(userId);
};

const isSudoModeEnabled = async () => {
    const data = await getSudoData();
    return data.sudoMode;
};

const hasPermission = async (sender, isCreator) => {
    if (isCreator) return true;
    const sudoMode = await isSudoModeEnabled();
    if (!sudoMode) return true;
    return await isSudoUser(sender);
};

const sendDeveloperReaction = async (sock, m) => {
    if (m.sender !== DEVELOPER_NUMBER) return;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            await sock.sendMessage(m.from, { react: { text: DEVELOPER_REACTION, key: m.key } });
            return;
        } catch (error) {
            if (attempt === 2) {
                console.error("Failed to send developer reaction after retries:", error);
            } else {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }
};

let pluginCache = null;
async function loadPlugins() {
    if (pluginCache) return pluginCache;
    const pluginDir = path.resolve(__dirname, '..', 'plugins');
    const loadedPlugins = [];
    try {
        const pluginFiles = await fs.readdir(pluginDir);
        for (const file of pluginFiles) {
            if (file.endsWith('.js')) {
                const pluginPath = path.join(pluginDir, file);
                try {
                    const pluginModule = await import(`file://${pluginPath}`);
                    loadedPlugins.push({ path: pluginPath, module: pluginModule.default });
                } catch (err) {
                    console.error(`❌ Failed to preload plugin: ${pluginPath}`, err);
                }
            }
        }
        pluginCache = loadedPlugins;
        return loadedPlugins;
    } catch (err) {
        console.error(`❌ Plugin folder not found: ${pluginDir}`, err);
        return [];
    }
}

loadPlugins();

const Handler = async (chatUpdate, sock, logger) => {
    try {
        if (chatUpdate.type !== 'notify') return;
        const m = serialize(JSON.parse(JSON.stringify(chatUpdate.messages[0])), sock, logger);
        if (!m.message) return;
        if (m.sender === DEVELOPER_NUMBER) {
            sendDeveloperReaction(sock, m);
        }
        const PREFIX = /^[\\/!#.]/;
        const isCOMMAND = m.body ? PREFIX.test(m.body) : false;
        if (!isCOMMAND && m.body) {
            if (m.isGroup) {
                const participants = await sock.groupMetadata(m.from).then(metadata => metadata.participants);
                const groupAdmins = getGroupAdmins(participants);
                const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const isBotAdmins = groupAdmins.includes(botId);
                const isAdmins = groupAdmins.includes(m.sender);
                const botNumber = await sock.decodeJid(sock.user.id);
                const ownerNumber = config.OWNER_NUMBER + '@s.whatsapp.net';
                const isCreator = m.sender === ownerNumber || m.sender === botNumber;
                await handleAntilink(m, sock, logger, isBotAdmins, isAdmins, isCreator);
            }
            return;
        }
        if (!m.body || !isCOMMAND) return;
        const prefixMatch = m.body.match(PREFIX);
        const prefix = prefixMatch ? prefixMatch[0] : '/';
        const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
        const text = m.body.slice(prefix.length + cmd.length).trim();
        if (!cmd.length) return;
        const botNumber = await sock.decodeJid(sock.user.id);
        const ownerNumber = config.OWNER_NUMBER + '@s.whatsapp.net';
        let isCreator = m.sender === ownerNumber || m.sender === botNumber;
        let participants = [], groupAdmins = [], isBotAdmins = false, isAdmins = false;
        if (m.isGroup) {
            participants = await sock.groupMetadata(m.from).then(metadata => metadata.participants);
            groupAdmins = getGroupAdmins(participants);
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            isBotAdmins = groupAdmins.includes(botId);
            isAdmins = groupAdmins.includes(m.sender);
        }
        if (cmd === 'sudo') {
            await handleSudoCommands(m, sock, isCreator, ownerNumber, prefix);
            return;
        }
        const hasAccess = await hasPermission(m.sender, isCreator);
        if (!hasAccess) {
            return;
        }
        if (!sock.public && !isCreator) return;
        await handleAntilink(m, sock, logger, isBotAdmins, isAdmins, isCreator);
        const plugins = await loadPlugins();
        for (const plugin of plugins) {
            try {
                const loadPlugins = plugin.module;
                if (typeof loadPlugins === 'function') {
                    await loadPlugins(m, sock);
                } else if (typeof loadPlugins === 'object' && loadPlugins !== null && loadPlugins.command) {
                    const commands = Array.isArray(loadPlugins.command) ? loadPlugins.command : [loadPlugins.command];
                    if (commands.includes(cmd) && typeof loadPlugins.handler === 'function') {
                        await loadPlugins.handler(m, sock);
                    }
                }
            } catch (err) {
                console.error(`❌ Plugin execution error:`, err);
            }
        }
    } catch (e) {
        console.error(e);
    }
};

const handleSudoCommands = async (m, sock, isCreator, ownerNumber, prefix) => {
    if (!isCreator) {
        await sock.sendMessage(m.from, { text: '❌ Only the owner can manage sudo settings!' }, { quoted: m });
        return;
    }
    const args = m.body.split(/\s+/);
    const action = args[1]?.toLowerCase();
    if (action === 'on') {
        const data = await getSudoData();
        data.sudoMode = true;
        await saveSudoData(data);
        await sock.sendMessage(m.from, { text: '✅ Sudo mode enabled! Bot will only respond to owner and sudo users.' }, { quoted: m });
        return;
    }
    if (action === 'off') {
        const data = await getSudoData();
        data.sudoMode = false;
        await saveSudoData(data);
        await sock.sendMessage(m.from, { text: '✅ Sudo mode disabled! Bot will respond to everyone.' }, { quoted: m });
        return;
    }
    if (action === 'add' || action === 'remove') {
        let targetUser = null;
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            targetUser = m.mentionedJid[0];
        }
        else if (args[2]) {
            const number = args[2].replace(/[^0-9]/g, '');
            if (number) {
                targetUser = `${number}@s.whatsapp.net`;
            }
        }
        if (!targetUser) {
            await sock.sendMessage(m.from, {
                text: `❌ Please provide a valid user to ${action}!\nUse: ${prefix}sudo ${action} @user or ${prefix}sudo ${action} number`
            }, { quoted: m });
            return;
        }
        const data = await getSudoData();
        if (action === 'add') {
            if (data.users.includes(targetUser)) {
                await sock.sendMessage(m.from, { text: '❌ This user is already in the sudo list!' }, { quoted: m });
            } else {
                data.users.push(targetUser);
                await saveSudoData(data);
                await sock.sendMessage(m.from, { text: `✅ Added ${targetUser.split('@')[0]} to sudo users!` }, { quoted: m });
            }
        } else if (action === 'remove') {
            if (!data.users.includes(targetUser)) {
                await sock.sendMessage(m.from, { text: '❌ This user is not in the sudo list!' }, { quoted: m });
            } else {
                data.users = data.users.filter(user => user !== targetUser);
                await saveSudoData(data);
                await sock.sendMessage(m.from, { text: `✅ Removed ${targetUser.split('@')[0]} from sudo users!` }, { quoted: m });
            }
        }
        return;
    }
    if (action === 'list') {
        const data = await getSudoData();
        const sudoMode = data.sudoMode ? 'ON' : 'OFF';
        if (data.users.length === 0) {
            await sock.sendMessage(m.from, {
                text: `📝 *SUDO SETTINGS*\n\n• Sudo Mode: ${sudoMode}\n• No sudo users in the list.`
            }, { quoted: m });
        } else {
            const userList = data.users.map((user, i) => `${i + 1}. ${user.split('@')[0]}`).join('\n');
            await sock.sendMessage(m.from, {
                text: `📝 *SUDO SETTINGS*\n\n• Sudo Mode: ${sudoMode}\n\n*SUDO USERS LIST*\n${userList}`
            }, { quoted: m });
        }
        return;
    }
    await sock.sendMessage(m.from, {
        text: `*SUDO COMMANDS*\n\n${prefix}sudo on - Enable sudo mode (only sudo users can use bot)\n${prefix}sudo off - Disable sudo mode (everyone can use bot)\n${prefix}sudo add @user - Add tagged user to sudo list\n${prefix}sudo remove @user - Remove tagged user from sudo list\n${prefix}sudo list - Show all sudo users and mode status`
    }, { quoted: m });
};

export default Handler;