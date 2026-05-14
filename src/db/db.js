const mongoose = require("mongoose");
const mongoUri = process.env.MONGO_URI;
async function connectToMongoDb() {
  try {
    await mongoose.connect(mongoUri);
    console.log("connected to mongoUri");
  } catch (err) {
    console.log(err);
  }
}

module.exports = connectToMongoDb;
