require('dotenv').config();
const mineflayer = require('mineflayer');
const emoji = require('node-emoji');

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: new Intents(['GUILDS', 'GUILD_MESSAGES']) });
let channel = null;

const express = require('express');
const app = express();
const port = 3170;

const bots = new Map();

let listening = false;
console.info = (...data) => {
    if (listening) {
        listening = false;
        client.emit('msaCode', data);
    } else if (data.includes('[msa] First time signing in. Please authenticate now:')) {
        listening = true;
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
            version: '1.18.1',
            auth: 'microsoft'
        };
        
        let bot = mineflayer.createBot(options);
        
        bots.set(username, bot);

        bot.on('spawn', () => {
            console.log(`${username} spawned`);
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
        bots.get(username).quit();
        message.channel.send(`Logging out from ${username}...`);
    } else if (message.content.startsWith('.eval ')) {
        message.channel.send('Returned value:\n' + eval(message.content.split(' ').slice(1).join(' ')));
    }
});

client.on('msaCode', msg => {
    channel.send(msg.join('\n'));
});

app.get('/:username', (req, res) => {
    if (req.headers.authorization !== process.env.TOKEN) return res.status(403).send('go away');
    const bot = bots.get(req.params.username);
    if (!bot) return res.status(404).send('404');
    res.send({
        health: bot.health,
        hunger: bot.food,
        saturation: bot.foodSaturation,
        oxygen: bot.oxygenLevel,
        gamemode: bot.player?.gamemode,
        ping: bot.player?.ping
    })
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
});

client.login(process.env.DISCORD_TOKEN);
