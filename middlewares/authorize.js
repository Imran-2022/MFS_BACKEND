const jwt = require('jsonwebtoken');

const authorize = async function (req, res, next) {
    let token = await req.header('Authorization');
    if (!token) return res.status(401).send("Access Denied ! No token provided");

    // Extract bearer token 🐸
    token = token.split(" ")[1]?.trim();
    if (!token) return res.status(401).send("Invalid Token");
    // console.log(token);
    try {
        const decoded = await jwt.verify(token, process.env.JWT_SECRET_KEY);
        // console.log("decoded",decoded);
        if (!decoded) return res.status(400).send('Invalid token');
        req.user = decoded; // Attach user data to request object
        next();
    } catch (err) {
        return res.status(400).send("Invalid token");
    }
};

module.exports = authorize;  // ✅ Correct export
