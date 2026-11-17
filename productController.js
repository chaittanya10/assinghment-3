const mongoose = require('mongoose');
const Product = require('../models/Product');

const allowedSortFields = new Set(['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'createdAt']);

function parseNumber(value, label, { min = -Infinity, max = Infinity, integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
    const error = new Error(`${label} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}.`);
    error.status = 400;
    throw error;
  }
  return number;
}

function getProductId(req) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error('Product ID must be a valid MongoDB ObjectId.');
    error.status = 400;
    throw error;
  }
  return req.params.id;
}

async function createProduct(req, res) {
  const product = await Product.create(req.body);
  res.status(201).json(product);
}

async function getProducts(req, res) {
  const page = parseNumber(req.query.page ?? 1, 'page', { min: 1, max: 1000000, integer: true });
  const limit = parseNumber(req.query.limit ?? 10, 'limit', { min: 1, max: 100, integer: true });
  const filter = {};

  if (req.query.category) filter.category = new RegExp(`^${escapeRegex(req.query.category.trim())}$`, 'i');
  if (req.query.search) {
    const search = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: search }, { sku: search }, { supplier: search }];
  }
  if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
    filter.price = {};
    if (req.query.minPrice !== undefined) filter.price.$gte = parseNumber(req.query.minPrice, 'minPrice', { min: 0 });
    if (req.query.maxPrice !== undefined) filter.price.$lte = parseNumber(req.query.maxPrice, 'maxPrice', { min: 0 });
    if (filter.price.$gte !== undefined && filter.price.$lte !== undefined && filter.price.$gte > filter.price.$lte) {
      const error = new Error('minPrice cannot be greater than maxPrice.');
      error.status = 400;
      throw error;
    }
  }

  const sortBy = req.query.sortBy || 'createdAt';
  if (!allowedSortFields.has(sortBy)) {
    const error = new Error(`sortBy must be one of: ${[...allowedSortFields].join(', ')}.`);
    error.status = 400;
    throw error;
  }
  const order = req.query.order || 'asc';
  if (!['asc', 'desc'].includes(order)) {
    const error = new Error('order must be asc or desc.');
    error.status = 400;
    throw error;
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter)
  ]);

  res.json({ total, page, totalPages: Math.ceil(total / limit), count: products.length, products });
}

async function getProductById(req, res) {
  const product = await Product.findById(getProductId(req));
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json(product);
}

async function updateProduct(req, res) {
  const product = await Product.findByIdAndUpdate(getProductId(req), req.body, {
    new: true,
    runValidators: true,
    context: 'query'
  });
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json(product);
}

async function deleteProduct(req, res) {
  const product = await Product.findByIdAndDelete(getProductId(req));
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json({ message: 'Product deleted.', id: product.id });
}

async function adjustStock(req, res) {
  const id = getProductId(req);
  const change = parseNumber(req.body?.change, 'change', { integer: true });
  if (change === 0) {
    const error = new Error('change must not be zero.');
    error.status = 400;
    throw error;
  }

  const filter = { _id: id };
  if (change < 0) filter.quantity = { $gte: Math.abs(change) };
  const product = await Product.findOneAndUpdate(
    filter,
    { $inc: { quantity: change } },
    { new: true, runValidators: true }
  );
  if (!product) {
    const exists = await Product.exists({ _id: id });
    if (!exists) return res.status(404).json({ message: 'Product not found.' });
    return res.status(400).json({ message: 'Insufficient stock: quantity cannot become negative.' });
  }
  res.json({ message: 'Stock updated.', product });
}

async function getLowStockProducts(req, res) {
  const filter = req.query.threshold === undefined
    ? { $expr: { $lte: ['$quantity', '$reorderLevel'] } }
    : { quantity: { $lte: parseNumber(req.query.threshold, 'threshold', { min: 0, integer: true }) } };
  const items = await Product.find(filter).sort({ quantity: 1, name: 1 });
  res.json({ count: items.length, lowStockItems: items });
}

async function getInventorySummary(req, res) {
  const [summary, totals] = await Promise.all([
    Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 1, totalItems: 1, totalQuantity: 1, totalStockValue: { $round: ['$totalStockValue', 2] }, avgPrice: { $round: ['$avgPrice', 2] } } }
    ]),
    Product.aggregate([
      { $group: { _id: null, totalProducts: { $sum: 1 }, totalQuantity: { $sum: '$quantity' }, totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } } } },
      { $project: { _id: 0, totalProducts: 1, totalQuantity: 1, totalStockValue: { $round: ['$totalStockValue', 2] } } }
    ])
  ]);
  res.json({ categories: summary.length, totals: totals[0] || { totalProducts: 0, totalQuantity: 0, totalStockValue: 0 }, summary });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct, adjustStock, getLowStockProducts, getInventorySummary };
