// Imports
var godsJson = require("./gods.json");

// Vars
var arrayOfGods = [];

/**
 * Load from json into array.
 */
function loadGodsFromJson() {
    const TAG = "\nloadGods.js - loadGodsFromJson(), ";
    console.log(TAG + "Running.");
    let index = 0;
    let aLength = godsJson.length;
    while (index < aLength) {
        this.arrayOfGods.push(godsJson[index]);
        index++;
    };
    console.log(`Finished loading gods. Total: ${arrayOfGods.length}`);
};

function getArrayOfGods() {
    return this.arrayOfGods;
};



module.exports = { loadGodsFromJson, arrayOfGods, getArrayOfGods };