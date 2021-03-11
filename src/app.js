require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const winston = require("winston");

const { NODE_ENV } = require("./config");
const { restart } = require("nodemon");

const app = express();

const morganOption = NODE_ENV === "production";

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

const bookmark = [
  {
    id: 1,
    title: "JiggyART",
    description: "The homespace of a contract developer",
    rating: 3,
    url: "https://jiggyart.org",
  },
  {
    id: 2,
    title: "YouTube",
    description: "The place of videos since forever",
    rating: 4,
    url: "https://youtube.com",
  },
];

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: "info.log",
    }),
  ],
});

if (NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

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

  //GET root page, send back 'Hello, world!' on web page
  app.get("/", (req, res) => {
    res.send("Hello, world!");
  });

  app.get("/bookmark", (res, req) => {
    res.json(bookmark);
  });

  res.status(500).json(response);
});

module.exports = app;
