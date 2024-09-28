const dynamoDB = require('../Models/contact');



const getPlantDetails = async (Pno) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS, // Make sure this matches your actual product table name
    Key: {
      Pno,
    },
  };

  try {
    const { Item } = await // The `.promise()` call might be on an JS SDK v2 client API.
    // If yes, please remove .promise(). If not, remove this comment.
    dynamoDB.get(params).promise();
    return Item ? { plantName: Item.plantName, plantPrice: Item.plantPrice } : null;
  } catch (error) {
    console.error('Error fetching product details:', error);
    throw new Error('Error fetching product details');
  }
};

const generateItemNumber = () => {
    // Generate a random 5-digit number and return it as a number, not a string
    return Math.floor(10000 + Math.random() * 90000);
};


const addToCart = async (req, res) => {
  const { Pno, quantity, CustName, CustEmail, CustMob } = req.body;

  try {
    const product = await getPlantDetails(Pno);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const totalCost = quantity * product.plantPrice;
    const ItemNo = generateItemNumber();

    const cartItem = {
      TableName: process.env.DYNAMODB_TABLE_NAME_CART, // Define your cart table name in your environment variables
      Item: {
        CustEmail, // Assuming CustEmail + Pno as a simple composite key for uniqueness in this example
        Pno,
        ItemNo,
        CustName,
        CustMob,
        plantName: product.plantName,
        quantity,
        plantPrice: product.plantPrice,
        totalCost,
      },
    };

    await // The `.promise()` call might be on an JS SDK v2 client API.
    // If yes, please remove .promise(). If not, remove this comment.
    dynamoDB.put(cartItem).promise();

    res.status(201).json({ message: 'Item added to cart successfully', cartItem: cartItem.Item });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


//Get API for all 
const getAllCartItems = async (req, res) => {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_CART,
    };
  
    try {
      const data = await // The `.promise()` call might be on an JS SDK v2 client API.
      // If yes, please remove .promise(). If not, remove this comment.
      dynamoDB.scan(params).promise();
      res.status(200).json({ items: data.Items });
    } catch (error) {
      console.error('Error fetching cart items:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

module.exports = { addToCart, getAllCartItems };
