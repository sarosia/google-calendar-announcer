// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');

const client = new textToSpeech.TextToSpeechClient();
module.exports = async function(text) {
  const request = {
    'input': {text},
    'voice': {
      'languageCode': 'en-US',
      'ssmlGender': 'MALE',
    },
    'audioConfig': {
      'audioEncoding': 'MP3',
    },
  };
  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
};
