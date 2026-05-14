const userModel = require("../db/models/user.model");
const auditModel = require("../db/models/audit.model");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

/* =====================================================
   JWT SECRETS
===================================================== */

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "accesssecret";

const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "refreshsecret";

/* =====================================================
   AUDIT LOG
===================================================== */

async function auditLog(req, user, action) {
  try {
    await auditModel.create({
      user: user?._id || req.user?._id || null,
      action,
      route: req.originalUrl,
      method: req.method,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
  } catch (err) {
    console.error("Audit Error:", err.message);
  }
}

/* =====================================================
   REGISTER PAGE
===================================================== */

async function getRegister(req, res) {
  res.render("register");
}

/* =====================================================
   REGISTER USER
===================================================== */

async function postRegister(req, res) {
  try {
    let { name, email, password } = req.body;

    /* =========================
       VALIDATION
    ========================= */

    if (!name || !email || !password) {
      return res.status(400).render("register", {
        error: "All fields are required",
      });
    }

    // Normalize email
    email = email.toLowerCase().trim();

    // Password validation
    if (password.length < 6) {
      return res.status(400).render("register", {
        error: "Password must be at least 6 characters",
      });
    }

    /* =========================
       CHECK EXISTING USER
    ========================= */

    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      return res.status(409).render("register", {
        error: "User already exists",
      });
    }

    /* =========================
       HASH PASSWORD
    ========================= */

    const hashedPassword = await bcrypt.hash(password, 12);

    /* =========================
       CREATE USER
    ========================= */

    const newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
    });

    /* =========================
       AUDIT LOG
    ========================= */

    await auditLog(req, newUser, "REGISTER");

    /* =========================
       REDIRECT
    ========================= */

    res.redirect("/auth/login?success=AccountCreated");
  } catch (err) {
    console.error("Register Error:", err.message);

    res.status(500).render("register", {
      error: "Registration failed",
    });
  }
}

/* =====================================================
   LOGIN PAGE
===================================================== */

async function getLogin(req, res) {
  res.render("login");
}

/* =====================================================
   LOGIN USER
===================================================== */

async function postLogin(req, res) {
  try {
    let { email, password } = req.body;

    /* =========================
       VALIDATION
    ========================= */

    if (!email || !password) {
      return res.status(400).render("login", {
        error: "Email and password required",
      });
    }

    // Normalize email
    email = email.toLowerCase().trim();

    /* =========================
       FIND USER
    ========================= */

    const user = await userModel.findOne({ email });

    if (!user || user.isDeleted) {
      return res.status(401).render("login", {
        error: "Invalid credentials",
      });
    }

    /* =========================
       CHECK PASSWORD
    ========================= */

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).render("login", {
        error: "Invalid credentials",
      });
    }

    /* =========================
       ACCESS TOKEN
    ========================= */

    const accessToken = jwt.sign(
      {
        _id: user._id,
        role: user.role,
        email: user.email,
      },
      ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      }
    );

    /* =========================
       REFRESH TOKEN
    ========================= */

    const refreshToken = jwt.sign(
      {
        _id: user._id,
        role: user.role,
        email: user.email,
      },
      REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );

    /* =========================
       SAVE COOKIES
    ========================= */

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    /* =========================
       AUDIT LOG
    ========================= */

    await auditLog(req, user, "LOGIN");

    /* =========================
       REDIRECT
    ========================= */
    return res.redirect(`/secure/${user.role}?success=LoggedIn`);
  } catch (err) {
    console.error("Login Error:", err.message);

    res.status(500).render("login", {
      error: "Login failed",
    });
  }
}

/* =====================================================
   REFRESH ACCESS TOKEN
===================================================== */

const refreshAccessToken = (req, res, next) => {
  try {
    /* =========================
       GET REFRESH TOKEN
    ========================= */

    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.redirect(
        "/auth/login?error=RefreshTokenMissing"
      );
    }

    /* =========================
       VERIFY REFRESH TOKEN
    ========================= */

    const decoded = jwt.verify(
      refreshToken,
      REFRESH_TOKEN_SECRET
    );

    /* =========================
       CREATE NEW ACCESS TOKEN
    ========================= */

    const newAccessToken = jwt.sign(
      {
        _id: decoded._id,
        email: decoded.email,
        role: decoded.role,
      },
      ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      }
    );

    /* =========================
       SAVE NEW ACCESS TOKEN
    ========================= */

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    req.user = decoded;

    next();
  } catch (error) {
    console.log(
      "Refresh Token Error:",
      error.message
    );

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.redirect(
      "/auth/login?error=RefreshSessionExpired"
    );
  }
};

/* =====================================================
   LOGOUT
===================================================== */

async function getLogout(req, res) {
  try {
    /* =========================
       CLEAR COOKIES
    ========================= */

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    /* =========================
       AUDIT LOG
    ========================= */

    await auditLog(req, req.user, "LOGOUT");

    /* =========================
       REDIRECT
    ========================= */

    res.redirect("/auth/login?success=LoggedOut");
  } catch (err) {
    console.error("Logout Error:", err.message);

    res.status(500).redirect("/");
  }
}

/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  getRegister,
  postRegister,
  getLogin,
  postLogin,
  getLogout,
  refreshAccessToken,
  auditLog,
};