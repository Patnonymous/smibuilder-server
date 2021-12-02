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
var helperFunctions = require("../functions/helperFunctions");
var loadItems = require("../functions/loadItems");

// Middleware
router.use("/create", function (req, res, next) {
    const { body } = req;
    const { token } = body;
    let verificationResponse = verifyUser.verifyToken(token);
    if (verificationResponse === false) {
        res.json({ status: "Failure", resData: "Unauthorized." })
    } else if (verificationResponse === true) {
        next();
    }
});
router.use("/like/:buildId", function (req, res, next) {
    const { body } = req;
    const { token } = body;
    let verificationResponse = verifyUser.verifyToken(token);
    if (verificationResponse === false) {
        res.json({ status: "Failure", resData: "Unauthorized." })
    } else if (verificationResponse === true) {
        next();
    }
});
router.use("/dislike/:buildId", function (req, res, next) {
    const { body } = req;
    const { token } = body;
    let verificationResponse = verifyUser.verifyToken(token);
    if (verificationResponse === false) {
        res.json({ status: "Failure", resData: "Unauthorized." })
    } else if (verificationResponse === true) {
        next();
    }
});
router.use("/favourited", function (req, res, next) {
    const { body } = req;
    const { token } = body;
    let verificationResponse = verifyUser.verifyToken(token);
    if (verificationResponse === false) {
        res.json({ status: "Failure", resData: "Unauthorized." })
    } else if (verificationResponse === true) {
        next();
    }
})



/**
 * GET paginated builds with a search string.
 */
router.get("/:pageNumber/:sortType/:isAscending/:searchString", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const pageNumber = parseInt(req.params.pageNumber);
    const sortType = req.params.sortType;
    const isAscending = req.params.isAscending === 'true' ? true : false;
    const searchString = req.params.searchString;

    try {
        // Verify variables.
        if (!Number.isInteger(pageNumber) || pageNumber < 1) {
            throw new Error(`The provided page number ${pageNumber} is not valid.`);
        }
        if (sortType !== "Date Added" && sortType !== "Build Title" && sortType !== "Likes" && sortType !== "Dislikes") {
            throw new Error(`The provided sort type ${sortType} is not valid.`);
        }
        if (isAscending !== true && isAscending !== false) {
            throw new Error(`The provided ascending type ${isAscending} is not valid.`);
        }
        if (searchString.length > 255) {
            throw new Error(`The provided search string is too large. Search string length must be < 255.`);
        }

        // Start work.
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        let orderBy = null;
        let sqlSelectBuildsStatement = "";
        dbConnection = dbConnectionStatus.resData;

        // Choose sort type.
        if (sortType === "Date Added") {
            orderBy = "created_on";
        } else if (sortType === "Build Title") {
            orderBy = "build_title";
        } else if (sortType === "Likes") {
            orderBy = "likes";
        } else if (sortType === "Dislikes") {
            orderBy = "dislikes"
        } else {
            orderBy = "id";
        };

        // Create the statement. One for DESC and one for ascending.
        if (isAscending) {
            sqlSelectBuildsStatement = `SELECT * FROM SmiBuilder.Builds WHERE build_title LIKE @titleSearch ORDER BY ${orderBy} OFFSET (${pageNumber}-1)*5 ROWS FETCH NEXT 5 ROWS ONLY`;
        } else {
            sqlSelectBuildsStatement = `SELECT * FROM SmiBuilder.Builds WHERE build_title LIKE @titleSearch ORDER BY ${orderBy} DESC OFFSET (${pageNumber}-1)*5 ROWS FETCH NEXT 5 ROWS ONLY`;
        };

        let request = new Request(sqlSelectBuildsStatement, async function (err, rowCount, rows) {
            if (err) {
                response = { status: "Failure", resData: err.message };
                dbConnection.close();
                res.json(response);
            } else {
                let allParsedBuilds = [];

                // Parse and format.
                let index = 0;
                let aLength = rows.length;
                while (index < aLength) {
                    let build = rows[index];
                    let parsedBuild = {};
                    // Basic data from the rows.
                    parsedBuild.id = build[0].value;
                    parsedBuild.ownerId = build[1].value;
                    parsedBuild.title = build[2].value;
                    parsedBuild.description = build[3].value;
                    parsedBuild.godId = build[4].value;
                    parsedBuild.items = JSON.parse(build[5].value);
                    parsedBuild.likes = build[6].value;
                    parsedBuild.dislikes = build[7].value;
                    parsedBuild.createdDate = Date.parse(build[8].value);

                    // Get the build owner username.
                    let ownerName = await helperFunctions.getUsername(parsedBuild.ownerId);
                    parsedBuild.ownerName = ownerName;

                    // Get the god data.
                    let godData = await helperFunctions.getGodData(parsedBuild.godId);
                    parsedBuild.godData = godData;

                    // Get the item data.
                    for (const itemType in parsedBuild.items) {
                        for (const itemSlot in parsedBuild.items[itemType]) {
                            // Item slots can be null, so ignore any that aren't set.
                            if (parsedBuild.items[itemType][itemSlot]) {
                                let itemData = await helperFunctions.getItemData(parsedBuild.items[itemType][itemSlot]);
                                // Replace the items ID with the actual item data.
                                parsedBuild.items[itemType][itemSlot] = itemData;
                            }
                        }
                    }

                    allParsedBuilds.push(parsedBuild);
                    index++;
                }

                response = { status: "Success", resData: allParsedBuilds };
                dbConnection.close();
                res.json(response);
            }
        });
        // Prepare.
        let formmattedSearchString = `%${searchString}%`;
        request.addParameter("titleSearch", TYPES.Text, formmattedSearchString);
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
 * GET paginated builds with no search string.
 */
router.get("/:pageNumber/:sortType/:isAscending", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const pageNumber = parseInt(req.params.pageNumber);
    const sortType = req.params.sortType;
    const isAscending = req.params.isAscending === 'true' ? true : false;

    try {
        // Verify variables.
        if (!Number.isInteger(pageNumber) || pageNumber < 1) {
            throw new Error(`The provided page number ${pageNumber} is not valid.`);
        }
        if (sortType !== "Date Added" && sortType !== "Build Title" && sortType !== "Likes" && sortType !== "Dislikes") {
            throw new Error(`The provided sort type ${sortType} is not valid.`);
        }
        if (isAscending !== true && isAscending !== false) {
            throw new Error(`The provided ascending type ${isAscending} is not valid.`);
        }

        // Start work.
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        let orderBy = null;
        let sqlSelectBuildsStatement = "";
        dbConnection = dbConnectionStatus.resData;

        // Choose sort type.
        if (sortType === "Date Added") {
            orderBy = "created_on";
        } else if (sortType === "Build Title") {
            orderBy = "build_title";
        } else if (sortType === "Likes") {
            orderBy = "likes";
        } else if (sortType === "Dislikes") {
            orderBy = "dislikes"
        } else {
            orderBy = "id";
        };

        // Create the statement. One for DESC and one for ascending.
        if (isAscending) {
            sqlSelectBuildsStatement = `SELECT * FROM SmiBuilder.Builds ORDER BY ${orderBy} OFFSET (${pageNumber}-1)*5 ROWS FETCH NEXT 5 ROWS ONLY`;
        } else {
            sqlSelectBuildsStatement = `SELECT * FROM SmiBuilder.Builds ORDER BY ${orderBy} DESC OFFSET (${pageNumber}-1)*5 ROWS FETCH NEXT 5 ROWS ONLY`;
        };

        let request = new Request(sqlSelectBuildsStatement, async function (err, rowCount, rows) {
            if (err) {
                response = { status: "Failure", resData: err.message };
                dbConnection.close();
                res.json(response);
            } else {
                let allParsedBuilds = [];

                // Parse and format.
                let index = 0;
                let aLength = rows.length;
                while (index < aLength) {
                    let build = rows[index];
                    let parsedBuild = {};
                    // Basic data from the rows.
                    parsedBuild.id = build[0].value;
                    parsedBuild.ownerId = build[1].value;
                    parsedBuild.title = build[2].value;
                    parsedBuild.description = build[3].value;
                    parsedBuild.godId = build[4].value;
                    parsedBuild.items = JSON.parse(build[5].value);
                    parsedBuild.likes = build[6].value;
                    parsedBuild.dislikes = build[7].value;
                    parsedBuild.createdDate = Date.parse(build[8].value);

                    // Get the build owner username.
                    let ownerName = await helperFunctions.getUsername(parsedBuild.ownerId);
                    parsedBuild.ownerName = ownerName;

                    // Get the god data.
                    let godData = await helperFunctions.getGodData(parsedBuild.godId);
                    parsedBuild.godData = godData;

                    // Get the item data.
                    for (const itemType in parsedBuild.items) {
                        for (const itemSlot in parsedBuild.items[itemType]) {
                            // Item slots can be null, so ignore any that aren't set.
                            if (parsedBuild.items[itemType][itemSlot]) {
                                let itemData = await helperFunctions.getItemData(parsedBuild.items[itemType][itemSlot]);
                                // Replace the items ID with the actual item data.
                                parsedBuild.items[itemType][itemSlot] = itemData;
                            }
                        }
                    }

                    allParsedBuilds.push(parsedBuild);
                    index++;
                }

                response = { status: "Success", resData: allParsedBuilds };
                dbConnection.close();
                res.json(response);
            }
        });
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
 * GET pagination info for the builds.
 * Counts builds, divided by 5 and uses ceil to round up.
 */
router.get("/pagination-info/", async function (req, res, next) {
    let response = {};
    let dbConnection = null;


    try {
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlSelectCountBuildsStatement = "SELECT COUNT('id') FROM SmiBuilder.Builds";

        let request = new Request(sqlSelectCountBuildsStatement, function (err, rowCount, rows) {
            if (err) {
                response = { status: "Failure", resData: err.message };
                dbConnection.close();
                res.json(response);
            } else {
                const recordCount = rows[0][0].value;
                let numberOfPages = recordCount / 5;
                numberOfPages = Math.ceil(numberOfPages);

                response = { status: "Success", resData: numberOfPages };
                res.json(response);
            }
        });
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
 * GET pagination info for the builds.
 * Counts builds, divided by 5 and uses ceil to round up.
 * Limits results to the search string.
 */
router.get("/pagination-info/:searchString", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const searchString = req.params.searchString;


    try {
        // Verify.
        if (searchString.length > 255) {
            throw new Error(`The provided search string is too large. Search string length must be < 255.`);
        }
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlSelectCountBuildsStatement = "SELECT COUNT('id') FROM SmiBuilder.Builds WHERE build_title LIKE @titleSearch";

        let request = new Request(sqlSelectCountBuildsStatement, function (err, rowCount, rows) {
            if (err) {
                response = { status: "Failure", resData: err.message };
                dbConnection.close();
                res.json(response);
            } else {
                const recordCount = rows[0][0].value;
                let numberOfPages = recordCount / 5;
                numberOfPages = Math.ceil(numberOfPages);

                response = { status: "Success", resData: numberOfPages };
                res.json(response);
            }
        });
        // Prepare.
        let formmattedSearchString = `%${searchString}%`;
        request.addParameter("titleSearch", TYPES.Text, formmattedSearchString);
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
 * GET a build according to the :buildId param.
 */
router.get("/:buildId", async function (req, res, next) {
    const buildId = parseInt(req.params.buildId);
    let response = {};
    let dbConnection = null;

    try {
        // Integer validation.
        if (!Number.isInteger(buildId)) {
            throw new Error(`The provided builId '${buildId}' is invalid.`);
        }
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlSelectSingleBuildStatement = "SELECT * FROM SmiBuilder.Builds WHERE id = @id";

        let request = new Request(sqlSelectSingleBuildStatement, async function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                if (rowCount === 0) {
                    response = { status: "Failure", resData: `A build with the ID: '${buildId}' does not exist.` };
                } else if (rowCount > 1) {
                    response = { status: "Failure", resData: "More than 1 build was found. Something has gone very wrong." };
                } else {
                    // Parse the build.
                    let build = rows[0];
                    let parsedBuild = {};

                    // Basic data from row.
                    parsedBuild.id = build[0].value;
                    parsedBuild.ownerId = build[1].value;
                    parsedBuild.title = build[2].value;
                    parsedBuild.description = build[3].value;
                    parsedBuild.godId = build[4].value;
                    parsedBuild.items = JSON.parse(build[5].value);
                    parsedBuild.likes = build[6].value;
                    parsedBuild.dislikes = build[7].value;
                    parsedBuild.createdDate = Date.parse(build[8].value);



                    // Get the build owner username.
                    let ownerName = await helperFunctions.getUsername(parsedBuild.ownerId);
                    parsedBuild.ownerName = ownerName;

                    // Get the god data.
                    let godData = await helperFunctions.getGodData(parsedBuild.godId);
                    parsedBuild.godData = godData;


                    // Get the item data.
                    for (const itemType in parsedBuild.items) {
                        for (const itemSlot in parsedBuild.items[itemType]) {
                            // Item slots can be null, so ignore any that aren't set.
                            if (parsedBuild.items[itemType][itemSlot]) {
                                let itemData = await helperFunctions.getItemData(parsedBuild.items[itemType][itemSlot]);
                                // Replace the items ID with the actual item data.
                                parsedBuild.items[itemType][itemSlot] = itemData;
                            }
                        }
                    }

                    // Finished, create response.
                    response = { status: "Success", resData: parsedBuild };
                }
            };
            dbConnection.close();
            // Send res.
            res.json(response);
        });
        // Prepare.
        request.addParameter("id", TYPES.Int, buildId);
        // Execute.
        dbConnection.execSql(request);

    } catch (error) {
        response = { status: "Failure", resData: error.message };
        // Close db connection if open.
        if (dbConnection) {
            dbConnection.close();
        };
        res.json(response);
    }
});

/**
 * POST get all builds that are favourited by the user.
 */
router.post("/favourited", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const { body } = req;
    const { userId } = body;


    try {
        // Validation.
        if (!Number.isInteger(userId)) {
            throw new Error(`The provided user ID '${userId}' is invalid.`);
        }
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        // Can use a JOIN statement to get all the relevant builds.
        let sqlSelectFavouritedBuildsStatement = "SELECT * FROM SmiBuilder.Builds AS bs JOIN SmiBuilder.Favourites AS fs ON bs.id = fs.build_id WHERE fs.builder_user_id = @userId";

        let request = new Request(sqlSelectFavouritedBuildsStatement, function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
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

        // Prepare.
        request.addParameter("userId", TYPES.Int, userId);
        // Execute.
        dbConnection.execSql(request);
    } catch (error) {
        response = { status: "Failure", resData: error.message };
        // Close db connection if open.
        if (dbConnection) {
            dbConnection.close();
        };
        res.json(response);
    }
});


/**
 * CREATE a build.
 */
router.post("/create", async function (req, res, next) {
    const { body } = req;
    let response = {};
    let dbConnection = null;

    // Do database work in try catch.
    try {
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlInsertBuildStatement = "INSERT INTO SmiBuilder.Builds VALUES(@ownerId, @title, @description, @godId, @items, @likes, @dislikes, @created_on, @updated_on)";

        let request = new Request(sqlInsertBuildStatement, function (err, rowCount, rows) {
            if (err) {
                let errorMessage = "";
                errorMessage = err.message;
                response = { status: "Failure", resData: errorMessage };
                dbConnection.close();
                res.json(response);
            } else {
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
        response = { status: "Failure", resData: error.message };

        // Close if open.
        if (dbConnection) {
            dbConnection.close();
        }
        res.json(response);
    }
});


/**
 * POST - increment the like count of a build.
 */
router.post("/like/:buildId", async function (req, res, next) {
    const buildId = parseInt(req.params.buildId);
    let response = {};
    let dbConnection = null;

    try {
        // Integer validation.
        if (!Number.isInteger(buildId)) {
            throw new Error(`The provided builId '${buildId}' is not an integer.`)
        }
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlUpdateIncrementBuildLikesStatement = "UPDATE SmiBuilder.Builds SET likes = likes + 1 WHERE id = @id";

        let request = new Request(sqlUpdateIncrementBuildLikesStatement, function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                response = { status: "Success", resData: "The build has been liked." };
                dbConnection.close();
                // Send res.
                res.json(response);
            }
        });
        // Prepare.
        request.addParameter("id", TYPES.Int, buildId);
        // Execute.
        dbConnection.execSql(request);
    } catch (error) {
        response = { status: "Failure", resData: error.message };
        // Close db connection if open.
        if (dbConnection) {
            dbConnection.close();
        };
        res.json(response);
    }
});

/**
 * POST - increment the dislike count of a build.
 */
router.post("/dislike/:buildId", async function (req, res, next) {
    const buildId = parseInt(req.params.buildId);
    let response = {};
    let dbConnection = null;

    try {
        // Integer validation.
        if (!Number.isInteger(buildId)) {
            throw new Error(`The provided builId '${buildId}' is not an integer.`)
        }
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlUpdateIncrementBuildLikesStatement = "UPDATE SmiBuilder.Builds SET dislikes = dislikes + 1 WHERE id = @id";

        let request = new Request(sqlUpdateIncrementBuildLikesStatement, function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                response = { status: "Success", resData: "The build has been disliked." };
                dbConnection.close();
                // Send res.
                res.json(response);
            }
        });
        // Prepare.
        request.addParameter("id", TYPES.Int, buildId);
        // Execute.
        dbConnection.execSql(request);
    } catch (error) {
        response = { status: "Failure", resData: error.message };
        // Close db connection if open.
        if (dbConnection) {
            dbConnection.close();
        };
        res.json(response);
    }
});


module.exports = router;