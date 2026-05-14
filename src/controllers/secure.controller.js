const userModel = require("../db/models/user.model");
const auditModel = require("../db/models/audit.model");
const storyModel = require("../db/models/story.model");
const auditLog = require("./auth.controller");
async function getUserDashboard(req, res) {
  try {
    const stories = await storyModel.find({ author: req.user._id });
    const user = await userModel.findById(req.user._id);
    res.render("user-dashboard", { user, stories });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Server Error");
  }
}

async function adminDeleteUser(req, res) {
  try {
    const { userId } = req.body;
    const deletedUser = await userModel.findById(userId);
    if (!deletedUser) {
      await auditLog(
        req,
        req.user,
        `ADMIN_DELETE_USER_FAILED: ${userId} - User Not Found`,
      );
      return res.redirect("/secure/admin?error=UserNotFound");
    }
    deletedUser.isDeleted = true;
    await deletedUser.save();

    // Audit log for admin action
    await auditLog(req, req.user, `ADMIN_DELETE_USER: ${userId}`);

    res.redirect("/secure/admin?UserDeletedSuccessfully");
  } catch (err) {
    console.error("Delete error:", err);
    res.redirect("/secure/admin?error=DeleteUserFailed");
  }
}

async function adminDashboard(req, res) {
  try {
    const users = await userModel.find({ isDeleted: false });
    const audits = await auditModel
      .find()
      .limit(10)
      .sort({ createdAt: -1 })
      .populate("user");
      const stories = await storyModel.find().populate("author");   
    res.render("admin-dashboard", { users, admin: req.user, audits, stories });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.status(500).send("Server Error");
  }
}



// Export the functions
module.exports = {
  adminDashboard,
  getUserDashboard,
  adminDeleteUser,
};
