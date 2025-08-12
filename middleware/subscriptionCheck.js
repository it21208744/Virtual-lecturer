const User = require('../models/User')

const subscriptionCheck = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)

    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    const now = new Date()

 
    if (
      user.subscriptionStatus.plan !== 'free' &&
      user.subscriptionStatus.expiryDate &&
      user.subscriptionStatus.expiryDate > now
    ) {
      return next()
    }


    if (user.freeTrialCount > 0) {
      return next()
    }

  
    return res.status(403).json({
      message:
        'Trial expired. Please subscribe to continue using this feature.',
    })
  } catch (error) {
    console.error('Subscription check error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = subscriptionCheck
