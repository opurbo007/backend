import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  username: {
    type: String,
    required: [true, "username is required"],
    unique: [true, "username must unique"],
    lowercase: true,
    trim: true,
    index: true,
  },
  email: {
    type: String,
    required: [true, "email is required"],
    unique: [true, "email must unique"],
    lowercase: true,
    trim: true,
  },
  fullName: {
    type: String,
    required: [true, "Full-name is required"],
    trim: true,
    index: true,
  },
  avater: {
    type: String, //cloudinary url
    required: [true, "Avater is required"],
  },
  cover: {
    type: String, //cloudinary url
  },
  watchHistory: [
    {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
  ],
  pasword: {
    type: String,
    required: [true, "Password is required"],
  },
  refreshToken: {
    type: String,
  },
});

//hasing password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.pasword = bcrypt.hash(this.pasword, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//generating token
userSchema.methods.generateAccessToken = async function () {
  //giving payload or token
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};

//refresh token generation
userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFESH_TOKEN_EXPIRY,
    },
  );
};

export const User = mongoose.model("User", userSchema);
