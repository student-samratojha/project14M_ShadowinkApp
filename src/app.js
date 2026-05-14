const express = require("express");
const app = express();
require("dotenv").config();
const authRoutes = require("./routes/auth.routes");
const secureRoutes = require("./routes/secure.routes");
const storyModel = require("./db/models/story.model");
const storyRoutes = require("./routes/story.routes");
const cookieParser = require("cookie-parser");
const path = require("path");
const connectToMongoDb = require("./db/db");
connectToMongoDb();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "../public")));
app.use("/auth", authRoutes);
app.use("/secure", secureRoutes);
app.use("/story", storyRoutes);
app.get("/", async (req, res) => {
  const stories = await storyModel
    .find()
    .populate("author")
    .limit(3)
    .sort({ createdAt: -1 });
  res.render("index", { stories });
});
module.exports = app;
