require("dotenv").config();

const aws = require("aws-sdk");
const dynamoDB = require('../models/contact'); // Ensure this is correctly pointing to your DynamoDB model

aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: process.env.AWS_REGION,
});

const s3 = new aws.S3();

// Assuming this function is meant to be called with `req.files` where files is an array of file objects
const uploadImages = async (files) => {
  try {
    console.log("Uploading files:", files);

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const { originalname, buffer, mimetype } = file;
        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          ACL: "public-read",
          ContentType: mimetype,
          Key: `${Date.now()}-${originalname}`, // Ensure unique file names
          Body: buffer,
        };

        const uploadResult = await s3.upload(params).promise();
        console.log("Uploaded File:", uploadResult);

        return uploadResult.Location; // Return the URL of the uploaded file
      })
    );

    console.log("All Uploaded Files:", uploadedFiles);
    return uploadedFiles;
  } catch (error) {
    console.error("Error uploading images:", error);
    throw error;
  }
};

const generateRandomNumber = () => {
  // Generate a random 5-digit number as a string
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Updated createProduct function to include image upload
const createProduct = async (req, res) => {
  try {
    const { plantName, plantSmallDescription, plantPrice, plantLongDescription, plantDescriptionForCard, category } = req.body;

    const Pno = generateRandomNumber();

    // Correctly call uploadImages within an async function
    const imageUrls = await uploadImages(req.files);

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      Item: {
        Pno, // Pass Pno as a string
        plantName,
        plantSmallDescription,
        plantPrice,
        plantLongDescription,
        plantDescriptionForCard,
        category,
        images: imageUrls, // Store image URLs from the upload
      },
    };

    await dynamoDB.put(params).promise();

    res.status(201).json({ message: 'Product created successfully', product: params.Item });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateProduct = async (req, res) => {
  try {
    // Extract the Pno from the request parameters
    const { Pno } = req.params;

    // Extract updated product details from the request body
    const { plantName, plantSmallDescription, plantPrice, plantLongDescription, plantDescriptionForCard, category } = req.body;

    // Handle image upload if new images are provided
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = await uploadImages(req.files);
    }

    // Log the incoming data
    console.log("Updating product with Pno:", Pno);
    console.log("Update data:", {
      plantName,
      plantSmallDescription,
      plantPrice,
      plantLongDescription,
      plantDescriptionForCard,
      category,
      images: imageUrls
    });

    // Define the update expression and attribute values
    let updateExpression = 'set plantName = :n, plantSmallDescription = :sd, plantPrice = :p, plantLongDescription = :ld, plantDescriptionForCard = :dc, category = :cat';
    const expressionAttributeValues = {
      ':n': plantName,
      ':sd': plantSmallDescription,
      ':p': plantPrice,
      ':ld': plantLongDescription,
      ':dc': plantDescriptionForCard,
      ':cat': category
    };

    // Add image URLs to the update expression if new images were uploaded
    if (imageUrls.length > 0) {
      updateExpression += ', images = :img';
      expressionAttributeValues[':img'] = imageUrls;
    }

    // Define parameters for the DynamoDB update operation
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      Key: {
        Pno: Pno
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'UPDATED_NEW'
    };

    // Perform the update operation on DynamoDB
    const data = await dynamoDB.update(params).promise();

    // Return the updated product as a JSON response
    res.status(200).json({ message: 'Product updated successfully', updatedProduct: data.Attributes });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};




//get API
const getAllProducts = async (req, res) => {
  try {
    const { category } = req.query; // Extract category from query parameters

    // Define parameters for DynamoDB scan operation with optional category filter
    let params;
    if (category) {
      params = {
        TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
        FilterExpression: "category = :category",
        ExpressionAttributeValues: {
          ":category": category,
        },
      };
    } else {
      params = {
        TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      };
    }

    // Retrieve all items from the DynamoDB table
    const data = await dynamoDB.scan(params).promise();

    // Extract the items from the response
    const products = data.Items;

    // Return the products as a JSON response
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


  //get product using Pno Number
  const getProductByPno = async (req, res) => {
    try {
      // Extract the Pno from the request parameters
      const { Pno } = req.params;
  
      // Define parameters for DynamoDB query
      const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
        Key: {
          Pno: Pno
        }
      };
  
      // Retrieve the product from DynamoDB
      const data = await dynamoDB.get(params).promise();
  
      // Check if the product exisnts
      if (!data.Item) {
        return res.status(404).json({ error: 'Product not found' });
      }
  
      // Return the product as a JSON response
      res.status(200).json(data.Item);
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };



// Get product by name
const getProductByName = async (req, res) => {
  try {
    // Extract the plantName from the request parameters
    const { plantName } = req.params;

    // Define parameters for DynamoDB scan operation
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      FilterExpression: 'plantName = :name',
      ExpressionAttributeValues: {
        ':name': plantName
      }
    };

    // Retrieve the product from DynamoDB using scan operation
    const data = await dynamoDB.scan(params).promise();

    // Check if any matching products were found
    if (data.Items.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Since there can be multiple products with the same name, return all matching products
    res.status(200).json(data.Items);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

  //Delete a product 
  const deleteProduct = async (req, res) => {
    try {
      // Extract the Pno from the request parameters
      const { Pno } = req.params;
  
      // Define parameters for the DynamoDB delete operation
      const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
        Key: {
          Pno: Pno
        }
      };
  
      // Perform the delete operation on DynamoDB
      await dynamoDB.delete(params).promise();
  
      // Return a success message as a JSON response
      res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };




module.exports = { createProduct, getAllProducts, getProductByPno, getProductByName, updateProduct, deleteProduct };


