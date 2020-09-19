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

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  try {
    if (!errors.isEmpty()) {
      throwErrorWithErrorsArray(errors.array()[0].msg, errors.array(), 422);
    }
    const { email, name, password } = req.body;
    const hashedPwd = await bcrypt.hash(password, 12);
    const user = new User({
      email,
      name,
      password: hashedPwd,
    });
    const userDoc = await user.save();
    const { _id } = userDoc;
    res.status(201).json({
      message: "Signed up successfully",
      userId: _id,
    });
  } catch (err) {
    catchError(err, next);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  let loadedUser;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throwError("A user with this email could not be found", 401);
    }
    loadedUser = user;
    const match = bcrypt.compare(password, user.password);
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
  } catch (err) {
    catchError(err, next);
  }
};

exports.getUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) throwError("User not found", 404);
    res.status(200).json({
      status: user.status,
    });
  } catch (err) {
    catchError(err, next);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  const newStatus = req.body.status;
  try {
    checkValidationResult({
      req,
      msg: "Entered data is incorrect",
      statusCode: 422,
    });
    const user = await User.findById(req.userId);
    if (!user) throwError("User not found", 404);
    user.status = newStatus;
    await user.save();
    res.status(200).json({
      message: "Status updated",
    });
  } catch (err) {
    catchError(err, next);
  }
};
