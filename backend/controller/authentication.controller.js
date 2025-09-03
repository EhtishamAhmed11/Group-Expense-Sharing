import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { error, timeStamp } from "console";
import { pool } from "../connections/db.js";
export const register = async (req, res) => {
  let client;

  try {
    const { email, password, firstName, lastName, phone, profilePictureUrl } =
      req.body;

    const errors = [];

    if (!email || !email.trim()) {
      errors.push("Email and Password are required");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push("Please provide a valid email address");
      }
    }

    if (!password) {
      errors.push("Password is required");
    } else {
      if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
      }
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      if (!hasUpperCase || !hasLowerCase) {
        errors.push(
          "Password must contain both uppercase and lowercase letters"
        );
      }

      if (!hasNumbers) {
        errors.push("Password must contain at least one number");
      }
    }
    if (!firstName || !firstName.trim()) {
      errors.push("First name is required");
    } else if (firstName.trim().length < 2 || firstName.trim().length > 50) {
      errors.push("First name must be between 2 and 50 characters");
    }
    if (!lastName || !lastName.trim()) {
      errors.push("Last name is required");
    } else if (lastName.trim().length < 2 || lastName.trim().length > 50) {
      errors.push("Last name must be between 2 and 50 characters");
    }
    if (phone && phone.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        errors.push("Please provide a valid phone number");
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
        timestamp: new Date().toISOString(),
      });
    }
    client = await pool.connect();

    const emailCheckQuery = `SELECT id,email,is_active FROM users WHERE email = $1`;

    const emailCheckResult = await client.query(emailCheckQuery, [
      email.toLowerCase().trim(),
    ]);

    if (emailCheckResult.rows.length > 0) {
      const existingUser = emailCheckResult.rows[0];
      if (existingUser.is_active) {
        return res.status(409).json({
          success: false,
          message: "An account with this email address already exists",
          timestamp: new Date().toISOString(),
        });
      } else {
        return res.status(409).json({
          success: false,
          message:
            "An account with this email was previously deactivated. Please contact support.",
          timestamp: new Date().toISOString(),
        });
      }
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");

    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedFirstName = firstName.trim().replace(/[<>]/g, "");
    const sanitizedLastName = lastName.trim().replace(/[<>]/g, "");
    const sanitizedPhone = phone ? phone.trim().replace(/[<>]/g, "") : null;

    const insertUserQuery = `
        INSERT INTO users(email,password_hash,first_name,last_name,phone,profile_picture_url,email_verification_token,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id,email,first_name,last_name,phone,profile_picture_url,email_verified,created_at
    `;

    const insertParams = [
      sanitizedEmail,
      passwordHash,
      sanitizedFirstName,
      sanitizedLastName,
      sanitizedPhone,
      profilePictureUrl || null,
      emailVerificationToken,
    ];
    const insertResult = await client.query(insertUserQuery, insertParams);

    if (insertResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to create user account",
        timestamp: new Date().toISOString(),
      });
    }

    const newUser = insertResult.rows[0];

    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      phone: newUser.phone,
      profilePictureUrl: newUser.profile_picture_url,
      emailVerified: newUser.email_verified,
      createdAt: newUser.created_at,
    };

    res.status(201).json({
      success: true,
      message:
        "Account created successfully. Please check your email to verify your account.",
      data: {
        user: userResponse,
        emailVerificationRequired: true,
      },
      timestamp: new Date().toISOString(),
    });
    console.log(`New User Registered: ${newUser.email} (ID:${newUser.id})`);
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists",
        timestamp: new Date().toISOString(),
      });
    }

    if (error.code === "23502") {
      // Not null violation
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        timestamp: new Date().toISOString(),
      });
    }
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return res.status(503).json({
        success: false,
        message: "Database connection failed. Please try again later.",
        timestamp: new Date().toISOString(),
      });
    }
    console.error(`Error in Registration: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

export const login = async (req, res) => {
  let client;
  try {
    const { email, password, rememberMe } = req.body;

    const errors = [];

    if (!email || !email.trim()) {
      errors.push("Email and Password are required");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push("Please provide a valid email address");
      }
    }
    if (!password || !password.trim()) {
      errors.push("Email and Password are required");
    }
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
        timestamp: new Date().toISOString(),
      });
    }

    client = await pool.connect();

    const findUserQuery = `
        SELECT id,email,password_hash,first_name,last_name,phone,profile_picture_url,email_verified,is_active,last_login,created_at,preferences FROM users WHERE email = $1
    `;

    const userResult = await client.query(findUserQuery, [
      email.toLowerCase().trim(),
    ]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        timestamp: new Date().toISOString(),
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
        timestamp: new Date().toISOString(),
      });
    }
    //email verification part to be added here

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      console.log(
        `Failed login attempt for email: ${email} at ${new Date().toISOString()}`
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        timestamp: new Date().toISOString(),
      });
    }

    const updateLastLoginQuery = `
        UPDATE users SET last_login = CURRENT_TIMESTAMP , updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING last_login
    `;

    const lastLoginQuery = await client.query(updateLastLoginQuery, [user.id]);

    const updatedLastLogin = lastLoginQuery.rows[0]?.last_login;

    const jwtPayload = {
      userId: user.id,
      email: user.email,
      emailVerified: user.email_verified,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.is_active,
    };

    const tokenExpiration = rememberMe ? "7d" : "1h";

    const cookieExpiration = rememberMe
      ? 7 * 24 * 60 * 60 * 1000
      : 60 * 60 * 1000;

    const jwtOptions = {
      expiresIn: tokenExpiration,
      issuer: "expense-sharing-app",
      audience: "expense-app-users",
      subject: user.id,
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, jwtOptions);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: cookieExpiration,
      path: "/",
    };

    res.cookie("auth_token", token, cookieOptions);

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      profilePictureUrl: user.profile_picture_url,
      emailVerified: user.email_verified,
      lastLogin: updatedLastLogin,
      createdAt: user.created_at,
      preferences: user.preferences || {},
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        token: token,
        expiresIn: tokenExpiration,
        rememberMe: rememberMe || false,
      },
      timestamp: new Date().toISOString(),
    });
    console.log(
      `Successful login: ${user.email} (ID: ${
        user.id
      }) at ${new Date().toISOString()}`
    );
  } catch (error) {
    console.error("Login error:", error);
    if (error.code && error.code.startsWith("42")) {
      // PostgreSQL syntax errors
      return res.status(500).json({
        success: false,
        message: "Database query failed",
        timestamp: new Date().toISOString(),
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};
