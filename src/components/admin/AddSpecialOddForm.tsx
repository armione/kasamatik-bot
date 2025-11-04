// src/components/admin/AddSpecialOddForm.tsx
import React, { useState, useRef, DragEvent } from 'react';
import toast from 'react-hot-toast';
import { FaUpload, FaPaste, FaTrash, FaBrain, FaPlus } from 'react-icons/fa6';
import { supabase } from '../../lib/supabaseClient';
import { useDataStore } from '../../stores/dataStore';
import { SpecialOdd } from '../../types';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const initialFormData = {
    platform: '',
    description: '',
    odds: 1.0,
    max_bet_amount: null,
    primary_link_text: '',
    primary_link_url: '',
    secondary_link_text: '',
    secondary_link_url: ''
};

const AddSpecialOddForm = () => {
    const [formData, setFormData] = useState(initialFormData);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addSpecialOdd } = useDataStore();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? null : parseFloat(value)) : value
        }));
    };

    const resetForm = () => {
        setFormData(initialFormData);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFile = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
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
        setAnalyzing(true);
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
            
            let newDescription = '';
            if (result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
              newDescription = result.matches
                .map((match: any) => `${match.matchName} (${match.bets.join(', ')})`)
                .join(' / ');
            }
            setFormData(prev => ({
                ...prev,
                description: newDescription,
                odds: result.odds || prev.odds,
            }));

            toast.success('Kupon başarıyla okundu!', { id: toastId });
        } catch (error: any) {
            toast.error(`Analiz hatası: ${error.message}`, { id: toastId });
        } finally {
            setAnalyzing(false);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.platform || !formData.description || !formData.odds) {
            return toast.error("Platform, Açıklama ve Oran alanları zorunludur.");
        }
        setLoading(true);
        const toastId = toast.loading('Özel oran ekleniyor...');

        const newOddData: Omit<SpecialOdd, 'id' | 'created_at' | 'play_count' | 'is_active' | 'resulted_at' | 'telegram_message_id' | 'matches' > = {
            ...formData,
            status: 'pending',
        };

        try {
            const { data, error } = await supabase.from('special_odds').insert(newOddData).select().single();
            if (error) throw error;

            addSpecialOdd(data);
            toast.success('Özel oran başarıyla eklendi!', { id: toastId });
            resetForm();

        } catch (error: any) {
            toast.error(`Hata: ${error.message}`, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Admin: Yeni Özel Fırsat Ekle</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Section */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Platform</label>
                            <input type="text" name="platform" value={formData.platform} onChange={handleChange} required className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Oran</label>
                            <input type="number" name="odds" value={formData.odds} onChange={handleChange} required step="0.01" className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Açıklama</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} required rows={3} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm"></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Maks. Bahis (₺)</label>
                        <input type="number" name="max_bet_amount" value={formData.max_bet_amount ?? ''} onChange={handleChange} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Ana Link Metni</label>
                            <input type="text" name="primary_link_text" value={formData.primary_link_text} onChange={handleChange} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Ana Link URL</label>
                            <input type="url" name="primary_link_url" value={formData.primary_link_url} onChange={handleChange} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">İkincil Link Metni</label>
                            <input type="text" name="secondary_link_text" value={formData.secondary_link_text} onChange={handleChange} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">İkincil Link URL</label>
                            <input type="url" name="secondary_link_url" value={formData.secondary_link_url} onChange={handleChange} className="mt-1 block w-full appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm" />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button type="submit" disabled={loading || analyzing} className="gradient-button w-full flex justify-center items-center py-2.5 rounded-lg font-semibold">
                            <FaPlus className="mr-2" />
                            {loading ? 'Ekleniyor...' : 'Fırsatı Ekle'}
                        </button>
                    </div>
                </form>

                {/* Coupon Reader Section */}
                <div className="space-y-4">
                    {!imagePreview ? (
                        <div 
                            onDragOver={(e) => handleDragEvents(e, true)}
                            onDragLeave={(e) => handleDragEvents(e, false)}
                            onDrop={handleDrop}
                            className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors h-full ${isDragOver ? 'border-primary-blue bg-blue-500/10' : 'border-gray-600'}`}
                        >
                            <FaUpload className="text-4xl text-gray-400 mb-2" />
                            <p className="text-center text-gray-300">Otomatik doldurmak için resmi sürükleyin veya seçin</p>
                            <input type="file" ref={fileInputRef} onChange={e => handleFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                        </div>
                    ) : (
                        <div className="relative group">
                            <img src={imagePreview} alt="Kupon Önizleme" className="rounded-lg w-full max-h-48 object-contain" />
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
                    <button onClick={handleAnalyze} disabled={!imagePreview || analyzing || loading} className="w-full gradient-button flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg font-semibold bg-opacity-80">
                        <FaBrain /> {analyzing ? 'Okunuyor...' : 'Kuponu Oku'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSpecialOddForm;
