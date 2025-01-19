const Order = require('../models/Order');

class OrderProcessor {
    async validateOrder(orderData) {
        if (!orderData.items || orderData.items.length === 0) {
            throw new Error('Order must contain at least one item');
        }
        if (!orderData.customerId) {
            throw new Error('Customer ID is required');
        }
        if (!orderData.shippingAddress) {
            throw new Error('Shipping address is required');
        }
    }

    async checkInventory(items) {
        // Simulate inventory check
        return new Promise((resolve) => {
            setTimeout(() => {
                const isAvailable = Math.random() > 0.1; // 90% success rate
                if (!isAvailable) {
                    throw new Error('Some items are out of stock');
                }
                resolve(true);
            }, 500);
        });
    }

    async processPayment(amount) {
        // Simulate payment processing
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const isSuccessful = Math.random() > 0.1; // 90% success rate
                if (isSuccessful) {
                    resolve({ transactionId: 'TXN' + Date.now() });
                } else {
                    reject(new Error('Payment processing failed'));
                }
            }, 1000);
        });
    }

    async updateOrderStatus(orderId, status, errorMessage = null) {
        const update = {
            status,
            updatedAt: new Date()
        };
        
        if (errorMessage) {
            update.errorMessage = errorMessage;
        }

        return await Order.findOneAndUpdate(
            { orderId },
            update,
            { new: true }
        );
    }

    async notifyCustomer(order) {
        // Simulate sending email notification
        console.log(`Notification sent to customer ${order.customerId} for order ${order.orderId}`);
        return true;
    }
}

module.exports = new OrderProcessor(); 