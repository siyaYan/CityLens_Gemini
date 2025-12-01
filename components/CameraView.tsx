'use client';

import React, { useRef, useState } from 'react';
import { Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { blobToBase64 } from '../utils';

interface CameraViewProps {
  onCapture: (base64Image: string) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await blobToBase64(file);
        onCapture(base64);
      } catch (err) {
        console.error("Error reading file", err);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const base64 = await blobToBase64(file);
      onCapture(base64);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-display font-bold text-sky-400 tracking-wider uppercase">CityLens AR</h1>
        <p className="text-slate-400 text-lg">Point, Shoot, and Discover History.</p>
      </div>

      <div 
        className={`relative w-full max-w-md h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden
          ${dragActive ? 'border-sky-400 bg-sky-900/20' : 'border-slate-600 hover:border-sky-500 hover:bg-slate-800/50'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-sky-900/10 pointer-events-none" />
        
        <div className="z-10 flex flex-col items-center space-y-4">
          <div className="p-4 bg-sky-500/10 rounded-full text-sky-400">
             <Camera size={48} />
          </div>
          <p className="text-slate-300 font-medium">Tap to upload or drag photo here</p>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
         <button 
           onClick={() => fileInputRef.current?.click()}
           className="flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white py-3 px-4 rounded-lg transition-all font-semibold shadow-lg shadow-sky-900/50"
         >
           <Upload size={20} />
           <span>Upload Photo</span>
         </button>
         <button 
           className="flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg transition-all font-semibold"
           onClick={() => alert("Please use the native camera or upload a file.")}
         >
           <ImageIcon size={20} />
           <span>Gallery</span>
         </button>
      </div>
    </div>
  );
};

export default CameraView;
