const path = require("path");
const express = require("express");
const xss = require("xss");

const { uuid } = require("uuidv4");
const { isWebUri } = require("valid-url");
const logger = require("../logger");

const BookmarksService = require("./bookmarks-service");
const fixtures = require("../../test/bookmarks-fixtures");

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = (bookmark) => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: Number(bookmark.rating),
});

bookmarksRouter
  .route("/bookmarks")
  .get((req, res, next) => {
    BookmarksService.getAllBookmarks(req.app.get("db"))
      .then((bookmarks) => {
        res.json(bookmarks.map(serializeBookmark));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res) => {
    const testBookmarks = fixtures.makeBookmarksArray();

    for (const field of ["title", "url", "rating"]) {
      if (!req.body[field]) {
        logger.error(`${field} is required`);
        return res.status(400).send(`'${field}' is required`);
      }
    }
    const { title, url, description, rating } = req.body;

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating '${rating}' supplied`);
      return res.status(400).send(`'rating' must be a number between 0 and 5`);
    }

    if (!isWebUri(url)) {
      logger.error(`Invalid url '${url}' supplied`);
      return res.status(400).send(`'url' must be a valid URL`);
    }

    const newBookmark = { id: uuid(), title, url, description, rating };

    testBookmarks.push(newBookmark);

    logger.info(`Bookmark with id ${newBookmark.id} created`);
    res
      .status(201)
      //.location(req.originalUrl + `/${newBookmark.id}`)
      .location(path.posix.join(req.originalUrl, `${newBookmark.id}`))
      .json(newBookmark);

    BookmarksService.insertBookmark(req.app.get("db"), newBookmark);
  });

bookmarksRouter
  .route("/bookmarks/:bookmark_id")
  .all((req, res, next) => {
    const { bookmark_id } = req.params;
    BookmarksService.getById(req.app.get("db"), bookmark_id)
      .then((bookmark) => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`);
          return res.status(404).json({
            error: { message: `Bookmark Not Found` },
          });
        }
        res.json(serializeBookmark(bookmark));
      })
      .catch(next);
  })
  .delete((req, res) => {
    const testBookmarks = fixtures.makeBookmarksArray();
    const { bookmark_id } = req.params;

    const bookmarkIndex = testBookmarks.findIndex((b) => b.id === bookmark_id);

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${bookmark_id} not found.`);
      return res.status(404).send("Bookmark Not Found");
    }

    testBookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id ${bookmark_id} deleted.`);
    res.status(204).end();
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;
    const bookmarkToUpdate = { title, url, description, rating };

    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean)
      .length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message:
            "Request body must contain either 'title', 'url', or 'rating'",
        },
      });
    }

    BookmarksService.updateBookmark(
      req.app.get("db"),
      req.params.bookmark_id,
      bookmarkToUpdate
    )
      .then((numRowsAffected) => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = bookmarksRouter;
