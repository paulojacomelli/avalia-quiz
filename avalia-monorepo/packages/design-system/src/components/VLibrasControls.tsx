import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export interface VLibrasControlsHandle {
  setIsPlaying: (playing: boolean) => void;
  setIsPaused: (paused: boolean) => void;
}

interface VLibrasControlsProps {
  onPlay: () => void;
  onPause: () => void;
  onRepeat: () => void;
  disabled?: boolean;
}

const VLibrasControls = forwardRef<VLibrasControlsHandle, VLibrasControlsProps>(
  ({ onPlay, onPause, onRepeat, disabled = false }, ref) => {
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [isPaused, setIsPaused] = React.useState(false);

    useImperativeHandle(ref, () => ({
      setIsPlaying,
      setIsPaused,
    }), []);

    const handlePlay = () => {
      setIsPlaying(true);
      setIsPaused(false);
      onPlay();
    };

    const handlePause = () => {
      setIsPaused(true);
      setIsPlaying(false);
      onPause();
    };

    const handleRepeat = () => {
      setIsPlaying(true);
      setIsPaused(false);
      onRepeat();
    };

    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        {/* Play Button */}
        <button
          onClick={handlePlay}
          disabled={disabled || isPlaying}
          className={`p-4 rounded-full transition-all ${
            isPlaying
              ? 'bg-jw-blue/30 text-jw-blue'
              : 'bg-jw-blue/10 text-jw-blue hover:bg-jw-blue/20'
          } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
          title="Reproduzir"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        {/* Pause Button */}
        <button
          onClick={handlePause}
          disabled={disabled || !isPlaying}
          className={`p-4 rounded-full transition-all ${
            isPaused
              ? 'bg-jw-blue/30 text-jw-blue'
              : 'bg-jw-blue/10 text-jw-blue hover:bg-jw-blue/20'
          } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
          title="Pausar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        </button>

        {/* Repeat Button */}
        <button
          onClick={handleRepeat}
          disabled={disabled}
          className="p-4 rounded-full transition-all bg-jw-blue/10 text-jw-blue hover:bg-jw-blue/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          title="Repetir"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.047.662M19.5 12a48.694 48.694 0 01-3.818 9.26m-2.318-9.26a48.694 48.694 0 00-5.512-9.26m7.25 0c1.295-.046 2.573-.1 3.815-.12a4.006 4.006 0 00-4-4.999m0 0c-1.312 0-2.605.054-3.878.158a4 4 0 00-3.8 3.801m15.378 5.856a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    );
  }
);

VLibrasControls.displayName = 'VLibrasControls';

export default VLibrasControls;
