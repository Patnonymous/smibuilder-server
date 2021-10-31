// Imports
var itemsJson = require("./items.json");

// Vars
var arrayOfItems = [];

function loadItemsFromJson() {
    const TAG = "\nloadItems.js - loadItemsFromJson(), ";
    console.log(TAG + "Running.");

    let index = 0;
    let aLength = itemsJson.length;
    while (index < aLength) {
        this.arrayOfItems.push(itemsJson[index]);
        index++;
    };
    console.log(`Finished loading items. Total: ${arrayOfItems.length}`);
};

function getArrayOfItems() {
    return this.arrayOfItems;
};

module.exports = { loadItemsFromJson, arrayOfItems, getArrayOfItems }