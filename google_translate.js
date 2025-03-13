// Imports the Google Cloud client library
const fs = require('fs')

const {Translate} = require('@google-cloud/translate').v2;

const path = require('path');

// Path to your service account key file
const keyFilePath = path.join(__dirname, 'summer-sun-430008-c9-50d522b59a5b.json');

// Initialize Google Cloud Translate with the service account key
const translate = new Translate({
    projectId: 'summer-sun-430008-c9',
    keyFilename: keyFilePath,
});

async function translateText(text, targetLanguage) {
    // Translates the text into the target language. "text" can be a string for
    // translating a single piece of text, or an array of strings for translating
    // multiple texts.
    let [translations] = await translate.translate(text, targetLanguage);
    translations = Array.isArray(translations) ? translations : [translations];
    console.log('Translations:');
    translations.forEach((translation, i) => {
        console.log(`${text[i]} => (${targetLanguage}) ${translation}`);
    });
    return translations[0];
}

async function getSupportedLanguages() {
    const result = await translate.getLanguages();
    const languagesJson = JSON.stringify(result, null, 2);

    fs.writeFileSync('languages.json', languagesJson,'utf8');
}

module.exports = {
    translateText
};

// translateText("Rise, Ascend, Fall, Lift", "pl")
// getSupportedLanguages();
