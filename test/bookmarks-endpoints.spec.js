const knex = require("knex");
const fixtures = require("./bookmarks-fixtures");
const app = require("../src/app");

const supertest = require("supertest");
const { expect } = require("chai");

describe("Bookmarks Endpoints", () => {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL,
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("cleanup", () => db("bookmarks").truncate());

  afterEach("cleanup", () => db("bookmarks").truncate());

  describe(`Unauthorized requests`, () => {
    const testBookmarks = fixtures.makeBookmarksArray();

    beforeEach("insert bookmarks", () => {
      return db.into("bookmarks").insert(testBookmarks);
    });

    it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
      return supertest(app)
        .get("/bookmarks")
        .expect(401, { error: "Unauthorized request" });
    });

    it(`responds with 401 Unauthorized for POST /bookmarks`, () => {
      return supertest(app)
        .post("/bookmarks")
        .send({ title: "test-title", url: "http://some.thing.com", rating: 1 })
        .expect(401, { error: "Unauthorized request" });
    });

    it(`responds with 401 Unauthorized for GET /bookmarks/:id`, () => {
      const secondBookmark = testBookmarks[1];
      return supertest(app)
        .get(`/bookmarks/${secondBookmark.id}`)
        .expect(401, { error: "Unauthorized request" });
    });

    it(`responds with 401 Unauthorized for DELETE /bookmarks/:id`, () => {
      const bookmarkId = testBookmarks[1];
      return supertest(app)
        .delete(`/bookmarks/${bookmarkId.id}`)
        .expect(401, { error: "Unauthorized request" });
    });
  });

  describe("GET /bookmarks", () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get("/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, []);
      });
    });

    context("Given there are bookmarks in the database", () => {
      const testBookmarks = fixtures.makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("gets the bookmarks from the store", () => {
        return supertest(app)
          .get("/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks);
      });
    });

    context(`Given a bookmark with XSS content`, () => {
      const { badBookmark, expectedBookmark } = fixtures.xssBookmark();

      beforeEach("insert xss bookmark", () => {
        return db.into("bookmarks").insert([badBookmark]);
      });

      it("Removes XSS bookmark content", () => {
        return supertest(app)
          .get("/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.title).to.eql(expectedBookmark.title);
            expect(res.body.description).to.eql(expectedBookmark.description);
          });
      });
    });
  });

  describe("GET /bookmarks/:id", () => {
    context(`Given no bookmarks`, () => {
      it(`responds 404 whe bookmark doesn't exist`, () => {
        return supertest(app)
          .get(`/bookmarks/123`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: `Bookmark Not Found` },
          });
      });
    });

    context("Given there are bookmarks in the database", () => {
      const testBookmarks = fixtures.makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("responds with 200 and the specified bookmark", () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark);
      });
    });

    context(`Given a bookmark with XSS content`, () => {
      const { badBookmark, expectedBookmark } = fixtures.xssBookmark();

      beforeEach("insert xss bookmark", () => {
        return db.into("bookmarks").insert([badBookmark]);
      });

      it("Removes XSS bookmark content", () => {
        return supertest(app)
          .get("/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.title).to.eql(expectedBookmark.title);
            expect(res.body.description).to.eql(expectedBookmark.description);
          });
      });
    });
  });

  //INSERT XSS COUNTER-CODE HERE

  describe("DELETE /bookmarks/:id", () => {
    const testBookmarks = fixtures.makeBookmarksArray();

    context(`Given no bookmarks`, () => {
      it(`returns 404 whe bookmark doesn't exist`, () => {
        return supertest(app)
          .delete(`/bookmarks/doesnt-exist`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, "Bookmark Not Found");
      });
    });

    context(`Given there are bookmarks in database`, () => {
      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("removes the bookmark by ID from the store", () => {
        const secondBookmark = 2;
        const expectedBookmarks = testBookmarks.filter(
          (s) => s.id !== secondBookmark
        );

        return supertest(app)
          .delete(`/bookmarks/${secondBookmark}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(() => {
            supertest(app)
              .get("/bookmarks")
              .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks);
          });
      });
    });
  });

  describe("POST /api/bookmarks", () => {
    it(`responds with 400 missing 'title' if not supplied`, () => {
      const newBookmarkMissingTitle = {
        // title: 'test-title',
        url: "https://test.com",
        rating: 1,
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkMissingTitle)
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'title' is required`);
    });

    it(`responds with 400 missing 'url' if not supplied`, () => {
      const newBookmarkMissingUrl = {
        title: "test-title",
        // url: 'https://test.com',
        rating: 1,
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkMissingUrl)
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'url' is required`);
    });

    it(`responds with 400 missing 'rating' if not supplied`, () => {
      const newBookmarkMissingRating = {
        title: "test-title",
        url: "https://test.com",
        // rating: 1,
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkMissingRating)
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'rating' is required`);
    });

    it(`responds with 400 invalid 'rating' if not between 0 and 5`, () => {
      const newBookmarkInvalidRating = {
        title: "test-title",
        url: "https://test.com",
        rating: "invalid",
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkInvalidRating)
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'rating' must be a number between 0 and 5`);
    });

    it(`responds with 400 invalid 'url' if not a valid URL`, () => {
      const newBookmarkInvalidUrl = {
        title: "test-title",
        url: "htp://invalid-url",
        rating: 1,
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkInvalidUrl)
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'url' must be a valid URL`);
    });

    it("adds a new bookmark to the store", () => {
      const newBookmark = {
        title: "test-title",
        url: "https://test.com",
        description: "test description",
        rating: 1,
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmark)
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.url).to.eql(newBookmark.url);
          expect(res.body.description).to.eql(newBookmark.description);
          expect(res.body.rating).to.eql(newBookmark.rating);
          expect(res.body).to.have.property("id");
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`);
        })
        .then((res) => {
          expect(testBookmarks[testBookmarks.length - 1]).to.eql(res.body);
        })
        .then((postRes) => {
          supertest(app)
            .get(`/api/bookmarks/${postRes.body.id}`)
            .expect(postRes.body);
        });
    });
  });

  describe(`PATCH /api/bookmarks/:id`, () => {
    context("Given no bookmarks", () => {
      it("responds with 404", () => {
        const bookmarkId = 12345;

        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: "Bookmark doesn't exist" } });
      });
    });

    context("Given there are bookmarks in the database", () => {
      const testBookmarks = fixtures.makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("responds 204 and updates the bookmark", () => {
        const idToUpdate = 2;

        const updateBookmark = {
          title: "Updated bookmark title",
          url: "https://updatedUrl.com",
          description: "Updated bookmark description",
          rating: 3,
        };

        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark,
        };

        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send(updateBookmark)
          .expect(204)
          .then((res) => {
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .expect(expectedBookmark);
          });
      });

      it(`Responds wtih 400 when no required fields supplied`, () => {
        const idToUpdate = 2;

        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send({ irrelevantField: "foo" })
          .expect(400, {
            error: {
              message: `Request body must contain either 'title', 'url', or 'rating'`,
            },
          });
      });

      it(`Responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2;

        const updateBookmark = {
          title: "Updated bookmark title",
        };

        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark,
        };

        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send({
            ...updateBookmark,
            fieldToIgnore: "Should not be in GET response",
          })
          .expect(204)
          .then((res) => {
            supertest(app)
              .get(`/api/articles/${idToUpdate}`)
              .expect(expectedBookmark);
          });
      });
    });
  });

  it("Removes XSS bookmark from response", () => {
    const { badBookmark, expectedBookmark } = fixtures.xssBookmark();

    return supertest(app)
      .post(`/api/bookmarks`)
      .send(badBookmark)
      .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
      .expect(201)
      .expect((res) => {
        expect(res.body.title).to.eql(expectedBookmark.title);
        expect(res.body.description).to.eql(expectedBookmark.description);
      });
  });
});
