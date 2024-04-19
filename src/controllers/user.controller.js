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

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.log("from 93 no line", error);
    throw new ApiError(500, "Token generation failed", error);
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
    const valid = await user.isPasswordCorrect(password);
    if (!valid) {
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
            accessToken: await accessToken,
            refreshToken: await refreshToken,
          },
          "User logged In Successfully",
        ),
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Login failed", error);
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
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
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

  try {
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Not authorized, no token");
    }
    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token expird or Invalid");
    }
    const options = {
      httpOnly: true,
      secure: false,
    };

    const { accessToken, newRrefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken: await accessToken,
            refreshToken: await newRrefreshToken,
          },
          "User logged In Successfully",
        ),
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refreshToken");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid password");
  }

  user.password = newPassword;
  await user.save({
    validateBeforeSave: false,
  });

  return res.status(200).json(200, {}, "Password updated successfully");
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current User fatces successfully");
});

const updateUser = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!email || !fullName) {
    throw new ApiError(400, "All fields are required");
  }
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true },
  ).select("-password");
  res.status(200).json(new ApiResponse(200, user, "User successfully updated"));
});

const updatedUserAvater = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar filed missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Avatar upload failed on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true },
  );
  return res.status(200).json(new ApiResponse(200, user, "Avatar updated"));
});

const updatedUserCover = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;

  if (!coverLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }

  const cover = await uploadOnCloudinary(coverLocalPath);
  if (!cover.url) {
    throw new ApiError(400, "Cover Image upload failed on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: cover.url,
      },
    },
    { new: true },
  );
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated"));
});

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateUser,
  updatedUserAvater,
  updatedUserCover,
};
