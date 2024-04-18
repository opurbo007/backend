import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const registerUser = asyncHandler(async (req, res) => {
  // get user details
  const { fullName, email, username, password } = req.body;

  // validation
  if (
    [username, fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user exists
  const existUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existUser) {
    throw new ApiError(409, "User already exists");
  }

  // files available or not
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverLocalPath = req.files?.coverImage[0]?.path;
  let coverLocalPath;

  if (req.files?.coverImage) {
    coverLocalPath = req.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar must be required");
  }

  // upload to cloudinary server
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
  }

  // create user object - create entry
  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // remove password and refresh token
  const userCreated = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  // check for user creation
  if (!userCreated) {
    throw new ApiError(500, "User creation failed");
  }

  // return res
  return res
    .status(201)
    .json(new ApiResponse(200, userCreated, "User created successfully"));
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw new ApiError(500, "Token generation failed");
  }
};

const loginUser = asyncHandler(async (req, res) => {
  try {
    //get body information
    const { email, username, password } = req.body;

    // username or email
    if (!(email || username)) {
      throw new ApiError(400, "Email or username is required");
    }

    //find the user
    const user = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // check password
    const vailed = await user.isPasswordCorrect(password);
    if (!vailed) {
      throw new ApiError(401, "Invalid password");
    }

    // generate refresh token & access token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id,
    );
    // console.log(accessToken);
    // console.log(refreshToken);

    // send cookies
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken",
    );
    const options = {
      httpOnly: true,
      secure: false,
    };

    console.log("access-token : ", accessToken);
    console.log("refresh-token : ", refreshToken);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User logged In Successfully",
        ),
      );
  } catch (error) {
    console.log(error);
  }
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    },
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookies("accessToken", options)
    .clearCookies("refreshTtoken", options)
    .json(new ApiResponse(200, {}, "Logout success"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Not authorized, no token");
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET,
  );
});

export { registerUser, loginUser, logOutUser };
