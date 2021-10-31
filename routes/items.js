// Imports - express
var express = require('express');
var router = express.Router();
// Imports - other
var loadItems = require("../functions/loadItems");

/**
 * @description GET all items.
 */
router.get("/", async function (req, res, next) {
    const TAG = "\nitems.js - get(/), ";
    const itemsArray = loadItems.getArrayOfItems();
    let response = {};

    console.log(TAG + "Sending array of all the items.");

    try {
        response = { status: "Success", resData: itemsArray };
    } catch (error) {
        console.log("ERROR: ");
        console.log(error.message);
        console.log(error);
        response = { status: "Failure", resData: error.message };
    };
    res.json(response);
});


/**
 * @description GET consumable items.
 */
router.get("/consumables", async function (req, res, next) {
    const TAG = "\nitems.js - get(/consumables), ";
    const itemsArray = loadItems.getArrayOfItems();
    let response = {};

    console.log(TAG + "Sending array of only consumables");

    try {
        let filteredItemsArray = itemsArray.filter(item => {
            return item.Type === "Consumable" && item.ActiveFlag == "y"
        });
        response = { status: "Success", resData: filteredItemsArray };
    } catch (error) {
        console.log("ERROR: ");
        console.log(error.message);
        console.log(error);
        response = { status: "Failure", resData: error.message };
    };
    res.json(response);
});

/**
 * @description GET relic items. Relics are called "Active" items in the API JSON.
 */
router.get("/relics", async function (req, res, next) {
    const TAG = "\nitems.js - get(/relics), ";
    const itemsArray = loadItems.getArrayOfItems();
    let response = {};

    console.log(TAG + "Sending array of only relics");

    try {
        let filteredItemsArray = itemsArray.filter(item => {
            return item.Type === "Active" && item.ActiveFlag == "y"
        });
        response = { status: "Success", resData: filteredItemsArray };
    } catch (error) {
        console.log("ERROR: ");
        console.log(error.message);
        console.log(error);
        response = { status: "Failure", resData: error.message };
    };
    res.json(response);
});

router.get("/:godRole/:godDamageType/:godBasicAttackType/:itemsOnly", async function (req, res, next) {
    const TAG = "\nitems.js - get(/godRole/godDamageType/godBasicAttackType/itemsOnly), ";
    const itemsArray = loadItems.getArrayOfItems();
    const { params } = req;
    const { godRole, godDamageType, godBasicAttackType, itemsOnly } = params
    let response = {};

    console.log(TAG + "Getting all regular items that this god can use.");
    console.log(`Role: ${godRole}, Damage Type: ${godDamageType}, Basic Attack Type: ${godBasicAttackType}, Only get items: ${itemsOnly}`);

    try {
        // First filter out all inactive items
        let filteredItemsArray = itemsArray.filter(item => {
            return item.ActiveFlag === "y"
        });

        // Second filter out non regular items if true
        if (itemsOnly) {
            filteredItemsArray = filteredItemsArray.filter(item => {
                return item.Type === "Item"
            });
        };

        // Third filter out items that cannot be used by this role
        filteredItemsArray = filteredItemsArray.filter(item => {
            let restrictedRoles = item.RestrictedRoles.split(",");
            restrictedRoles.forEach((roleString, index) => restrictedRoles[index] = roleString.toLowerCase());
            return restrictedRoles.includes(godRole.toLowerCase()) !== true;
        });
        response = { status: "Success", resData: filteredItemsArray };
    } catch (error) {
        console.log("ERROR: ");
        console.log(error.message);
        console.log(error);
        response = { status: "Failure", resData: error.message };
    };
    res.json(response);
});










module.exports = router;