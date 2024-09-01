
const { Firestore } = require('@google-cloud/firestore');
const path = require('path');

// Path to your service account key file
const keyFilePath = path.join(__dirname, 'summer-sun-430008-c9-50d522b59a5b.json');

// Initialize Firestore with the service account key
const firestore = new Firestore({
    projectId: 'summer-sun-430008-c9',
    keyFilename: keyFilePath,
});

const addPlayerToFirestore = async (playerData) => {
    try {
        // Reference to the 'players' collection
        const playersCollection = firestore.collection('players');

        // Add the player data to Firestore using the player's ID as the document ID
        await playersCollection.doc(playerData.id).set(playerData);

        console.log('Player added successfully:', playerData);
    } catch (error) {
        console.error('Error adding player to Firestore:', error);
    }
};

const getAllPlayersFromFirestore = async () => {
    try {
        const playersCollection = firestore.collection('players');
        const snapshot = await playersCollection.get();
        const players = [];

        snapshot.forEach(doc => {
            players.push(doc.data());
        });

        return players;
    } catch (error) {
        console.error('Error retrieving players from Firestore:', error);
        return [];
    }
};

const clearPlayersCollection = async () => {
    try {
        const playersCollection = firestore.collection('players');
        const snapshot = await playersCollection.get();

        // Delete each document in the collection
        const batch = firestore.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log('All players have been successfully deleted.');
    } catch (error) {
        console.error('Error clearing players collection:', error);
    }
};

// Export the Firestore instance for use in other files
module.exports = {
    firestore,
    addPlayerToFirestore,
    getAllPlayersFromFirestore,
    clearPlayersCollection
};
