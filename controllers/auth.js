const User = require("../models/user");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");

const catchError = (e) => {
  if (!e.statusCode) {
    e.statusCode = SEVER_ERROR_CODE;
  }
  next(e);
};

const throwError = (msg, errorsArray, errStatusCode) => {
  const error = new Error(msg);
  error.statusCode = errStatusCode;
  error.data = errorsArray;
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
    throwError("Validation failed", errors.array(), 422);
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
    .catch((err) => catchError(err));
};
