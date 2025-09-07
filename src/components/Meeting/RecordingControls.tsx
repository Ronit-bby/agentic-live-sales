import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-4">
      <motion.button
        onClick={isRecording ? onStopRecording : onStartRecording}
        disabled={disabled}
        className={`
          relative flex items-center justify-center w-16 h-16 rounded-full font-semibold
          transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
          ${isRecording
            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/25'
            : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/25'
          }
        `}
        whileHover={disabled ? undefined : { scale: 1.05 }}
        whileTap={disabled ? undefined : { scale: 0.95 }}
      >
        {isRecording ? (
          <>
            <Square className="w-8 h-8 text-white" />
            <motion.div
              className="absolute inset-0 rounded-full border-3 border-red-400/60"
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </>
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </motion.button>

      <div className="text-slate-200">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <>
              <motion.div
                className="w-3 h-3 bg-red-500 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="font-semibold">Recording</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-slate-500 rounded-full" />
              <span className="text-slate-400">Ready to record</span>
            </>
          )}
        </div>
        <div className="text-sm text-slate-400 mt-1">
          {isRecording ? 'Speak clearly - AI is listening' : 'Click to start live transcription'}
        </div>
        {!isRecording && (
          <div className="text-xs text-blue-400 mt-1">
            💡 Enable microphone access when prompted
          </div>
        )}
      </div>
    </div>
  );
};