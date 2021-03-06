const jwt = require("jsonwebtoken");
const config = require("config");

const throwError = (msg, errorStatusCode) => {
  const error = new Error(msg);
  error.statusCode = errorStatusCode;
  throw error;
};

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) throwError("Not Authenticated", 401);
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    const tokenSecret = config.get("jwtSecret");
    decodedToken = jwt.verify(token, tokenSecret);
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) throwError("Not Authenticated", 401);
  req.userId = decodedToken.userId;
  next();
};
