const { validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");

const Post = require("../models/post");

const ERROR_STATUS_CODE = 422;
const SEVER_ERROR_CODE = 500;

const PER_PAGE_LIMIT = 2;

const catchError = (e) => {
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

// remove image from file each time if the user uploads a new image
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => err && console.log("err", err));
};

exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1;
  let totalItems;
  Post.find()
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return Post.find()
        .skip((currentPage - 1) * PER_PAGE_LIMIT) // if on page 1, skip no item, if on page 2, skip first 2 items ...
        .limit(PER_PAGE_LIMIT);
    })
    .then((posts) => {
      res.status(200).json({
        message: "All posts fetched",
        posts,
        totalItems,
      });
    })
    .catch((err) => catchError(err));
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        throwError("Could not find post", 404);
      }
      res.status(200).json({
        message: "Post fetched",
        post,
      });
    })
    .catch((err) => catchError(err));
};

exports.createPost = (req, res, next) => {
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
    creator: {
      name: "Carson",
    },
  });
  post
    .save()
    .then((result) => {
      res.status(201).json({
        message: "Post created successfully",
        post: result,
      });
    })
    .catch((err) => {
      catchError(err);
    });
};

exports.updatePost = (req, res, next) => {
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
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        throwError("Could not find post", 404);
      }
      if (imageUrl !== post.imageUrl) {
        // changed, new file,
        clearImage(post.imageUrl);
      }
      // update post
      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;
      return post.save();
    })
    .then((updatedPost) => {
      res.status(200).json({
        message: "Post updated",
        post: updatedPost,
      });
    })
    .catch((err) => {
      catchError(err);
    });
};

exports.deletePost = (req, res, next) => {
  const { postId } = req.params;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        throwError("Could not find post", 404);
      }
      // Check logged in user
      clearImage(post.imageUrl);
      return Post.findByIdAndRemove(postId);
    })
    .then((result) => {
      console.log("post delete", result);
      res.status(200).json({
        message: "Deleted post",
      });
    })
    .catch((err) => catchError(err));
};
