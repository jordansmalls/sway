import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            sparse: true,
            minLength: 3,
            maxLength: 20,
            unique: true,
            lowercase: true,
            index: 1,
            validate: {
                validator: function (v) {
                    // if there is no username, pass validation (allows it to be blank)
                    if (!v) return true;

                    // if there is a username, enforce length & regex rules
                    const isValidLength = v.length >= 3 && v.length <= 20;
                    const isValidFormat = /^[a-zA-Z0-9_]+$/.test(v);

                    return isValidLength && isValidFormat;
                },
                message:
                    "Username must be 3-20 characters and contain only letters, numbers, and underscores",
            },
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: 1,
        },
        password: {
            type: String,
            required: true,
            minLength: 8,
        },
        active: {
            type: Boolean,
            default: true,
        },
        hasActiveRoom: {
            type: Boolean,
            default: false,
        },
        hasUsername: {
            type: Boolean,
            default: false,
        },
        admin: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);


// compare user entered password to hashed password in database
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema)
export default User;