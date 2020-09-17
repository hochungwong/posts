const mongoose = require("mongoose");
const config = require("config");
const db = config.get("mongoUri");

const connectToDB = async () => {
  try {
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log("MongoDb connected");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

module.exports = connectToDB;
