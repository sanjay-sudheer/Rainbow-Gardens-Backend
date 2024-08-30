const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());

app.use(cors());

// Routes
const routes = require('./Routes/authRoutes');

app.use('/api', routes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});