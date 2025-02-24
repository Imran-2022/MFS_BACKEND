const express = require('express');
const cors = require('cors');
const userRouter = require('./routers/userRouter');
const transactionRouter = require('./routers/transactionRouter');

const app = express();

app.use(cors());
app.use(express.json());

// Route to show all routes and a welcome message
app.get('/', (req, res) => {
    const routes = `
        <html>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@700&display=swap" rel="stylesheet">
                <style>
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh; /* Full height of the viewport */
                        margin: 0;
                        background-color: #0a192f; /* Black background */
                        color: white; /* White text */
                        font-family: 'Roboto', sans-serif; /* Stylish font */
                    }
                    h1 {
                        font-size: 3em; /* Optional: adjust font size */
                    }
                </style>
            </head>
            <body>
                <h1>MFS API - by Imran !</h1>
            </body>
        </html>
    `;
    res.send(routes);
});


// Use the routers
app.use('/user', userRouter);
app.use('/transaction', transactionRouter);

module.exports = app;
