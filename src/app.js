require("dotenv").config();

const bookmarkRouter = require("./bookmark-router");
const { NODE_ENV } = require("./config");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const { restart } = require("nodemon");

const app = express();

const morganOption = NODE_ENV === "production";

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

//VALIDATE API_TOKEN
app.use(function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_TOKEN;
  const authToken = req.get("Authorization");

  if (!authToken || authToken.split(" ")[1] !== apiToken) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: "Unauthorized access" });
  }
  //review next middleware
  next();
});

//Hide error message from users and outsiders
app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === "production") {
    response = { error: { message: "server error" } };
  } else {
    console.error(error);
    response = { message: error.message, error };
  }
});

//GET root page, send back 'Hello, world!' on web page
app.get("/", (req, res) => {
  res.send("Hello, world!");
});

//USE app after validateBearerToken so no one can use beforehand
app.use(bookmarkRouter);

module.exports = app;
