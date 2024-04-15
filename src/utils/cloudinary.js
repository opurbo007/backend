import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

//connect to cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRATE,
});

const uploadOnCloudinary = async (localfilepath) => {
  try {
    if (!localfilepath) return null;
    const resposnse = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localfilepath);
    return resposnse;
  } catch (error) {
    //remove local file from server in case of error
    fs.unlinkSync(localfilepath);
  }
};

export { uploadOnCloudinary };
