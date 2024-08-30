const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();

// AWS SDK Configuration
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const AUTH_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME_USERS;

const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    try {
      // Verify the token and extract the user information
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userEmail = decoded.email;

      // Check if the email exists in the DynamoDB auth table
      const params = {
        TableName: AUTH_TABLE_NAME,
        Key: { email: userEmail },
      };

      const result = await dynamoDB.get(params).promise();

      // If the email is not found, send a 403 Forbidden status
      if (!result.Item) {
        return res.sendStatus(403); // Forbidden
      }

      // Set the user info in the request object and proceed
      req.user = decoded;
      next();
    } catch (err) {
      // Handle any errors, including token verification errors
      console.error('Error verifying token or checking database:', err);
      res.sendStatus(403); // Forbidden
    }
  } else {
    res.sendStatus(401); // Unauthorized
  }
};

module.exports = authenticateJWT;
