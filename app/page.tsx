'use client';

import { useState } from 'react';
import CameraView from '@/components/CameraView';
import LandmarkHUD from '@/components/LandmarkHUD';
import { identifyLandmark } from '@/services/geminiService_free';
import { AppState, LandmarkData } from '@/types';

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [landmarkData, setLandmarkData] = useState<LandmarkData | null>(null);

  const handleCapture = async (base64Image: string) => {
    setCapturedImage(base64Image);
    setLandmarkData(null);
    setAppState(AppState.ANALYZING);

    try {
      const data = await identifyLandmark(base64Image);
      setLandmarkData(data);
      setAppState(AppState.IDENTIFIED);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      alert('Could not identify the image. Please try again.');
      handleReset();
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setLandmarkData(null);
    setAppState(AppState.IDLE);
  };

  return (
    <main className="app-shell w-full text-white">
      {appState === AppState.IDLE && <CameraView onCapture={handleCapture} />}

      {appState === AppState.ANALYZING && capturedImage && (
        <section className="relative flex min-h-screen items-center justify-center px-6 py-10">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={`data:image/jpeg;base64,${capturedImage}`}
              className="h-full w-full scale-105 object-cover opacity-55 blur-[1px]"
              alt="Analyzing uploaded landmark"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(70,187,255,0.12),transparent_30%),linear-gradient(180deg,rgba(3,8,13,0.1),rgba(2,6,10,0.62))]" />
          </div>
          <div className="scan-line" />
          <div className="glass-panel glow-outline relative z-10 w-full max-w-xl rounded-[32px] px-8 py-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/10">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-200" />
            </div>
            <p className="mb-3 text-sm uppercase tracking-[0.45em] text-cyan-200/60">Computer Vision Pass</p>
            <h2 className="font-display text-4xl font-semibold text-white sm:text-5xl">
              Reading your landmark
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-300">
              AI is identifying the place in your photo, estimating its world position, and preparing the location
              highlight for the globe.
            </p>
            <div className="mt-8 grid gap-3 text-left text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Scene recognition</div>
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-cyan-100">
                Geo highlight
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">World map ready</div>
            </div>
          </div>
        </section>
      )}

      {appState === AppState.IDENTIFIED && capturedImage && landmarkData && (
        <LandmarkHUD image={capturedImage} landmarkData={landmarkData} onReset={handleReset} />
      )}
    </main>
  );
}
