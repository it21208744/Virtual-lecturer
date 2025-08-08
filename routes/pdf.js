const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const pdfParse = require('pdf-parse')
const auth = require('../middleware/auth')
const Pdf = require('../models/Pdf')

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

router.post('/upload', auth, upload.single('pdf'), async (req, res) => {
  try {
    const dataBuffer = fs.readFileSync(req.file.path)

    // Extract text per page
    const pdfData = await pdfParse(dataBuffer, {
      pagerender: (pageData) =>
        pageData.getTextContent().then((textContent) => {
          return textContent.items.map((item) => item.str).join(' ')
        }),
    })

    // pdfData.text is all text combined, but we want per page text:
    // pdf-parse doesn’t provide direct per-page text in the default API,
    // so you might need to parse it differently or use pdfjs-dist for more control.
    // For MVP, you can use combined text, or explore pdfjs-dist if you want per-page text.

    // For simplicity here, store the entire text as page 1 (adjust later)
    const pdfRecord = new Pdf({
      user: req.user.userId,
      originalFileName: req.file.originalname,
      storedFileName: req.file.filename,
      pages: [
        {
          pageNumber: 1,
          text: pdfData.text,
        },
      ],
    })

    await pdfRecord.save()

    res.json({ message: 'PDF uploaded and processed', pdfId: pdfRecord._id })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to process PDF' })
  }
})

module.exports = router
