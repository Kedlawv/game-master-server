
const { Firestore,FieldValue } = require('@google-cloud/firestore');
const path = require('path');

// Path to your service account key file
const keyFilePath = path.join(__dirname, 'summer-sun-430008-c9-50d522b59a5b.json');

// Initialize Firestore with the service account key
const firestore = new Firestore({
    projectId: 'summer-sun-430008-c9',
    keyFilename: keyFilePath,
});

const HIGH_SCORE_COLLECTION = 'strangers_highs_cores'

const addPlayerHighScore = async (player)  => {
    try {
        // Reference to the 'players' collection
        const playersCollection = firestore.collection(HIGH_SCORE_COLLECTION);

        // Add the player data to Firestore using the player's ID as the document ID
        await playersCollection.doc(player.id).set({
            playerId: player.id,
            playerName: player.name,
            score: player.score,
            timestamp: FieldValue.serverTimestamp()
        });

        console.log('Player added successfully:', player);
        return true;
    } catch (error) {
        console.error('Error adding player to Firestore:', error);
        return false;
    }
};

// Export the Firestore instance for use in other files
module.exports = {
    firestore,
    addPlayerHighScore
};
