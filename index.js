require('dotenv').config();
const mineflayer = require('mineflayer');

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: new Intents(['GUILDS', 'GUILD_MESSAGES']) });
let channel = null;

const express = require('express');
const app = express();
const port = 3170;

const options = {
    host: process.env.HOST,
    username: process.env.EMAIL,
    password: process.env.PASSWORD,
    version: '1.17.1',
    auth: 'microsoft'
};

let bot = mineflayer.createBot(options);

bot.on('spawn', () => {
    console.log('spawned');
});

bot.on('kicked', console.error);
bot.on('error', console.error);

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
})

client.on('ready', () => {
    console.log('discord bot ready');
    channel = client.channels.cache.get(process.env.CHANNEL);
});

client.on('messageCreate', message => {
    if (message.channel.id !== process.env.CHANNEL || message.author.bot) return;
    if (message.content.startsWith('!')) {
        return bot.chat('/' + message.content.slice(1));
    }
    bot.chat(message.content);
});

app.get('/', (req, res) => {
    if (req.headers.authorization !== process.env.TOKEN) return res.status(403).send('go away');
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