import { pool } from "../connections/db.js";

export const getUserProfile = async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    const query = `
        SELECT id, email,first_name,last_name,profile_picture_url,preferences,email_verified FROM users WHERE id=$1 AND is_active=true
        `;
    const userResult = await client.query(query, [req.userId]);
    if (userResult.rows.length === 0) {
      res.clearCookie("auth_token");
      return res.status(401).json({
        success: false,
        message: "User not found or account deactivated",
        authenticated: false,
        timestamp: new Date().toISOString(),
      });
    }
    const user = userResult.rows[0];
    const responseData = {
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      profilePictureUrl: user.profile_picture_url,
      preferences: user.preferences,
      emailVerified: user.email_verified,
    };
    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.log(`Error fetching user profile: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};
