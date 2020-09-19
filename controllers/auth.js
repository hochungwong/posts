const User = require("../models/user");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");

const SEVER_ERROR_CODE = 500;

const catchError = (e, next) => {
  if (!e.statusCode) {
    e.statusCode = SEVER_ERROR_CODE;
  }
  next(e);
};

const throwErrorWithErrorsArray = (msg, errorsArray, errStatusCode) => {
  const error = new Error(msg);
  error.statusCode = errStatusCode;
  error.data = errorsArray;
  throw error;
};

const throwError = (msg, errStatusCode) => {
  const error = new Error(msg);
  error.statusCode = errStatusCode;
  throw error;
};

const checkValidationResult = ({ req, msg, statusCode }) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throwError(msg, statusCode);
  }
};

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throwErrorWithErrorsArray("Validation failed", errors.array(), 422);
  }
  const { email, name, password } = req.body;
  bcrypt
    .hash(password, 12)
    .then((hashedPwd) => {
      const user = new User({
        email,
        name,
        password: hashedPwd,
      });
      return user.save();
    })
    .then((userResult) => {
      const { _id } = userResult;
      res.status(201).json({
        message: "Signed up successfully",
        userId: _id,
      });
    })
    .catch((err) => catchError(err, next));
};

exports.login = (req, res, next) => {
  const { email, password } = req.body;
  let loadedUser;
  User.findOne({ email })
    .then((user) => {
      if (!user) {
        throwError("A user with this email could not be found", 401);
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((match) => {
      if (!match) {
        throwError("Wrong password", 401);
      }
      const tokenPayload = {
        email: loadedUser.email,
        userId: loadedUser._id.toString(),
      };
      const tokenSecret = config.get("jwtSecret");
      jwt.sign(
        tokenPayload,
        tokenSecret,
        {
          expiresIn: 360000,
        },
        (err, token) => {
          if (err) throw error;
          res.status(200).json({ token, userId: loadedUser._id.toString() });
        }
      );
    })
    .catch((err) => catchError(err, next));
};

exports.getUserStatus = (req, res, next) => {
  User.findById(req.userId)
    .then((user) => {
      if (!user) throwError("User not found", 404);
      res.status(200).json({
        status: user.status,
      });
    })
    .catch((err) => catchError(err));
};

exports.updateUserStatus = (req, res, next) => {
  const newStatus = req.body.status;
  User.findById(req.userId)
    .then((user) => {
      if (!user) throwError("User not found", 404);
      user.status = newStatus;
      return user.save();
    })
    .then((_) => {
      res.status(200).json({
        message: "Status updated",
      });
    })
    .catch((err) => catchError(err));
};
