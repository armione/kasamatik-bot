
// src/components/sponsors/SponsorCard.tsx
import React from 'react';
import { Sponsor } from '../../types';

interface SponsorCardProps {
  sponsor: Sponsor;
}

const SponsorCard: React.FC<SponsorCardProps> = ({ sponsor }) => {
  return (
    <a 
      href={sponsor.target_url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="sponsor-card glass-card rounded-2xl block p-4 transition-transform duration-300 hover:-translate-y-2"
    >
      <div className="h-40 flex items-center justify-center rounded-xl overflow-hidden mb-4 bg-black bg-opacity-20">
        <img src={sponsor.logo_url} alt={`${sponsor.name} Logosu`} className="max-h-full max-w-full object-contain p-2" />
      </div>
      <h4 className="font-bold text-center text-lg text-white">{sponsor.name}</h4>
    </a>
  );
};

export default SponsorCard;
