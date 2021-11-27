// Imports.
var jwt = require('jsonwebtoken');


function verifyToken(token) {
    const TAG = "\nverifyUser - verifyToken(), ";
    console.log(TAG + "Verifying a token. Token output: ");
    console.log(token)
    let decoded = null;

    try {
        decoded = jwt.verify(token, process.env.WEBTOKEN_SECRET);
        return true;
    } catch (error) {
        return false;
    }
}


module.exports = { verifyToken }