const express = require('express');
const { Transaction, validate } = require('../models/transactions');
const { User } = require('../models/user'); 

const router = express.Router();

const newTransaction = async (req, res) => {
    try {
        const { error } = validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        // Extract values
        const { sender, receiver, amount, type } = req.body;

        // Find sender & receiver by mobile number
        const senderUser = await User.findOne({ mobile: sender });
        const receiverUser = await User.findOne({ mobile: receiver });

        if (!senderUser || !receiverUser || senderUser.mobile === receiverUser.mobile) {
            return res.status(400).json({ error: "Sender or Receiver not found" });
        }

        // Create transaction object
        const transaction = new Transaction({
            sender: senderUser.mobile,
            receiver: receiverUser.mobile,
            amount,
            type
        });

        // Send Money logic
        if (type === "Send Money") {
            if (amount < 50) {
                return res.status(400).json({ error: "For send money, amount should be more than 50" });
            }
            if(amount>=50 && amount<=100){
                if (amount > senderUser.balance) {
                    return res.status(400).json({ error: "Insufficient balance" });
                }else{
                    senderUser.balance -= amount;
                    receiverUser.balance += amount;
                }
            }

            if(amount>100){
                if(amount>(senderUser.balance+5)){
                    return res.status(400).json({ error: "Insufficient balance" });
                }
                else{
                    const admin = await User.findOne({ accountType: "Admin" });
                    admin.income+=5;
                    await admin.save();
                     // Deduct from sender & add to receiver
                    senderUser.balance -=( amount + 5);
                    receiverUser.balance += amount;
                }
               
            }

            // Save updated balances
            await senderUser.save();
            await receiverUser.save();
        }

        // Cash In logic
        if (type === "Cash In") {
            if(senderUser.accountType!="Agent"){
                return res.status(400).json({ error: "Sender Should be Agent" });
            }
            if(amount>senderUser.balance){
                return res.status(400).json({ error: "Insufficient balance" });
            }
            senderUser.balance-=amount;
            receiverUser.balance+=amount;
            await receiverUser.save();
            await senderUser.save();
        }

        // Cash Out logic
        if (type === "Cash Out") {

            if(receiverUser.accountType!="Agent"){
                return res.status(400).json({ error: "receiver Should be Agent" });
            }
            if (amount > senderUser.balance +(amount*1.5)/100) {
                return res.status(400).json({ error: "Insufficient balance for cash out" });
            }

            senderUser.balance-=amount + (amount*1.5)/100;
            receiverUser.balance+=amount;
            receiverUser.income+=(amount)/100;

            const admin = await User.findOne({ accountType: "Admin" });
            admin.income+=(amount*0.5)/100;

            await admin.save();
            await receiverUser.save();
            await senderUser.save();
        }

        // Save transaction
        await transaction.save();
        return res.status(201).json(transaction);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

router.route('/').post(newTransaction);
module.exports = router;