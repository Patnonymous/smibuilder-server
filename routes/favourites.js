// Imports - Express
var express = require('express');
var router = express.Router();
// Imports - Database
var dbconfig = require("../config/dbconfig");
var Request = require("tedious").Request;
const TYPES = require("tedious").TYPES;
// Imports - Other
var verifyUser = require("../functions/verifyUser");

// Middleware - Favourites is only accessible by logged in users.
router.use("/", function (req, res, next) {
    const { body } = req;
    const { token } = body;
    let verificationResponse = verifyUser.verifyToken(token);
    if (verificationResponse === false) {
        res.json({ status: "Failure", resData: "Unauthorized." })
    } else if (verificationResponse === true) {
        next();
    }
});


/**
 * POST Favourite a Build.
 */
router.post("/", async function (req, res, next) {
    const TAG = "\nfavourites - POST(/), ";
    let response = {};
    let dbConnection = null;
    const { body } = req;
    const { token, userId, buildId } = body;

    console.log(TAG + "Favouriting.");
    console.log("userId: ", userId);
    console.log("buildId: ", buildId);


    try {
        // Verify ints.
        if (!Number.isInteger(userId)) {
            throw new Error(`The provided userId '${userId}' is invalid.`);
        };
        if (!Number.isInteger(buildId)) {
            throw new Error(`The provided buildId '${buildId}' is invalid`);
        };
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        // Verify that the build is not already favourited.
        // Counts 0 or 1 depending on if Favourite already exists.
        let sqlCountOneFavouritesStatement = "SELECT COUNT(1) FROM SmiBuilder.Favourites WHERE builder_user_id = @userId AND build_id = @buildId";

        let request = new Request(sqlCountOneFavouritesStatement, function (err, rowCount, rows) {
            if (err) {
                console.log("Database request error: ");
                console.log(err);
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                console.log("rows[0][0]: ");
                console.log(rows[0][0].value);

                // If the value is not 0, then this build is already favourited.
                if (rows[0][0].value === 0) {
                    console.log("The rows value is zero. Inserting record now.")
                    let sqlInsertFavouriteStatement = "INSERT INTO SmiBuilder.Favourites VALUES(@userId, @buildId)";
                    let favRequest = new Request(sqlInsertFavouriteStatement, function (err, rowCount, rows) {
                        if (err) {
                            console.log("Database request error: ");
                            console.log(err);
                            dbConnection.close();
                            response = { status: "Failure", resData: err.message };
                            dbConnection.close();
                            res.json(response);
                        } else {
                            response = { status: "Success", resData: "Build successfully favourited." };
                            dbConnection.close();
                            res.json(response);
                        }
                    });
                    // Prepare insert.
                    favRequest.addParameter("userId", TYPES.Int, userId);
                    favRequest.addParameter("buildId", TYPES.Int, buildId);
                    // Execute insert.
                    dbConnection.execSql(favRequest);
                } else {
                    console.log("Rows value is not 0. Favourite exists. Responding with failure and closing db.")
                    response = { status: "Failure", resData: "This build is already in your favourites." };
                    dbConnection.close();
                    res.json(response);
                }
            }
        });

        // Prepare.
        request.addParameter("userId", TYPES.Int, userId);
        request.addParameter("buildId", TYPES.Int, buildId);
        // Execute.
        dbConnection.execSql(request);
    } catch (error) {
        console.log("Error caught by try catch.");
        console.log(error.message);
        response = { status: "Failure", resData: error.message }
        // Close db connection if open.
        if (dbConnection) {
            dbConnection.close();
        };
        res.json(response);
    }
});



module.exports = router;