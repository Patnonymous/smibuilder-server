// Imports - express
var express = require('express');
var router = express.Router();
// Imports - other
var loadItems = require("../functions/loadItems");

/**
 * @description GET all items.
 */
router.post("/", async function (req, res, next) {
    const TAG = "\nitems.js - get(/), ";
    const itemsArray = loadItems.getArrayOfItems();
    const { body } = req
    let response = {};

    console.log(TAG + "Sending array of all the items.");



    try {
        let filteredItemsArray = itemsArray.filter(item => {
            return item.ActiveFlag == "y"
        });
        // Filter out any equipped items.
        filteredItemsArray = filteredItemsArray.filter(item => {
            return !body.equipped.includes(item.ItemId)
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
router.post("/consumables", async function (req, res, next) {
    const TAG = "\nitems.js - get(/consumables), ";
    const itemsArray = loadItems.getArrayOfItems();
    const { body } = req
    let response = {};

    console.log(TAG + "Sending array of only consumables");
    console.log("body: ");
    console.log(body);

    try {
        let filteredItemsArray = itemsArray.filter(item => {
            return item.Type === "Consumable" && item.ActiveFlag == "y"
        });
        // Filter out any equipped items.
        filteredItemsArray = filteredItemsArray.filter(item => {
            return !body.equipped.includes(item.ItemId)
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
router.post("/relics", async function (req, res, next) {
    const TAG = "\nitems.js - get(/relics), ";
    const itemsArray = loadItems.getArrayOfItems();
    const { body } = req
    let response = {};

    console.log(TAG + "Sending array of only relics");

    try {
        let filteredItemsArray = itemsArray.filter(item => {
            return item.Type === "Active" && item.ActiveFlag == "y"
        });
        // Filter out any equipped items.
        filteredItemsArray = filteredItemsArray.filter(item => {
            return !body.equipped.includes(item.ItemId)
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
 * @description Get the valid items for the character.
 * Uses many filters to filter out the items that the character cannot use.
 * The final arra should be the valid items.
 * Returns response.
 */
router.post("/:godRole/:godDamageType/:godBasicAttackType/:itemsOnly/:isRatatoskr", async function (req, res, next) {
    const TAG = "\nitems.js - get(/godRole/godDamageType/godBasicAttackType/itemsOnly), ";
    const itemsArray = loadItems.getArrayOfItems();
    const { params } = req;
    const { godRole, godDamageType, godBasicAttackType, itemsOnly, isRatatoskr } = params
    const { body } = req
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

        // Filter out any equipped items.
        filteredItemsArray = filteredItemsArray.filter(item => {
            return !body.equipped.includes(item.ItemId)
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


/**
 * @description Gets all the items that are related to the rootId param.
 * Puts each item in the appropriate array (tier 1, 2, and 3).
 * Returns the response.
 */
router.get("/tree/:rootId", async function (req, res, next) {
    const itemsArray = loadItems.getArrayOfItems();
    const { params } = req;
    const { rootId } = params;
    let response = {};
    let resData = {
        tier1Items: [], tier2Items: [], tier3Items: [],
    };

    try {
        // Step 1 filter all items to only ones with root id
        let filteredItems = itemsArray.filter(item => {
            return parseInt(item.RootItemId) === parseInt(rootId) && item.ActiveFlag === "y";
        });

        filteredItems.forEach(item => {
            if (item.ItemTier === 1) {
                resData.tier1Items.push(item);
            } else if (item.ItemTier === 2) {
                resData.tier2Items.push(item);
            } else if (item.ItemTier === 3) {
                resData.tier3Items.push(item);
            };
        });

        response = { status: "Success", resData: resData }

    } catch (error) {
        console.log("ERROR: ");
        console.log(error.message);
        console.log(error);
        response = { status: "Failure", resData: error.message };
    };
    res.json(response);

})










module.exports = router;