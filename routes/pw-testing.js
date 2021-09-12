var express = require("express");
var router = express.Router();


router.get("/", function (req, res, next) {
    res.send("Hello there.");
});

router.post("/multiply-by-three", function (req, res, next) {
    console.log(req.body);
    let multipliedNumber = req.body.numberToMultiply * 3;
    res.json({ result: multipliedNumber });
});



module.exports = router;