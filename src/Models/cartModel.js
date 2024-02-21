const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const cartSchema = new mongoose.Schema({
    userId: {
        type: ObjectId,
        ref: 'user',
        required: true,
        unique: true,
        trim: true

    },
    items: [{
        _id: false,
        productId: {
            type: ObjectId,
            ref: 'product',
            required: true,
            trim: true
        },

        quantity: {
            type: Number,
            required: true,
            default: 1,
            trim: true
        }
    }],
    totalPrice: {
        type: Number,
        required: true,
        trim: true
    },
    totalItems: {
        type: Number,
        required: true,
        trim: true
    },
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema)