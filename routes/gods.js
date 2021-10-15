// Imports - Express
var express = require('express');
var router = express.Router();
// Imports - Other
var loadGods = require('../functions/loadGods');

/**
 * GET all gods.
 */
router.get('/', async function (req, res, next) {
    const TAG = "\ngods.js - get(/), ";
    const godsArray = loadGods.getArrayOfGods();
    let response = {};

    console.log(TAG + "sending array of gods.");

    try {
        response = { status: "Success", resData: godsArray };
    } catch (error) {
        console.log("ERROR: ");
        console.log(error.message);
        console.log(error);
        response = { status: "Failure", resData: error.message };
    };
    res.json(response);
});



module.exports = router;