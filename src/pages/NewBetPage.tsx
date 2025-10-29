
// src/pages/NewBetPage.tsx
import { useState } from 'react';
import BetForm from '../components/new_bet/BetForm';
import CouponReader from '../components/new_bet/CouponReader';
import { Bet } from '../types';

export type BetFormData = Omit<Bet, 'id' | 'created_at' | 'user_id' | 'status' | 'win_amount' | 'profit_loss' | 'special_odd_id' | 'special_odds'>;

const NewBetPage = () => {
  const [formData, setFormData] = useState<BetFormData>({
    platform: '',
    bet_type: 'Spor Bahis',
    description: '',
    bet_amount: 0,
    odds: 1.0,
    date: new Date().toISOString().split('T')[0],
  });

  const handleAnalysisComplete = (analysisResult: any) => {
    let newDescription = formData.description;
    if (analysisResult.matches && Array.isArray(analysisResult.matches) && analysisResult.matches.length > 0) {
      newDescription = analysisResult.matches
        .map((match: any) => `${match.matchName} (${match.bets.join(', ')})`)
        .join(' / ');
    }
    
    setFormData(prev => ({
      ...prev,
      description: newDescription,
      bet_amount: analysisResult.betAmount || prev.bet_amount,
      odds: analysisResult.odds || prev.odds,
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Yeni Bahis Kaydı</h1>
        <p className="mt-1 text-gray-400">Yeni bahislerinizi veya kasa hareketlerinizi kaydedin.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <BetForm formData={formData} setFormData={setFormData} />
        </div>
        <div className="lg:col-span-2">
          <CouponReader onAnalysisComplete={handleAnalysisComplete} />
        </div>
      </div>
    </div>
  );
};

export default NewBetPage;
