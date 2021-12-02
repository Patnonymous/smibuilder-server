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
 * GET paginated comments for the build with the associated ID.
 * Gets 10 comments per page.
 */
router.get("/:buildId/:pageNumber/:sortType/:isAscending", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const buildId = parseInt(req.params.buildId);
    const pageNumber = parseInt(req.params.pageNumber);
    const sortType = req.params.sortType;
    const isAscending = req.params.isAscending === 'true' ? true : false;


    try {
        // Verify the integers.
        if (!Number.isInteger(buildId)) {
            throw new Error(`The provided build ID ${buildId} is not valid.`);
        }
        if (!Number.isInteger(pageNumber) || pageNumber < 1) {
            throw new Error(`The provided page number ${pageNumber} is not valid.`);
        }
        // Verify the others.
        if (sortType !== "Date" && sortType !== "Rating") {
            throw new Error(`The provided sort type ${sortType} is not valid.`);
        }
        if (isAscending !== true && isAscending !== false) {
            throw new Error(`The provided ascending variable ${isAscending} is not valid.`)
        }

        // Start work.
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        let orderBy = null;
        let sqlSelectCommentsStatement = "";
        dbConnection = dbConnectionStatus.resData;

        // We want a pagination statement, it'll be pretty big.
        if (sortType === "Date") {
            orderBy = "created_on";
        } else if (sortType === "Rating") {
            orderBy = "rating";
        } else {
            orderBy = "id"
        }

        // Create the statement.
        if (isAscending) {
            sqlSelectCommentsStatement = `SELECT cs.id, cs.build_id, cs.owner_id, cs.comment_text, cs.rating, cs.created_on, us.username FROM SmiBuilder.Comments AS cs JOIN SmiBuilder.Users AS us ON cs.owner_id = us.id WHERE build_id = @buildId ORDER BY ${orderBy} OFFSET (${pageNumber}-1)*10 ROWS FETCH NEXT 10 ROWS ONLY`;
        } else {
            sqlSelectCommentsStatement = `SELECT cs.id, cs.build_id, cs.owner_id, cs.comment_text, cs.rating, cs.created_on, us.username FROM SmiBuilder.Comments AS cs JOIN SmiBuilder.Users AS us ON cs.owner_id = us.id WHERE build_id = @buildId ORDER BY ${orderBy} DESC OFFSET (${pageNumber}-1)*10 ROWS FETCH NEXT 10 ROWS ONLY`;
        }

        let request = new Request(sqlSelectCommentsStatement, function (err, rowCount, rows) {
            if (err) {
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
        response = { status: "Failure", resData: error.message }
        // Close db connection if open.
        if (dbConnection) {
            dbConnection.close();
        };
        res.json(response);
    }
});


/**
 * GET pagination info for this build.
 * Calculates the total number of comments pages that are appropriate for this build.
 */
router.get("/pagination-info/:buildId", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const buildId = parseInt(req.params.buildId);

    try {
        if (!Number.isInteger(buildId)) {
            throw new Error(`The provided build ID ${buildId} is invalid.`);
        }
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlSelectCountCommentsStatement = "SELECT COUNT('id') FROM SmiBuilder.Comments WHERE build_id = @buildId";

        let request = new Request(sqlSelectCountCommentsStatement, function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                const recordCount = rows[0][0].value;
                let numberOfPages = recordCount / 10;
                numberOfPages = Math.ceil(numberOfPages);

                response = { status: "Success", resData: numberOfPages };
                res.json(response);
            }
        });
        // Prepare.
        request.addParameter("buildId", TYPES.Int, buildId);
        //Execute.
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
        } else if (commentText.length > 254 || commentText.length < 1) {
            throw new Error("Comment Text Error.")
        };

        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlInsertCommentStatement = "INSERT INTO SmiBuilder.Comments VALUES(@buildId, @userId, @commentText, @rating, @createdOn)";

        let request = new Request(sqlInsertCommentStatement, function (err, rowCount, rows) {
            if (err) {
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
        response = { status: "Failure", resData: error.message }
        // Close db connection if open.
        if (dbConnection) {
            dbConnection.close();
        };
        res.json(response);
    }
});

/**
 * POST delete a comment with the associated ID.
 */
router.post("/delete/:commentId", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const commentId = parseInt(req.params.commentId);

    try {
        if (!Number.isInteger(commentId)) {
            throw new Error(`The provided comment ID '${commentId}' is invalid.`);
        }

        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlDeleteCommentStatement = "DELETE FROM SmiBuilder.Comments WHERE id = @commentId";

        let request = new Request(sqlDeleteCommentStatement, function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                dbConnection.close();
                response = { status: "Success", resData: "Comment Successfully deleted." };
                res.json(response);
            }
        });
        // Prepare.
        request.addParameter("commentId", TYPES.Int, commentId);
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
 * POST edit an existing comments text.
 */
router.post("/edit/:commentId", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const commentId = parseInt(req.params.commentId);
    const { body } = req;
    const { token, newCommentText } = body;

    try {
        if (!Number.isInteger(commentId)) {
            throw new Error(`The provided comment ID '${commentId}' is invalid.`);
        } else if (newCommentText.length < 1 || newCommentText.length > 254) {
            throw new Error("Comment Text Error.")
        }

        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlUpdateCommentStatement = "UPDATE SmiBuilder.Comments SET comment_text = @newCommentText WHERE id = @commentId";

        let request = new Request(sqlUpdateCommentStatement, function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                dbConnection.close();
                response = { status: "Success", resData: "Comment successfully edited." };
                res.json(response);
            }
        });
        // Prepare.
        request.addParameter("newCommentText", TYPES.VarChar, newCommentText);
        request.addParameter("commentId", TYPES.Int, commentId);
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
})


/**
 * POST rate a build up or down.
 */
router.post("/rate/:commentId", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const commentId = parseInt(req.params.commentId);
    const { body } = req;
    const { token, rateUp } = body;

    try {
        if (!Number.isInteger(commentId)) {
            throw new Error(`The provided comment ID '${commentId}' is invalid.`);
        }
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlUpdateRatingStatement = "";
        if (rateUp) {
            sqlUpdateRatingStatement = "UPDATE SmiBuilder.Comments SET rating = rating + 1 WHERE id = @commentId";
        } else {
            sqlUpdateRatingStatement = "UPDATE SmiBuilder.Comments SET rating = rating - 1 WHERE id = @commentId";
        }

        let request = new Request(sqlUpdateRatingStatement, function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                dbConnection.close();
                response = { status: "Success", resData: "Comment successfully rated." };
                res.json(response);
            }
        });

        // Prepare.
        request.addParameter("commentId", TYPES.Int, commentId);
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