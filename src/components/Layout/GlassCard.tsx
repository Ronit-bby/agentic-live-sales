import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  onClick,
  hover = false 
}) => {
  return (
    <motion.div
      className={`
        backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl
        shadow-xl shadow-black/10
        ${hover ? 'hover:bg-white/20 transition-all duration-300' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      whileHover={hover ? { scale: 1.02, y: -4 } : undefined}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};