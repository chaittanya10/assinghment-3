const express = require('express');
const controller = require('../controllers/productController');

const router = express.Router();

router.route('/').post(controller.createProduct).get(controller.getProducts);
router.get('/low-stock', controller.getLowStockProducts);
router.get('/summary', controller.getInventorySummary);
router.patch('/:id/stock', controller.adjustStock);
router.route('/:id').get(controller.getProductById).put(controller.updateProduct).delete(controller.deleteProduct);

module.exports = router;
