import jwt from "jsonwebtoken";
export const authenticate = (req, res, next) => {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required. Please log in.",
      timestamp: new Date().toISOString(),
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userEmailVerified = decoded.emailVerified;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      emailVerified: decoded.emailVerified,
      isActive: decoded.isActive,
    };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      // Clear expired cookie
      res.clearCookie("auth_token");
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please log in again.",
        expired: true,
        timestamp: new Date().toISOString(),
      });
    }

    if (error.name === "JsonWebTokenError") {
      // Clear invalid cookie
      res.clearCookie("auth_token");
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token. Please log in again.",
        timestamp: new Date().toISOString(),
      });
    }

    if (error.name === "NotBeforeError") {
      return res.status(401).json({
        success: false,
        message: "Token not active yet.",
        timestamp: new Date().toISOString(),
      });
    }

    // Generic JWT error
    console.error("Authentication error:", error);
    res.clearCookie("auth_token");
    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please log in again.",
      timestamp: new Date().toISOString(),
    });
  }
};
