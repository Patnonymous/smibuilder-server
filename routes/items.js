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
        let filteredItemsArray = itemsArray.filter(item => {
            return item.ActiveFlag == "y"
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

router.get("/:godRole/:godDamageType/:godBasicAttackType/:itemsOnly/:isRatatoskr", async function (req, res, next) {
    const TAG = "\nitems.js - get(/godRole/godDamageType/godBasicAttackType/itemsOnly), ";
    const itemsArray = loadItems.getArrayOfItems();
    const { params } = req;
    const { godRole, godDamageType, godBasicAttackType, itemsOnly, isRatatoskr } = params
    let response = {};

    // These can catch most items
    const magicalRelatedItemKeys = ["Magical Power", "Magical Penetration", "Magical Lifesteal"];
    const physicalRelatedItemKeys = ["Physical Power", "Physical Penetration", "Physical Lifesteal"]

    // These are more specific arrays for items that don't get caught by the above arrays.
    const physicalOnlyItems = [10662];
    const magicalOnlyItems = [];

    console.log(TAG + "Getting all regular items that this god can use.");
    console.log(`Role: ${godRole}, Damage Type: ${godDamageType}, Basic Attack Type: ${godBasicAttackType}, Only get items: ${itemsOnly}`);
    console.log(`Is this God Ratatoskr: ${isRatatoskr}`);

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


        // Fourth is damage type filters.
        filteredItemsArray = filteredItemsArray.filter(item => {
            if (item.StartingItem === true) {
                return true;
            } else {
                if (godDamageType === "Physical") {
                    let index = 0;
                    let aLength = item.ItemDescription.Menuitems.length;
                    while (index < aLength) {
                        if (magicalRelatedItemKeys.includes(item.ItemDescription.Menuitems[index].Description)) {
                            return false;
                        };
                        index++;
                    };
                    return true;
                } else if (godDamageType === "Magical") {
                    let index = 0;
                    let aLength = item.ItemDescription.Menuitems.length;
                    while (index < aLength) {
                        if (physicalRelatedItemKeys.includes(item.ItemDescription.Menuitems[index].Description)) {
                            return false;
                        };
                        index++;
                    };
                    return true;
                };
            }
        });

        // Fifth is to catch items that evade the above filters
        filteredItemsArray = filteredItemsArray.filter(item => {
            if (godDamageType === "Physical") {
                if (magicalOnlyItems.includes(item.ItemId) || magicalOnlyItems.includes(item.RootItemId)) {
                    return false;
                };
                return true;
            } else if (godDamageType === "Magical") {
                if (physicalOnlyItems.includes(item.ItemId) || physicalOnlyItems.includes(item.RootItemId)) {
                    return false;
                };
                return true;
            };
        });

        // FINAL filter catches character specific edge cases.
        // IIRC there's only one in the game right now: Rats acorn. Nobody but Rat can use the acorn.
        filteredItemsArray = filteredItemsArray.filter(item => {
            // Deny the Acorn tree if current god is not Ratatoskr
            if (item.RootItemId === 18703 && isRatatoskr === "false") {
                return false;
            }
            return true;
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