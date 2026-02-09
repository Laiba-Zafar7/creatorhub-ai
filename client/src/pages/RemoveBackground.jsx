import { Eraser, Download, Sparkles } from "lucide-react";
import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import Loading from "../components/Loading";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const RemoveBackground = () => {
  const [input, setInput] = useState(null); // store File object
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");

  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!input) return toast.error("Please select an image");

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("image", input); // append the file

      const { data } = await axios.post("/api/ai/remove-background", formData, {
        headers: {
          Authorization: `Bearer ${await getToken()}`, // attach auth token
          // Do NOT set Content-Type manually, axios handles it
        },
      });

      if (data.success === true) {
        setContent(data.content); // processed image URL from backend
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!content) return;

    try {
      const response = await fetch(content);
      const blob = await response.blob();
      const element = document.createElement("a");
      element.href = URL.createObjectURL(blob);
      element.download = `background_removed_${Date.now()}.png`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Image downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  return (
    <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700">
      {/* Left column - upload form */}
      <form
        onSubmit={onSubmitHandler}
        className="w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200 "
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 text-[#FF4938]" />
          <h1 className="text-xl font-semibold">Background Removal</h1>
        </div>

        <p className="mt-6 text-sm font-medium">Upload Image</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setInput(e.target.files[0])}
          className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300 text-gray-600"
          required
        />
        <p className="text-xs text-gray-500 font-light mt-1">
          Supports JPG, PNG, and other image formats
        </p>

        <button
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#F6AB41] to-[#FF4938] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer"
        >
          {loading ? (
            <span className="w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin"></span>
          ) : (
            <Eraser className="w-5" />
          )}
          Remove Background
        </button>
      </form>

      {/* Right column - processed image */}
      <div className="w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eraser className="w-5 h-5 text-[#FF4938]" />
            <h1 className="text-xl font-semibold">Processed Image</h1>
          </div>

          {content && (
            <button
              onClick={downloadImage}
              className="flex items-center gap-2 bg-[#FF4938] hover:bg-[#E6412F] text-white px-3 py-1.5 rounded-lg transition-colors"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Download</span>
            </button>
          )}
        </div>

        {!content && !loading ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-sm flex flex-col items-center gap-5 text-gray-400">
              <Eraser className="w-9 h-9" />
              <p>Upload an image and click "Remove Background" to get started</p>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex-1 relative">
            {loading ? <Loading /> : <img src={content} alt="processed" className="w-full h-full object-contain" />}
          </div>
        )}
      </div>
    </div>
  );
};

export default RemoveBackground;
