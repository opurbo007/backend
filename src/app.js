import cors from "cors";
import express from "express";

const app = express();

// define cors origins
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

//define limit of json payload
app.use(
  express.json({
    limit: "16kb",
  }),
);

//handle incoming URL payload
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

//define static folder path
app.use(express.static("public"));

//define cookie parser
app.use(express.cookieParser());

// hndle error
app.on("error", (err) => {
  console.error(err);
  throw err;
});
export default app;
