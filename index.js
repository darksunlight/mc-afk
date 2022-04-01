require('dotenv').config();
const version = '1.18.1';
const mineflayer = require('mineflayer');
const mineflayerViewer = require('prismarine-viewer').mineflayer;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalNear } = require('mineflayer-pathfinder').goals;
const mcData = require('minecraft-data')(version);

const emoji = require('node-emoji');

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: new Intents(['GUILDS', 'GUILD_MESSAGES']) });
let channel = null;
let port = 3170;

const bots = new Map();

console.info = (...data) => {
    if (data[0].startsWith('[msa] ')) {
        client.emit('msaInfo', data);
    }
    console.log(...data);
}

client.on('ready', () => {
    console.log('discord bot ready');
    channel = client.channels.cache.get(process.env.CHANNEL);
});

client.on('messageCreate', message => {
    if (message.channel.id !== process.env.CHANNEL || message.author.bot) return;
    if (message.content.startsWith('.login ')) {
        const username = message.content.split(' ')[1];
        const options = {
            host: process.env.HOST,
            username,
            version,
            auth: 'microsoft'
        };

        let bot = mineflayer.createBot(options);

        bots.set(username, bot);

        bot.on('spawn', () => {
            bot.loadPlugin(pathfinder);
            mineflayerViewer(bot, { port });
            message.channel.send(`[mc-afk] ${username} spawned. Viewer port ${port}`);
            console.log(`${username} spawned`);
            port++;
        });

        bot.on('health', () => {
            if (bot.health < 10) {
                message.channel.send(`[mc-afk] ${username} health critical (${bot.health}), quitting...`);
                bot.quit();
            }
        });

        bot.on('kicked', (err) => {
            console.error(err);
            message.channel.send(err);
        });
        bot.on('error', (err) => {
            console.error(err);
            process.exit(1);
        });

        bot.on('message', (jsonMsg) => {
            if (!channel) return;
            if (jsonMsg.translate) {
                if (jsonMsg.with) return channel.send(`(${jsonMsg.translate}: ${jsonMsg.with.map(x => x.text).join(', ')})`).catch(console.error);
                return channel.send(`(${jsonMsg.translate})`).catch(console.error);
            }
            if (jsonMsg.extra) {
                channel.send(jsonMsg.extra.map(x => x.bold ? `**${x.text}**` : x.text).join('')).catch(console.error);
                return;
            }
            if (jsonMsg.text) {
                channel.send(jsonMsg.text).catch(console.error);
                return;
            }
            console.log(jsonMsg);
        });
    } else if (message.content.split(':').length > 1) {
        bots.get(message.content.split(':')[0]).chat(emoji.unemojify(message.content.split(':').slice(1).join(':')));
    } else if (message.content.startsWith('.logout ')) {
        const username = message.content.split(' ')[1];
        if (!bots.has(username)) return message.reply(`${username} is not logged in.`);
        const bot = bots.get(username);
        bot.viewer.close();
        bot.quit();
        message.channel.send(`Logging out from ${username}...`);
    } else if (message.content.startsWith('.eval ')) {
        message.channel.send('Returned value:\n' + eval(message.content.split(' ').slice(1).join(' ')));
    }
});

client.on('msaInfo', msg => {
    channel.send(msg.join('\n'));
});

client.login(process.env.DISCORD_TOKEN);
