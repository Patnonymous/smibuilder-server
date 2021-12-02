// Imports - Express
var express = require('express');
var router = express.Router();
// Imports - Other
var loadGods = require('../functions/loadGods');

/**
 * GET all gods.
 */
router.get('/', async function (req, res, next) {
    const godsArray = loadGods.getArrayOfGods();
    let response = {};

    try {
        response = { status: "Success", resData: godsArray };
    } catch (error) {
        response = { status: "Failure", resData: error.message };
    };
    res.json(response);
});

/**
 * Get 1 god according to the id param.
 */
router.get("/:id", async function (req, res, next) {
    const godsArray = loadGods.getArrayOfGods();
    const idToGet = parseInt(req.params.id)
    let response = {};

    try {
        let foundGod = godsArray.filter(god => { return parseInt(god.id) === idToGet });
        if (foundGod.length !== 1) {
            throw new Error(`Something went wrong. Found under 1, or more than 1 gods with the ID ${idToGet}.`)
        } else {
            response = { status: "Success", resData: foundGod[0] };
        }
    } catch (error) {
        response = { status: "Failure", resData: error.message };
    }

    res.json(response);

});



module.exports = router;