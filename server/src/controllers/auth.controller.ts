import User from "../models/user.model";
import generateToken from "../utils/generate.jwt";
import validator from "validator"


/**
 * @desc    Create user account
 * @route   POST /api/auth
 * @access  PUBLIC
 */

export const createUserAccount = async (req, res) => {
    const { email, password } = req.body;

    try {

        if(!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: missing email and/or password",
                message: "Both email and password fields are required!"
            })
        }


        // email validation
        if(!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: invalid email",
                message: "Please enter a valid email address."
            })
        }

        // password length check
        if(password.length < 8) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: invalid password",
                message: "Passwords must be at least 8 characters long!"
            })
        }


        // check if email is already in use
        const emailExists = await User.findOne({ email: email.toLowerCase() });

        if(emailExists) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: email collision",
                message: "Email is already associated with another account."
            })
        }


        // create user account
        const user = await User.create({
            email: email.toLowerCase(),
            password,
        })


        if(!user) {
            return res.status(500).json({
                success: false,
                error: "Invalid Credentials: invalid user data",
                message: "We're having trouble, please try again.",
            })
        }

        generateToken(res, user._id);

        return res.status(201).json({
            success: true,
            message: "Account created successfully. Welcome to Sway!",
            user: {
                _id: user._id,
                email: user.email,
                hasActiveRoom: user.hasActiveRoom,
                hasUsername: user.hasUsername,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }
        })

    } catch (err) {
       console.error("There was an error creating a user account:", err);

        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            return res.status(400).json({
                message: `${field === "email" ? "Email" : "Username"} already exists`,
            });
        }

        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "Sorry, we're having trouble creating your account. Please try again soon."
        })
    }
}


/**
 * @desc    Create username
 * @route   POST /api/auth/username
 * @access  PRIVATE
 */

export const createUsername = async (req, res) => {
    const { username } = req.body;

    try {
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "Invalid Credentials: ID missing",
                message: "You must be logged in.",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Resource Not Found",
                message: "User not found.",
            });
        }

        // check if user's `hasUsername` prop is true
        if (user.hasUsername) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: user has username",
                message: "You have already created a username.",
            });
        }

        // check if username is valid length
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: username length",
                message: "Usernames must be between 3 and 20 characters long.",
            });
        }

        // check if username is valid chars
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: invalid username characters",
                message: "Usernames can only contain letters, numbers, and underscores.",
            });
        }

        // check if username is taken
        const usernameTaken = await User.findOne({ username });

        if(usernameTaken) {
            return res.status(400).json({
                success: false,
                error: "Username taken",
                message: "This username is already in use."
            })
        }

        user.username = username;
        user.hasUsername = true;

        const updatedUser = await user.save();

        return res.status(201).json({
            success: true,
            message: `${username} has a great ring to it, let's do this.`,
            user: {
                _id: user._id,
                username: updatedUser.username,
                email: updatedUser.email,
                hasActiveRoom: updatedUser.hasActiveRoom,
                hasUsername: updatedUser.hasUsername,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt,
            },
        });

    } catch (err) {
       console.error("There was an error assigning a user a username:", err);
       return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "We're having trouble, please try again."
       })
    }
}



/**
 * @desc    Check username availability
 * @route   GET /api/auth/username/:username
 * @access  PUBLIC
 */

export const checkUsernameAvailability = async (req, res) => {
    const { username } = req.params;

    try {

        if(!username || typeof username !== "string" || username.length < 3 || username.length > 20) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: invalid username characters or length",
                message: "Usernames must be between 3 and 20 characters in length, and only contain no special characters."
            })
        }

        const taken = await User.findOne({ username })

        if(taken) {
            return res.status(200).json({
                success: true,
                taken: true,
                message: "Username is already in use.",
            })
        } else {
            return res.status(200).json({
                success: true,
                taken: false,
                message: "Username is available."
            })
        }


    } catch (err) {
       console.error("There was an error attempting to check username availability:", err);
       return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "We're having trouble, please try again soon."
       })
    }
}


/**
 * @desc    Check email availability
 * @route   GET /api/auth/email/:email
 * @access  PUBLIC
 */

export const checkEmailAvailability = async (req, res) => {
    const { email } = req.params;

    try {

        if(!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: invalid email",
                message: "Oops! Please enter a valid email address."
            })
        }

        const taken = await User.findOne({ email })

        if(taken) {
            return res.status(200).json({
                success: true,
                taken: true,
                message: "Email is already in use."
            })
        } else {
            return res.status(200).json({
                success: true,
                taken: false,
                message: "Email is available!"
            })
        }

    } catch (err) {
       console.error("There was an error fetching the availability of an email:", err);
       return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "We're having trouble, please try again soon."
       })
    }
}


/**
 * @desc    Log in user
 * @route   POST /api/auth/login
 * @access  PUBLIC
 */
export const loginUserAccount = async (req, res) => {
    const { identifier, password } = req.body;

    try {
        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: missing identifier or password",
                message: "All fields are required.",
            });
        }

        // find account by username or email
        const user = await User.findOne({
            $or: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }],
        }).select("+password"); // Explicitly include password if it's set to select: false

        if(user && user.active && (await user.comparePassword(password))) {
            generateToken(res, user._id);
            return res.status(200).json({
                success: true,
                message: "You've been successfully logged in.",
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    hasActiveRoom: user.hasActiveRoom,
                    hasUsername: user.hasUsername,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                }
            })
        } else {
            return res.status(401).json({
                success: false,
                error: "Invalid Credentials: invalid username/email or password",
                message: "We're having trouble logging you in, please try again soon."
            })
        }

    } catch (err) {
       console.error("There was an error attempting to log a user in:", err);
       return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "We're having trouble logging you in, please try again soon."
       })
    }
}



/**
 * @desc    Log out user
 * @route   POST /api/auth/logout
 * @access  PUBLIC
 */

export const logoutUserAccount = (req, res) => {
    try {
        res.cookie("jwt", "", {
            httpOnly: true,
            expires: new Date(0),
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully. Please come back soon.",
        });
    } catch (err) {
        console.error("There was an error attempting to logout a user:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble logging you out, please try again.",
        });
    }
};