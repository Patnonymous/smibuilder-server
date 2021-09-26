var express = require('express');
var router = express.Router();
var dbconfig = require("../config/dbconfig");
var dbConnection = dbconfig.getDb();
var Request = require("tedious").Request;


router.post("/register", function (req, res, next) {
  const TAG = "users.js - post(/), ";
  console.log(TAG + "body: ");
  console.log(req.body);

  console.log(process.env.FOO)

  let sqlTestStatement = "SELECT * FROM SmiBuilder.Users";
  var request = new Request(sqlTestStatement, function (err, rowCount, rows) {
    if (err) {
      console.log(err);
    } else {
      console.log("SQL Total Rows: " + rowCount);
      console.log(rows);
    };
  });
  dbConnection.execSql(request)

  res.send("Yeah!")
});


/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});




module.exports = router;
