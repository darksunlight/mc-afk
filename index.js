require('dotenv').config();
const mineflayer = require('mineflayer');
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
let retries = 0;

bot.on('spawn', () => {
    console.log('spawned');
});

bot.on('kicked', (reason, loggedIn) => {
    const reasonString = JSON.parse(reason).text;
    console.error(reason, loggedIn);
    if (retries > 2) process.exit(1);
    retries++;
    if (reasonString.startsWith("You must wait ")) {
        setTimeout(() => {
            bot = mineflayer.createBot(options);
        }, +reasonString.match(/^You must wait (\d+) seconds? before logging-in again.$/)[1] * 1000);
    } else {
        setTimeout(() => {
            bot = mineflayer.createBot(options);
        }, 45000);
    }
});
bot.on('error', console.error);

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