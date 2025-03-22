const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Middleware to parse form data and serve static files
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/notes', express.static('notes'));
app.use(session({
    secret: 'familyhub_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
};
ensureDirectoryExists('uploads');
ensureDirectoryExists('notes');

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

// Function to find the next upcoming Meet link
function getUpcomingMeetLink() {
    const today = new Date();
    for (const date in meetLinks) {
        const meetDate = new Date(date);
        if (meetDate >= today) {
            return { link: meetLinks[date], date: date };
        }
    }
    return { link: null, date: null };
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
        res.send('Invalid credentials. <a href=\"/\">Try again</a>');
    }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Google Meet API route
app.get('/get-meet-link', (req, res) => {
    const upcomingMeet = getUpcomingMeetLink();
    res.json(upcomingMeet);
});

// Google Meet Page
app.get('/google-meet', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'google-meet.html'));
});

// Serve the messages page
app.get('/messages', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'messages.html'));
});

// Serve the upload page
app.get('/upload-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Serve the notes page
app.get('/notes', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'notes.html'));
});

// Set up storage for uploaded files
const uploadStorage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: uploadStorage });

// Set up storage for notes
const notesStorage = multer.diskStorage({
    destination: 'notes/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const uploadNotes = multer({ storage: notesStorage });

// Upload File API Endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.json({ filePath: `/uploads/${req.file.filename}`, fileName: req.file.originalname });
});

// Upload Note API Endpoint
app.post('/upload-note', uploadNotes.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.json({ filePath: `/notes/${req.file.filename}`, fileName: req.file.originalname });
});

// Fetch uploaded notes
app.get('/get-notes', (req, res) => {
    fs.readdir('notes/', (err, files) => {
        if (err) return res.status(500).send('Error fetching notes');
        res.json(files.map(file => ({ name: file, path: `/notes/${file}` })));
    });
});

// Delete a note
app.delete('/delete-note', (req, res) => {
    const noteName = req.query.name;
    if (!noteName) return res.status(400).send('No note specified');

    const notePath = path.join(__dirname, 'notes', noteName);
    if (fs.existsSync(notePath)) {
        fs.unlinkSync(notePath);
        res.send('Note deleted successfully');
    } else {
        res.status(404).send('Note not found');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

