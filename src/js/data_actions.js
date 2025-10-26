import { state } from './state.js';
import { addBet, addPlatform, clearAllBetsForUser, clearAllPlatformsForUser } from './api/database.js';
import { showNotification, setButtonLoading } from './utils/helpers.js';
import { updateAllUI } from './main.js';
import { closeModal } from './components/modals.js';
import { closeImportModal } from './components/modals.js';

/**
 * Kullanıcının mevcut bahis ve platform verilerini bir JSON dosyası olarak indirmesini sağlar.
 */
export function handleExportData() {
    try {
        const dataToExport = {
            bets: state.bets,
            customPlatforms: state.customPlatforms
        };

        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `kasamatik_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('✅ Veriler başarıyla dışa aktarıldı!', 'success');

    } catch (error) {
        console.error("Dışa aktarma hatası:", error);
        showNotification('Veriler dışa aktarılırken bir hata oluştu.', 'error');
    }
}

/**
 * Kullanıcının seçtiği JSON dosyasındaki verileri uygulamaya aktarır.
 */
export async function handleImportData() {
    const fileInput = document.getElementById('import-file');
    const textInput = document.getElementById('import-text');
    const mode = document.getElementById('import-mode').value; // 'merge' or 'replace'
    const importButton = document.getElementById('import-data-btn');

    let rawData;

    try {
        setButtonLoading(importButton, true, 'Aktarılıyor...');

        // 1. Veriyi Al (Dosyadan veya Metin Alanından)
        if (fileInput.files.length > 0) {
            rawData = await fileInput.files[0].text();
        } else if (textInput.value) {
            rawData = textInput.value;
        } else {
            showNotification('Lütfen bir dosya seçin veya JSON metni yapıştırın.', 'warning');
            setButtonLoading(importButton, false);
            return;
        }

        // 2. Veriyi Parse Et ve Doğrula
        const data = JSON.parse(rawData);
        const betsToImport = data.bets || [];
        const platformsToImport = data.customPlatforms || [];

        if (!Array.isArray(betsToImport) || !Array.isArray(platformsToImport)) {
            throw new Error('JSON formatı geçersiz. "bets" ve "customPlatforms" dizileri bekleniyor.');
        }

        // 3. Veri Tabanı İşlemleri
        if (mode === 'replace') {
            if (!confirm('TÜM MEVCUT VERİLERİNİZİ SİLMEK ve bu yedekle değiştirmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
                setButtonLoading(importButton, false);
                return;
            }
            // Mevcut verileri temizle
            await clearAllBetsForUser(state.currentUser.id);
            await clearAllPlatformsForUser(state.currentUser.id);
            state.bets = [];
            state.customPlatforms = [];
        }

        let importedBetsCount = 0;
        let importedPlatformsCount = 0;

        // Platformları aktar
        for (const platform of platformsToImport) {
            // Sadece mevcut değilse ekle (birleştirme modu için önemli)
            if (!state.customPlatforms.some(p => p.name === platform.name)) {
                const { data: newPlatform, error } = await addPlatform({
                    user_id: state.currentUser.id,
                    name: platform.name
                });
                if (!error && newPlatform) {
                    state.customPlatforms.push(newPlatform[0]);
                    importedPlatformsCount++;
                }
            }
        }

        // Bahisleri aktar (yeni bahisler başa eklenir)
        for (const bet of betsToImport) {
            // Veri bütünlüğünü sağla
            const newBetData = {
                user_id: state.currentUser.id,
                platform: bet.platform,
                bet_type: bet.bet_type,
                description: bet.description,
                bet_amount: bet.bet_amount,
                odds: bet.odds,
                date: bet.date,
                status: bet.status,
                win_amount: bet.win_amount,
                profit_loss: bet.profit_loss,
                special_odd_id: bet.special_odd_id || null // Eski yedeklerde bu olmayabilir
            };
            
            const { data: newBet, error } = await addBet(newBetData);
            if (!error && newBet) {
                state.bets.unshift(newBet[0]);
                importedBetsCount++;
            }
        }

        // 4. Kullanıcı Arayüzünü Güncelle
        updateAllUI();
        closeModal('import-modal');
        document.getElementById('import-file').value = '';
        textInput.value = '';
        showNotification(`✅ İçe aktarma tamamlandı: ${importedBetsCount} bahis, ${importedPlatformsCount} platform eklendi.`, 'success');

    } catch (error) {
        console.error("İçe aktarma hatası:", error);
        showNotification(`İçe aktarma hatası: ${error.message}`, 'error');
    } finally {
        setButtonLoading(importButton, false);
    }
}

