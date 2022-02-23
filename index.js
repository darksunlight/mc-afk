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

client.on('ready', () => {
    console.log('discord bot ready');
    channel = client.channels.cache.get(process.env.CHANNEL);
});

client.on('messageCreate', message => {
    if (message.channel.id !== process.env.CHANNEL || message.author.bot) return;
    if (message.content.startsWith('!')) {
        return bot.chat('/' + message.content.slice(1));
    } else if (message.content.startsWith('.login ')) {
        const username = message.content.split(' ')[1];
        const options = {
            host: process.env.HOST,
            version: '1.18.1',
            auth: 'microsoft'
        };
        
        let bot = mineflayer.createBot(options);
        
        bots.set(username, bot);

        bot.on('spawn', () => {
            console.log('spawned');
        });

        bot.on('kicked', (err) => {
            console.error(err);
            process.exit(1);
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
    }
    bots.get(message.content.split(':')[0]).chat(emoji.unemojify(message.content.split(':').slice(1).join(':')));
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
