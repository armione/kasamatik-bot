
// src/components/modals/PlatformManagerModal.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { useUiStore } from '../../stores/uiStore';
import { FaTrash, FaXmark } from 'react-icons/fa6';

const PlatformManagerModal = () => {
    const [newPlatformName, setNewPlatformName] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { user } = useAuthStore();
    const { platforms, addPlatform, deletePlatform: deletePlatformFromStore } = useDataStore();
    const { closePlatformManagerModal } = useUiStore();

    const handleAddPlatform = async () => {
        if (!newPlatformName.trim()) {
            toast.error('Platform adı boş olamaz.');
            return;
        }
        if (!user) return;

        setLoading(true);
        const { data, error } = await supabase
            .from('platforms')
            .insert({ name: newPlatformName.trim(), user_id: user.id })
            .select()
            .single();
        
        if (error) {
            toast.error(error.message);
        } else if (data) {
            addPlatform(data);
            setNewPlatformName('');
            toast.success('Platform eklendi!');
        }
        setLoading(false);
    };
    
    const handleDeletePlatform = async (platformId: number, platformName: string) => {
        if (!window.confirm(`'${platformName}' platformunu silmek istediğinizden emin misiniz?`)) return;

        const { error } = await supabase.from('platforms').delete().eq('id', platformId);
        
        if (error) {
            toast.error(error.message);
        } else {
            deletePlatformFromStore(platformId);
            toast.success('Platform silindi!');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closePlatformManagerModal}>
            <div className="glass-card rounded-2xl w-full max-w-md p-6 m-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Platformları Yönet</h2>
                    <button onClick={closePlatformManagerModal} className="p-2 text-gray-400 hover:text-white">
                        <FaXmark />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newPlatformName}
                            onChange={(e) => setNewPlatformName(e.target.value)}
                            placeholder="Yeni platform adı..."
                            className="flex-grow appearance-none rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-primary-blue sm:text-sm"
                        />
                        <button onClick={handleAddPlatform} disabled={loading} className="gradient-button px-4 py-2 rounded-lg font-semibold disabled:opacity-50">
                            {loading ? '...' : 'Ekle'}
                        </button>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {platforms.length > 0 ? platforms.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-2 bg-gray-800/50 rounded-lg">
                                <span>{p.name}</span>
                                <button onClick={() => handleDeletePlatform(p.id, p.name)} className="text-red-500 hover:text-red-400 p-1" aria-label={`${p.name} platformunu sil`}>
                                    <FaTrash />
                                </button>
                            </div>
                        )) : <p className="text-center text-gray-400 py-4">Özel platformunuz yok.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlatformManagerModal;