require("dotenv").config();
const home = require("./routes/home");
const apiRoutes = require("./routes/apiRoutes");
const posts = require("./routes/posts");
const error = require("./middlewares/error");
const mongoose = require("mongoose");
const express = require("express");
const app = express();

// connecting to db
mongoose
  .connect(process.env.db_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("Connected to db...");
  })
  .catch((err) => {
    console.log("Error occured while connecting to db.", err);
  });

// middlewares
app.use(express.json());

// setting up routes
app.use("/", home);
app.use("/api", apiRoutes);
app.use("/api/posts", posts);
app.use(error);

// server setup
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
