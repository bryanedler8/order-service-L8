'use strict';

const fp = require('fastify-plugin');
const axios = require('axios');  // Add this line

module.exports = fp(async function (fastify, opts) {
  
  // Best Buy order processing logic
  fastify.decorate('processOrder', async (orderData) => {
    const { items, customer, shippingAddress, paymentMethod, addProtection, useRewards } = orderData;
    
    const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
    
    // Validate inventory with Product Service
    for (const item of items) {
      const productResponse = await axios.get(`${productServiceUrl}/products/${item.productId}`);
      const product = productResponse.data;
      
      if (product.quantity_available < item.quantity) {
        throw new Error(`Insufficient inventory for ${product.name}`);
      }
    }
    
    // Calculate order total
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const productResponse = await axios.get(`${productServiceUrl}/products/${item.productId}`);
      const product = productResponse.data;
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      
      orderItems.push({
        productId: item.productId,
        name: product.name,
        brand: product.brand,
        category: product.category,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal
      });
    }
    
    // Calculate tax (example: 8% tax rate)
    const taxRate = 0.08;
    const tax = subtotal * taxRate;
    
    // Calculate shipping (free over $35)
    let shippingCost = 0;
    if (subtotal < 35) {
      shippingCost = 5.99;
    }
    
    // Apply Best Buy rewards discount
    let rewardsDiscount = 0;
    if (useRewards && customer.rewardsNumber) {
      rewardsDiscount = subtotal * 0.05; // 5% discount for rewards members
    }
    
    // Add Geek Squad protection if requested
    let protectionCost = 0;
    if (addProtection) {
      protectionCost = subtotal * 0.10; // 10% for protection plan
    }
    
    const total = Number((subtotal + tax + shippingCost + protectionCost - rewardsDiscount).toFixed(2));
    
    // Create order object
    const order = {
      id: `BBY-${Date.now()}`,
      items: orderItems,
      customer: {
        name: customer.name,
        email: customer.email,
        rewardsNumber: customer.rewardsNumber || null
      },
      shippingAddress,
      paymentMethod: paymentMethod.type,
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      shippingCost: Number(shippingCost.toFixed(2)),
      protectionCost: Number(protectionCost.toFixed(2)),
      rewardsDiscount: Number(rewardsDiscount.toFixed(2)),
      total,
      addProtection,
      useRewards,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    return order;
  });
});