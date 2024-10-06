// Import the required modules
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { secretKey } = require('./config');

const serverVersion = '0.1.4 REST';

// Create an express app
const cors = require('cors');
const allowedOrigin = 'https://storage.googleapis.com';

const rateLimit = require('express-rate-limit');

const app = express();
const firestore = require('./firestore');

const corsOptions = {
    origin: (origin, callback) => {
        console.log(`Request Origin: ${origin}`);
        if (origin === allowedOrigin || !origin) { // Allows server-to-server communication and localhost during testing
            console.log(`Origin: ${origin} allowed.`);
            callback(null, true);
        } else {
            console.log(`Origin: ${origin} not allowed!`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Create rate limit rule: limit each IP to 100 requests per minute
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute in milliseconds
    max: 10, // Limit each IP to 100 requests per `windowMs`
    message: 'Too many requests from this IP, please try again after a minute.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

function validateUserAgent(req, res, next) {
    const userAgent = req.get('User-Agent');
    const allowedUserAgent = 'UnityPlayer/2022.3.20f1'; // Standalone Unity builds
    const allowedBrowserAgents = ['Chrome', 'Firefox', 'Safari', 'Edge']; // Browsers

    if (userAgent && (userAgent.startsWith(allowedUserAgent) || allowedBrowserAgents.some(agent => userAgent.includes(agent)))) {
        // If the user agent matches UnityPlayer or a valid browser, allow the request
        next();
    } else {
        console.log(`User agent: ${userAgent} is forbidden`);
        // If it doesn't match, reject the request
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid User-Agent' });
    }
}

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Apply the middleware to all requests globally
app.use(validateUserAgent);
app.use(limiter);
app.use(bodyParser.json());


// Custom middleware to log rate limit info for every request
app.use((req, res, next) => {
    const ip = req.ip;
    const requestCount = req.rateLimit.current;
    const limit = req.rateLimit.limit;
    const remainingRequests = req.rateLimit.remaining;
    const resetTime = new Date(req.rateLimit.resetTime).toISOString();
    const route = req.originalUrl;
    const time = new Date().toISOString();
    const userAgent = req.get('User-Agent');

    // Log rate limit details for every request
    console.log(`[${time}] IP: ${ip}, Route: ${route}, User-Agent: ${userAgent}, Requests: ${requestCount}/${limit}, Remaining: ${remainingRequests}, ResetTime: ${resetTime}`);

    next();
});

// Function to validate the player's score by hashing their ID and score
function validateScore(player, clientHash, secretKey) {
    const message = player.id + player.score.toString();

    // Generate the hash on the server side
    const hash = crypto.createHmac('sha256', secretKey)
        .update(message)
        .digest('hex');

    // Compare the generated hash with the client's hash
    return hash === clientHash;
}

// API endpoint to submit the player's score
app.post('/api/submitScore', async (req, res) => {
    // Extract playerJson and hash from the request body
    const { playerJson, hash } = req.body;

    if (!playerJson || !hash) {
        return res.status(400).json({ success: false, message: 'Missing player data or hash!' });
    }

    // Parse the player's JSON
    let player;
    try {
        player = JSON.parse(playerJson);
    } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid player JSON!' });
    }

    // Validate the player's score using the hash
    if (validateScore(player, hash, secretKey)) {
        try {
            // Await the result of adding the player to Firestore
            const uploadedToDB = await firestore.addPlayerHighScore(player);

            if (uploadedToDB) {
                return res.json({ success: true, message: 'Score submitted successfully!' });
            } else {
                return res.status(500).json({ success: false, message: 'Failed to save score to Firestore!' });
            }
        } catch (error) {
            console.error('Error saving score to Firestore:', error);
            return res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    } else {
        // If invalid, reject the score
        return res.status(400).json({ success: false, message: 'Invalid score submission!' });
    }
});

app.get('/api/highscores', async (req, res) => {
    try {
        const highscores = await firestore.getHighScores();

        if (highscores.length > 0) {
            return res.json({ success: true, highscores });
        } else {
            return res.status(404).json({ success: false, message: 'No high scores found' });
        }
    } catch (error) {
        console.error('Error fetching high scores:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Server version: ${serverVersion}`);
});
