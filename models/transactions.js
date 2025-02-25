const { Schema, model } = require('mongoose');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid'); // For generating unique transaction IDs

const transactionSchema = new Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true,
        default: uuidv4 // Generates a unique ID automatically
    },
    sender: {
        type: String,
        required: true,
        match: /^[0-9]{11}$/ 
    },
    receiver: {
        type: String,
        required: true,
        match: /^[0-9]{11}$/ 
    },
    amount: {
        type: Number,
        required: true,
        min: 0 
    },
    type: {
        type: String,
        required: true,
        enum: ["Send Money", "Cash In", "Cash Out"] 
    },
    balanceRequest: {
        type: Boolean,
        default:false
    },
    timestamp: {
        type: Date,
        default: Date.now // Auto-sets the transaction time
    }
});

// Joi Validation
const validateTransaction = (transaction) => {
    const schema = Joi.object({
        sender: Joi.string().length(11).pattern(/^[0-9]{11}$/).required(),
        receiver: Joi.string().length(11).pattern(/^[0-9]{11}$/).required(),
        amount: Joi.number().min(0).required(),
        balanceRequest: Joi.boolean(),
        type: Joi.string().valid("Send Money", "Cash In", "Cash Out").required()
    });

    return schema.validate(transaction);
};

module.exports.Transaction = model('Transaction', transactionSchema);
module.exports.validate = validateTransaction;
