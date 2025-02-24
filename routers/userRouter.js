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
    else user.balance=100000;

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
        user: _.pick(user, ['_id', 'email', 'mobile', 'name', 'accountType','balance'])
    });
};



router.route('/')
    .post(newUser)

router.route('/auth')
    .post(authUser)

module.exports=router;