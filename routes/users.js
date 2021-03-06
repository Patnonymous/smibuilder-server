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
var verifyUser = require("../functions/verifyUser");


// Middleware.
router.use("/purge", async function (req, res, next) {
  const { body } = req;
  const { token, userId, password } = body;
  // Verify token.
  let verificationResponse = verifyUser.verifyToken(token);
  if (verificationResponse === false) {
    res.json({ status: "Failure", resData: "Unauthorized." })
  } else if (verificationResponse === true) {
    // If token is verified, verify the current password.
    let passwordResponse = await verifyUser.verifyPassword(userId, password);
    if (passwordResponse === false) {
      res.json({ status: "Failure", resData: "Could not authenticate current password." });
    } else {
      next();
    }
  }
});

router.use("/change/password", async function (req, res, next) {
  const { body } = req;
  const { token, userId, currentPassword } = body;
  // Verify token.
  let verificationResponse = verifyUser.verifyToken(token);
  if (verificationResponse === false) {
    res.json({ status: "Failure", resData: "Unauthorized." })
  } else if (verificationResponse === true) {
    // If token is verified, verify the current password.
    let passwordResponse = await verifyUser.verifyPassword(userId, currentPassword);
    if (passwordResponse === false) {
      res.json({ status: "Failure", resData: "Could not authenticate current password." });
    } else {
      next();
    }
  }
});


/**
 * @description CREATE a user. A post request to /register attempts to create a user.
 * All API responses for this application will try to follow a standard format. All response objects will contain
 * a 'status'' indicating Success or Failure, and sometimes a 'resData' containing data.
 * @returns {JSON} SUCCESS: res.json{status: Success}
 * 
 * ERROR: res.json{status: Failure, resData: errorMessage}
 */
router.post("/register", async function (req, res, next) {
  const { body } = req;
  const hashed = bcrypt.hashSync(body.password, saltRounds);
  let response = {};
  let dbConnection = null;
  let userNameWithAppend;
  const isRegistrationOpen = (process.env.REGISTRATION_OPEN === 'true');


  try {
    // Deny if registration is not open.
    if (isRegistrationOpen !== true) {
      throw new Error("Registration is currently closed.");
    };

    // Continue if it registration is open.
    let dbConnectionStatus = await dbconfig.asyncConnectToDb();
    dbConnection = dbConnectionStatus.resData;

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

        // Bad error handling.
        if (err.message.includes("Violation of UNIQUE KEY constraint 'Users_email_Unique'")) {
          errorMessage = "This email is already is registered."
        } else {
          errorMessage = err.message;
        }

        response = { status: "Failure", resData: errorMessage };
        dbConnection.close();
        res.json(response);
      } else {
        // There was no err, statement was a success. Process the data, then send the response.
        response = { status: "Success" };
        dbConnection.close();
        res.json(response);
      };
    });

    // This is how to add variables to prepared statements using Tedious.
    request.addParameter("email", TYPES.VarChar, body.email.toLowerCase());
    request.addParameter("username", TYPES.VarChar, userNameWithAppend);
    request.addParameter("password", TYPES.VarChar, hashed);
    request.addParameter("user_type", TYPES.VarChar, "Member");
    request.addParameter("created_on", TYPES.DateTime, DateTime.now())
    request.addParameter("updated_on", TYPES.DateTime, DateTime.now())
    // Once everything is ready, execute the request.
    dbConnection.execSql(request);


  } catch (error) {
    response = { status: "Failure", resData: error.message };
    if (dbConnection) {
      dbConnection.close();
    }
    res.json(response);
  };
});


/**
 * @description POST log in a user. Find the account with the email they gave, then attempt login.
 */
router.post("/login", async function (req, res, next) {
  const { body } = req;
  let response = {};
  let dbConnection = null;
  let errorMessage = "";


  try {
    let dbConnectionStatus = await dbconfig.asyncConnectToDb();
    dbConnection = dbConnectionStatus.resData;
    let sqlSelectUserStatement = "SELECT id, email, username, password, user_type, created_on, updated_on FROM SmiBuilder.Users WHERE email = @email";
    let request = new Request(sqlSelectUserStatement, function (err, rowCount, rows) {
      if (err) {
        errorMessage = "";

        response = { status: "Failure", resData: errorMessage };
        dbConnection.close();
        res.json(response);

      } else {
        // If rowCount is 0, then the account doesn't exist.
        if (rowCount === 0) {
          errorMessage = "The username or password is incorrect.";
          response = { status: "Failure", resData: errorMessage };
          dbConnection.close();
          res.json(response);
        } else if (rowCount > 1) {
          // If rowCount is greater than 1, something is wrong.
          errorMessage = "Found more than 1 account associated with this email. Contact an administrator and complain because this shouldn't happen."
          response = { status: "Failure", resData: errorMessage };
          dbConnection.close();
          res.json(response);
        } else {
          // Else, we have a valid user to check.
          const retrievedUser = rows[0];
          const passHash = retrievedUser[3].value;
          let isPasswordCorrect = bcrypt.compareSync(body.password, passHash);
          if (isPasswordCorrect === true) {
            const userObject = {
              userId: retrievedUser[0].value,
              userEmail: retrievedUser[1].value,
              userName: retrievedUser[2].value,
              userType: retrievedUser[4].value,
              createdOn: retrievedUser[5].value,
              updatedOn: retrievedUser[6].value,

            };
            // Sign token.
            let token = jwt.sign({ data: userObject }, process.env.WEBTOKEN_SECRET, { expiresIn: "12h" });

            response = { status: "Success", resData: { userObject: userObject, token: token } };
            dbConnection.close();
            res.json(response);
          } else {
            errorMessage = "The username or password is incorrect.";
            response = { status: "Failure", resData: errorMessage };
            dbConnection.close();
            res.json(response);
          };
        };
      };
    });

    request.addParameter("email", TYPES.VarChar, body.email);
    dbConnection.execSql(request);
  } catch (error) {
    response = { status: "Failure", resData: error.message };

    if (dbConnection) {
      dbConnection.close();
    };

    res.json(response);
  };
});

/**
 * @description GET a username according to user ID.
 */
router.get("/username/:userId", async function (req, res, next) {
  let response = {};
  let dbConnection = null;


  try {
    let dbConnectionStatus = await dbconfig.asyncConnectToDb();
    dbConnection = dbConnectionStatus.resData;
    let sqlSelectOneUsernameStatement = "SELECT username FROM SmiBuilder.Users WHERE id = @id";

    let request = new Request(sqlSelectOneUsernameStatement, function (err, rowCount, rows) {
      if (err) {
        dbConnection.close();
        response = { status: "Failure", resData: err.message };
        res.json(response);
      } else {
        if (rowCount === 0) {
          response = { status: "Failure", resData: `A user with the ID: '${req.params.userId}' does not exist.` };
        } else if (rowCount > 1) {
          response = { status: "Failure", resData: "More than 1 user was found. Something has gone very wrong." };
        } else {
          response = { status: "Success", resData: rows[0][0].value };
        }

        dbConnection.close();
        // Send res.
        res.json(response);
      };
    });

    // Prepare.
    request.addParameter("id", TYPES.Int, req.params.userId);
    // Execute.
    dbConnection.execSql(request);
  } catch (error) {
    if (dbConnection) {
      dbConnection.close();
    };
    response = { status: "Failure", resData: error.message };
    res.json(response);
  }
});


/**
 * POST change a users password.
 */
router.post("/change/password", async function (req, res, next) {
  let response = {};
  let dbConnection = null;
  const { body } = req;
  const { userId, currentPassword, newPassword } = body;
  const hashed = bcrypt.hashSync(newPassword, saltRounds);

  try {
    let dbConnectionStatus = await dbconfig.asyncConnectToDb();
    dbConnection = dbConnectionStatus.resData;
    let sqlUpdateUserPassword = "UPDATE SmiBuilder.Users SET password = @newPass WHERE id = @userId";

    let request = new Request(sqlUpdateUserPassword, function (err, rowCount, rows) {
      if (err) {
        dbConnection.close();
        response = { status: "Failure", resData: err.message };
        res.json(response);
      } else {
        response = { status: "Success", resData: "Password successfully changed." };
        dbConnection.close();
        res.json(response);
      }
    });

    // Prepare.
    request.addParameter("newPass", TYPES.VarChar, hashed);
    request.addParameter("userId", TYPES.Int, userId);
    // Execute.
    dbConnection.execSql(request);

  } catch (error) {
    response = { status: "Failure", resData: error.message };
    if (dbConnection) {
      dbConnection.close();
    }
    res.json(response);
  }


});


/**
 * POST - purge a user. Removes the users builds and favourites.
 * Incoming callback hell statemement running a bunch of SQL.
 */
router.post("/purge", async function (req, res, next) {
  let response = {};
  let dbConnection = null;
  const { body } = req;
  const { userId } = body;

  try {
    let dbConnectionStatus = await dbconfig.asyncConnectToDb();
    dbConnection = dbConnectionStatus.resData;
    let sqlDeleteUsersFavouritesStatement = "DELETE FROM SmiBuilder.Favourites WHERE builder_user_id = @userId";

    // Delete this users favourites.
    let deleteFavouritesRequest = new Request(sqlDeleteUsersFavouritesStatement, function (err, rowCount, rows) {
      if (err) {
        dbConnection.close();
        response = { status: "Failure", resData: err.message };
        res.json(response);
      } else {
        // Delete this users comments.
        let sqlDeleteUsersCommentsStatement = "DELETE FROM SmiBuilder.Comments WHERE owner_id = @userId";
        let deleteCommentsRequest = new Request(sqlDeleteUsersCommentsStatement, function (err, rowCount, rows) {
          if (err) {
            dbConnection.close();
            response = { status: "Failure", resData: err.message };
            res.json(response);
          } else {
            // Delete this users builds.
            let sqlDeleteUsersBuildsStatement = "DELETE FROM SmiBuilder.Builds WHERE owner_id = @userId";
            let deleteBuildsRequest = new Request(sqlDeleteUsersBuildsStatement, function (err, rowCount, rows) {
              if (err) {
                dbConnection.close();
                response = { status: "Failure", resData: err.message };
                res.json(response);
              } else {
                // Finally, delete this users account.
                let sqlDeleteThisUserStatement = "DELETE FROM SmiBuilder.Users WHERE id = @userId";
                let deleteUserRequest = new Request(sqlDeleteThisUserStatement, function (err, rowCount, rows) {
                  if (err) {
                    dbConnection.close();
                    response = { status: "Failure", resData: err.message };
                    res.json(response);
                  } else {
                    response = { status: "Success", resData: "User successfully purged. Goodbye!" };
                    dbConnection.close();
                    res.json(response);
                  }
                });
                // Prepare.
                deleteUserRequest.addParameter("userId", TYPES.Int, userId);
                // Execute.
                dbConnection.execSql(deleteUserRequest);
              }
            });
            // Prepare.
            deleteBuildsRequest.addParameter("userId", TYPES.Int, userId);
            // Execute.
            dbConnection.execSql(deleteBuildsRequest);
          }
        });
        // Prepare.
        deleteCommentsRequest.addParameter("userId", TYPES.Int, userId);
        // Execute.
        dbConnection.execSql(deleteCommentsRequest);
      }
    });

    // Prepare.
    deleteFavouritesRequest.addParameter("userId", TYPES.Int, userId);
    // Execute.
    dbConnection.execSql(deleteFavouritesRequest);
  } catch (error) {
    response = { status: "Failure", resData: error.message };
    if (dbConnection) {
      dbConnection.close();
    }
    res.json(response);
  }
});


/**
 * POST - verify a users token.
 */
router.post("/verify", async function (req, res, next) {
  const { body } = req;
  const { token } = body;
  let dbConnection = null;
  let response = {};
  let decoded = null;


  try {
    // Decode
    decoded = jwt.verify(token, process.env.WEBTOKEN_SECRET);
    // Gets data.
    const { data } = decoded;
    const { userId, userName } = data
    // Init connection.
    let dbConnectionStatus = await dbconfig.asyncConnectToDb();
    dbConnection = dbConnectionStatus.resData;
    let sqlSelectOneUsernameStatement = "SELECT username FROM SmiBuilder.Users WHERE id = @id";

    // Check if user exists.
    let request = new Request(sqlSelectOneUsernameStatement, function (err, rowCount, rows) {
      if (err) {
        dbConnection.close();
        response = { status: "Failure", resData: err.message };
        res.json(response);
      } else {
        if (rowCount === 0) {
          response = { status: "Failure", resData: `Unauthorized. User does not exist.` };
        } else if (rowCount > 1) {
          response = { status: "Failure", resData: "Unauthorized. Error occurred." };
        } else if (userName !== rows[0][0].value) {
          response = { status: "Failure", resData: "Unauthorized. Bad auth." };
        } else {
          response = { status: "Success", resData: data };
        }

        dbConnection.close();
        // Send res.
        res.json(response);
      }
    });
    // Prepare.
    request.addParameter("id", TYPES.Int, userId);
    // Execute.
    dbConnection.execSql(request);

    //response = { status: "Success", resData: decoded.data };
  } catch (error) { // Failures.
    if (error.name === "TokenExpiredError") {
      response = { status: "Failure", resData: "Login session has expired. Please sign in again." };
      if (dbConnection) {
        dbConnection.close();
      };
    } else {
      response = { status: "Failure", resData: "An error has occurred with your session. Please sign in again." };
      if (dbConnection) {
        dbConnection.close();
      };
    };
    res.json(response);
  };
});



module.exports = router;
