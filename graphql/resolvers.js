const bycrpt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const config = require("config");

const User = require("../models/user");

module.exports = {
  createUser: async function ({ userInput }, req) {
    const { email, password, name } = userInput;
    const errors = [];
    if (!validator.isEmail(email)) {
      errors.push({
        message: "Email is invalid",
      });
    }
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      errors.push({
        message: "Password is too short",
      });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("User exists already");
      throw error;
    }
    const hashedPw = await bycrpt.hash(password, 12);
    const user = new User({
      email,
      name,
      password: hashedPw,
    });
    const createdUser = await user.save();
    return {
      ...createdUser._doc,
      _id: createdUser._id.toString(),
    };
  },
  login: async function ({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not found");
      error.code = 401;
      throw error;
    }
    const match = await bycrpt.compare(password, user.password);
    if (!match) {
      const error = new Error("Password is incorrect");
      error.code = 401;
      throw error;
    }
    const tokenPayload = {
      email: user.email,
      userId: user._id.toString(),
    };
    const tokenSecret = config.get("jwtSecret");
    const token = jwt.sign(tokenPayload, tokenSecret, {
      expiresIn: 360000,
    });
    return { token, userId: user._id.toString() };
  },
};
