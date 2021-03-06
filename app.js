const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");

const connectToDB = require("./config/db");

const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, `${new Date().toISOString()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const app = express();
app.use(bodyParser.json()); // application/json
app.use(multer({ storage: fileStorage, fileFilter }).single("image"));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// GET /feed/posts
app.use("/feed", feedRoutes);
app.use("/auth", authRoutes);

app.use((error, req, res, next) => {
  console.log("error", error);
  const status = error.statusCode || 500;
  const { message, data } = error;
  res.status(status).json({
    message,
    data,
  });
});

connectToDB()
  .then((_) => {
    const server = app.listen(8080);
    const io = require("./socket").init(server);
    // execute on every new client connection
    io.on("connection", (socket) => {
      console.log("Socket Client Connected");
    });
  })
  .catch((err) => console.log(err));
