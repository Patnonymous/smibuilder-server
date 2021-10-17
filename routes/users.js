// Imports - Express
var express = require('express');
var router = express.Router();
// Imports - Database
var dbconfig = require("../config/dbconfig");
var Request = require("tedious").Request;
const TYPES = require("tedious").TYPES;
// Imports - bcrypt
const bcrypt = require("bcrypt");
const saltRounds = 10;
// Imports - Other
const { DateTime } = require("luxon");
var jwt = require('jsonwebtoken');


/**
 * @description CREATE a user. A post request to /register attempts to create a user.
 * All API responses for this application will try to follow a standard format. All response objects will contain
 * a 'status'' indicating Success or Failure, and sometimes a 'resData' containing data.
 * @returns SUCCESS: res.json{status: Success}
 * 
 * ERROR: res.json{status: Failure, resData: errorMessage}
 */
router.post("/register", async function (req, res, next) {
  const TAG = "\nusers.js - post(/register), ";
  const { body } = req;
  const hashed = bcrypt.hashSync(body.password, saltRounds);
  let response = {};
  let userNameWithAppend;


  console.log(TAG + "body: ");
  console.log(body);

  try {
    console.log("Awaiting connection status...");
    let dbConnectionStatus = await dbconfig.asyncConnectToDb();
    console.log("Awaited connection.");
    let dbConnection = dbConnectionStatus.resData;

    // Get the identifier number that will be added to the end of the username
    let dbGetUsernameAppendStatus = await dbconfig.asyncGetAndSetUsernameAppend(dbConnection);
    userNameWithAppend = body.username + "#" + String(dbGetUsernameAppendStatus.resData);


    // Create the prepared statement. Tedious uses @name for variables.
    let sqlInsertUserStatement = "INSERT INTO SmiBuilder.Users VALUES(@email, @username, @password, @user_type, @created_on, @updated_on)";
    // Create the new request object.
    let request = new Request(sqlInsertUserStatement, function (err, rowCount, rows) {
      // Check for errors.
      if (err) {
        let errorMessage = "";
        console.log("Database request error.");
        console.log(err.message);

        // Bad error handling.
        if (err.message.includes("Violation of UNIQUE KEY constraint 'SmiBuilderUsers_email_unique'")) {
          errorMessage = "This email is already is registered."
        } else {
          errorMessage = err.message;
        }

        response = { status: "Failure", resData: errorMessage };
        dbConnection.close();
        console.log("dbConnection has been closed.");
        res.json(response);
      } else {
        // There was no err, statement was a success. Process the data, then send the response.
        console.log("Create User Success");
        console.log(rowCount);
        console.log(rows);
        response = { status: "Success" };
        dbConnection.close();
        console.log("dbConnection has been closed.");
        res.json(response);
      };
    });

    // This is how to add variables to prepared statements using Tedious.
    request.addParameter("email", TYPES.VarChar, body.email);
    request.addParameter("username", TYPES.VarChar, userNameWithAppend);
    request.addParameter("password", TYPES.VarChar, hashed);
    request.addParameter("user_type", TYPES.VarChar, "Member");
    request.addParameter("created_on", TYPES.DateTime, DateTime.now())
    request.addParameter("updated_on", TYPES.DateTime, DateTime.now())
    // Once everything is ready, execute the request.
    dbConnection.execSql(request);


  } catch (error) {
    console.log(TAG + "error: ");
    console.log(error)
    response = { status: "Failure", resData: error.message };
    dbConnection.close();
    console.log("dbConnection has been closed.");
    res.json(response);
  };
});


/**
 * @description POST log in a user. Find the account with the email they gave, then attempt login.
 */
router.post("/login", async function (req, res, next) {
  const TAG = "\nusers.js - post(/login), ";
  const { body } = req;
  let response = {};
  let errorMessage = "";

  console.log(TAG + "body: ");
  console.log(body);


  try {
    console.log("Awaiting connection status...");
    let dbConnectionStatus = await dbconfig.asyncConnectToDb();
    console.log("Awaited connection.");
    let dbConnection = dbConnectionStatus.resData;
    let sqlSelectUserStatement = "SELECT email, username, password, user_type, created_on, updated_on FROM SmiBuilder.Users WHERE email = @email";
    let request = new Request(sqlSelectUserStatement, function (err, rowCount, rows) {
      if (err) {
        errorMessage = "";
        console.log("Database request error.");
        console.log(err.message);

        response = { status: "Failure", resData: errorMessage };
        dbConnection.close();
        console.log("dbConnection has been closed.");
        res.json(response);

      } else {
        console.log(TAG + "Request success. Outputting rowCount and rows: ")
        console.log(rowCount);
        console.log(rows);

        // If rowCount is 0, then the account doesn't exist.
        if (rowCount === 0) {
          errorMessage = "The username or password is incorrect.";
          response = { status: "Failure", resData: errorMessage };
          dbConnection.close();
          console.log("dbConnection has been closed.");
          res.json(response);
        } else if (rowCount > 1) {
          // If rowCount is greater than 1, something is wrong.
          errorMessage = "Found more than 1 account associated with this email. Contact an administrator and complain because this shouldn't happen."
          response = { status: "Failure", resData: errorMessage };
          dbConnection.close();
          console.log("dbConnection has been closed.");
          res.json(response);
        } else {
          // Else, we have a valid user to check.
          const retrievedUser = rows[0];
          const passHash = retrievedUser[2].value;
          let isPasswordCorrect = bcrypt.compareSync(body.password, passHash);
          if (isPasswordCorrect === true) {
            const userObject = {
              userEmail: retrievedUser[0].value,
              userName: retrievedUser[1].value,
              userType: retrievedUser[3].value,
              createdOn: retrievedUser[4].value,
              updatedOn: retrievedUser[5].value,

            };
            // Sign token.
            let token = jwt.sign({ data: userObject }, process.env.WEBTOKEN_SECRET, { expiresIn: "12h" });
            console.log(TAG + "token: ");
            console.log(token)

            response = { status: "Success", resData: { userObject: userObject, token: token } };
            dbConnection.close();
            console.log("dbConnection has been closed.");
            res.json(response);
          } else {
            errorMessage = "The username or password is incorrect.";
            response = { status: "Failure", resData: errorMessage };
            dbConnection.close();
            console.log("dbConnection has been closed.");
            res.json(response);
          };
        };
      };
    });

    request.addParameter("email", TYPES.VarChar, body.email);
    dbConnection.execSql(request);
  } catch (error) {
    console.log(TAG + "Error caught by the try catch.")
    console.log(error);
    response = { status: "Failure", resData: error.message };
    dbConnection.close();
    console.log("dbConnection has been closed.");
    res.json(response);
  };
});


router.post("/verify", async function (req, res, next) {
  const TAG = "users.js - post(/verify), ";
  const { body } = req;
  const { token } = body;
  let response = {};

  console.log(TAG + "Verifying jwt.");
  console.log(TAG + "body: ");
  console.log(body);
  let decoded;

  try {
    // Success.
    decoded = jwt.verify(token, process.env.WEBTOKEN_SECRET);
    console.log(TAG + "decoded token: ");
    console.log(decoded);

    response = { status: "Success", resData: decoded.data };


  } catch (error) { // Failures.
    console.log(TAG + "Error decoding token");
    if (error.name === "TokenExpiredError") {
      console.log("Expired token error.");
      console.log(error);
      response = { status: "Failure", resData: "Login session has expired. Please sign in again." };
    } else {
      console.log("Other error.");
      console.log(error);
      response = { status: "Failure", resData: "An error has occurred with your session. Please sign in again." };
    };
  };

  console.log(TAG + "response: ");
  console.dir(response);
  res.json(response);
});



module.exports = router;
