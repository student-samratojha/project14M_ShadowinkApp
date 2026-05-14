const storyModel = require("../db/models/story.model");
const userModel = require("../db/models/user.model");
const auditModel = require("../db/models/audit.model");
async function createStory(req, res) {
  try {
    res.render("story-create", { user: req.user });
  } catch (err) {
    console.error("Create Story Page Error:", err);
    res.redirect("/secure/user?error=CreateStoryPageError");
  }
}

async function postCreateStory(req, res) {
  try {
    const { title, content, bannerImage } = req.body;
    if (!title || !content) {
      return res.status(400).render("create-story", {
        user: req.user,
        error: "Title and content are required",
      });
    }
    const existStory = await storyModel.findOne({
      title,
      author: req.user._id,
    });
    if (existStory) {
      await auditModel.create({
        user: req.user._id,
        action: `CREATE_STORY_FAILED: ${title} - Story Already Exists`,
        route: req.originalUrl,
        method: req.method,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });
      return res.redirect("/secure/user?error=StoryAlreadyExists");
    }
    const newStory = await storyModel.create({
      title,
      content,
      bannerImage: bannerImage || "",
      author: req.user._id,
    });
    await auditModel.create({
      user: req.user._id,
      action: `CREATE_STORY: ${title}`,
      route: req.originalUrl,
      method: req.method,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    res.redirect("/secure/user?success=StoryCreated");
  } catch (err) {
    console.error("Create Story Error:", err);
    res.redirect("/secure/user?error=CreateStoryError");
  }
}

async function deleteStory(req, res) {
  try {
    const { storyId } = req.body;
    const deletedStory = await storyModel.findById(storyId);
    if (!deletedStory) {
      await auditModel.create({
        user: req.user._id,
        action: `DELETE_STORY_FAILED: ${storyId} - Story Not Found`,
        route: req.originalUrl,
        method: req.method,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });
      return res.redirect(`/secure/${req.user.role}?error=StoryNotFound`);
    }
    if (
      deletedStory.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      await auditModel.create({
        user: req.user._id,
        action: `DELETE_STORY_FAILED: ${storyId} - Unauthorized`,
        route: req.originalUrl,
        method: req.method,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });
      return res.redirect(`/secure/${req.user.role}?error=Unauthorized`);
    }
    deletedStory.isDeleted = true;
    await deletedStory.save();
    await auditModel.create({
      user: req.user._id,
      action: `DELETE_STORY: ${storyId}`,
      route: req.originalUrl,
      method: req.method,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    res.redirect(`/secure/${req.user.role}?success=StoryDeleted`);
  } catch (err) {
    console.error("Delete Story Error:", err);
    res.redirect("/secure/user?error=DeleteStoryError");
  }
}
async function likeStory(req, res) {
  try {
    const { storyId } = req.body;

    if (!storyId) {
      return res.redirect("/story/all?error=StoryIdMissing");
    }

    const story = await storyModel.findOne({
      _id: storyId,
      isDeleted: false,
    });

    if (!story) {
      await auditModel.create({
        user: req.user._id,
        action: `LIKE_STORY_FAILED: ${storyId}`,
        route: req.originalUrl,
        method: req.method,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });

      return res.redirect("/story/all?error=StoryNotFound");
    }

    const alreadyLiked = story.likes.includes(req.user._id);

    if (alreadyLiked) {
      story.likes.pull(req.user._id);

      await auditModel.create({
        user: req.user._id,
        action: `UNLIKE_STORY: ${storyId}`,
        route: req.originalUrl,
        method: req.method,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });
    } else {
      story.likes.push(req.user._id);

      if (story.dislikes.includes(req.user._id)) {
        story.dislikes.pull(req.user._id);
      }

      await auditModel.create({
        user: req.user._id,
        action: `LIKE_STORY: ${storyId}`,
        route: req.originalUrl,
        method: req.method,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });
    }

    await story.save();

    return res.redirect(
      `/secure/${req.user.role}?success=StoryLiked`
    );
  } catch (err) {
    console.error("Like Story Error:", err.message);

    return res.redirect(
      "/story/all?error=LikeStoryError"
    );
  }
}

async function dislikeStory(req, res) {
  try {
    const { storyId } = req.body;

    if (!storyId) {
      return res.redirect("/story/all?error=StoryIdMissing");
    }

    const story = await storyModel.findOne({
      _id: storyId,
      isDeleted: false,
    });

    if (!story) {
      await auditModel.create({
        user: req.user._id,
        action: `DISLIKE_STORY_FAILED: ${storyId}`,
        route: req.originalUrl,
        method: req.method,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });

      return res.redirect("/story/all?error=StoryNotFound");
    }

    const alreadyDisliked = story.dislikes.includes(
      req.user._id
    );

    if (alreadyDisliked) {
      story.dislikes.pull(req.user._id);

      await auditModel.create({
        user: req.user._id,
        action: `REMOVE_DISLIKE_STORY: ${storyId}`,
        route: req.originalUrl,
        method: req.method,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });
    } else {
      story.dislikes.push(req.user._id);

      if (story.likes.includes(req.user._id)) {
        story.likes.pull(req.user._id);
      }

      await auditModel.create({
        user: req.user._id,
        action: `DISLIKE_STORY: ${storyId}`,
        route: req.originalUrl,
        method: req.method,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });
    }

    await story.save();

    return res.redirect(
      `/secure/${req.user.role}?success=StoryDisliked`
    );
  } catch (err) {
    console.error("Dislike Story Error:", err.message);

    return res.redirect(
      "/story/all?error=DislikeStoryError"
    );
  }
}
async function getAllStories(req, res) {
  try {
    const stories = await storyModel
      .find({ isDeleted: false })
      .populate("author")
      .sort({ createdAt: -1 });
    res.render("story-all", { user: req.user, stories });
  } catch (err) {
    console.error("Get All Stories Error:", err);
    res.redirect("/?error=GetAllStoriesError");
  }
}

async function getStoryById(req, res) {
  try {
    const { id } = req.params;
    const story = await storyModel
      .findOne({ _id: id, isDeleted: false })
      .populate("author");
    if (!story) {
      return res.redirect("/story/all?error=StoryNotFound");
    }
    res.render("story-detail", { user: req.user || null, story });      
    } catch (err) {
    console.error("Get Story By ID Error:", err);
    res.redirect("/story/all?error=GetStoryError");
  }
}

module.exports = {
  createStory,
  getAllStories,
    getStoryById,
  postCreateStory,
  deleteStory,
  likeStory,
    dislikeStory,
};
