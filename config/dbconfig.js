// Imports
var Connection = require("tedious").Connection;

// Vars
var dbConnectionVar;

function connectToDb() {
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

function getDb() {
    return dbConnectionVar
}

module.exports = { connectToDb, getDb };

