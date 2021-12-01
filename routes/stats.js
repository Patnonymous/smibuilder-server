// Imports - Express.
var express = require('express');
var router = express.Router();
// Imports - Other
const fs = require("fs");
var verifyUser = require("../functions/verifyUser");


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

router.post("/", function (req, res, next) {
    // Variables.
    const TAG = "\n-------- stats.js - POST(/), --------";
    const { body, baseUrl, originalUrl, path, hostname, ip } = req;
    const { routeData, userData } = body;
    const { userId, userEmail, userName, userType } = userData;
    let loggerJsonData = null;

    // Attempt to load logger file.
    try {
        let rawData = fs.readFileSync("pw-logging/pwLoggerFile.json");
        loggerJsonData = JSON.parse(rawData);
    } catch (error) {
        console.log("Caught error when loading file");
        console.log(error);
        // Create the log file if it doesn't exist.
        // Initialize with the current date.
        loggerJsonData = { dateLoggerInitialized: Date.now(), lastTwentyFiveRequests: [], userStats: {}, routeStats: {} };
        fs.writeFileSync("pw-logging/pwLoggerFile.json", JSON.stringify(loggerJsonData));
    };

    try {
        console.log("loggerJsonData: ");
        console.log(loggerJsonData);

        // The works.
        console.log(TAG + "We loggin!");
        console.log("Outputting server route req stats: ");
        console.log("req.baseUrl: ", baseUrl);
        console.log("req.originalUrl: ", originalUrl);
        console.log("req.path: ", path);
        console.log("req.hostname: ", hostname);
        console.log("req.ip: ", ip);
        console.log('Time:', Date.now());

        console.log("\nOutputting body stats!");
        console.log("routeData: ");
        console.log(routeData);
        console.log("\nuserData: ");
        console.log(userData);

        console.log("\n -------- LOG END --------\n");



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
            console.log("Updating pw log user stats.");
            console.log("Checking if user is alread in stats: ");
            // If the user is not already initiated in the logs, init them.
            if (!loggerJsonData.userStats.hasOwnProperty(userId)) {
                console.log("User not initiated.");
                loggerJsonData.userStats[userId] = { userName: userName, numberOfHits: 0 };
            };
            // Increment hits.
            loggerJsonData.userStats[userId].numberOfHits = loggerJsonData.userStats[userId].numberOfHits + 1;
        }





        // Write.
        fs.writeFileSync("pw-logging/pwLoggerFile.json", JSON.stringify(loggerJsonData));

        res.send("I got you!");
    } catch (error) {
        console.log("Caught error processing pw log: ");
        console.log(error);
        res.send("I dont got you. There was an error.");
    }
});


/**
 * POST get the site stats.
 */
router.post("/get/site-stats", function (req, res, next) {
    // Try to get the stats log file.
    try {
        let rawData = fs.readFileSync("pw-logging/pwLoggerFile.json");
        let loggerJsonData = JSON.parse(rawData);
        res.json({ status: "Success", resData: loggerJsonData });
    } catch (error) {
        console.log("Caught error when trying to get stats log file: ");
        console.log(error);
        res.json({ status: "Failure", resData: error.message });
    }
});




module.exports = router;