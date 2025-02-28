const express =require('express');
const bcrypt = require('bcrypt');
const _=require('lodash');
const {User,validate} = require('../models/user');
const authorize=require('../middlewares/authorize');
const { Transaction } = require('../models/transactions');

const router = express.Router();
const newUser = async(req,res)=>{
    // console.log("body",req.body);
    const {error}=validate(req.body);
    if(error)return res.status(400).send(error.details[0].message);
    
    let user =await User.findOne({email:req.body.email});
    if(user)return res.status(400).send({error: 'user already registered with this email ! '});
    
    user =await User.findOne({mobile:req.body.mobile});
    if(user)return res.status(400).send({error: 'user already registered with this mobile number ! '});

    user =await User.findOne({nid:req.body.nid});
    if(user)return res.status(400).send({error: 'user already registered with this NID ! '});

    user = new User(req.body);

    const salt=await bcrypt.genSalt(10);
    user.pin=await bcrypt.hash(user.pin,salt);
    if(user.accountType=='User') user.balance=40;
    else if(user.accountType=='Agent') {
        user.balance=0;
        user.income=0;
        user.approval="pending";
    }else{
        user.balance=10000000; //admin 
        user.income=0;
    }

    const token=user.generateJWT();
    
    const result=await user.save();
    return res.status(201).send({
        token:token,
        user:_.pick(result,['_id','email','name'])
    });

}

const authUser = async (req, res) => {
    const { identifier, pin } = req.body; 

    // Find user by email or mobile number
    let user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });
    if (!user) return res.status(400).send({error:"Invalid email/mobile or PIN!"});

    // Compare provided PIN with stored PIN
    const validUser = await bcrypt.compare(pin, user.pin);
    if (!validUser) return res.status(400).send({error:"Invalid email/mobile or PIN!"});

    // Generate token
    const token = user.generateJWT();

    // Send response
    res.send({
        token: token,
        user: _.pick(user, ['_id', 'email', 'mobile', 'name', 'accountType','balance','approval','balanceRequest','status'])
    });
};


const userDetails = async (req, res) => {
    try {
        const user = await User.findOne({ mobile: req.params.id }).select("-pin"); // Exclude PIN for security
        if (!user) return res.status(404).send("User not found");

        res.send(user);
    } catch (error) {
        res.status(500).send("Something went wrong");
    }
};


const updateUser = async (req, res) => {
    try {
        const { approval } = req.body;
        const mobile = req.params.id;
        // Find user by mobile
        const user = await User.findOne({ mobile });

        if(approval==="block"){
            user.status="block";
            // Save changes
           await user.save();
           return res.status(200).json({ message: "blocked the user ", user });
        }
        if(approval==="unblock"){
            user.status="active";
            // Save changes
           await user.save();
           return res.status(200).json({ message: "unblocked the user ", user });
        }

        if(approval==="balanceRequest"){
            user.balanceRequest=true;
            // Save changes
           await user.save();
           return res.status(200).json({ message: "requested for balance recharge", user });
        }

        if(approval==="rejectedRecharge"){
            user.balanceRequest=false;
             // Save changes
            await user.save();
            return res.status(200).json({ message: "Rejected to Recharge Balance", user });
        }

        const admin = await User.findOne({accountType:"Admin"})
        if (!user || !admin) {
            return res.status(404).json({ message: "User not found" });
        }

   
        // Update fields
        user.approval = approval;
        if (approval === 'verified') {
            if(admin.balance>=100000){
                user.balance = 100000;
                admin.balance-=100000;

                const amount=100000;
                const type="Cash In";

                 // Create transaction object
                const transaction = new Transaction({
                    sender: admin.mobile,
                    receiver: user.mobile,
                    amount,
                    type,
                });

                await transaction.save();

            }else{
                return res.status(500).json({ error: "Admin have no Enough balance " });
            }
        }

        // Save changes
        await user.save();
        await admin.save();
        return res.status(200).json({ message: "Agent updated successfully", user });

    } catch (error) {
        // console.error("Error updating agent:", error);
        return res.status(500).json({ error: "Something went wrong" });
    }
};


const agentsWithPending = async (req, res) => {
    try {
        const users = await User.find({ 
            accountType:'Agent',
            approval:'pending'
        }).select("-pin");
        // if (!users.length) return res.status(404).send("No pending agents found");
        res.send(users);
    } catch (error) {
        res.status(500).send("Something went wrong");
    }
};


const getUsersBalance = async (req, res) => {
    try {
        const users = await User.find({ accountType: 'User' }, 'balance'); // Fetch only balance field
        const userTotalBalance = users.reduce((sum, user) => sum + (Number(user.balance) || 0), 0);
        res.json({ userTotalBalance });
    } catch (error) {
        // console.error("Error fetching user balance:", error);
        res.status(500).send("Something went wrong");
    }
};

const getAgentsBalance = async (req, res) => {
    try {
        const agents = await User.find({ accountType: 'Agent' }, 'balance'); // Fetch only balance field
        const agentTotalBalance = agents.reduce((sum, agent) => sum + (Number(agent.balance) || 0), 0);
        res.json({ agentTotalBalance });
    } catch (error) {
        console.error("Error fetching agent balance:", error);
        res.status(500).send("Something went wrong");
    }
};


const agentsWithReschargeRequest = async (req, res) => {
    try {
        const users = await User.find({ 
            accountType:'Agent',
            balanceRequest:true
        }).select("-pin");
        // console.log("Found users:", users); // Debugging line
        res.send(users);
    } catch (error) {
        res.status(500).send("Something went wrong");
    }
};
const allUsers = async (req, res) => {
    try {
        const users = await User.find({ $or: [{ accountType: "Agent" }, { accountType:"User" }] }).select("-pin").sort({ timestamp: -1 });
        // console.log("Found users:", users); // Debugging line
        res.send(users);
    } catch (error) {
        res.status(500).send("Something went wrong");
    }
};

const userCount = async (req, res) => {
    try {
        const count = await User.countDocuments();
        res.status(200).json({ success: true, totalUsers: count });
    } catch (error) {
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

router.get('/count', userCount);

router.route('/')
    .post(newUser)
    .get(allUsers)

router.route('/agentspending')
    .get(authorize,agentsWithPending)

router.route('/agentsRescharge')
    .get(authorize,agentsWithReschargeRequest)

router.route('/auth')
    .post(authUser)

router.route('/get_users_balance')
    .get(getUsersBalance)

router.route('/get_agets_balance')
    .get(getAgentsBalance)

router.route('/:id')
    .get(userDetails)
    .patch(authorize,updateUser);
    
module.exports=router;