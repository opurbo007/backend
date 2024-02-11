import dotenv from "dotenv";
import app from "./app.js";
import configDB from "./db/index.js";

dotenv.config();

configDB()
  .then(() => {
    app.listen(process.env.PORT || 8080, () => {
      console.log(`Server running on port ${process.env.PORT || 8080}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB", error);
  });
