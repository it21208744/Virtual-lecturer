const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    preferredVoiceType: { type: String, default: 'female' },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    freeTrialCount: { type: Number, default: 3 },
    subscriptionStatus: {
      plan: { type: String, default: 'free' }, // free, monthly, yearly
      expiryDate: { type: Date },
    },
    trialUploadsLeft: { type: Number, default: 3 },
  },
  { timestamps: true }
)

module.exports = mongoose.model('User', UserSchema)
