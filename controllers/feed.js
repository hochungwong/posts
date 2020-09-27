const { validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
const io = require("../socket");

const Post = require("../models/post");
const User = require("../models/user");
const { create } = require("../models/post");

const ERROR_STATUS_CODE = 422;
const SEVER_ERROR_CODE = 500;

const PER_PAGE_LIMIT = 2;

const catchError = (e, next) => {
  if (!e.statusCode) {
    e.statusCode = SEVER_ERROR_CODE;
  }
  next(e);
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

const emitEvent = (event, data) => {
  io.getIO().emit(event, data);
};

// remove image from file each time if the user uploads a new image
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => err && console.log("err", err));
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    res.status(200).json({
      message: "Get user success",
      user,
    });
  } catch (err) {
    catchError(err, next);
  }
};

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * PER_PAGE_LIMIT) // if on page 1, skip no item, if on page 2, skip first 2 items ...
      .limit(PER_PAGE_LIMIT);
    res.status(200).json({
      message: "All posts fetched",
      posts,
      totalItems,
    });
  } catch (err) {
    catchError(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      throwError("Could not find post", 404);
    }
    res.status(200).json({
      message: "Post fetched",
      post,
    });
  } catch (err) {
    catchError(err, next);
  }
};

exports.createPost = async (req, res, next) => {
  checkValidationResult({
    req,
    msg: "Validation failed, entered data is incorrect",
    statusCode: ERROR_STATUS_CODE,
  });
  if (!req.file) {
    throwError("No image provided", ERROR_STATUS_CODE);
  }
  const title = req.body.title;
  const imageUrl = req.file.path;
  const content = req.body.content;
  // Create post in db
  const post = new Post({
    title,
    content,
    imageUrl,
    creator: req.userId,
  });
  try {
    await post.save();
    const user = await User.findById(req.userId); // get the creator id
    user.posts.push(post);
    await user.save(); // save posts to user table
    io.getIO().emit("posts", {
      action: "create",
      post: {
        ...post._doc,
        creator: {
          _id: req.userId,
          name: user.name,
        },
      },
    });
    res.status(201).json({
      message: "Post created successfully",
      post,
      creator: {
        _id: user._id,
        name: user.name,
      },
    });
  } catch (err) {
    catchError(err, next);
  }
};

exports.updatePost = async (req, res, next) => {
  const { postId } = req.params;
  const { title, content } = req.body;
  checkValidationResult({
    req,
    msg: "Validation failed, entered data is incorrect",
    statusCode: ERROR_STATUS_CODE,
  });
  let { imageUrl } = req.body;
  if (req.file) {
    const { path } = req.file;
    imageUrl = path;
  }
  if (!imageUrl) {
    throwError("No file picked", ERROR_STATUS_CODE);
  }
  try {
    const post = await Post.findById(postId).populate("creator"); // with the full user data;
    if (!post) {
      throwError("Could not find post", 404);
    }
    console.log("-----1", post.creator);
    console.log("-----2", req.userId);
    if (post.creator._id.toString() !== req.userId) {
      throwError("No authorised", 403);
    }
    if (imageUrl !== post.imageUrl) {
      // changed, new file,
      clearImage(post.imageUrl);
    }
    // update post
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const updatedPost = await post.save();
    io.getIO().emit("posts", {
      action: "update",
      post: updatedPost,
    });
    res.status(200).json({
      message: "Post updated",
      post: updatedPost,
    });
  } catch (err) {
    catchError(err, next);
  }
};

exports.deletePost = async (req, res, next) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      throwError("Could not find post", 404);
    }
    if (post.creator.toString() !== req.userId) {
      throwError("No authorised", 403);
    }
    // Check logged in user
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();
    emitEvent("posts", {
      actions: "delete",
      post: postId,
    });
    res.status(200).json({
      message: "Deleted post",
    });
  } catch (err) {
    catchError(err, next);
  }
};
