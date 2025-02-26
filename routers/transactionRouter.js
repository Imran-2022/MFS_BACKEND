const express = require('express');
const { Transaction, validate } = require('../models/transactions');
const { User } = require('../models/user');
const bcrypt = require('bcrypt');
const authorize = require('../middlewares/authorize');
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

        if (!senderUser || !receiverUser) {
            return res.status(400).json({ error: "Sender or Receiver not found" });
        }
        if (senderUser.mobile === receiverUser.mobile) {
            return res.status(400).json({ error: "Sender & Receiver can't be same" });
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
            const isMatch = await bcrypt.compare(req.body.pin, senderUser.pin)
            if (!isMatch) {
                return res.status(400).json({ error: "Invalid Pin !!" });
            }
            if (amount < 50) {
                return res.status(400).json({ error: "For send money, amount should be more than 50" });
            }
            if (amount >= 50 && amount <= 100) {
                if (amount > senderUser.balance) {
                    return res.status(400).json({ error: "Insufficient balance" });
                } else {
                    senderUser.balance -= amount;
                    receiverUser.balance += amount;
                }
            }

            if (amount > 100) {
                if (amount > (senderUser.balance + 5)) {
                    return res.status(400).json({ error: "Insufficient balance" });
                }
                else {
                    const admin = await User.findOne({ accountType: "Admin" });
                    admin.balance += 5; //income
                    // Deduct from sender & add to receiver
                    senderUser.balance -= (amount + 5);
                    receiverUser.balance += amount;
                    await admin.save();
                }

            }

            // Save updated balances
            await senderUser.save();
            await receiverUser.save();
        }

        // Cash In logic
        if (type === "Cash In") {

            if (senderUser.accountType != "Admin") {
                const isMatch = await bcrypt.compare(req.body.pin, senderUser.pin)
                if (!isMatch) {
                    return res.status(400).json({ error: "Invalid Pin !!" });
                }
            }

            if (req.body?.balanceRequest) {
                receiverUser.balanceRequest = false;
            }

            if (senderUser.accountType == "User") {
                return res.status(400).json({ error: "Sender Can't User for cash in" });
            }
            if (amount > senderUser.balance) {
                return res.status(400).json({ error: "Insufficient balance" });
            }
            senderUser.balance -= amount;
            receiverUser.balance += amount;
            await receiverUser.save();
            await senderUser.save();
        }

        // Cash Out logic
        if (type === "Cash Out") {
            const isMatch = await bcrypt.compare(req.body.pin, senderUser.pin)
            if (!isMatch) {
                return res.status(400).json({ error: "Invalid Pin !!" });
            }
            if (receiverUser.accountType != "Agent") {
                return res.status(400).json({ error: "receiver Should be Agent" });
            }
            if (amount > senderUser.balance + (amount * 1.5) / 100) {
                return res.status(400).json({ error: "Insufficient balance for cash out" });
            }

            senderUser.balance -= amount + (amount * 1.5) / 100;
            receiverUser.balance += amount;
            receiverUser.balance += (amount) / 100; // income 

            const admin = await User.findOne({ accountType: "Admin" });
            admin.balance += (amount * 0.5) / 100; // income

            await admin.save();
            await receiverUser.save();
            await senderUser.save();
            // console.log(senderUser.pin,"hash");
            // console.log(req.body.pin);
            // console.log(isMatch);
            // return ;
        }

        // Save transaction
        await transaction.save();
        return res.status(201).json(transaction);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

const userTransactions = async (req, res) => {
    try {
        const { mobile } = req.params;

        // Find transactions where the user is either sender or receiver
        const transactions = await Transaction.find({
            $or: [{ sender: mobile }, { receiver: mobile }]
        }).sort({ timestamp: -1 }); // Sorting in descending order

        return res.status(200).json(transactions);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const allTransaction = async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ timestamp: -1 }); // Sorting in descending order;
        return res.status(200).json(transactions);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

router.route('/')
    .post(authorize,newTransaction)
    .get(allTransaction)
router.route('/:mobile')
    .get(userTransactions)

module.exports = router;