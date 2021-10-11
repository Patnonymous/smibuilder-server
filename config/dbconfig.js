// Imports
var Connection = require("tedious").Connection;
var Request = require("tedious").Request;
const TYPES = require("tedious").TYPES;

// Vars
var dbConnectionVar;
var usernameAppendNumber;

function connectToDb() {
    const SELF = this;
    // Tedious
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
            SELF.getAndSetUsernameAppend();
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
    // Initialize the connection.
    dbConnectionVar.connect();
};


function getAndSetUsernameAppend() {
    const TAG = "dbconfig.js - getAndSetUsernameAppend(), "
    const SELF = this;
    let sqlUserCountStatement = "SELECT COUNT(id) FROM SmiBuilder.Users";
    let request = new Request(sqlUserCountStatement, function (err, rowCount, rows) {
        console.log(TAG + "count:", rows[0][0].value);
        appendNumber = 100 + rows[0][0].value;
        SELF.usernameAppendNumber = String(appendNumber);
        console.log(TAG + "usernameAppendNumber: ", SELF.usernameAppendNumber);
    });
    dbConnectionVar.execSql(request);
};

function getDb() {
    return dbConnectionVar;
};


function incrementUsernameAppend() {
    appendNumber = parseInt(this.usernameAppendNumber) + 1;
    this.usernameAppendNumber = String(appendNumber)
}

module.exports = { connectToDb, getAndSetUsernameAppend, getDb, usernameAppendNumber, incrementUsernameAppend };

