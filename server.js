const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

// Serve static files
app.use(express.static('.'));
app.use(express.json());

// Configure multer for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './Storage/Announcements';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Maintain a manifest.json of all announcements for static hosting
function writeManifest() {
    try {
        const announcements = readAnnouncements();
        fs.writeFileSync(
            path.join('./Storage/Announcements', 'manifest.json'),
            JSON.stringify(announcements, null, 2)
        );
    } catch (e) {
        console.error('Failed to write manifest.json', e);
    }
}

// Helper function to read announcements
function readAnnouncements() {
    const dir = './Storage/Announcements';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));
    const announcements = [];
    
    files.forEach(file => {
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        try {
            const announcement = JSON.parse(content);
            announcements.push(announcement);
        } catch (error) {
            console.error(`Error parsing ${file}:`, error);
        }
    });
    
    return announcements.sort((a, b) => b.date - a.date);
}

// Get all announcements
app.get('/api/announcements', (req, res) => {
    try {
        const announcements = readAnnouncements();
        res.json(announcements);
    } catch (error) {
        console.error('Error reading announcements:', error);
        res.status(500).json({ error: 'Failed to read announcements' });
    }
});

// Create new announcement
app.post('/api/announcements', upload.single('image'), (req, res) => {
    try {
        const { title, content } = req.body;
        const id = uuidv4();
        const date = Date.now();
        
        const announcement = {
            id,
            title,
            content,
            date,
            image: req.file ? `Storage/Announcements/${req.file.filename}` : null
        };
        
        fs.writeFileSync(
            path.join('./Storage/Announcements', `${id}.json`),
            JSON.stringify(announcement, null, 2)
        );
        // Update manifest
        writeManifest();
        
        res.status(201).json(announcement);
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

// Delete announcement
app.delete('/api/announcements/:id', (req, res) => {
    try {
        const { id } = req.params;
        const filePath = path.join('./Storage/Announcements', `${id}.json`);
        
        if (fs.existsSync(filePath)) {
            // Read the announcement to get the image path
            const content = fs.readFileSync(filePath, 'utf8');
            const announcement = JSON.parse(content);
            
            // Delete the image if it exists
            if (announcement.image) {
                const imagePath = path.join('.', announcement.image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            
            // Delete the JSON file
            fs.unlinkSync(filePath);
            // Update manifest
            writeManifest();
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Announcement not found' });
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    // Ensure manifest exists at startup
    writeManifest();
}); 