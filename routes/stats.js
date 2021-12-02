// Imports - Express.
var express = require('express');
var router = express.Router();
// Imports - Database
var dbconfig = require("../config/dbconfig");
var Request = require("tedious").Request;
const TYPES = require("tedious").TYPES;
// Imports - Other
const fs = require("fs");
var verifyUser = require("../functions/verifyUser");
// Imports - other
var loadItems = require("../functions/loadItems");

// Middleware ----
router.use("/get/site-stats", async function (req, res, next) {
    const { body } = req;
    const { token, userId } = body;

    // Verify token.
    let verifyTokenResult = verifyUser.verifyToken(token);
    if (verifyTokenResult === false) {
        res.json({ status: "Failure", resData: "Unauthorized." });
    } else {
        // Verify user is the type we want.
        let verifyUserTypeResponse = await verifyUser.verifyUserType(userId, "Admin");
        if (verifyUserTypeResponse === false) {
            res.json({ status: "Failure", resData: "Unauthorized." });
        } else {
            next();
        }
    }
});
router.use("/get/item-stats", async function (req, res, next) {
    const { body } = req;
    const { token, userId } = body;

    // Verify token.
    let verifyTokenResult = verifyUser.verifyToken(token);
    if (verifyTokenResult === false) {
        res.json({ status: "Failure", resData: "Unauthorized." });
    } else {
        // Verify user is the type we want.
        let verifyUserTypeResponse = await verifyUser.verifyUserType(userId, "Admin");
        if (verifyUserTypeResponse === false) {
            res.json({ status: "Failure", resData: "Unauthorized." });
        } else {
            next();
        }
    }
});
// END Middleware ----


/**
 * POST / end point logs provided data to the pw logging file.
 */
router.post("/", function (req, res, next) {
    // Variables.
    const { body, ip } = req;
    const { routeData, userData } = body;
    const { userId, userName, userType } = userData;
    let loggerJsonData = null;

    // Attempt to load logger file.
    try {
        let rawData = fs.readFileSync("pw-logging/pwLoggerFile.json");
        loggerJsonData = JSON.parse(rawData);
    } catch (error) {
        // Create the log file if it doesn't exist.
        // Initialize with the current date.
        loggerJsonData = { dateLoggerInitialized: Date.now(), lastTwentyFiveRequests: [], userStats: {}, routeStats: {} };
        fs.writeFileSync("pw-logging/pwLoggerFile.json", JSON.stringify(loggerJsonData));
    };

    try {
        // Log the route file.
        // Remove the first item if 25.
        if (loggerJsonData.lastTwentyFiveRequests.length === 25) {
            loggerJsonData.lastTwentyFiveRequests.shift();
        };
        // Log the line.
        let logLine = `ROUTE: ${routeData.path}, USER NAME: ${userName ? userName : "Anonymous"}, USER ID: ${userId ? userId : "-1"} USER TYPE: ${userType ? userType : "Public"}, IP: ${ip}, DATE: ${new Date(Date.now()).toUTCString()}`
        loggerJsonData.lastTwentyFiveRequests.push(logLine);

        // Update user stats if they're not anonymous.
        if (userId !== null) {
            // If the user is not already initiated in the logs, init them.
            if (!loggerJsonData.userStats.hasOwnProperty(userId)) {
                loggerJsonData.userStats[userId] = { userName: userName, numberOfHits: 0 };
            };
            // Increment hits.
            loggerJsonData.userStats[userId].numberOfHits = loggerJsonData.userStats[userId].numberOfHits + 1;
        };


        // Update the route paths stats.
        if (!loggerJsonData.routeStats.hasOwnProperty(routeData.path)) {
            loggerJsonData.routeStats[routeData.path] = { numberOfHits: 0 };
        };
        loggerJsonData.routeStats[routeData.path].numberOfHits = loggerJsonData.routeStats[routeData.path].numberOfHits + 1;


        // Write.
        fs.writeFileSync("pw-logging/pwLoggerFile.json", JSON.stringify(loggerJsonData));

        res.send("I got you!");
    } catch (error) {
        res.send("I dont got you. There was an error.");
    }
});


/**
 * POST get the latest site statistics.
 */
router.post("/get/site-stats", function (req, res, next) {
    // Try to get the stats log file.
    try {
        let rawData = fs.readFileSync("pw-logging/pwLoggerFile.json");
        let loggerJsonData = JSON.parse(rawData);
        res.json({ status: "Success", resData: loggerJsonData });
    } catch (error) {
        res.json({ status: "Failure", resData: error.message });
    }
});


/**
 * POST get the latest info on what items are being used.
 */
router.post("/get/item-stats", async function (req, res, next) {
    let response = {};
    let dbConnection = null;
    const itemsArray = loadItems.getArrayOfItems();

    try {
        let dbConnectionStatus = await dbconfig.asyncConnectToDb();
        dbConnection = dbConnectionStatus.resData;
        let sqlSelectAllBuildsItemsStatement = "SELECT item_ids_json FROM SmiBuilder.Builds";

        let request = new Request(sqlSelectAllBuildsItemsStatement, function (err, rowCount, rows) {
            if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
            } else {
                dbConnection.close();

                // Do work and process the items.
                let itemUsageStats = {}
                rows.forEach(build => {
                    let buildData = JSON.parse(build[0].value);

                    // Check item categories for non-null item slots.
                    for (const itemCategory in buildData) {
                        for (const itemSlot in buildData[itemCategory]) {
                            if (buildData[itemCategory][itemSlot] !== null) {
                                let itemId = buildData[itemCategory][itemSlot];
                                // Check if the item already exists in the itemUsageStats. If not - initialize it.
                                if (!itemUsageStats.hasOwnProperty(itemId)) {
                                    itemUsageStats[itemId] = { numberOfHits: 0 };
                                    // Get the data for this item.
                                    let itemIndex = itemsArray.findIndex(item => {
                                        return item.ItemId === itemId
                                    });
                                    itemUsageStats[itemId].itemData = itemsArray[itemIndex];
                                };
                                // Increment items hits.
                                itemUsageStats[itemId].numberOfHits = itemUsageStats[itemId].numberOfHits + 1;
                            }
                        }
                    }
                });




                response = { status: "Success", resData: itemUsageStats };
                res.json(response);
            }
        });
        // Execute.
        dbConnection.execSql(request);
    } catch (error) {
        if (dbConnection) {
            dbConnection.close();
        };
        response = { status: "Failure", resData: error.message };
        res.json(response);
    }
});




module.exports = router;