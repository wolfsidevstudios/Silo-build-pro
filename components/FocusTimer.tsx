
import React, { useState, useEffect, useCallback, useRef } from 'react';

const FOCUS_TIME = 25 * 60; // 25 minutes

const playCompletionSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1);
};


export const FocusTimer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
    const [isRunning, setIsRunning] = useState(false);
    const originalTitleRef = useRef(document.title);

    useEffect(() => {
        if (!isOpen) {
            // Reset timer and stop it when modal is closed
            setIsRunning(false);
            setTimeLeft(FOCUS_TIME);
            return;
        }

        // Fix: Use ReturnType<typeof setInterval> for browser compatibility instead of NodeJS.Timeout
        let interval: ReturnType<typeof setInterval> | null = null;
        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isRunning) {
            playCompletionSound();
            setIsRunning(false);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, timeLeft, isOpen]);

    useEffect(() => {
        if (isRunning && isOpen) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} - Focus`;
        } else {
            document.title = originalTitleRef.current;
        }
        
        return () => {
            document.title = originalTitleRef.current;
        };
    }, [timeLeft, isRunning, isOpen]);


    const handleStartPause = () => {
        if (timeLeft === 0) setTimeLeft(FOCUS_TIME);
        setIsRunning(!isRunning);
    };

    const handleReset = () => {
        setIsRunning(false);
        setTimeLeft(FOCUS_TIME);
    };
    
    if (!isOpen) return null;

    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const seconds = String(timeLeft % 60).padStart(2, '0');
    const progress = (timeLeft / FOCUS_TIME) * 100;

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-zinc-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm relative text-white flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <h2 className="text-xl font-bold mb-6">Focus Timer</h2>

                <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="absolute w-full h-full transform -rotate-90">
                        <circle cx="96" cy="96" r={radius} strokeWidth="8" stroke="#3f3f46" fill="transparent" />
                        <circle
                            cx="96"
                            cy="96"
                            r={radius}
                            strokeWidth="8"
                            stroke="currentColor"
                            className="text-blue-500"
                            fill="transparent"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                        />
                    </svg>
                    <span className="text-5xl font-mono font-semibold z-10">{minutes}:{seconds}</span>
                </div>
                
                <p className="text-gray-400 mt-4 text-sm">
                    {timeLeft === 0 ? "Time's up!" : (isRunning ? "Focus session in progress..." : "Ready to focus?")}
                </p>

                <div className="flex items-center space-x-4 mt-8">
                    <button onClick={handleReset} className="w-24 py-2 bg-zinc-800 rounded-full font-semibold hover:bg-zinc-700 transition-colors">
                        Reset
                    </button>
                    <button 
                        onClick={handleStartPause}
                        className={`w-32 py-2 rounded-full font-semibold transition-colors ${isRunning ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                    >
                        {isRunning ? 'Pause' : (timeLeft > 0 && timeLeft < FOCUS_TIME ? 'Resume' : 'Start')}
                    </button>
                </div>
            </div>
        </div>
    );
};
