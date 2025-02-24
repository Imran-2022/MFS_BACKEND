const express = require('express');
const { Transaction, validate } = require('../models/transactions');
const { User } = require('../models/user'); 

const router = express.Router();
const newTransaction = async(req,res)=>{
    const { error } = validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Find sender & receiver by mobile number
    const senderUser = await User.findOne({ mobile: req.body.sender });
    const receiverUser = await User.findOne({ mobile: req.body.receiver });

    if (!senderUser || !receiverUser) {
        return res.status(400).json({ error: "Sender or Receiver not found" });
    }

    // Create transaction
    const transaction = new Transaction({
        sender: senderUser.mobile,
        receiver: receiverUser.mobile,
        amount: req.body.amount,
        type: req.body.type
    });

    await transaction.save();
    res.status(201).json(transaction);
}

router.route('/')
    .post(newTransaction)

module.exports=router;