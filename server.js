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
        fs.mkdirSync(dir, { recursive: true });
    }
};
ensureDirectoryExists('uploads');
ensureDirectoryExists('notes');

// Family usernames and passwords (store securely in production)
const users = {
    'Olusegun Obadje': 'Obasegs',
    'Olufunke Obadje': 'Ifelola',
    'David Obadje': 'Dave',
    'Joshua Obadje': 'Josh',
    'Samuel Obadje': 'Sam',
    'Enoch Obadje': 'Enoch'
};

// Google Meet links for family meetings
const meetLinks = {
    '2025-03-23': 'https://meet.google.com/ucv-ijtd-geo',
    '2025-04-20': 'https://meet.google.com/uyo-sykg-wgu',
    '2025-05-18': 'https://meet.google.com/yrn-hhut-fhb',
    '2025-06-15': 'https://meet.google.com/oni-hfvz-pie'
};

// Function to find the correct Meet link for today or the next Sunday
function getUpcomingMeetLink() {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (today.getDay() === 0 && meetLinks[todayStr]) {
        return { link: meetLinks[todayStr], date: todayStr };
    }

    let closestDate = null;
    let closestLink = null;

    for (const date in meetLinks) {
        const meetDate = new Date(date);
        if (meetDate >= today && meetDate.getDay() === 0) {
            closestDate = date;
            closestLink = meetLinks[date];
            break;
        }
    }

    return { link: closestLink, date: closestDate };
}

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => req.session.username ? res.sendFile(path.join(__dirname, 'public', 'dashboard.html')) : res.redirect('/'));
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));
app.get('/get-meet-link', (req, res) => res.json(getUpcomingMeetLink()));
app.get('/google-meet', (req, res) => res.sendFile(path.join(__dirname, 'public', 'google-meet.html')));
app.get('/messages', (req, res) => res.sendFile(path.join(__dirname, 'public', 'messages.html')));
app.get('/upload-page', (req, res) => res.sendFile(path.join(__dirname, 'public', 'upload.html')));
app.get('/notes', (req, res) => res.sendFile(path.join(__dirname, 'public', 'notes.html')));

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

// Set up file uploads
const uploadStorage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: uploadStorage });
const notesStorage = multer.diskStorage({
    destination: 'notes/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadNotes = multer({ storage: notesStorage });

// Upload API Endpoints
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    res.json({ filePath: `/uploads/${req.file.filename}`, fileName: req.file.originalname });
});

app.post('/upload-note', uploadNotes.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    res.json({ filePath: `/notes/${req.file.filename}`, fileName: req.file.originalname });
});

// Fetch uploaded files
app.get('/files', (req, res) => {
    fs.readdir('uploads/', (err, files) => {
        if (err) return res.status(500).send('Error fetching files');
        res.json(files.map(file => ({ name: file, path: `/uploads/${file}` })));
    });
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
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
