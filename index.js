// Import the required modules
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

// Create an express app
const app = express();
const firestore = require('./firestore');

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Secret key used for hashing (should be the same as in your game)
const secretKey = 'yourSecretKey';

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

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
