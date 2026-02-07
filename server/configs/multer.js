// import multer from 'multer';

// const storage = multer.diskStorage({});

// export const upload =multer({storage});
// middlewares/multer.js
// import multer from "multer";

// const upload = multer();  
// export default upload;
import multer from "multer";
import path from "path";
import fs from "fs";

// Make sure upload folder exists
const uploadFolder = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Export upload middleware
export const upload = multer({ storage });
