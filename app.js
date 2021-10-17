var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var dbconfig = require("./config/dbconfig");
var loadGods = require("./functions/loadGods");
require('dotenv').config();


// Load gods and items
loadGods.loadGodsFromJson();



// Init the routers here.
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var godsRouter = require('./routes/gods');
var pwTestingRouter = require('./routes/pw-testing');

var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Init rout links here.
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/pw-testing', pwTestingRouter);
app.use('/gods', godsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
