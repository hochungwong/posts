const bycrpt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const config = require("config");

const User = require("../models/user");
const Post = require("../models/post");

const validatePost = (data, errorMessage) => {
  if (
    validator.isEmpty(data) ||
    !validator.isLength(data, {
      min: 5,
    })
  ) {
    errors.push({
      message: errorMessage,
    });
  }
};

const throwErrorByErrorsArray = (errors) => {
  if (errors.length > 0) {
    const error = new Error("Invalid Input");
    error.data = errors;
    error.code = 422;
    throw error;
  }
};

const throwErrorBySingleError = (message, errorCode) => {
  const error = new Error(message);
  error.code = errorCode;
  throw error;
};

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
      !validator.isLength(password, {
        min: 5,
      })
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
    const existingUser = await User.findOne({
      email,
    });
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
    const user = await User.findOne({
      email,
    });
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
    return {
      token,
      userId: user._id.toString(),
    };
  },
  createPost: async function ({ postInput }, req) {
    if (!req.isAuth) throwErrorBySingleError("Not Authenticated", 401);

    const errors = [];
    const { title, content, imageUrl } = postInput;

    validatePost(title, "Title is invalid");
    validatePost(content, "Contetn is invalid");
    throwErrorByErrorsArray(errors);

    const user = await User.findById(req.userId);
    if (!user) throwErrorBySingleError("Invalid user", 401);

    const post = new Post({
      title,
      content,
      imageUrl,
      creator: user,
    });
    const createdPost = await post.save();
    // TODO
    // Add post to user's posts
    user.posts.push(createdPost);
    await user.save();
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  posts: async function (_, req) {
    if (!req.isAuth) throwErrorBySingleError("Not Authenticated", 401);
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({
        createdAt: -1,
      })
      .populate("creator");
    return {
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      totalPosts,
    };
  },
};
