const dynamoDB = require('../models/contact');



const getPlantDetails = async (Pno) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS, // Make sure this matches your actual product table name
    Key: {
      Pno,
    },
  };

  try {
    const { Item } = await dynamoDB.get(params).promise();
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


// const addToCart = async (req, res) => {
//   const { Pno, quantity, CustName, CustEmail, CustMob } = req.body;

//   try {
//     const product = await getPlantDetails(Pno);
//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     const totalCost = quantity * product.plantPrice;
//     const ItemNo = generateItemNumber();

//     const cartItem = {
//       TableName: process.env.DYNAMODB_TABLE_NAME_CART, // Define your cart table name in your environment variables
//       Item: {
//         CustEmail, // Assuming CustEmail + Pno as a simple composite key for uniqueness in this example
//         Pno,
//         ItemNo,
//         CustName,
//         CustMob,
//         plantName: product.plantName,
//         quantity,
//         plantPrice: product.plantPrice,
//         totalCost,
//       },
//     };

//     await dynamoDB.put(cartItem).promise();

//     res.status(201).json({ message: 'Item added to cart successfully', cartItem: cartItem.Item });
//   } catch (error) {
//     console.error('Error adding item to cart:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

// const addMultipleToCart = async (req, res) => {
//   const { items } = req.body; // Expect an array of objects representing products to add

//   // Input validation (optional but recommended)
//   if (!items || !Array.isArray(items) || items.length === 0) {
//     return res.status(400).json({ message: 'Invalid request body: "items" array is required' });
//   }

//   try {
//     const productDetails = await Promise.all(items.map(async (item) => { // Use "item" here
//       return await getPlantDetails(item.Pno); // Assuming "Pno" is the property for product number
//     }));
//     const validProducts = productDetails.filter(product => product); // Filter out any products not found

//     if (validProducts.length === 0) {
//       return res.status(404).json({ message: 'No valid products found in the request' });
//     }

//     const cartItems = validProducts.map(product => ({
//       TableName: process.env.DYNAMODB_TABLE_NAME_CART,
//       Item: {
//         // Assuming CustEmail + Pno as a simple composite key for uniqueness
//         CustEmail: req.body.CustEmail, // Retrieve CustEmail from request body
//         Pno: product.Pno,
//         ItemNo: generateItemNumber(),
//         CustName: req.body.CustName, // Assuming CustName is provided in the request body
//         CustMob: req.body.CustMob, // Assuming CustMob is provided in the request body
//         plantName: product.plantName,
//         quantity: product.quantity, // Assuming quantity is provided for each product in the "items" array
//         plantPrice: product.plantPrice,
//         totalCost: product.quantity * product.plantPrice,
//       },
//     }));

//     await Promise.all(cartItems.map(dynamoDB.put.promise)); // Add cart items concurrently

//     res.status(201).json({ message: 'Items added to cart successfully', cartItems });
//   } catch (error) {
//     console.error('Error adding items to cart:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

const addToCart = async (req, res) => {
  const cartItems = req.body; // Array of product objects to be added to the cart

  try {
    const promises = cartItems.map(async (item) => {
      const { Pno, quantity, CustName, CustEmail, CustMob } = item;

    const product = await getPlantDetails(Pno);
    if (!product) {
        return { message: `Product with Pno ${Pno} not found` };
    }

    const totalCost = quantity * product.plantPrice;
    const ItemNo = generateItemNumber();

    const cartItem = {
        TableName: process.env.DYNAMODB_TABLE_NAME_CART,
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

    await dynamoDB.put(cartItem).promise();

      return { message: `Product with Pno ${Pno} added to cart successfully`, cartItem: cartItem.Item };
    });

    const results = await Promise.all(promises);
    res.status(201).json(results);
  } catch (error) {
    console.error('Error adding item(s) to cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


//Get API for all 
const getAllCartItems = async (req, res) => {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_CART,
    };
  
    try {
      const data = await dynamoDB.scan(params).promise();
      res.status(200).json({ items: data.Items });
    } catch (error) {
      console.error('Error fetching cart items:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

module.exports = { addToCart, getAllCartItems };
