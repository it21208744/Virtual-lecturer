const fs = require('fs')
const util = require('util')
const textToSpeech = require('@google-cloud/text-to-speech')

// Creates a client
const client = new textToSpeech.TextToSpeechClient()

async function textToSpeechConvert(
  text,
  voice = 'en-US-Wavenet-D',
  speed = 1.0
) {
  const request = {
    input: { text },
    // Select the language and voice
    voice: { languageCode: 'en-US', name: voice },
    // Select the type of audio encoding
    audioConfig: { audioEncoding: 'MP3', speakingRate: speed },
  }

  // Performs the text-to-speech request
  const [response] = await client.synthesizeSpeech(request)

  // Save the audio to a file or return the buffer
  // For now, return audio content buffer
  return response.audioContent
}

module.exports = { textToSpeechConvert }
