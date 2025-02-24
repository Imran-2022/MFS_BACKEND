// connect mongodb !!
// run server !!

const dotenv=require('dotenv');
dotenv.config();

const app = require('./app');
const mongoose=require('mongoose');

mongoose.connect(process.env.MONGO_SERVER)
.then(()=>{
    console.log("Connected to mongoDB");
})
.catch(err=>{
    console.log('MongoDB connection failed');
});


const port =process.env.PORT || 5000;

app.listen(port,()=>{
    console.log(`Listening on port ${port}`);
})