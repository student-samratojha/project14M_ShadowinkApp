const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const secureController = require("../controllers/secure.controller");
router.get(
  "/user",
  authMiddleware.verifyUser,
  secureController.getUserDashboard,
);
router.get(
  "/admin",
  authMiddleware.verifyAdmin,
  secureController.adminDashboard,
);
router.post(
  "/delete",
  authMiddleware.verifyAdmin,
  secureController.adminDeleteUser,
);
module.exports = router;
