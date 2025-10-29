
// src/components/new_bet/CouponReader.tsx
import React, { useState, useRef, DragEvent } from 'react';
import toast from 'react-hot-toast';
import { FaUpload, FaPaste, FaTrash, FaBrain } from 'react-icons/fa6';

interface CouponReaderProps {
  onAnalysisComplete: (result: any) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const CouponReader: React.FC<CouponReaderProps> = ({ onAnalysisComplete }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Lütfen geçerli bir resim dosyası seçin.');
    }
  };

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read();
      const imageItem = items.find(item => item.types.some(t => t.startsWith('image/')));
      if (imageItem) {
        const blob = await imageItem.getType(imageItem.types.find(t => t.startsWith('image/'))!);
        const file = new File([blob], "clipboard.png", { type: blob.type });
        handleFile(file);
        toast.success('Resim panodan yapıştırıldı!');
      } else {
        toast.error('Panoda yapıştırılacak resim bulunamadı.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Panodan yapıştırma başarısız oldu.');
    }
  };
  
  const handleAnalyze = async () => {
    if (!imagePreview) {
      toast.error('Lütfen önce bir resim yükleyin.');
      return;
    }
    setLoading(true);
    const toastId = toast.loading('Kupon analiz ediliyor...');
    try {
        const response = await fetch(imagePreview);
        const blob = await response.blob();
        const file = new File([blob], "coupon.png", { type: blob.type });
        const base64ImageData = await fileToBase64(file);

        const apiResponse = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64ImageData }),
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            throw new Error(errorData.message || 'API isteği başarısız.');
        }

        const result = await apiResponse.json();
        onAnalysisComplete(result);
        toast.success('Kupon başarıyla okundu!', { id: toastId });
    } catch (error: any) {
        toast.error(`Analiz hatası: ${error.message}`, { id: toastId });
    } finally {
        setLoading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleDragEvents = (e: DragEvent<HTMLDivElement>, isOver: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(isOver);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <h3 className="text-xl font-bold text-white">Akıllı Kupon Okuyucu</h3>
      {!imagePreview ? (
        <div 
            onDragOver={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors ${isDragOver ? 'border-primary-blue bg-blue-500/10' : 'border-gray-600'}`}
        >
          <FaUpload className="text-4xl text-gray-400 mb-2" />
          <p className="text-center text-gray-300">Resmi sürükleyip bırakın veya seçin</p>
          <input type="file" ref={fileInputRef} onChange={e => handleFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
        </div>
      ) : (
        <div className="relative group">
          <img src={imagePreview} alt="Kupon Önizleme" className="rounded-lg w-full max-h-64 object-contain" />
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={removeImage} className="p-3 bg-red-600 rounded-full text-white hover:bg-red-500 transition-colors">
              <FaTrash />
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
            <FaUpload /> Resim Seç
        </button>
        <button onClick={handlePaste} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
            <FaPaste /> Panodan Yapıştır
        </button>
      </div>
      <button onClick={handleAnalyze} disabled={!imagePreview || loading} className="w-full gradient-button flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
        <FaBrain /> {loading ? 'Okunuyor...' : 'Kuponu Oku'}
      </button>
    </div>
  );
};

export default CouponReader;
