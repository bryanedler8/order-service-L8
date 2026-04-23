'use strict';

module.exports = async function (fastify, opts) {
  
  // Store orders in memory (in production, use a database)
  const orders = new Map();
  
  // Create a new order
  fastify.post('/api/orders', async (request, reply) => {
    try {
      // Process the order (calculate totals, validate inventory)
      const order = await fastify.processOrder(request.body);
      
      // Update inventory in Product Service
      await fastify.updateInventory(request.body.items);
      
      // Store the order
      orders.set(order.id, order);
      
      // Send to message queue if available
      if (fastify.sendMessage) {
        fastify.sendMessage(Buffer.from(JSON.stringify(order)));
        fastify.log.info(`Order ${order.id} sent to queue`);
      }
      
      return reply.code(201).send({
        success: true,
        orderId: order.id,
        total: order.total,
        status: order.status,
        breakdown: {
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shippingCost,
          protection: order.protectionCost,
          rewardsDiscount: order.rewardsDiscount
        }
      });
      
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ 
        error: error.message || 'Failed to create order'
      });
    }
  });
  
  // Get order by ID
  fastify.get('/api/orders/:id', async (request, reply) => {
    const { id } = request.params;
    const order = orders.get(id);
    
    if (!order) {
      return reply.code(404).send({ error: 'Order not found' });
    }
    
    return reply.send(order);
  });
  
  // Cancel order
  fastify.put('/api/orders/:id/cancel', async (request, reply) => {
    const { id } = request.params;
    const order = orders.get(id);
    
    if (!order) {
      return reply.code(404).send({ error: 'Order not found' });
    }
    
    if (order.status !== 'pending') {
      return reply.code(400).send({ error: 'Order cannot be cancelled - already processed' });
    }
    
    order.status = 'cancelled';
    orders.set(id, order);
    
    return reply.send({ 
      success: true, 
      message: `Order ${id} cancelled successfully` 
    });
  });
  
  // Get order status
  fastify.get('/api/orders/:id/status', async (request, reply) => {
    const { id } = request.params;
    const order = orders.get(id);
    
    if (!order) {
      return reply.code(404).send({ error: 'Order not found' });
    }
    
    return reply.send({
      orderId: order.id,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt || order.createdAt
    });
  });
  
  // Get all orders (admin)
  fastify.get('/api/orders', async (request, reply) => {
    const allOrders = Array.from(orders.values());
    return reply.send({
      total: allOrders.length,
      orders: allOrders
    });
  });
  

  
  // Health check
//   fastify.get('/health', async () => {
//     return { 
//       status: 'ok', 
//       service: 'order-service',
//       timestamp: new Date().toISOString()
//     };
//   });
  
  // Root endpoint
  fastify.get('/', async () => {
    return {
      service: 'Best Buy Order Service',
      version: '1.0.0',
      description: 'Order processing for Best Buy electronics store',
      endpoints: [
        'POST /api/orders - Create a new order',
        'GET /api/orders/:id - Get order details',
        'PUT /api/orders/:id/cancel - Cancel an order',
        'GET /api/orders/:id/status - Check order status',
        'GET /api/orders - List all orders (admin)',
        'GET /health - Health check'
      ]
    };
  });
};