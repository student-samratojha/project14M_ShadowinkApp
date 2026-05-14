const router = require("express").Router();
const storyController = require("../controllers/story.controller");
const authMiddleware = require("../middleware/auth.middleware");
router.get("/create", authMiddleware.verifyUser, storyController.createStory);
router.get("/all", authMiddleware.verifyToken, storyController.getAllStories);
router.post(
  "/create",
  authMiddleware.verifyUser,
  storyController.postCreateStory,
);
router.post("/delete", authMiddleware.verifyToken, storyController.deleteStory);
router.post("/like", authMiddleware.verifyToken, storyController.likeStory);
router.post(
  "/dislike",
  authMiddleware.verifyToken,
  storyController.dislikeStory,
);
router.get("/:id",authMiddleware.verifyToken, storyController.getStoryById);
module.exports = router;
