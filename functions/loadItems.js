// Imports
var itemsJson = require("./items.json");

// Vars
var arrayOfItems = [];

function loadItemsFromJson() {

    let index = 0;
    let aLength = itemsJson.length;
    while (index < aLength) {
        this.arrayOfItems.push(itemsJson[index]);
        index++;
    };
};

function getArrayOfItems() {
    return this.arrayOfItems;
};

module.exports = { loadItemsFromJson, arrayOfItems, getArrayOfItems }