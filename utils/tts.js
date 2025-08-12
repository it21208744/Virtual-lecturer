const fs = require('fs')
const util = require('util')
const textToSpeech = require('@google-cloud/text-to-speech')


const client = new textToSpeech.TextToSpeechClient()

async function textToSpeechConvert(
  text,
  voice = 'en-US-Wavenet-D',
  speed = 1.0
) {
  const request = {
    input: { text },

    voice: { languageCode: 'en-US', name: voice },

    audioConfig: { audioEncoding: 'MP3', speakingRate: speed },
  }


  const [response] = await client.synthesizeSpeech(request)


  return response.audioContent
}

module.exports = { textToSpeechConvert }
