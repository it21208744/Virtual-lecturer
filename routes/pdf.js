const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const auth = require('../middleware/auth')
const subscriptionCheck = require('../middleware/subscriptionCheck')
const Pdf = require('../models/Pdf')
const User = require('../models/User')
const { textToSpeechConvert } = require('../utils/tts')

// Use legacy build for CommonJS compatibility
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')
pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(
  __dirname,
  '../node_modules/pdfjs-dist/legacy/build/pdf.worker.js'
)

const generateExplanation = require('../utils/llama')

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDFs are allowed'))
  },
})

// ===== PDF Upload & Page-wise Extraction =====
router.post(
  '/upload',
  auth,
  subscriptionCheck, // <-- fixed missing comma here
  upload.single('pdf'),
  async (req, res) => {
    try {
      const dataBuffer = fs.readFileSync(req.file.path)
      const loadingTask = pdfjsLib.getDocument({ data: dataBuffer })
      const pdfDocument = await loadingTask.promise

      const pagesArray = []
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item) => item.str).join(' ')

        pagesArray.push({
          pageNumber: pageNum,
          text: pageText,
          explanation: '', // placeholder for explanation later
        })
      }

      const pdfRecord = new Pdf({
        user: req.user.userId,
        originalFileName: req.file.originalname,
        storedFileName: req.file.filename,
        pages: pagesArray,
      })

      await pdfRecord.save()

      // Decrement freeTrialCount if user is on free plan and has trials left
      const user = await User.findById(req.user.userId)
      if (user.subscriptionStatus.plan === 'free' && user.freeTrialCount > 0) {
        user.freeTrialCount -= 1
        await user.save()
      }

      res.json({
        message: 'PDF uploaded and processed page-wise',
        pdfId: pdfRecord._id,
        totalPages: pagesArray.length,
        freeTrialLeft: user.freeTrialCount, // optional: send remaining trials to frontend
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'Failed to process PDF' })
    }
  }
)

// ===== Generate Explanations for Each Page =====
router.post('/generate/:pdfId', auth, subscriptionCheck, async (req, res) => {
  const { style, voice, speed } = req.body
  const { pdfId } = req.params

  try {
    const pdfDoc = await Pdf.findOne({ _id: pdfId, user: req.user.userId })
    if (!pdfDoc) return res.status(404).json({ message: 'PDF not found' })

    // Create subfolder for this PDF inside tts-audio folder
    const pdfAudioDir = path.join(__dirname, '../tts-audio', pdfId.toString())
    if (!fs.existsSync(pdfAudioDir)) {
      fs.mkdirSync(pdfAudioDir, { recursive: true })
    }

    for (let page of pdfDoc.pages) {
      if (!page.text || page.text.trim() === '') {
        page.explanation = '[No text found on this page]'
        page.audioFileName = ''
        continue
      }

      const explanation = await generateExplanation(
        page.text,
        style,
        page.pageNumber
      )
      page.explanation = explanation

      const audioContent = await textToSpeechConvert(
        explanation,
        voice || 'en-US-Wavenet-D',
        speed || 1.0
      )

      // Save audio in the PDF subfolder
      const audioFileName = `tts-page-${page.pageNumber}.mp3`
      const audioFilePath = path.join(pdfAudioDir, audioFileName)

      await fs.promises.writeFile(audioFilePath, audioContent, 'binary')

      // Store relative path or filename to retrieve later
      // For example: 'pdfId/tts-page-1.mp3'
      page.audioFileName = path.join(pdfId.toString(), audioFileName)
    }

    await pdfDoc.save()

    res.json({
      message: 'Explanations and audio generated',
      pdf: pdfDoc,
    })
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({ message: 'Failed to generate explanations and audio' })
  }
})

router.get('/pdf/:pdfId', auth, async (req, res) => {
  try {
    const pdfDoc = await Pdf.findOne({
      _id: req.params.pdfId,
      user: req.user.userId,
    })
    if (!pdfDoc) return res.status(404).json({ message: 'PDF not found' })

    // Build full audio URLs for each page (adjust base URL as needed)
    const baseAudioUrl = `${req.protocol}://${req.get('host')}/tts-audio/`

    const pagesWithAudioUrls = pdfDoc.pages.map((page) => ({
      pageNumber: page.pageNumber,
      text: page.text,
      explanation: page.explanation,
      audioUrl: page.audioFileName
        ? baseAudioUrl + page.audioFileName.replace(/\\/g, '/')
        : null,
    }))

    res.json({
      pdfId: pdfDoc._id,
      originalFileName: pdfDoc.originalFileName,
      pages: pagesWithAudioUrls,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to fetch PDF data' })
  }
})

module.exports = router
