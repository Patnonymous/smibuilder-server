// Imports - Express
var express = require('express');
var router = express.Router();
// Imports - Database
var dbconfig = require("../config/dbconfig");
var dbConnection = dbconfig.getDb();
var Request = require("tedious").Request;
const TYPES = require("tedious").TYPES;
// Imports - bcrypt
const bcrypt = require("bcrypt");
const saltRounds = 10;


// CREATE USER
router.post("/register", async function (req, res, next) {
  const TAG = "users.js - post(/), ";
  console.log(TAG + "body: ");
  const { body } = req;
  console.log(body);
  let response = {};
  const hashed = bcrypt.hashSync(body.password, saltRounds);

  try {
    let sqlInsertUserStatement = "INSERT INTO SmiBuilder.Users VALUES(@email, @username, @password, @user_type)";
    let request = new Request(sqlInsertUserStatement, function (err, rowCount, rows) {
      if (err) {
        console.log("Database request error.");
        console.log(err.message);
        response = { status: "Failure", resData: err.message };
        res.json(response);
      } else {
        console.log("Create User Success");
        console.log(rowCount);
        console.log(rows);
        response = { status: "Success" };
        res.json(response);
      }
    });
    request.addParameter("email", TYPES.VarChar, body.email);
    request.addParameter("username", TYPES.VarChar, body.username);
    request.addParameter("password", TYPES.VarChar, hashed);
    request.addParameter("user_type", TYPES.VarChar, "Member");
    dbConnection.execSql(request);


  } catch (error) {
    console.log(TAG + "error: ");
    console.log(error)
    response = { status: "Failure", resData: error.message };
    res.json(response);
  };



  // let sqlTestStatement = "SELECT * FROM SmiBuilder.Users";
  // var request = new Request(sqlTestStatement, function (err, rowCount, rows) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     console.log("SQL Total Rows: " + rowCount);
  //     console.log(rows);
  //   };
  // });
  // dbConnection.execSql(request)

  // res.send("Yeah!")
});


/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});




module.exports = router;
