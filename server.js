const express = require('express');
const bodyParser = require('body-parser');
const yandexApi = require('./JS/yandexApi');
const PORT = process.env.PORT || 3000;
const yandexToken = process.env.yandexToken;
const yandex = new yandexApi(yandexToken);
const playersDataFileName = 'players_data.json';

let playersData = {};
let connectedUsers = {users:[]};

class Enumerator {
    constructor(object) {
        return object;
    } 
};

const roles = new Enumerator({admin: 1, player: 2});

app = express();
app.set('view engine', 'ejs');
app.use('/JS', express.static('JS'));
app.use('/public', express.static('public'))
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

app.get('/api/login', (req, res) => { 
    const query = req.query;
    const userData = playersData.users.find((user) => user.username === query.username);
    if (userData) {
        if (userData.password === query.password) {
            if (userData.role === roles.admin) {
                if (Object.keys(connectedUsers).length) {
                    const user = connectedUsers.users.find((user) => user.username === query.username);
                    if (user) {
                        res.status(200).json(playersData);
                    } else {
                        const template = {
                            username: userData.username,
                            apiKey: createApiKey(10)
                        };

                        connectedUsers.users.push(template);
                        res.status(201).json({ username: template.username, apiKey: template.apiKey });
                    }
                }
            } else {
                res.status(404).send('You have not administrator permissions');
            }
        } else {
            res.status(400).send('Incorrect login or password');
        }
    } else {
        res.status(400).send(`User ${query.username} not registered!`);
    }
});

app.get('/api/data', (req, res) => { 
    const query = req.query;
    const userData = playersData.users.find((user) => user.username === query.username);
    if (userData) {
        if (userData.password === query.password) {
            res.status(200).json({ username: userData.username, playerAttributes: userData.playerAttributes });
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
            registerUser(body.username, body.password, body.role, body.email);
        } else {
            if (!playersData.users.find(player => player.username === body.username)) {
                registerUser(body.username, body.password, body.role, body.email);
                res.status(201).send(`User ${body.username} registered successfull`);
            } else {
                res.status(400).send(`User ${body.username} alreary registered!`);
            }     
        }
    } else {
        res.status(400).send('Enter correct username and password');
    }
    
    async function registerUser(username, password, role, email) {
        const template = {
            username,
            password,
            email,
            playerAttributes: {
                coins: 0,
                highScore: 0
            }
        };

        if (!role) {
            template.role = roles.player;
        } else {
            if (role === roles.player) template.role = roles.player;
            else if (role === roles.admin) template.role = roles.admin;
        }

        playersData.users.push(template);
        const uploadLink = await yandex.getUploadLink(`/${playersDataFileName}`);
        await yandex.putData(uploadLink.body.href, JSON.stringify(playersData));
    }
});

app.get('/dashboard', (req, res) => {
    const query = req.query;
    if (!Object.keys(query).length) {
        res.render('index.ejs');
    } else {
        const admin = connectedUsers.users.find((admin) => admin.username === query.username);
        if (admin) {
            if (admin.apiKey === query.apiKey) {
                res.render('dashboard.ejs');
            } else {
                res.status(400).send("Api key expired");
            }
        } else {
            res.status(404).send(`User ${query.username} not found`);
        }
        
    }
});

function createApiKey(length) {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

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