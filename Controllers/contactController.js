const dynamoDB = require('../models/contact');

const createContact = async (req, res) => {
  try {
    const { Sno, firstName, lastName, email, mobileNumber, message } = req.body;

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_CONTACT,
      Item: {
        Sno: Sno,
        firstName,
        lastName,
        email,
        mobileNumber,
        message
      }
    };

    await dynamoDB.put(params).promise();

    res.status(201).json({ message: 'Contact created successfully' });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



//Get all Contacts
const getAllContacts = async (req, res) => {
    try {
      const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME_CONTACT,
      };
  
      // Retrieve all items from the DynamoDB table
      const data = await dynamoDB.scan(params).promise();
  
      // Extract the items from the response
      const contacts = data.Items;
  
      // Return the contacts as a JSON response
      res.status(200).json(contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

module.exports = { createContact, getAllContacts };
