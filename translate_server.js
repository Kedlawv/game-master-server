// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const google_translate = require('./google_translate');

const serverVersion = '0.1.5 REST GT - Translation Only';

// Initialize the Express app
const app = express();

// Set up CORS options
const corsOptions = {
    origin: '*', // Allow requests from any origin
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Translation endpoint
app.post('/api/translate', async (req, res) => {
    try {
        const { word, language } = req.body;

        if (!word || !language) {
            return res.status(400).json({ success: false, message: 'Missing word or language!' });
        }

        console.log(`Translating: "${word}" to "${language}"`);

        try {
            const translation = await google_translate.translateText(word, language);
            if (translation) {
                res.json({ success: true, translation });
            } else {
                return res.status(500).json({ success: false, message: 'Failed to translate!' });
            }
        } catch (error) {
            console.error('Error translating:', error);
            return res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    } catch (error) {
        res.status(500).send('Translation failed');
    }
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Translation server is running on port ${PORT}`);
    console.log(`Server version: ${serverVersion}`);
});
