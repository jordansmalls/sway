import config from "../config/config";
import User from "../models/user.model";
import validator from "validator"

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  PRIVATE
 */

export const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "User not found."
             });
        }

        const { username, email } = req.body;

        // Check if at least one field is provided
        if (!username && !email) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: one field required",
                message: "Please provide at least one field to update your account."
            });
        }

        // Validate input if provided
        if (email && !validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: invalid email",
                message: "Please enter a valid email."
            });
        }

        if (username && (username.length < 3 || username.length > 20)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: invalid username length",
                message: "Username must be between 3 and 20 characters."
             });
        }

        if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: invalid username",
                message: "Username can only contain letters, numbers, and underscores.",
            });
        }

        // Trim whitespace from inputs
        const trimmedUsername = username?.trim();
        const trimmedEmail = email?.trim();

        // Check for conflicts and update fields
        if (trimmedUsername && trimmedUsername !== user.username) {
            const usernameExists = await User.findOne({
                username: trimmedUsername,
                _id: { $ne: user._id },
            });

            if (usernameExists) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid Credentials: username is taken",
                    message: "Username is already taken." });
            }

            user.username = trimmedUsername;
        }

        if (trimmedEmail && trimmedEmail.toLowerCase() !== user.email) {
            const emailExists = await User.findOne({
                email: trimmedEmail.toLowerCase(),
                _id: { $ne: user._id },
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid Credentials: email is taken",
                    message: "Email is already associated with another account.",
                });
            }

            user.email = trimmedEmail.toLowerCase();
        }

        const updatedUser = await user.save();

        return res.status(200).json({
            success: true,
            message: "Success! Your account has been updated.",
            user: {
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                hasActiveRoom: updatedUser.hasActiveRoom,
                hasUsername: updatedUser.hasUsername,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt,
            },
        });
    } catch (err) {
        console.error("There was an error updating a user's profile:", err);

        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: username/email is taken",
                message: `${field === "email" ? "Email" : "Username"} already exists with another account.`,
            });
        }

        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We had trouble updating your profile. Please try again."
        });
    }
};


/**
 * @desc    Update user password
 * @route   POST /api/users/password
 * @access  PRIVATE
 */
export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: missing current or new password",
                message: "Current password and new password are required."
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: invalid new password length",
                message: "New password must be at least 8 characters."
            });
        }

        const user = await User.findById(req.user._id).select("+password");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "User not found.",
            });
        }

        // Check current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);

        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: invalid password",
                message: "Current password is incorrect."
            });
        }

        // Set new password (will be hashed by pre-save middleware)
        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password updated successfully."
        });
    } catch (err) {
        console.error("There was an error attempting to update a user's password:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "Error changing password, please try again soon."
        });
    }
};




/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  PRIVATE
 */

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findOne(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                hasActiveRoom: user.hasActiveRoom,
                hasUsername: user.hasUsername,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (err) {
        console.error("There was an error fetching a user's profile:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
    }
};

/**
 * @desc    Delete user account (toggle active prop)
 * @route   DELETE /api/users/profile
 * @access  PRIVATE
 */
export const deleteAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "User not found.",
            });
        }

        user.active = false;
        await user.save();

        // clear JWT cookie

        res.cookie("jwt", "", {
            httpOnly: true,
            secure: config.node_env === "production",
            sameSite: "strict",
            expires: new Date(0),
        });

        return res.status(200).json({
            success: true,
            message: "Account deactivated successfully.",
        });
    } catch (err) {
        console.error("There was an error attempting to deactivate a user's account:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble deleting your account, please try again soon.",
        });
    }
};
