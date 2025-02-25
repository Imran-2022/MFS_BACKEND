const jwt=require('jsonwebtoken');
const { Schema, model } = require('mongoose');
const Joi = require('joi');

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    pin: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true,
        unique: true,
        match: /^[0-9]{11}$/ 
    },
    email: {
        type: String,
        required: true,
        unique: true,
        minlength: 5,
        maxlength: 255
    },
    accountType: {
        type: String,
        required: true,
        enum: ["Agent", "User", "Admin"] 
    },
    nid: {
        type: String,
        required: true,
        unique: true,
        match: /^[0-9]{10}$/ 
    },
    balance: {
        type: Number,
        required: true,
        default: 0 
    },
    income: {
        type: Number,
    },
    approval:{
        type: String,
        enum: ["pending", "verified", "rejected"] 
    }
});


userSchema.methods.generateJWT=function(){
    const token=jwt.sign({id:this._id,email:this.email,name:this.name,approval:this.approval},process.env.JWT_SECRET_KEY,{
        expiresIn:"3h"
    });

    return token;
}



// Joi Validation
const validateUser = (user) => {
    const schema = Joi.object({
        name: Joi.string().min(3).max(50).required(),
        pin: Joi.string().length(5).pattern(/^[0-9]{5}$/).required(),
        mobile: Joi.string().length(11).pattern(/^[0-9]{11}$/).required(),
        email: Joi.string().email().min(5).max(255).required(),
        accountType: Joi.string().valid("Agent", "User","Admin").required(),
        nid: Joi.string().length(10).pattern(/^[0-9]{10}$/).required()
    });

    return schema.validate(user);
};

module.exports.User = model('User', userSchema);
module.exports.validate = validateUser;
