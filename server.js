const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// === MIDDLEWARE ===
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/notes', express.static('notes'));

app.use(session({
  secret: 'familyhub_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// === INITIAL SETUP ===
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
ensureDirectoryExists('uploads');
ensureDirectoryExists('notes');

// === USERS ===
const users = {
  'Daddy': 'Obasegs',
  'Mummy': 'Ifelola',
  'David': 'Dave',
  'Joshua': 'Josh',
  'Samuel': 'Sam',
  'Enoch': 'Enoch'
};

// === ROTATING GOOGLE MEET LINKS ===
const meetLinks = [
  'https://meet.google.com/ucv-ijtd-geo',
  'https://meet.google.com/uyo-sykg-wgu',
  'https://meet.google.com/yrn-hhut-fhb',
  'https://meet.google.com/oni-hfvz-pie'
];
let currentMeetIndex = 0;

function getNextMeetLink() {
  const link = meetLinks[currentMeetIndex];
  currentMeetIndex = (currentMeetIndex + 1) % meetLinks.length;
  return link;
}

// === PAGE ROUTES ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/dashboard', (req, res) => {
  if (!req.session.username) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/google-meet', (req, res) => res.sendFile(path.join(__dirname, 'public', 'google-meet.html')));
app.get('/messages', (req, res) => res.sendFile(path.join(__dirname, 'public', 'messages.html')));
app.get('/upload-page', (req, res) => res.sendFile(path.join(__dirname, 'public', 'upload.html')));
app.get('/notes', (req, res) => res.sendFile(path.join(__dirname, 'public', 'notes.html')));

// === API ENDPOINTS ===
app.get('/get-meet-link', (req, res) => {
  const link = getNextMeetLink();
  res.json({ link });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    req.session.username = username;
    res.redirect('/dashboard');
  } else {
    res.send('Invalid credentials. <a href="/">Try again</a>');
  }
});

// === FILE UPLOADS ===
const uploadStorage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: uploadStorage });

const notesStorage = multer.diskStorage({
  destination: 'notes/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const uploadNotes = multer({ storage: notesStorage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  res.json({ filePath: `/uploads/${req.file.filename}`, fileName: req.file.originalname });
});

app.post('/upload-note', uploadNotes.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  res.json({ filePath: `/notes/${req.file.filename}`, fileName: req.file.originalname });
});

app.get('/files', (req, res) => {
  fs.readdir('uploads/', (err, files) => {
    if (err) return res.status(500).send('Error fetching files');
    res.json(files.map(file => ({ name: file, path: `/uploads/${file}` })));
  });
});

app.get('/get-notes', (req, res) => {
  fs.readdir('notes/', (err, files) => {
    if (err) return res.status(500).send('Error fetching notes');
    res.json(files.map(file => ({ name: file, path: `/notes/${file}` })));
  });
});

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

// === EXTRAS ===
app.get('/user-info', (req, res) => {
  if (!req.session.username) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user: req.session.username });
});

app.get('/current-time', (req, res) => {
  const now = new Date();
  res.json({ time: now.toLocaleTimeString(), date: now.toLocaleDateString() });
});

app.get('/check-session', (req, res) => {
  res.json({ loggedIn: !!req.session.username });
});

// === START SERVER ===
app.listen(port, () => {
  console.log(`✅ Family Hub server is running at http://localhost:${port}`);
});