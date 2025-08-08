require('dotenv').config()
const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')

const audioDir = path.join(__dirname, 'tts-audio')

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir)
}

const app = express()
connectDB()

app.use(cors())
app.use(express.json())

app.use('/api/auth', require('./routes/auth'))
app.use('/api/pdf', require('./routes/pdf'))
app.use('/tts-audio', express.static(path.join(__dirname, 'tts-audio')))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
