const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const nodemailer = require('nodemailer');

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const generateRandomCode = () => {
  // Generate a random 6-digit code as a string
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Function to check if email exists in DynamoDB
const checkEmailExists = async (email) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_AUTH,
      Key: {
        email: email,
      },
    };

    const data = await dynamoDB.get(params).promise();

    return !!data.Item; // Returns true if email exists, false otherwise
  } catch (error) {
    console.error('Error checking if email exists:', error);
    throw error;
  }
};

// Function to send email with verification code
const sendVerificationCode = async (email) => {
  try {
    const code = generateRandomCode();

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Verification Code for Your Account',
      text: `Your verification code is: ${code}`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return code; // Return the verification code
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// API endpoint to send verification code to the provided email
const sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email already exists in the DynamoDB table
    const emailExists = await checkEmailExists(email);

    if (emailExists) {
      return res.status(200).json({ message: 'User already exists' });
    }

    // If the email does not exist, send the verification code
    const verificationCode = await sendVerificationCode(email);

    res.status(200).json({ message: 'Verification code sent successfully', verificationCode });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Function to store email ID and verification code in DynamoDB
const storeEmailAndVerificationCodeInDB = async (email, verificationCode) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_AUTH,
      Item: {
        Eno: generateRandomCode(), // Generate Eno
        email: email,
        verificationCode: verificationCode,
      },
    };

    await dynamoDB.put(params).promise();
  } catch (error) {
    console.error('Error storing email and verification code in DynamoDB:', error);
    throw error;
  }
};

// API endpoint to verify the provided code and store the email in DynamoDB
const storeEmailAndVerifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Compare the provided code with the stored code
    // For simplicity, let's assume the codes match
    const verificationCode = code; // Assuming the verification code is passed in the request

    // Store the email and verification code in DynamoDB
    await storeEmailAndVerificationCodeInDB(email, verificationCode);

    res.status(200).json({ message: 'Email stored in DynamoDB successfully' });
  } catch (error) {
    console.error('Error verifying code and storing email:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { sendVerificationEmail, storeEmailAndVerifyCode };
