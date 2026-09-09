import { useState, useRef, useEffect, DragEvent } from "react";
import { X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  images: { file: File | null; url: string; isPrimary: boolean }[];
  setImages: (images: { file: File | null; url: string; isPrimary: boolean }[]) => void;
  maxFiles?: number;
}

export function ImageUploader({ images, setImages, maxFiles = 5 }: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.url.startsWith("blob:")) URL.revokeObjectURL(img.url);
      });
    };
  }, [images]);

  const validateFiles = (files: File[]) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 2 * 1024 * 1024; // 2MB
    
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}`);
        return false;
      }
      if (file.size > maxSize) {
        setError(`File too large: ${file.name}`);
        return false;
      }
    }
    if (images.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} images allowed`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleFiles = (files: File[] | FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    if (!validateFiles(fileArray)) return;

    const newImages = fileArray.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      isPrimary: images.length === 0 && fileArray.indexOf(file) === 0,
    }));

    setImages([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    const imgToRemove = images[index];
    if (imgToRemove.url.startsWith("blob:")) URL.revokeObjectURL(imgToRemove.url);
    
    const newImages = images.filter((_, i) => i !== index);
    if (imgToRemove.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    setImages(newImages);
  };

  const setPrimary = (index: number) => {
    setImages(
      images.map((img, i) => ({ ...img, isPrimary: i === index }))
    );
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-md p-4 transition-colors ${dragOver ? "border-primary bg-primary/10" : "border-gray-300"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="grid grid-cols-3 gap-4">
          {images.map((img, index) => (
            <div key={index} className="relative group aspect-square">
              <img src={img.url} className="w-full h-full object-cover rounded-md" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 rounded-md transition-opacity">
                <Button size="sm" variant="destructive" onClick={() => removeImage(index)}><X size={16} /></Button>
                <Button size="sm" onClick={() => setPrimary(index)} disabled={img.isPrimary}>Primary</Button>
              </div>
              {img.isPrimary && <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">Primary</span>}
            </div>
          ))}
          {images.length < maxFiles && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center aspect-square cursor-pointer hover:border-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="text-gray-400" />
              <span className="text-sm text-gray-400">Upload</span>
            </div>
          )}
        </div>
      </div>
      <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
