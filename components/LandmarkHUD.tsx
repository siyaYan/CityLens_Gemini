'use client';

import React, { useEffect, useState } from 'react';
import { LoaderCircle, MapPin, RefreshCw } from 'lucide-react';
import { getLandmarkDetails } from '@/services/geminiService_free';
import { LandmarkData, TourDetails } from '../types';
import InteractiveGlobe, { GlobeSelection } from './InteractiveGlobe';

interface LandmarkHUDProps {
  image: string;
  landmarkData: LandmarkData;
  onReset: () => void;
}

const LandmarkHUD: React.FC<LandmarkHUDProps> = ({ image, landmarkData, onReset }) => {
  const [details, setDetails] = useState<TourDetails | null>(null);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [activeMarker, setActiveMarker] = useState<GlobeSelection>({
    id: 'current-focus',
    name: landmarkData.name,
    region: `${landmarkData.location.city}, ${landmarkData.location.country}`,
    summary: landmarkData.briefIntro,
    location: landmarkData.location,
    emphasis: 'current',
  });

  useEffect(() => {
    setActiveMarker({
      id: 'current-focus',
      name: landmarkData.name,
      region: `${landmarkData.location.city}, ${landmarkData.location.country}`,
      summary: landmarkData.briefIntro,
      location: landmarkData.location,
      emphasis: 'current',
    });
    setDetails(null);
    setDetailsFor(null);
    setDetailsOpen(false);
    setDetailsError(null);
  }, [landmarkData]);

  const handleGetDetails = async () => {
    if (detailsFor === activeMarker.name && details) {
      setDetailsOpen(current => !current);
      return;
    }

    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);

    try {
      const response = await getLandmarkDetails(activeMarker.name);
      setDetails(response);
      setDetailsFor(activeMarker.name);
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : 'Unable to load tour details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img
        src={`data:image/jpeg;base64,${image}`}
        alt={landmarkData.name}
        className="absolute inset-0 h-full w-full object-cover opacity-40 blur-xl saturate-[0.72] brightness-[0.38]"
      />
      <InteractiveGlobe
        location={landmarkData.location}
        label={landmarkData.name}
        summary={landmarkData.briefIntro}
        onActiveMarkerChange={setActiveMarker}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,12,0.94)_0%,rgba(2,7,12,0.8)_26%,rgba(2,7,12,0.28)_52%,rgba(2,7,12,0.46)_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-[36%] hidden w-px bg-gradient-to-b from-transparent via-cyan-200/18 to-transparent lg:block" />

      <div className="relative z-10 flex min-h-screen flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12 lg:py-10">
        <div className="pointer-events-auto flex items-start justify-between">
          <button
            onClick={onReset}
            className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            <RefreshCw size={16} />
            New image
          </button>
        </div>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,31rem)_1fr]">
          <section className="max-w-xl pt-12 lg:pt-0">
            <p className="text-[11px] uppercase tracking-[0.36em] text-cyan-100/62">
              {activeMarker.emphasis === 'current' ? 'Detected from your image' : 'Selected world landmark'}
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[0.92] text-white sm:text-6xl lg:text-7xl">
              {activeMarker.name}
            </h1>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-200 backdrop-blur-xl">
              <MapPin size={16} className="text-cyan-200" />
              {activeMarker.region}
            </div>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-300 sm:text-lg">
              {activeMarker.summary}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] px-5 py-4 backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-[0.32em] text-cyan-100/60">World position</p>
                <p className="mt-3 text-sm text-white">{activeMarker.region}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {activeMarker.location.latitude.toFixed(2)}°, {activeMarker.location.longitude.toFixed(2)}°
                </p>
              </div>

              <button
                type="button"
                onClick={handleGetDetails}
                className="glass-panel inline-flex items-center gap-2 self-start rounded-full px-5 py-3 text-sm text-white transition hover:bg-white/10"
              >
                {detailsLoading ? <LoaderCircle size={16} className="animate-spin" /> : null}
                Get tour details
              </button>
            </div>

            {detailsOpen && (
              <div className="mt-6 max-w-lg rounded-[28px] border border-white/10 bg-slate-950/42 px-5 py-5 backdrop-blur-xl">
                {detailsError ? (
                  <p className="text-sm leading-7 text-rose-200">{detailsError}</p>
                ) : details ? (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.32em] text-cyan-100/60">Tour overview</p>
                      <p className="mt-3 text-sm leading-7 text-slate-200">{details.overview}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.32em] text-cyan-100/60">Highlights</p>
                      <div className="mt-3 space-y-2">
                        {details.highlights.map(item => (
                          <p key={item} className="text-sm leading-7 text-slate-200">
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.32em] text-cyan-100/60">Visit tips</p>
                      <div className="mt-3 space-y-2">
                        {details.visitTips.map(item => (
                          <p key={item} className="text-sm leading-7 text-slate-200">
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-slate-300">Preparing the tour details for this landmark.</p>
                )}
              </div>
            )}
          </section>

          <div className="hidden lg:block" />
        </div>
      </div>
    </div>
  );
};

export default LandmarkHUD;
