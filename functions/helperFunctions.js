// Imports - Database
var dbconfig = require("../config/dbconfig");
var Request = require("tedious").Request;
const TYPES = require("tedious").TYPES;
// Imports other.
var loadGods = require('../functions/loadGods');
var loadItems = require("../functions/loadItems");

/**
 * Async promise to get a users username according to the provided ID.
 * @param {Number} userId 
 * @returns Promise resolve with name or rejected with false.
 */
async function getUsername(userId) {
    let dbConnection = null;
    let dbConnectionStatus = await dbconfig.asyncConnectToDb();

    return new Promise((resolve, reject) => {
        try {
            dbConnection = dbConnectionStatus.resData;
            let sqlSelectUsernameStatement = "SELECt username FROM SmiBuilder.Users WHERE id = @userId";
            let request = new Request(sqlSelectUsernameStatement, function (err, rowCount, rows) {
                if (err) {
                    dbConnection.close();
                    reject(false);
                } else {
                    dbConnection.close();
                    resolve(rows[0][0].value);
                }
            });
            // Prepare.
            request.addParameter("userId", TYPES.Int, userId);
            // Execute.
            dbConnection.execSql(request);
        } catch (error) {
            // Close db connection if open.
            if (dbConnection) {
                dbConnection.close();
            };
            reject(false);
        }
    });
};

/**
 * Async promise to get god data according to the godId.
 * @param {Number} godId 
 * @returns Resolve to god data or reject with false.
 */
async function getGodData(godId) {
    const godsArray = loadGods.getArrayOfGods();
    return new Promise((resolve, reject) => {
        try {
            let godIndex = godsArray.findIndex(god => {
                return god.id === godId;
            });
            resolve(godsArray[godIndex]);
        } catch (error) {
            reject(false);
        }
    });
};

/**
 * Async promise to get item data according to the itemId.
 * @param {Number} itemId 
 * @returns Resolve to item data or reject with false.
 */
async function getItemData(itemId) {
    const itemsArray = loadItems.getArrayOfItems();
    return new Promise((resolve, reject) => {
        try {
            let itemIndex = itemsArray.findIndex(item => {
                return item.ItemId === itemId;
            });
            resolve(itemsArray[itemIndex]);
        } catch (error) {
            reject(false);
        }
    });
}



module.exports = { getUsername, getGodData, getItemData };