const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse form data and serve static files
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'familyhub_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Family usernames and passwords (store securely in production)
const users = {
    'Olusegun Obadje': 'Obasegs@favour.com',
    'Olufunke Obadje': 'Ifelola@favour.com',
    'David Obadje': 'Dave@favour.com',
    'Joshua Obadje': 'Josh@favour.com',
    'Samuel Obadje': 'Sam@favour.com',
    'Enoch Obadje': 'Enoch@favour.com'
};

// Google Meet links for family meetings
const meetLinks = {
    '2025-03-23': 'https://meet.google.com/ucv-ijtd-geo',
    '2025-04-20': 'https://meet.google.com/uyo-sykg-wgu',
    '2025-05-18': 'https://meet.google.com/yrn-hhut-fhb',
    '2025-06-15': 'https://meet.google.com/oni-hfvz-pie'
};

// Function to find the most recent Meet link
function getCurrentMeetLink() {
    const today = new Date();
    let closestDate = null;
    let closestLink = null;

    for (const date in meetLinks) {
        const meetDate = new Date(date);
        if (today >= meetDate) {
            if (!closestDate || meetDate > new Date(closestDate)) {
                closestDate = date;
                closestLink = meetLinks[date];
            }
        }
    }

    return { link: closestLink, date: closestDate };
}

// Serve the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (users[username] && users[username] === password) {
        req.session.username = username;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid credentials. <a href="/">Try again</a>');
    }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/');
    }

    const meetInfo = getCurrentMeetLink();
    const currentLink = meetInfo.link;
    const meetDate = meetInfo.date 
        ? new Date(meetInfo.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) 
        : null;

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Obadje Dashboard</title>
            <link rel="stylesheet" href="styles.css">
        </head>
        <body>
            <div class="login-container">
                <h1>Welcome, ${req.session.username}!</h1>
                <p>Sunday Family Gathering</p>
                ${currentLink ? `
                    <p>Next Meeting: ${meetDate}</p>
                    <a href="${currentLink}" target="_blank" class="meet-button">Join Now</a>
                ` : `
                    <p>No meeting scheduled for this period.</p>
                `}
                <p><a href="/logout" class="logout-button">Logout</a></p>
            </div>
        </body>
        </html>
    `);
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Start the server and allow external connections
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://${getLocalIP()}:${port}`);
});

// Function to get local IP address
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
}
