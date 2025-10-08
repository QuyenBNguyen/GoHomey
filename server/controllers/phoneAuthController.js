// Simple phone authentication controller for demo
const verificationStore = new Map();

// Format Vietnamese phone numbers
const formatVietnamesePhone = (phone) => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+84')) return cleaned;
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('84')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+84${cleaned.substring(1)}`;
  if (cleaned.length >= 9 && cleaned.length <= 10) return `+84${cleaned}`;
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

// Generate random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP endpoint
const sendOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const formattedPhone = formatVietnamesePhone(phoneNumber);
    const otp = generateOTP();
    
    // Store OTP with expiration (5 minutes)
    verificationStore.set(formattedPhone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      attempts: 0,
      timestamp: Date.now()
    });

    // Log OTP clearly for demo purposes
    console.log('\n' + '='.repeat(50));
    console.log(`📱 PHONE: ${formattedPhone}`);
    console.log(`🔐 OTP CODE: ${otp}`);
    console.log('='.repeat(50) + '\n');
    
    res.json({
      success: true,
      message: `Verification code sent to ${formattedPhone}`,
      // For demo only - remove in production
      otp: otp,
      note: "Demo mode: Use the OTP shown above or any 6-digit number"
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

// Verify OTP endpoint
const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and code are required'
      });
    }

    const formattedPhone = formatVietnamesePhone(phoneNumber);
    const verificationData = verificationStore.get(formattedPhone);

    if (!verificationData) {
      return res.status(400).json({
        success: false,
        message: 'No verification session found. Please request a new OTP.'
      });
    }

    // Check if expired
    if (Date.now() > verificationData.expiresAt) {
      verificationStore.delete(formattedPhone);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new OTP.'
      });
    }

    // Check attempt limit
    if (verificationData.attempts >= 3) {
      verificationStore.delete(formattedPhone);
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // For demo: Accept the generated OTP OR any 6-digit number
    const isValidCode = (
      verificationData.otp === code || 
      (code.length === 6 && /^\d+$/.test(code))
    );

    if (!isValidCode) {
      verificationData.attempts += 1;
      verificationStore.set(formattedPhone, verificationData);
      
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });
    }

    // Verification successful
    verificationStore.delete(formattedPhone);

    // Log successful verification
    console.log('\n' + '✅'.repeat(25));
    console.log(`🎉 VERIFICATION SUCCESSFUL!`);
    console.log(`📱 PHONE: ${formattedPhone}`);
    console.log(`🔐 CODE USED: ${code}`);
    console.log('✅'.repeat(25) + '\n');

    // Create demo user
    const user = {
      uid: `demo_user_${Date.now()}`,
      phoneNumber: formattedPhone,
      displayName: `User ${formattedPhone.slice(-4)}`,
      verified: true,
      createdAt: new Date().toISOString()
    };

    const token = `demo_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.json({
      success: true,
      message: 'Phone number verified successfully!',
      token: token,
      user: user
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP
};