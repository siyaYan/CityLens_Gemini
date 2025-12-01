'use client';

import { useState } from 'react';
import CameraView from '@/components/CameraView';
import LandmarkHUD from '@/components/LandmarkHUD';
import { identifyLandmark, getLandmarkDetails } from '@/services/geminiService_free';
import { AppState, LandmarkData, LandmarkDetails } from '@/types';

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [landmarkData, setLandmarkData] = useState<LandmarkData | null>(null);
  const [details, setDetails] = useState<LandmarkDetails | null>(null);

  const handleCapture = async (base64Image: string) => {
    setCapturedImage(base64Image);
    setAppState(AppState.ANALYZING);

    try {
      const data = await identifyLandmark(base64Image);
      setLandmarkData(data);
      setAppState(AppState.FETCHING_DETAILS);

      const detailsData = await getLandmarkDetails(data.name);
      setDetails(detailsData);
      setAppState(AppState.READY);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      if (landmarkData) {
        setAppState(AppState.READY);
      } else {
        alert('Could not identify the image. Please try again.');
        handleReset();
      }
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setLandmarkData(null);
    setDetails(null);
    setAppState(AppState.IDLE);
  };

  return (
    <div className="w-full h-screen bg-slate-900 text-white overflow-hidden flex flex-col">
      {appState === AppState.IDLE && <CameraView onCapture={handleCapture} />}

      {(appState === AppState.ANALYZING || appState === AppState.ERROR) && capturedImage && (
        <div className="relative h-full w-full flex items-center justify-center bg-black">
          <img
            src={`data:image/jpeg;base64,${capturedImage}`}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            alt="Analyzing"
          />
          <div className="scan-line" />
          <div className="z-10 text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500" />
            <h2 className="text-2xl font-display font-bold text-sky-400 tracking-widest animate-pulse">
              ANALYZING SCENE
            </h2>
            <p className="text-sky-200/70 font-mono text-sm">Identifying landmarks via satellite uplink...</p>
          </div>
        </div>
      )}

      {(appState === AppState.FETCHING_DETAILS || appState === AppState.READY) &&
        capturedImage &&
        landmarkData && (
          <LandmarkHUD
            image={capturedImage}
            landmarkData={landmarkData}
            details={details}
            onReset={handleReset}
            appState={appState}
          />
        )}
    </div>
  );
}
