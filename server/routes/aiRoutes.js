import express from 'express';
import { auth } from '../middlewares/auth.js';
import upload, { uploadToCloudinary } from "../configs/multer.js";
import { 
  generateArticle,
  generateBlogTitle,
  generateImage,
  removeImageBackground,
  removeImageObject,
  resumeReview
} from '../controllers/aiController.js';

const aiRouter = express.Router();

// For routes that don't require file upload
aiRouter.post('/generate-article', auth, generateArticle);
aiRouter.post('/generate-blog-title', auth, generateBlogTitle);
aiRouter.post('/generate-images', auth, generateImage);

// For routes that require file upload
aiRouter.post('/remove-background', auth, upload.single('image'), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer, "backgrounds");
    req.file.cloudinaryUrl = result.secure_url; // attach URL to request for controller
    await removeImageBackground(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

aiRouter.post('/remove-image-object', auth, upload.single('image'), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer, "objects");
    req.file.cloudinaryUrl = result.secure_url;
    await removeImageObject(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

aiRouter.post('/resume-review', auth, upload.single('resume'), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer, "resumes");
    req.file.cloudinaryUrl = result.secure_url;
    await resumeReview(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

export default aiRouter;
