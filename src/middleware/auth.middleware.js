const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "accesssupersecretkey";

const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "refreshsupersecretkey";

/* =========================================================
   VERIFY ACCESS TOKEN
========================================================= */

const verifyToken = (req, res, next) => {
  try {
    // Access Token from cookies
    const accessToken = req.cookies.accessToken;

    // No token
    if (!accessToken) {
      return res.redirect("/auth/login?error=AccessTokenMissing");
    }

    // Verify token
    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);

    // Save user data in req.user
    req.user = decoded;

    next();
  } catch (error) {
    console.log("Access Token Error:", error.message);

    // Clear invalid token
    res.clearCookie("accessToken");

    return res.redirect("/auth/login?error=InvalidAccessToken");
  }
};

/* =========================================================
   VERIFY NORMAL USER
========================================================= */

const verifyUser = (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.redirect("/auth/login?error=PleaseLoginFirst");
    }

    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);

    // Optional role checking
    if (!decoded.role || decoded.role !== "user") {
      return res.status(403).render("error", {
        message: "Access Denied! Users only.",
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    console.log("Verify User Error:", error.message);

    res.clearCookie("accessToken");

    return res.redirect("/auth/login?error=SessionExpired");
  }
};

/* =========================================================
   VERIFY ADMIN
========================================================= */

const verifyAdmin = (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.redirect("/auth/login?error=PleaseLoginFirst");
    }

    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);

    // Admin role check
    if (decoded.role !== "admin") {
      return res.status(403).render("error", {
        message: "Access Denied! Admin only.",
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    console.log("Verify Admin Error:", error.message);

    res.clearCookie("accessToken");

    return res.redirect("/auth/login?error=SessionExpired");
  }
};

module.exports = {
  verifyToken,
  verifyUser,
  verifyAdmin,
};
