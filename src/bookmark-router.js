const express = require("express");
//const { V4: uuid } = require("uuid");
const uuid = require("uuid").v4;
const logger = require("./logger");
const { bookmark } = require("./store");

const bookmarkRouter = express.Router();
const bodyParser = express.json();

bookmarkRouter
  .route("/bookmarks")
  .get((req, res) => {
    res.json(bookmark);
  })
  .post(bodyParser, (req, res) => {
    const { id } = uuid();
    const { title, url, description, rating } = req.body;

    if (!title) {
      logger.error(`Title is required`);
      return res.status(400).send("Invalid data");
    }

    if (!url) {
      logger.error(`URL is required`);
      return res.status(400).send("Invalid data");
    }

    if (!rating) {
      logger.error(`Rating is required`);
      return res.status(400).send("Invalid data");
    }

    const newBookmark = {
      id,
      title,
      url,
      description,
      rating,
    };

    bookmark.push(newBookmark);

    logger.info(`Bookmark with id ${newBookmark.id} created`);

    res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${newBookmark.id}`)
      .json(newBookmark);
  });

bookmarkRouter
  .route("/bookmarks/:id")
  .get((req, res) => {
    const { id } = req.params;
    const bookmark = bookmark.find((b) => b.id === id);

    if (!bookmark) {
      logger.error(`Bookmark with id ${id} not found.`);
      return res.status(404).send("Bookmark not found");
    }
    res.json(bookmark);
  })
  .delete((req, res) => {
    const { id } = req.params;

    const bookmarkId = bookmark.findIndex((b) => b.id == id);

    if (bookmarkId === -1) {
      logger.error(`Bookmark with id ${id} not found`);
      return res.status(404).send("Not found");
    }

    bookmark.splice(bookmarkId, 1);

    logger.info(`Card with id ${id} deleted`);

    res.status(204).end();
  });

module.exports = bookmarkRouter;
