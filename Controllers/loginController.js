const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dynamoDB = require('../models/contact');
const { v4: uuidv4 } = require('uuid');  // Import DynamoDB model
const dotenv = require('dotenv');
dotenv.config();

async function signup(req, res) {
  try {
    const { email, password } = req.body;

    // Check if the user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const unoNumber = uuidv4();

    // Save the user to DynamoDB
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_USERS,
      Item: {
        email,
        password: hashedPassword,
        unoNumber, // Store the generated Uno number with the user's details
      }
    };
    await dynamoDB.put(params).promise();

    res.status(201).json({ message: "User registered successfully", unoNumber });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}


async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Get the user by email from DynamoDB
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET);

    // Include a success message in the response
    res.json({
      message: "Login successful", // Success message
      token,
      email: user.email,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}


// Helper function to get user by email from DynamoDB
async function getUserByEmail(email) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME_USERS,
    Key: {
      email,
    }
  };
  const data = await dynamoDB.get(params).promise();
  return data.Item;
}

module.exports = { signup, login };
