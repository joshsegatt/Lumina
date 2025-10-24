
import React from 'react';
import type { Feature } from '../types';

interface FeatureCardProps {
  feature: Feature;
  onSelect: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-violet-400 dark:hover:border-violet-500/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 text-left flex flex-col items-start group"
    >
      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 mb-4 group-hover:border-violet-400 dark:group-hover:border-violet-500 transition-colors">
        <feature.icon className="w-6 h-6 text-violet-500 dark:text-violet-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{feature.title}</h3>
      <p className="text-slate-600 dark:text-slate-400 flex-grow">{feature.description}</p>
    </button>
  );
};