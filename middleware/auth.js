const jwt = require("jsonwebtoken");
const config = require("config");

const throwError = (msg, errorStatusCode) => {
  const error = new Error(msg);
  error.statusCode = errorStatusCode;
  throw error;
};

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.isAuth = false;
    return next();
  }
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    const tokenSecret = config.get("jwtSecret");
    decodedToken = jwt.verify(token, tokenSecret);
  } catch (err) {
    req.isAuth = false;
    return next();
  }
  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }
  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
};
