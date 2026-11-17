const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
      minlength: [2, 'Product name must contain at least 2 characters.'],
      maxlength: [120, 'Product name cannot exceed 120 characters.']
    },
    sku: {
      type: String,
      required: [true, 'SKU is required.'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [40, 'SKU cannot exceed 40 characters.']
    },
    category: {
      type: String,
      required: [true, 'Category is required.'],
      trim: true,
      maxlength: [80, 'Category cannot exceed 80 characters.']
    },
    price: {
      type: Number,
      required: [true, 'Price is required.'],
      min: [0, 'Price cannot be negative.']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required.'],
      min: [0, 'Quantity cannot be negative.'],
      validate: { validator: Number.isInteger, message: 'Quantity must be a whole number.' }
    },
    reorderLevel: {
      type: Number,
      required: [true, 'Reorder level is required.'],
      min: [0, 'Reorder level cannot be negative.'],
      validate: { validator: Number.isInteger, message: 'Reorder level must be a whole number.' }
    },
    supplier: {
      type: String,
      required: [true, 'Supplier is required.'],
      trim: true,
      maxlength: [120, 'Supplier cannot exceed 120 characters.']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productSchema.virtual('stockValue').get(function getStockValue() {
  return Number((this.price * this.quantity).toFixed(2));
});

module.exports = mongoose.model('Product', productSchema);
