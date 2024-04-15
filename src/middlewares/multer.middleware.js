import multer from "multer";

const storage = multer.diskStorage({
  destination: function (_req, _res, cb) {
    cb(null, "./public/temp/");
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random());
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

export const upload = multer({ storage });
