const express = require('express');
const productRoutes = require('./routes/productRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '100kb' }));
app.get('/', (req, res) => res.json({ message: 'Inventory Data Management API', endpoints: '/api/products' }));
app.use('/api/products', productRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
