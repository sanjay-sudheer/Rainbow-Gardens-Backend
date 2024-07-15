const aws = require("aws-sdk");
const dynamoDB = require("../models/contact"); // Ensure this is correctly pointing to your DynamoDB model

aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: process.env.AWS_REGION,
});

const s3 = new aws.S3();

// Assuming this function is meant to be called with `req.files` where files is an array of file objects
const uploadImages = async (files) => {
  try {
    if (!files || files.length === 0) {
      console.log("No images found in the request");
      return [];
    }

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

// Updated createProduct function to include image upload and category
const createProduct = async (req, res) => {
  try {
    const {
      plantName,
      plantSmallDescription,
      plantPrice,
      plantLongDescription,
      plantDescriptionForCard,
      category,
    } = req.body;
    
    const Pno = generateRandomNumber();

    const imageUrls = await uploadImages(req.files);

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      Item: {
        Pno,
        plantName,
        plantSmallDescription,
        plantPrice,
        plantLongDescription,
        plantDescriptionForCard,
        category,
        images: imageUrls,
      },
    };

    await dynamoDB.put(params).promise();

    // Construct the complete product object including all properties
    const createdProduct = {
      Pno,
      plantName,
      plantSmallDescription,
      plantPrice,
      plantLongDescription,
      plantDescriptionForCard,
      category,
      images: imageUrls,
    };

    res
      .status(201)
      .json({ message: "Product created successfully", product: createdProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getProductByName = async (req, res) => {
  try {
    // Extract the plantName and category from the request parameters
    const { plantName, category } = req.params;

    // Define parameters for DynamoDB scan operation with optional category filter
    let params;
    if (category) {
      params = {
        TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
        FilterExpression: "plantName = :name AND category = :category",
        ExpressionAttributeValues: {
          ":name": plantName,
          ":category": category,
        },
      };
    } else {
      params = {
        TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
        FilterExpression: "plantName = :name",
        ExpressionAttributeValues: {
          ":name": plantName,
        },
      };
    }

    // Retrieve the product from DynamoDB using scan operation
    const data = await dynamoDB.scan(params).promise();

    // Check if any matching products were found
    if (data.Items.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Since there can be multiple products with the same name, return all matching products
    res.status(200).json(data.Items);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

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

const getProductByPno = async (req, res) => {
  try {
    // Extract the Pno from the request parameters
    const { Pno } = req.params;

    // Define parameters for DynamoDB query
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      Key: {
        Pno,
      },
    };

    // Retrieve the product from DynamoDB
    const { Item } = await dynamoDB.get(params).promise();

    // Check if the product exists
    if (!Item) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Return the product as a JSON response
    res.status(200).json(Item);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    // Extract the Pno from the request parameters
    const { Pno } = req.params;

    // Extract updated product details from the request body
    const {
      plantName,
      plantSmallDescription,
      plantPrice,
      plantLongDescription,
      plantDescriptionForCard,
      category,
    } = req.body;

    // Define parameters for the DynamoDB update operation
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      Key: {
        Pno,
      },
      UpdateExpression:
        "set plantName = :n, plantSmallDescription = :sd, plantPrice = :p, plantLongDescription = :ld, plantDescriptionForCard = :dc, category = :cat",
      ExpressionAttributeValues: {
        ":n": plantName,
        ":sd": plantSmallDescription,
        ":p": plantPrice,
        ":ld": plantLongDescription,
        ":dc": plantDescriptionForCard,
        ":cat": category,
      },
      ReturnValues: "UPDATED_NEW",
    };

    // Perform the update operation on DynamoDB
    const { Attributes } = await dynamoDB.update(params).promise();

    // Return the updated product as a JSON response
    res.status(200).json(Attributes);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    // Extract the Pno from the request parameters
    const { Pno } = req.params;

    // Define parameters for the DynamoDB delete operation
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      Key: {
        Pno,
      },
    };

    // Perform the delete operation on DynamoDB
    await dynamoDB.delete(params).promise();

    // Return a success message as a JSON response
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  createProduct,
  getProductByName,
  getAllProducts,
  getProductByPno,
  updateProduct,
  deleteProduct,
};