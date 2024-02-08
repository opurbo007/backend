import dotenv from "dotenv";
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
dotenv.config();

const configDB = async () => {
  try {
    const connection = await mongoose.connect(
      `${process.env.MONGO_URL}/${DB_NAME}`,
    );

    console.log(
      `Connected to MongoDB: ${DB_NAME}\nHost: ${connection.connection.host}`,
    );
  } catch (error) {
    console.error("MongoDB not connect", error);
    process.exit(1);
  }
};

export default configDB;
