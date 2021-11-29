// Imports - Express
var express = require('express');
var router = express.Router();
// Imports - Database
var dbconfig = require("../config/dbconfig");
var Request = require("tedious").Request;
const TYPES = require("tedious").TYPES;
// Imports - Other
const { DateTime } = require("luxon");
var verifyUser = require("../functions/verifyUser");

// Middleware.

// Verify for every POST route in this router.
router.post("*", function (req, res, next) {
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
 * GET all comments on the associated buildId.
 */
router.get("/:buildId", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const buildId = parseInt(req.params.buildId);

    try {
        // Verify int.
        if (!Number.isInteger(buildId)) {
            throw new Error(`The provided userId '${buildId}' is invalid.`);
        };

        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlSelectAllCommentsStatement = "SELECT cs.id, cs.build_id, cs.owner_id, cs.comment_text, cs.rating, cs.created_on, us.username FROM SmiBuilder.Comments AS cs JOIN SmiBuilder.Users AS us ON cs.owner_id = us.id WHERE build_id = @buildId";

        let request = new Request(sqlSelectAllCommentsStatement, function (err, rowCount, rows) {
            if (err) {
                console.log("Database request error: ");
                console.log(err);
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                let allParsedComments = [];

                rows.forEach(comment => {
                    let parsedComment = {};
                    parsedComment.id = comment[0].value;
                    parsedComment.buildId = comment[1].value;
                    parsedComment.ownerId = comment[2].value;
                    parsedComment.commentText = comment[3].value;
                    parsedComment.rating = comment[4].value;
                    parsedComment.createdOn = Date.parse(comment[5].value);
                    parsedComment.ownerName = comment[6].value;
                    allParsedComments.push(parsedComment);
                });

                response = { status: "Success", resData: allParsedComments };
                dbConnection.close();
                res.json(response);
            }
        });

        // Prepare.
        request.addParameter("buildId", TYPES.Int, buildId);
        //Execute.
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

/**
 * POST create a comment on the associated buildId.
 */
router.post("/:buildId", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const buildId = parseInt(req.params.buildId);
    const { body } = req;
    const { token, userId, commentText } = body;

    try {
        // Error checking.
        if (!Number.isInteger(buildId)) {
            throw new Error(`The provided build ID '${buildId}' is invalid.`);
        } else if (!Number.isInteger(userId)) {
            throw new Error(`The provided user ID '${userId}' is invalid.`);
        } else if (commentText.length > 254) {
            throw new Error("Comment Text Error.")
        };

        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlInsertCommentStatement = "INSERT INTO SmiBuilder.Comments VALUES(@buildId, @userId, @commentText, @rating, @createdOn)";

        let request = new Request(sqlInsertCommentStatement, function (err, rowCount, rows) {
            if (err) {
                console.log("Database request error: ");
                console.log(err);
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                dbConnection.close();
                response = { status: "Success", resData: "Comment successfully added." };
                res.json(response);
            }
        });

        // Prepare.
        request.addParameter("buildId", TYPES.Int, buildId);
        request.addParameter("userId", TYPES.Int, userId);
        request.addParameter("commentText", TYPES.VarChar, commentText);
        request.addParameter("rating", TYPES.Int, 0);
        request.addParameter("createdOn", TYPES.DateTime, DateTime.now());
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