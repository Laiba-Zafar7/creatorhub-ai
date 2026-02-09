import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

const storage = multer.memoryStorage(); // memory storage for buffer
const upload = multer({ storage });

export const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export default upload;
