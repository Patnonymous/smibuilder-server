// Imports
var godsJson = require("./gods.json");

// Vars
var arrayOfGods = [];

/**
 * Load from json into array.
 */
function loadGodsFromJson() {
    let index = 0;
    let aLength = godsJson.length;
    while (index < aLength) {
        this.arrayOfGods.push(godsJson[index]);
        index++;
    };
};

function getArrayOfGods() {
    return this.arrayOfGods;
};



module.exports = { loadGodsFromJson, arrayOfGods, getArrayOfGods };