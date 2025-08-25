import React, { useState } from 'react';
import { BookOpen, TrendingUp, Shield, Calculator, Target, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const BettingGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState('basics');

  const sections: GuideSection[] = [
    {
      id: 'basics',
      title: 'Temel Kavramlar',
      icon: <BookOpen className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-blue-900 mb-4">Bahis Nedir?</h3>
            <p className="text-blue-800 mb-4">
              Bahis, gelecekte gerçekleşecek bir olayın sonucunu tahmin ederek para yatırma işlemidir. 
              Doğru tahmin ettiğinizde kazanç elde edersiniz, yanlış tahmin ettiğinizde yatırdığınız parayı kaybedersiniz.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-2">📊 Oran (Odds)</h4>
              <p className="text-gray-600 text-sm">
                Bir olayın gerçekleşme olasılığını ve kazanç miktarını gösteren sayı. 
                Örnek: 2.50 oran = 100 TL yatırırsanız 250 TL alırsınız.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-2">💰 Stake (Bahis Miktarı)</h4>
              <p className="text-gray-600 text-sm">
                Bir bahise yatırdığınız para miktarı. Bu miktar, toplam bütçenizin küçük bir yüzdesi olmalıdır.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-2">📈 ROI (Yatırım Getirisi)</h4>
              <p className="text-gray-600 text-sm">
                Yatırımınızın ne kadar karlı olduğunu gösteren oran. 
                ROI = (Kazanç - Yatırım) / Yatırım × 100
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-2">🎯 Value Bet</h4>
              <p className="text-gray-600 text-sm">
                Gerçek olasılığından daha yüksek oran verilen bahisler. 
                Uzun vadede kar sağlayan bahis türüdür.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'bankroll',
      title: 'Bankroll Yönetimi',
      icon: <DollarSign className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-green-900 mb-4">Bankroll Nedir?</h3>
            <p className="text-green-800 mb-4">
              Bankroll, bahis yapmak için ayırdığınız toplam para miktarıdır. Bu para, kaybetseniz bile 
              günlük yaşamınızı etkilemeyecek bir miktar olmalıdır.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">💡 Temel Kurallar</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">%1-5 Kuralı</p>
                  <p className="text-gray-600 text-sm">Her bahiste bankrollunuzun maksimum %1-5'ini kullanın</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Kayıp Limiti</p>
                  <p className="text-gray-600 text-sm">Günlük/haftalık kayıp limitinizi önceden belirleyin</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Kazanç Hedefi</p>
                  <p className="text-gray-600 text-sm">Aylık %10-20 kazanç hedefi realistik bir hedeftir</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-yellow-900 mb-4">📊 Bankroll Hesaplama Örneği</h4>
            <div className="space-y-2 text-yellow-800">
              <p><strong>Toplam Bankroll:</strong> 10.000 TL</p>
              <p><strong>Bahis başına miktar (%2):</strong> 200 TL</p>
              <p><strong>Günlük maksimum kayıp (%10):</strong> 1.000 TL</p>
              <p><strong>Aylık hedef (%15):</strong> 1.500 TL</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'strategies',
      title: 'Bahis Stratejileri',
      icon: <Target className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">🎯 Value Betting</h4>
              <p className="text-gray-600 mb-4">
                Bahis sitelerinin verdiği oranların gerçek olasılıktan yüksek olduğu durumları bulma stratejisi.
              </p>
              <div className="space-y-2">
                <p className="text-sm"><strong>Avantajları:</strong></p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Uzun vadede matematiksel avantaj</li>
                  <li>Sürdürülebilir kar</li>
                  <li>Risk yönetimi kolay</li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Arbitraj</h4>
              <p className="text-gray-600 mb-4">
                Farklı bahis sitelerindeki oran farklılıklarından yararlanarak garantili kar elde etme.
              </p>
              <div className="space-y-2">
                <p className="text-sm"><strong>Avantajları:</strong></p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Garantili kar</li>
                  <li>Risk yok</li>
                  <li>Matematiksel kesinlik</li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">⚡ Matched Betting</h4>
              <p className="text-gray-600 mb-4">
                Bahis sitelerinin bonuslarını kullanarak risksiz kar elde etme stratejisi.
              </p>
              <div className="space-y-2">
                <p className="text-sm"><strong>Avantajları:</strong></p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Bonuslardan yararlanma</li>
                  <li>Düşük risk</li>
                  <li>Başlangıç için ideal</li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">📈 Kelly Criterion</h4>
              <p className="text-gray-600 mb-4">
                Optimal bahis miktarını hesaplamak için kullanılan matematiksel formül.
              </p>
              <div className="space-y-2">
                <p className="text-sm"><strong>Formül:</strong></p>
                <p className="text-xs bg-gray-100 p-2 rounded font-mono">
                  f = (bp - q) / b
                </p>
                <p className="text-xs text-gray-500">
                  f: Bahis oranı, b: Oran-1, p: Kazanma olasılığı, q: Kaybetme olasılığı
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'analysis',
      title: 'Analiz Teknikleri',
      icon: <TrendingUp className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-purple-900 mb-4">Başarılı Analiz İçin</h3>
            <p className="text-purple-800">
              Bahis yapmadan önce detaylı analiz yapmak, uzun vadeli başarının anahtarıdır. 
              İşte dikkat etmeniz gereken temel faktörler:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-3">🏈 Spor Analizi</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Takım formu ve son performans</li>
                <li>• Sakatlık ve ceza durumları</li>
                <li>• Kafa kafaya istatistikler</li>
                <li>• Ev sahibi avantajı</li>
                <li>• Motivasyon faktörleri</li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-3">📊 İstatistiksel Analiz</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Geçmiş maç sonuçları</li>
                <li>• Gol ortalamaları</li>
                <li>• Savunma/hücum istatistikleri</li>
                <li>• Farklı lig performansları</li>
                <li>• Sezon içi trendler</li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-3">🎯 Oran Analizi</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Farklı siteler arası karşılaştırma</li>
                <li>• Oran hareketleri takibi</li>
                <li>• Closing line value</li>
                <li>• Piyasa konsensüsü</li>
                <li>• Value bet tespiti</li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">🔍 Analiz Araçları</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Ücretsiz Kaynaklar:</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Flashscore, Sofascore (canlı skorlar)</li>
                  <li>• Transfermarkt (takım değerleri)</li>
                  <li>• ESPN, BBC Sport (haberler)</li>
                  <li>• Reddit spor toplulukları</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Profesyonel Araçlar:</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Oddschecker (oran karşılaştırma)</li>
                  <li>• Betfair Exchange (piyasa derinliği)</li>
                  <li>• Football-Data.org (istatistikler)</li>
                  <li>• Tipster platformları</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'psychology',
      title: 'Psikoloji & Disiplin',
      icon: <Shield className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="bg-red-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-red-900 mb-4">Psikolojik Tuzaklar</h3>
            <p className="text-red-800">
              Bahis yaparken en büyük düşman kendi psikolojinizdir. Bu tuzaklara düşmemek için 
              kendinizi tanımalı ve disiplinli olmalısınız.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">❌ Kaçınılması Gerekenler</h4>
              
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h5 className="font-medium text-red-900 mb-2">🎰 Tilt (Duygusal Bahis)</h5>
                <p className="text-sm text-red-700">
                  Kayıptan sonra duygusal kararlar alarak daha büyük bahisler yapmak. 
                  Bu, bankrollunuzu hızla eritebilir.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h5 className="font-medium text-red-900 mb-2">📈 Martingale Sistemi</h5>
                <p className="text-sm text-red-700">
                  Her kayıptan sonra bahis miktarını ikiye katlama. Matematiksel olarak 
                  uzun vadede kaybettiren bir sistemdir.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h5 className="font-medium text-red-900 mb-2">🏃‍♂️ Kayıpları Kovalama</h5>
                <p className="text-sm text-red-700">
                  Kaybedilen parayı hemen geri kazanmaya çalışmak. Bu genellikle 
                  daha büyük kayıplara yol açar.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">✅ Yapılması Gerekenler</h4>
              
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h5 className="font-medium text-green-900 mb-2">📝 Kayıt Tutma</h5>
                <p className="text-sm text-green-700">
                  Tüm bahislerinizi detaylı şekilde kaydedin. Bu, hatalarınızı 
                  görmenizi ve gelişmenizi sağlar.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h5 className="font-medium text-green-900 mb-2">⏰ Mola Verme</h5>
                <p className="text-sm text-green-700">
                  Kayıp serilerinde mola verin. Duygusal kararlar almak yerine 
                  soğukkanlılığınızı koruyun.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h5 className="font-medium text-green-900 mb-2">🎯 Hedef Belirleme</h5>
                <p className="text-sm text-green-700">
                  Gerçekçi hedefler belirleyin ve bunlara sadık kalın. 
                  Hızlı zengin olma hayalleri kurmayın.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-blue-900 mb-4">🧠 Zihinsel Hazırlık</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">🧘</span>
                </div>
                <h5 className="font-medium text-blue-900 mb-1">Sabır</h5>
                <p className="text-sm text-blue-700">Uzun vadeli düşünün, acele etmeyin</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">🎯</span>
                </div>
                <h5 className="font-medium text-blue-900 mb-1">Disiplin</h5>
                <p className="text-sm text-blue-700">Kurallarınıza sadık kalın</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">📊</span>
                </div>
                <h5 className="font-medium text-blue-900 mb-1">Objektiflik</h5>
                <p className="text-sm text-blue-700">Duygusal değil, analitik düşünün</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'tools',
      title: 'Hesaplama Araçları',
      icon: <Calculator className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Pratik Hesaplama Araçları</h3>
            <p className="text-gray-700">
              Bahis yaparken kullanabileceğiniz temel hesaplama formülleri ve araçları:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">💰 Kazanç Hesaplama</h4>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-900">Formül:</p>
                  <p className="font-mono text-sm">Kazanç = Bahis Miktarı × (Oran - 1)</p>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <p className="font-medium text-blue-900">Örnek:</p>
                  <p className="text-sm text-blue-800">100 TL × (2.50 - 1) = 150 TL kazanç</p>
                  <p className="text-sm text-blue-800">Toplam geri dönüş: 250 TL</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Olasılık Hesaplama</h4>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-900">Formül:</p>
                  <p className="font-mono text-sm">Olasılık = 1 / Oran × 100</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="font-medium text-green-900">Örnek:</p>
                  <p className="text-sm text-green-800">2.00 oran = %50 olasılık</p>
                  <p className="text-sm text-green-800">3.00 oran = %33.33 olasılık</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">🎯 Value Bet Hesaplama</h4>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-900">Formül:</p>
                  <p className="font-mono text-sm">Value = (Oran × Gerçek Olasılık) - 1</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <p className="font-medium text-purple-900">Örnek:</p>
                  <p className="text-sm text-purple-800">Oran: 2.20, Gerçek olasılık: %50</p>
                  <p className="text-sm text-purple-800">Value = (2.20 × 0.50) - 1 = 0.10 (%10 value)</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">⚖️ Arbitraj Hesaplama</h4>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-900">Formül:</p>
                  <p className="font-mono text-sm">Arbitraj = (1/Oran1) + (1/Oran2)</p>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                  <p className="font-medium text-orange-900">Örnek:</p>
                  <p className="text-sm text-orange-800">Oran1: 2.10, Oran2: 2.05</p>
                  <p className="text-sm text-orange-800">Arbitraj = 0.476 + 0.488 = 0.964 (&lt;1 = Fırsat!)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">📈 Kelly Criterion Hesaplama</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="bg-gray-50 p-3 rounded mb-3">
                  <p className="font-medium text-gray-900">Formül:</p>
                  <p className="font-mono text-sm">f = (bp - q) / b</p>
                  <p className="text-xs text-gray-600 mt-1">
                    f: Bahis oranı, b: Oran-1, p: Kazanma olasılığı, q: Kaybetme olasılığı
                  </p>
                </div>
              </div>
              <div>
                <div className="bg-indigo-50 p-3 rounded">
                  <p className="font-medium text-indigo-900">Örnek:</p>
                  <p className="text-sm text-indigo-800">Oran: 2.50, Kazanma olasılığı: %45</p>
                  <p className="text-sm text-indigo-800">f = (1.5×0.45 - 0.55) / 1.5 = 0.083</p>
                  <p className="text-sm text-indigo-800">Bankrollun %8.3'ünü bahse yatır</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Önemli Not:</p>
                <p className="text-sm text-yellow-800">
                  Bu hesaplamalar teorik değerlerdir. Gerçek bahislerde her zaman daha konservatif yaklaşın 
                  ve risk yönetimini ön planda tutun.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'risks',
      title: 'Riskler & Uyarılar',
      icon: <AlertTriangle className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-400">
            <h3 className="text-xl font-semibold text-red-900 mb-4">⚠️ Önemli Uyarılar</h3>
            <p className="text-red-800 mb-4">
              Bahis, ciddi finansal kayıplara yol açabilecek riskli bir aktivitedir. 
              Bu riskleri anlamak ve kabul etmek çok önemlidir.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">🚨 Temel Riskler</h4>
              
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h5 className="font-medium text-red-900 mb-2">💸 Finansal Kayıp</h5>
                <p className="text-sm text-red-700">
                  Bahiste yatırdığınız paranın tamamını kaybetme riski her zaman vardır. 
                  Sadece kaybetmeyi göze alabileceğiniz parayla bahis yapın.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h5 className="font-medium text-red-900 mb-2">🎰 Bağımlılık Riski</h5>
                <p className="text-sm text-red-700">
                  Kumar bağımlılığı ciddi bir hastalıktır. Kontrolünüzü kaybettiğinizi 
                  hissettiğinizde profesyonel yardım alın.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h5 className="font-medium text-red-900 mb-2">📉 Psikolojik Etki</h5>
                <p className="text-sm text-red-700">
                  Sürekli kayıplar stres, depresyon ve ilişki sorunlarına yol açabilir. 
                  Mental sağlığınızı korumayı önceleyeyin.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">🛡️ Korunma Yolları</h4>
              
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h5 className="font-medium text-green-900 mb-2">💰 Bütçe Belirleme</h5>
                <p className="text-sm text-green-700">
                  Aylık bahis bütçenizi önceden belirleyin ve bu miktarı asla aşmayın. 
                  Bu para, kaybetseniz bile yaşamınızı etkilemeyecek bir miktar olmalı.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h5 className="font-medium text-green-900 mb-2">⏰ Zaman Limiti</h5>
                <p className="text-sm text-green-700">
                  Günlük/haftalık bahis yapma sürenizi sınırlayın. Bahis yapmak 
                  hayatınızın merkezine dönüşmemeli.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h5 className="font-medium text-green-900 mb-2">👥 Sosyal Destek</h5>
                <p className="text-sm text-green-700">
                  Aileniz ve arkadaşlarınızla bahis alışkanlıklarınız hakkında açık olun. 
                  Onların uyarılarını dikkate alın.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-orange-900 mb-4">🚩 Uyarı İşaretleri</h4>
            <p className="text-orange-800 mb-4">
              Aşağıdaki durumlardan herhangi biri yaşıyorsanız, bahis yapmayı bırakıp profesyonel yardım alın:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="space-y-2 text-sm text-orange-800">
                <li>• Kayıpları gizleme ihtiyacı hissetmek</li>
                <li>• Bahis için borç para almak</li>
                <li>• Bahis yapmadan duramama hissi</li>
                <li>• Kayıpları kovalamak için daha büyük bahisler yapmak</li>
              </ul>
              <ul className="space-y-2 text-sm text-orange-800">
                <li>• İş/okul performansında düşüş</li>
                <li>• İlişkilerde sorunlar yaşamak</li>
                <li>• Bahis hakkında sürekli düşünmek</li>
                <li>• Duygusal durumun bahis sonuçlarına bağlı olması</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-blue-900 mb-4">📞 Yardım Kaynakları</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-blue-800"><strong>Kumar Bağımlıları Derneği:</strong> Ücretsiz danışmanlık ve destek grupları</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-blue-800"><strong>Psikoloji Uzmanları:</strong> Bireysel terapi ve tedavi seçenekleri</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-blue-800"><strong>Bahis Siteleri:</strong> Kendi kendini sınırlama araçları</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 text-white p-6 rounded-lg">
            <h4 className="text-lg font-semibold mb-4">🎯 Unutmayın</h4>
            <p className="text-gray-300">
              Bahis bir eğlence aktivitesi olmalıdır, gelir kaynağı değil. Matematiksel olarak, 
              uzun vadede bahis siteleri her zaman kazanır. Sadece eğlenmek için ve 
              kaybetmeyi göze alabileceğiniz parayla bahis yapın.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Yeni Başlayanlar için Kasamatik Rehberi</h1>
          <p className="text-gray-600">Bahis dünyasına güvenli ve bilinçli bir giriş için kapsamlı rehber</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">Rehber İçeriği</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {section.icon}
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex items-center space-x-3">
                  {sections.find(s => s.id === activeSection)?.icon}
                  <h2 className="text-2xl font-bold text-gray-900">
                    {sections.find(s => s.id === activeSection)?.title}
                  </h2>
                </div>
              </div>
              <div className="p-6">
                {sections.find(s => s.id === activeSection)?.content}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};