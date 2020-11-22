const path = require("path");
const fs = require("fs");

// remove image from file each time if the user uploads a new image
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => err && console.log("err", err));
};

module.exports = {
  clearImage,
};
