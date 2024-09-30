const {
  DynamoDBClient,
  ScanCommand,
  GetCommand,
  BatchWriteItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB Document Client
const dynamoDB = DynamoDBDocument.from(new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
}));

// Function to retrieve plantName, plantPrice, and URL of the first image from the database
const getAddCartPlantDetails = async (req, res, email) => {
  try {
    // Define parameters for DynamoDB scan operation
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
    };

    // Retrieve all items from the DynamoDB table
    const data = await dynamoDB.send(new ScanCommand(params));

    // Extract the items from the response
    const products = data.Items;

    // Extract plantName, plantPrice, and URL of the first image for each product
    const plantDetails = products.map(product => ({
      Eno: { S: email },
      Pno: product.Pno,
      plantName: product.plantName,
      plantPrice: product.plantPrice,
      imageUrl: (product.images && product.images.length > 0) ? product.images[0] : null,
    }));

    // Return the plant details as a JSON response
    res.status(200).json(plantDetails);
  } catch (error) {
    console.error('Error fetching plant details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Function to retrieve plantName, plantPrice, and URL of the first image by Pno
const getaddcartPlantDetailsByPno = async (req, res) => {
  try {
    // Extract the Pno from the request parameters
    const { Pno } = req.params;

    // Define parameters for DynamoDB query operation
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      Key: {
        Pno: Pno,
      },
    };

    // Retrieve the product from DynamoDB
    const data = await dynamoDB.send(new GetCommand(params));

    // Check if the product exists
    if (!data.Item) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Extract plantName, plantPrice, and URL of the first image
    const plantDetails = {
      Pno: data.Item.Pno,
      plantName: data.Item.plantName,
      plantPrice: data.Item.plantPrice,
      imageUrl: (data.Item.images && data.Item.images.length > 0) ? data.Item.images[0] : null,
    };

    // Add the retrieved item to the database
    await addPlantDetailsToCart([plantDetails]);

    // Return the plant details as a JSON response
    res.status(200).json(plantDetails);
  } catch (error) {
    console.error('Error fetching plant details by Pno:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Function to add multiple items to the DynamoDB table
const addPlantDetailsToCart = async (plantDetailsArray) => {
  try {
    // Ensure that plantDetailsArray is an array
    if (!Array.isArray(plantDetailsArray)) {
      throw new Error('Plant details must be provided as an array');
    }

    // Create an array to store the items to be added to DynamoDB
    const items = plantDetailsArray.map(plantDetails => ({
      Pno: { S: plantDetails.Pno },
      plantName: { S: plantDetails.plantName },
      plantPrice: { N: plantDetails.plantPrice.toString() },
      // Add other properties as needed
    }));

    // Create parameters for DynamoDB batchWrite operation
    const params = {
      RequestItems: {
        [process.env.DYNAMODB_TABLE_CARTADD]: items.map(Item => ({
          PutRequest: { Item },
        })),
      },
    };

    // Batch write the items into DynamoDB table
    await dynamoDB.send(new BatchWriteItemCommand(params));
  } catch (error) {
    console.error('Error adding plant details to cart:', error);
    throw error; // Rethrow the error to handle it in the calling function if necessary
  }
};

module.exports = { getAddCartPlantDetails, getaddcartPlantDetailsByPno, addPlantDetailsToCart };
