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
 * GET all the builds.
 */
router.get("/", async function (req, res, next) {
    const TAG = "\nbuilds.js - GET(/), ";
    let response = {};

    console.log(TAG + "Getting all the builds.");

    // Do database work in try catch.
    try {
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        let dbConnection = dbConnectionStatus.resData;
        let sqlSelectAllStatement = "SELECT * FROM SmiBuilder.Builds";

        let request = new Request(sqlSelectAllStatement, function (err, rowCount, rows) {
            if (err) {
                console.log("Database request error.");
                console.log(err.message);
                response = { status: "Failure", resData: err.message };
                dbConnection.close();
                res.json(response);
            } else {
                console.log("Get all builds success. Parsing now.");
                let allParsedBuilds = [];

                // Parse and format.
                rows.forEach(build => {
                    let parsedBuild = {};
                    parsedBuild.id = build[0].value;
                    parsedBuild.ownerId = build[1].value;
                    parsedBuild.title = build[2].value;
                    parsedBuild.description = build[3].value;
                    parsedBuild.godId = build[4].value;
                    parsedBuild.items = JSON.parse(build[5].value);
                    parsedBuild.likes = build[6].value;
                    parsedBuild.dislikes = build[7].value;
                    parsedBuild.createdDate = Date.parse(build[8].value);

                    allParsedBuilds.push(parsedBuild);
                });

                response = { status: "Success", resData: allParsedBuilds };
                dbConnection.close();
                res.json(response);
            }
        });

        // Execute.
        dbConnection.execSql(request);
    } catch (error) {
        console.log("Error caught by try catch.");
        console.log(error);
        response = { status: "Failure", resData: error.message }

        // Close db connection if open.
        if (dbConnection !== null) {
            dbConnection.close();
        };
        res.json(response);
    }
});


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

        // Close if open.
        if (dbConnection !== null) {
            dbConnection.close();
        }
        res.json(response);
    }
});






module.exports = router;