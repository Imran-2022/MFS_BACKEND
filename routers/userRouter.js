const express =require('express');
const bcrypt = require('bcrypt');
const _=require('lodash');
const {User,validate} = require('../models/user');
const authorize=require('../middlewares/authorize');

const router = express.Router();
const newUser = async(req,res)=>{
    // console.log("body",req.body);
    const {error}=validate(req.body);
    if(error)return res.status(400).send(error.details[0].message);
    
    let user =await User.findOne({email:req.body.email});
    if(user)return res.status(400).send('user already registered !');

    user = new User(req.body);

    const salt=await bcrypt.genSalt(10);
    user.pin=await bcrypt.hash(user.pin,salt);
    if(user.accountType=='User') user.balance=40;
    else if(user.accountType=='Agent') {
        user.balance=0;
        user.income=0;
        user.approval="pending";
    }else{
        user.balance=10000000;
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
    if (!user) return res.status(400).send("Invalid email/mobile or PIN!");

    // Compare provided PIN with stored PIN
    const validUser = await bcrypt.compare(pin, user.pin);
    if (!validUser) return res.status(400).send("Invalid email/mobile or PIN!");

    // Generate token
    const token = user.generateJWT();

    // Send response
    res.send({
        token: token,
        user: _.pick(user, ['_id', 'email', 'mobile', 'name', 'accountType','balance','income','approval'])
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
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update fields
        user.approval = approval;
        if (approval === 'verified') {
            user.balance = 10000;
        }

        // Save changes
        await user.save();
        return res.status(200).json({ message: "Agent updated successfully", user });

    } catch (error) {
        console.error("Error updating agent:", error);
        return res.status(500).json({ error: "Something went wrong" });
    }
};



const agentsWithPending = async (req, res) => {
    try {
        const users = await User.find({ 
            accountType:'Agent',
            approval:'pending'
        }).select("-pin");
        if (!users.length) return res.status(404).send("No pending agents found");

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
        console.error("Error fetching user balance:", error);
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


router.route('/')
    .post(newUser)
router.route('/agentspending')
    .get(agentsWithPending)



router.route('/auth')
    .post(authUser)

router.route('/get_users_balance')
    .get(getUsersBalance)

router.route('/get_agets_balance')
    .get(getAgentsBalance)

router.route('/:id')
    .get(userDetails)
    .patch(updateUser);
    
module.exports=router;