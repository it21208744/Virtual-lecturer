const mongoose = require('mongoose')

const PdfSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalFileName: String,
  storedFileName: String,
  uploadDate: { type: Date, default: Date.now },
  pages: [
    {
      pageNumber: Number,
      text: String,
      explanation: String, // AI-generated explanation
    },
  ],
})

module.exports = mongoose.model('Pdf', PdfSchema)
