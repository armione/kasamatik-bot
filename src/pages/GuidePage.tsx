
// src/pages/GuidePage.tsx

const GuidePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Kullanım Rehberi</h1>
        <p className="mt-1 text-gray-400">Kasamatik'i en verimli şekilde nasıl kullanacağınızı öğrenin.</p>
      </div>

      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h2 className="text-xl font-bold text-white">Yeni Bahis Kaydı</h2>
        <p className="text-gray-300">
          "Yeni Kayıt" sayfasından bahislerinizi ekleyebilirsiniz. Platform, bahis türü, miktar ve oran gibi bilgileri girdikten sonra "Bahsi Ekle" butonuyla kaydınızı tamamlayın.
        </p>

        <h2 className="text-xl font-bold text-white">Akıllı Kupon Okuyucu</h2>
        <p className="text-gray-300">
          "Yeni Kayıt" sayfasındaki "Akıllı Kupon Okuyucu" ile bahis kuponlarınızın ekran görüntüsünü yükleyerek bilgilerin otomatik doldurulmasını sağlayabilirsiniz. Resmi sürükleyip bırakabilir, panodan yapıştırabilir veya dosya seçerek yükleyebilirsiniz.
        </p>

        <h2 className="text-xl font-bold text-white">Bahis Geçmişi ve Sonuçlandırma</h2>
        <p className="text-gray-300">
          "Bahis Geçmişi" sayfasında tüm bahislerinizi görebilirsiniz. Bekleyen (pending) durumdaki bir bahsi sonuçlandırmak için "Sonuçlandır" butonuna tıklayarak kazandı/kaybetti durumunu ve kazanç miktarını girebilirsiniz.
        </p>

        <h2 className="text-xl font-bold text-white">Kasa İşlemleri</h2>
        <p className="text-gray-300">
          "Kasa Geçmişi" sayfasından veya Ana Panel'deki kısayol ile kasanıza para yatırma veya çekme işlemi ekleyebilirsiniz. Bu işlemler, toplam kasanızı ve net kar/zarar durumunuzu doğru hesaplamak için önemlidir.
        </p>

        <h2 className="text-xl font-bold text-white">İstatistikler</h2>
        <p className="text-gray-300">
          "İstatistikler" sayfası, bahislerinizin performansını görsel grafiklerle analiz etmenizi sağlar. Kümülatif kar grafiği, platformlara göre bahis dağılımı ve ROI (Yatırım Geri Dönüşü) gibi metrikleri burada bulabilirsiniz.
        </p>
      </div>
    </div>
  );
};

export default GuidePage;
