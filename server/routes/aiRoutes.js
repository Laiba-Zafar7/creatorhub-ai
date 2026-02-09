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

// Routes that don't require file upload
aiRouter.post('/generate-article', auth, generateArticle);
aiRouter.post('/generate-blog-title', auth, generateBlogTitle);
aiRouter.post('/generate-images', auth, generateImage);

// Helper function for file-upload routes
const handleFileUpload = (folder, controller) => async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Upload file to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, folder);

    // Attach URL to request for controller
    req.file.cloudinaryUrl = result.secure_url;

    // Call the controller
    await controller(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};

// Routes that require file upload
aiRouter.post('/remove-background', auth, upload.single('image'), handleFileUpload("backgrounds", removeImageBackground));
aiRouter.post('/remove-image-object', auth, upload.single('image'), handleFileUpload("objects", removeImageObject));
aiRouter.post('/resume-review', auth, upload.single('resume'), handleFileUpload("resumes", resumeReview));

export default aiRouter;
