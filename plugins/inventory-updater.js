'use strict';

const fp = require('fastify-plugin');
const axios = require('axios');  // Add axios import

module.exports = fp(async function (fastify, opts) {
  
  // Decorate fastify with updateInventory method
  fastify.decorate('updateInventory', async (items) => {
    const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
    const updates = [];
    
    for (const item of items) {
      const update = axios.put(  // Use axios directly
        `${productServiceUrl}/products/${item.productId}/inventory`,
        { quantity_change: -item.quantity }
      );
      updates.push(update);
    }
    
    await Promise.all(updates);
    return true;
  });
});