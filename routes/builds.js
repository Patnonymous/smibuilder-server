// Imports - Express
var express = require('express');
var router = express.Router();
// Imports - Database
var dbconfig = require("../config/dbconfig");
var Request = require("tedious").Request;
const TYPES = require("tedious").TYPES;
// Imports - Other
const { DateTime } = require("luxon");


/**
 * CREATE a build.
 */
router.post("/create", async function (req, res, next) {
    const TAG = "\nbuilds.js - POST(/create), ";
    const { body } = req;
    let response = {};

    console.log(TAG + "body: ");
    console.log(body);
    console.log(JSON.stringify(body.buildItems));

    // Do database work in try catch.
    try {
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        let dbConnection = dbConnectionStatus.resData;
        let sqlInsertBuildStatement = "INSERT INTO SmiBuilder.Builds VALUES(@ownerId, @title, @description, @godId, @items, @likes, @dislikes, @created_on, @updated_on)";

        let request = new Request(sqlInsertBuildStatement, function (err, rowCount, rows) {
            if (err) {
                let errorMessage = "";
                console.log("Database request error.");
                console.log(err.message);
                errorMessage = err.message;
                response = { status: "Failure", resData: errorMessage };
                dbConnection.close();
                res.json(response);
            } else {
                console.log("Created new build success.");
                console.log(rowCount);
                console.log(rows);
                response = { status: "Success" };
                dbConnection.close();
                res.json(response);
            }
        });

        // Prepare.
        request.addParameter("ownerId", TYPES.Int, body.buildOwnerId);
        request.addParameter("title", TYPES.VarChar, body.buildTitle);
        request.addParameter("description", TYPES.VarChar, body.buildDescription);
        request.addParameter("godId", TYPES.Int, body.buildGodId);
        request.addParameter("items", TYPES.VarChar, JSON.stringify(body.buildItems));
        request.addParameter("likes", TYPES.Int, 0);
        request.addParameter("dislikes", TYPES.Int, 0);
        request.addParameter("created_on", TYPES.DateTime, DateTime.now());
        request.addParameter("updated_on", TYPES.DateTime, DateTime.now());
        // Execute.
        dbConnection.execSql(request);
    } catch (error) {
        console.log("Error caught by the try catch.")
        console.log(error);
        response = { status: "Failure", resData: error.message };
        dbConnection.close();
        res.json(response);
    }
});






module.exports = router;