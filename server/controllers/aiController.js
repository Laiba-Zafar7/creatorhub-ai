import dotenv from "dotenv";

import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";      // <-- only once
import FormData from "form-data"; // <-- only once

import fs from "fs";
import { createRequire } from "module";

dotenv.config();

const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

 const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;


    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message:
          "Free usage limit exceeded. Upgrade to premium for more requests.",
      });
    }

    const response = await AI.chat.completions.create({
     model: "gemini-3-flash-preview",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: length,
    });

    const content = response.choices[0].message.content;

    await sql`INSERT INTO creations (user_id, prompt, content,type) VALUES (${userId}, ${prompt}, ${content} , 'article')`;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (err) {

    res.json({ success: false, message: err.message });
  }
};

//blog section
 const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;


    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message:
          "Free usage limit exceeded. Upgrade to premium for more requests.",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-3-flash-preview",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    });

    const content = response.choices[0].message.content;

    await sql`INSERT INTO creations (user_id, prompt, content, type)
    VALUES (${userId}, ${prompt}, ${content} , 'article')`;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (err) {
    
    res.json({ success: false, message: err.message });
  }
};


//generate image


 const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;

    if (!prompt) {
      return res.json({ success: false, message: "Prompt is required" });
    }

    // Make sure API key exists
    const apiKey = process.env.CLIPDROP_API_KEY;
    if (!apiKey) {
      return res.json({ success: false, message: "Clipdrop API key is missing" });
    }

    // Build form-data
    const formData = new FormData();
    formData.append("prompt", prompt);

    // Send POST request to Clipdrop
    const response = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",
      formData,
      {
        headers: {
          ...formData.getHeaders(),  // IMPORTANT for multipart/form-data
          "x-api-key": process.env.CLIPDROP_API_KEY,        // API key
        },
        responseType: "arraybuffer",
      }
    );

    // Convert to base64
    const base64Image = `data:image/png;base64,${Buffer.from(response.data, "binary").toString("base64")}`;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(base64Image);

    // Save in DB
    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${uploadResult.secure_url}, 'image', ${publish ?? false})
    `;

    res.json({ success: true, content: uploadResult.secure_url });
  } catch (err) {
    console.error("Error generating image:", err.response?.data || err.message);

    const message = err.response?.data?.error || err.response?.data || err.message;
    res.json({ success: false, message });
  }
};


//remove background
 const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const image = req.file;
    const plan = req.plan;
    console.log(plan);

    console.log("Image File:", JSON.stringify(image, null, 2));

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "only available for premium.",
      });
    }

    const { secure_url } = await cloudinary.uploader.upload(image.path, {
      transformation: [
        {
          effect: "background_removal",
          background_removal: "remove_the_background",
        },
      ],
    });

    // Simpan hasil ke database
    try {
      await sql`
        INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')
      `;
      console.log("Database insert successful");
    } catch (dbError) {
      console.error("Database Error:", JSON.stringify(dbError, null, 2));
      throw new Error("Failed to save to database: " + dbError.message);
    }

    // Kirim respons berhasil
    return res.json({ success: true, content: secure_url });
  } catch (error) {
    console.error("Error in removeImageBackground:", JSON.stringify(error, null, 2));
    return res.json({ success: false, message: error.message });
  }
};



const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { object } = req.body;
    const image = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscription",
      });
    }

    const { public_id } = await cloudinary.uploader.upload(image.path);
    // const imageUrl = cloudinary.url(public_id, {
    const imageUrl = cloudinary.url(public_id, {
      transformation: [{ effect: `gen_remove:${object}` }],
      resource_type: "image",
    });

    // 5) Persist and respond
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${`Remove ${object} from image`}, ${imageUrl}, 'image')
    `;

    res.json({ success: true, content: imageUrl });
  } catch (err) {

    res.json({ success: false, message: err.message });
  }
};

 const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth();
    const resume = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscription",
      });
    }

    if (resume.size > 5 * 1024 * 1024) {
      return res.json({
        success: false,
        message: "File size exceeds 5MB limit.",
      });
    }

    const dataBuffer = fs.readFileSync(resume.path);
    // To parse the resume  npm install pdf-parse
    const pdfData = await pdf(dataBuffer);

    const prompt = `Review the following resume and provide constructive feedback on its strengths,weakness, areas for improvement. Resume Content :\n\n${pdfData.text}`;

    const response = await AI.chat.completions.create({
      model: "gemini-3-flash-preview",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    });

    const content = response.choices[0].message.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (
        ${userId},
        'Review the uploaded resume',
        ${content},
        'resume-review'
      )
    `;

    res.json({ success: true, content });
  } catch (err) {

    res.json({ success: false, message: err.message });
  }
};
export { generateArticle, generateBlogTitle, generateImage,removeImageBackground,removeImageObject ,resumeReview};




