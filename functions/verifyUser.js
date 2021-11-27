// Imports.
var jwt = require('jsonwebtoken');


function verifyToken(token) {
    let decoded = null;
    try {
        decoded = jwt.verify(token, process.env.WEBTOKEN_SECRET);
        return true;
    } catch (error) {
        return false;
    }
}


module.exports = { verifyToken }