const bycrpt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const config = require("config");
const { clearImage } = require("../util/file");

const User = require("../models/user");
const Post = require("../models/post");

const POSTS_LIMIT = 2;

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
  posts: async function ({ page }, req) {
    if (!req.isAuth) throwErrorBySingleError("Not Authenticated", 401);
    if (!page) {
      page = 1;
    }
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({
        createdAt: -1,
      })
      .skip((page - 1) * POSTS_LIMIT)
      .limit(POSTS_LIMIT)
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
  post: async function ({ id }, req) {
    if (!req.isAuth) throwErrorBySingleError("Not Authenticated", 401);
    const post = await Post.findById(id).populate("creator");
    return {
      ...post._doc,
      id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  updatePost: async function ({ id, postInput }, req) {
    if (!req.isAuth) throwErrorBySingleError("Not Authenticated", 401);
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      throwErrorBySingleError("No post found!", 404);
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      throwErrorBySingleError("Not authorised", 403);
    }

    const { title, content, imageUrl } = postInput;
    validatePost(title, "Title is invalid");
    validatePost(content, "Contetn is invalid");
    throwErrorByErrorsArray(errors);

    post.title = title;
    post.content = content;
    if (postInput.imageUrl !== "undefined") {
      post.imageUrl = imageUrl;
    }
    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost,
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
  deletePost: async function ({ id }, req) {
    if (!req.isAuth) throwErrorBySingleError("Not authenticated", 401);
    const post = await Post.findById(id);
    if (!post) throwErrorBySingleError("No post found!", 404);
    if (post.creator._id.toString() !== req.userId.toString())
      throwErrorBySingleError("Not authorised", 403);

    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    return true;
  },
};
