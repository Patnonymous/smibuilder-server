// Imports
var Connection = require("tedious").Connection;
var Request = require("tedious").Request;
const TYPES = require("tedious").TYPES;

/**
 * Wrap a Tedious connection in a Promise so it can be used async.
 * Allows other .js files to call asyncConnectToDb(), run their SQL, then disconnect without copying major boilerplate code everywhere.
 * @returns Promise resolved or rejected.
 */
function asyncConnectToDb() {
    const TAG = "\dbconfig.js - asyncConnectToDb(), ";
    let dbConnectionVar;
    console.log(TAG + "Starting.");
    return new Promise((resolve, reject) => {
        var config = {
            server: process.env.DB_HOST,
            authentication: {
                type: "default",
                options: {
                    userName: process.env.DB_USER,
                    password: process.env.DB_PASS,
                }
            },
            options: {
                database: process.env.DB_DATABASE,
                rowCollectionOnRequestCompletion: true,
            }
        };
        dbConnectionVar = new Connection(config);
        dbConnectionVar.on("connect", function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("Database connection.")
                resolve({ conStatus: "Success", resData: dbConnectionVar });
            };
        });
        dbConnectionVar.on("databaseChange", function (databaseName) {
            if (databaseName) {
                console.log("Database changed. Name: ");
                console.log(databaseName)
            } else {
                console.log("Database change had no name.")
            };
        });
        dbConnectionVar.on("error", function (err) {
            console.log("Tedious error: ");
            console.log(err);
            dbConnectionVar.close();
            reject({ conStatus: "Failure", resData: err.message });
        });
        // Initialize the connection.
        dbConnectionVar.connect();
    });
};



/**
 * Get the count of current users, return 100 + that count as a string.
 * Ex. if there's 2 users registered, return '102'. This number is added to the end of usernames.
 * 
 * This probably implodes if two users register at the exact same millisecond. I'll probably switch this abomination out
 * for UUID.
 * @param {Connection} dbConnectionVar 
 * @returns Promise resolve or reject.
 */
function asyncGetAndSetUsernameAppend(dbConnectionVar) {
    const SELF = this;
    return new Promise((resolve, reject) => {
        let sqlUserCountStatement = "SELECT COUNT(id) FROM SmiBuilder.Users";
        let request = new Request(sqlUserCountStatement, function (err, rowCount, rows) {
            try {
                appendNumber = 100 + rows[0][0].value;
                SELF.usernameAppendNumber = String(appendNumber);
                resolve({ resStatus: "Success", resData: SELF.usernameAppendNumber });
            } catch (error) {
                console.log("ERROR: ");
                console.log(error.message);
                reject({ resStatus: "Failure", resData: error.message });
            }
        });
        dbConnectionVar.execSql(request);
    })
};


module.exports = { asyncConnectToDb, asyncGetAndSetUsernameAppend, };

