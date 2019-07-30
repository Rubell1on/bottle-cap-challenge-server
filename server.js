const express = require('express');
const bodyParser = require('body-parser');
const yandexApi = require('./JS/yandexApi');
const PORT = process.env.PORT || 3000;
const yandexToken = process.env.yandexToken;
const yandex = new yandexApi(yandexToken);
const playersDataFileName = 'players_data.json';

let playersData = {};

app = express();
app.use('/JS', express.static('JS'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.listen(PORT, () => {
    serverPreparation()
        .then((data) => {
            playersData = JSON.parse(data.body);
            console.log('Server started');
        })
        .catch((error) => console.error(error));
});

app.get('/', (req, res) => {
    res.json(playersData);
});

app.get('/api/login', (req, res) => {
    const query = req.query;
    const userData = playersData.users.find((user) => user.username === query.username);
    if (userData) {
        if (userData.password === query.password) {
            res.status(200).json({username: userData.username, playerAttributes: userData.playerAttributes});
        } else {
            res.status(400).send('Incorrect login or password');
        }
    } else {
        res.status(400).send(`User ${query.username} not registered!`);
    }
});

app.post('/api/register', (req, res) => {
    const body = req.body;
    if (body.username && body.password) {
        if (!Object.keys(playersData).length) {
            registerUser(body.username, body.password);
        } else {
            if (!playersData.users.find(player => player.username === body.username)) {
                registerUser(body.username, body.password);
            } else {
                res.status(400).send(`Username ${body.username} alreary registered!`);
            }     
        }
    } else {
        res.status(400).send('Enter correct username and password');
    }
    
    async function registerUser(username, password) {
        const template = {
            username,
            password,
            playerAttributes: {
                coins: 0,
                highScore: 0
            }
        };

        playersData.users.push(template);
        const uploadLink = await yandex.getUploadLink(`/${playersDataFileName}`);
        await yandex.putData(uploadLink.body.href, JSON.stringify(playersData));
    }
});

app.post('/api', (req, res) => {
    console.log('hello');
});

async function serverPreparation() {
    const template = { 
        users: []
    };

    const filesList = await yandex.getList();
    const isFile = filesList.body.items.find(file => file.name === playersDataFileName);
    if (!isFile) {
        const uploadLink = await yandex.getUploadLink(`/${playersDataFileName}`);
        await yandex.putData(uploadLink.body.href, JSON.stringify(template));
    } else {
        const downloadLink = await yandex.getDowndloadLink(`/${playersDataFileName}`);
        return yandex.getData(downloadLink.body.href);
    }
}