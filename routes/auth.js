const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const sendEmail = require('../utils/sendEmail')

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body

  try {
    let user = await User.findOne({ email })
    if (user) return res.status(400).json({ message: 'User already exists' })

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const emailVerificationToken = crypto.randomBytes(20).toString('hex')

    user = new User({
      name,
      email,
      passwordHash,
      emailVerificationToken,
    })

    await user.save()

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}&email=${email}`

    const message = `<p>Please verify your email by clicking <a href="${verificationUrl}">here</a>.</p>`

    await sendEmail(email, 'Verify your email', message)

    res
      .status(201)
      .json({ message: 'Signup successful, please verify your email' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Server error')
  }
})

// Email verification endpoint
router.get('/verify-email', async (req, res) => {
  const { token, email } = req.query

  try {
    const user = await User.findOne({ email, emailVerificationToken: token })
    if (!user) return res.status(400).send('Invalid token')

    user.isEmailVerified = true
    user.emailVerificationToken = null
    await user.save()

    res.send('Email verified successfully. You can now login.')
  } catch (error) {
    console.error(error)
    res.status(500).send('Server error')
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Invalid credentials' })

    if (!user.isEmailVerified) {
      return res
        .status(401)
        .json({ message: 'Email not verified. Please check your inbox.' })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch)
      return res.status(400).json({ message: 'Invalid credentials' })

    const payload = {
      userId: user._id,
      email: user.email,
      name: user.name,
      subscriptionStatus: user.subscriptionStatus,
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })

    res.json({ token, user: payload })
  } catch (error) {
    console.error(error)
    res.status(500).send('Server error')
  }
})

const auth = require('../middleware/auth')

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      '-passwordHash -emailVerificationToken'
    )
    res.json(user)
  } catch (error) {
    res.status(500).send('Server error')
  }
})

module.exports = router
