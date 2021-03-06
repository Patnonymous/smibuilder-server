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
router.use(function (req, res, next) {
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
    let response = {};
    let dbConnection = null;
    const { body } = req;
    const { userId, buildId } = body;

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
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                // If the value is not 0, then this build is already favourited.
                if (rows[0][0].value === 0) {
                    let sqlInsertFavouriteStatement = "INSERT INTO SmiBuilder.Favourites VALUES(@userId, @buildId)";
                    let favRequest = new Request(sqlInsertFavouriteStatement, function (err, rowCount, rows) {
                        if (err) {
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
        response = { status: "Failure", resData: error.message }
        // Close db connection if open.
        if (dbConnection) {
            dbConnection.close();
        };
        res.json(response);
    }
});

/**
 * POST remove the associated record from favourites.
 */
router.post("/remove", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const { body } = req;
    const { token, userId, buildId } = body;

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
        let sqlRemoveFavouriteStatement = "DELETE FROM SmiBuilder.Favourites WHERE builder_user_id = @userId AND build_id = @buildId";

        let request = new Request(sqlRemoveFavouriteStatement, function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                response = { status: "Success", resData: "Favourite successfully removed." };
                dbConnection.close();
                res.json(response);
            }
        });
        // Prepare.
        request.addParameter("userId", TYPES.Int, userId);
        request.addParameter("buildId", TYPES.Int, buildId);
        // Execute.
        dbConnection.execSql(request);

    } catch (error) {
        response = { status: "Failure", resData: error.message }
        // Close db connection if open.
        if (dbConnection) {
            dbConnection.close();
        };
        res.json(response);
    }

});


router.post("/remove/all", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const { body } = req;
    const { token, userId } = body;

    try {
        // Verify int.
        if (!Number.isInteger(userId)) {
            throw new Error(`The provided userId '${userId}' is invalid.`);
        };
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlDeleteAllOfThisUsersFavsStatement = "DELETE FROM SmiBuilder.Favourites WHERE builder_user_id = @userId";
        let request = new Request(sqlDeleteAllOfThisUsersFavsStatement, function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                response = { status: "Success", resData: "All your favourites successfully removed." };
                dbConnection.close();
                res.json(response);
            }
        });
        // Prepare.
        request.addParameter("userId", TYPES.Int, userId);
        // Execute.
        dbConnection.execSql(request);
    } catch (error) {
        response = { status: "Failure", resData: error.message }
        // Close db connection if open.
        if (dbConnection) {
            dbConnection.close();
        };
        res.json(response);
    }
});


/**
 * POST checks if the build with associated ID is favourited by the associated user.
 */
router.post("/check", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const { body } = req;
    const { token, userId, buildId } = body;

    try {
        // Verify Ints.
        if (!Number.isInteger(userId)) {
            throw new Error(`The provided userId '${userId}' is invalid.`);
        };
        if (!Number.isInteger(buildId)) {
            throw new Error(`The provided buildId '${buildId}' is invalid`);
        };
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlCountOneFavouritesStatement = "SELECT COUNT(1) FROM SmiBuilder.Favourites WHERE builder_user_id = @userId AND build_id = @buildId";
        let request = new Request(sqlCountOneFavouritesStatement, function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                // true if already fav'd, false if not fav'd.
                if (rows[0][0].value !== 0) {
                    response = { status: "Success", resData: true };
                } else {
                    response = { status: "Success", resData: false };
                }

                dbConnection.close();
                res.json(response)
            }
        });
        // Prepare.
        request.addParameter("userId", TYPES.Int, userId);
        request.addParameter("buildId", TYPES.Int, buildId);
        // Execute.
        dbConnection.execSql(request);
    } catch (error) {
        response = { status: "Failure", resData: error.message }
        // Close db connection if open.
        if (dbConnection) {
            dbConnection.close();
        };
        res.json(response);
    }
});



module.exports = router;