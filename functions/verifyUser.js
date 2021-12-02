// Imports.
var jwt = require('jsonwebtoken');
// Imports - Database
var dbconfig = require("../config/dbconfig");
var Request = require("tedious").Request;
const TYPES = require("tedious").TYPES;
// Imports - bcrypt
const bcrypt = require("bcrypt");
const saltRounds = 10;

/**
 * Called Vertify but does pretty much nothing right now.
 * Simply decodes token. Basically a check if there's a token or not.
 * Should be changed to something else later.
 * @param {*} token 
 * @returns {Boolean} result true or false
 */
function verifyToken(token) {
    let decoded = null;
    try {
        decoded = jwt.verify(token, process.env.WEBTOKEN_SECRET);
        return true;
    } catch (error) {
        return false;
    }
};

async function verifyPassword(userId, passwordAttempt) {
    let dbConnection = null;
    let dbConnectionStatus = await dbconfig.asyncConnectToDb();
    return new Promise((resolve, reject) => {
        try {
            dbConnection = dbConnectionStatus.resData;
            let sqlSelectPasswordStatement = "SELECT password FROM SmiBuilder.Users WHERE id = @userId";
            let request = new Request(sqlSelectPasswordStatement, function (err, rowCount, rows) {
                if (err) {
                    dbConnection.close();
                    reject(false);
                } else {
                    const passHash = rows[0][0].value;
                    let isPasswordCorrect = bcrypt.compareSync(passwordAttempt, passHash);
                    if (isPasswordCorrect === true) {
                        dbConnection.close();
                        resolve(true);
                    } else {
                        dbConnection.close();
                        resolve(false);
                    }
                }
            });
            // Prepare.
            request.addParameter("userId", TYPES.Int, userId);
            // Exec.
            dbConnection.execSql(request);
        } catch (error) {
            // Close db connection if open.
            if (dbConnection) {
                dbConnection.close();
            };
            reject(false);
        }
    });
};

async function verifyUserType(userId, typeToCheckFor) {
    let dbConnection = null;
    let dbConnectionStatus = await dbconfig.asyncConnectToDb();


    return new Promise((resolve, reject) => {
        try {
            dbConnection = dbConnectionStatus.resData;
            let sqlSelectUserTypeStatement = "SELECT user_type FROM SmiBuilder.Users WHERE id = @userId";

            let request = new Request(sqlSelectUserTypeStatement, function (err, rowCount, rows) {
                if (err) {
                    dbConnection.close();
                    reject(false);
                } else {
                    let usersType = rows[0][0].value;
                    dbConnection.close();
                    if (usersType === typeToCheckFor) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            });
            // Prepare.
            request.addParameter("userId", TYPES.Int, userId);
            // Exec.
            dbConnection.execSql(request);
        } catch (error) {
            // Close db connection if open.
            if (dbConnection) {
                dbConnection.close();
            };
            reject(false);
        }
    });

};


module.exports = { verifyToken, verifyPassword, verifyUserType }