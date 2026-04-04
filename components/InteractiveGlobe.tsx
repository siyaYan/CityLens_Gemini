'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LandmarkLocation } from '@/types';
import { worldLandmarks, WorldLandmarkMarker } from '@/data/worldLandmarks';

interface InteractiveGlobeProps {
  location: LandmarkLocation;
  label: string;
  summary: string;
  onActiveMarkerChange?: (marker: GlobeSelection) => void;
}

interface Rotation {
  longitude: number;
  latitude: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
}

interface GlobeMarker extends WorldLandmarkMarker {
  emphasis: 'current' | 'global';
}

export interface GlobeSelection {
  id: string;
  name: string;
  region: string;
  summary: string;
  location: LandmarkLocation;
  emphasis: 'current' | 'global';
}

const SIZE = 920;
const CENTER = SIZE / 2;
const BASE_RADIUS = 258;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toRadians = (value: number) => (value * Math.PI) / 180;
const wrapLongitudeDelta = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;

const projectPoint = (latitude: number, longitude: number, rotation: Rotation, radius: number): ProjectedPoint => {
  const lat = toRadians(latitude);
  const lon = toRadians(longitude - rotation.longitude);
  const rotLat = toRadians(rotation.latitude);

  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.cos(rotLat) * Math.sin(lat) - Math.sin(rotLat) * Math.cos(lat) * Math.cos(lon);
  const z = Math.sin(rotLat) * Math.sin(lat) + Math.cos(rotLat) * Math.cos(lat) * Math.cos(lon);

  return {
    x: CENTER + x * radius,
    y: CENTER - y * radius,
    z,
  };
};

const buildPathSegments = (points: ProjectedPoint[]) => {
  const segments: string[] = [];
  let currentSegment: ProjectedPoint[] = [];

  for (const point of points) {
    if (point.z > 0) {
      currentSegment.push(point);
      continue;
    }

    if (currentSegment.length > 1) {
      segments.push(
        currentSegment
          .map((entry, index) => `${index === 0 ? 'M' : 'L'} ${entry.x.toFixed(2)} ${entry.y.toFixed(2)}`)
          .join(' ')
      );
    }

    currentSegment = [];
  }

  if (currentSegment.length > 1) {
    segments.push(
      currentSegment
        .map((entry, index) => `${index === 0 ? 'M' : 'L'} ${entry.x.toFixed(2)} ${entry.y.toFixed(2)}`)
        .join(' ')
    );
  }

  return segments;
};

const buildMeridian = (longitude: number, rotation: Rotation, radius: number) => {
  const samples: ProjectedPoint[] = [];
  for (let latitude = -90; latitude <= 90; latitude += 4) {
    samples.push(projectPoint(latitude, longitude, rotation, radius));
  }
  return buildPathSegments(samples);
};

const buildParallel = (latitude: number, rotation: Rotation, radius: number) => {
  const samples: ProjectedPoint[] = [];
  for (let longitude = -180; longitude <= 180; longitude += 4) {
    samples.push(projectPoint(latitude, longitude, rotation, radius));
  }
  return buildPathSegments(samples);
};

const InteractiveGlobe: React.FC<InteractiveGlobeProps> = ({ location, label, summary, onActiveMarkerChange }) => {
  const initialRotation = {
    longitude: location.longitude,
    latitude: clamp(location.latitude * 0.35, -48, 48),
  };
  const [rotation, setRotation] = useState<Rotation>(initialRotation);
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState('current-focus');

  const targetRotationRef = useRef<Rotation | null>(initialRotation);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    longitude: number;
    latitude: number;
  } | null>(null);

  const markers: GlobeMarker[] = [
    {
      id: 'current-focus',
      name: label,
      region: `${location.city}, ${location.country}`,
      icon: '◎',
      summary,
      location,
      emphasis: 'current',
    },
    ...worldLandmarks
      .filter(entry => entry.name.toLowerCase() !== label.toLowerCase())
      .map(entry => ({ ...entry, emphasis: 'global' as const })),
  ];

  const activeMarkerId = hoveredMarkerId || selectedMarkerId;
  const activeMarker = markers.find(marker => marker.id === activeMarkerId) || markers[0];
  const radius = BASE_RADIUS;

  const focusMarker = (marker: GlobeMarker) => {
    setSelectedMarkerId(marker.id);
    targetRotationRef.current = {
      longitude: marker.location.longitude,
      latitude: clamp(marker.location.latitude * 0.35, -55, 55),
    };
  };

  useEffect(() => {
    const next = {
      longitude: location.longitude,
      latitude: clamp(location.latitude * 0.35, -48, 48),
    };
    setRotation(next);
    targetRotationRef.current = next;
    setSelectedMarkerId('current-focus');
    setHoveredMarkerId(null);
  }, [label, summary, location.latitude, location.longitude, location.city, location.country]);

  useEffect(() => {
    onActiveMarkerChange?.({
      id: activeMarker.id,
      name: activeMarker.name,
      region: activeMarker.region,
      summary: activeMarker.summary,
      location: activeMarker.location,
      emphasis: activeMarker.emphasis,
    });
  }, [activeMarker, onActiveMarkerChange]);

  useEffect(() => {
    let frameId = 0;
    let previousTime = 0;

    const animate = (time: number) => {
      const delta = previousTime ? time - previousTime : 16;
      previousTime = time;

      setRotation(prev => {
        const target = targetRotationRef.current;

        if (target) {
          const longitudeDelta = wrapLongitudeDelta(target.longitude - prev.longitude);
          const latitudeDelta = target.latitude - prev.latitude;
          const next = {
            longitude: prev.longitude + longitudeDelta * 0.085,
            latitude: prev.latitude + latitudeDelta * 0.085,
          };

          if (Math.abs(longitudeDelta) < 0.2 && Math.abs(latitudeDelta) < 0.2) {
            targetRotationRef.current = null;
            return target;
          }

          return next;
        }

        if (autoRotate && !dragRef.current) {
          return {
            longitude: prev.longitude + delta * 0.0045,
            latitude: prev.latitude,
          };
        }

        return prev;
      });

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [autoRotate]);

  const meridianPaths: string[] = [];
  for (let longitude = -180; longitude < 180; longitude += 20) {
    meridianPaths.push(...buildMeridian(longitude, rotation, radius));
  }

  const parallelPaths: string[] = [];
  for (let latitude = -70; latitude <= 70; latitude += 20) {
    parallelPaths.push(...buildParallel(latitude, rotation, radius));
  }

  const projectedMarkers = markers
    .map(marker => ({
      marker,
      point: projectPoint(marker.location.latitude, marker.location.longitude, rotation, radius),
    }))
    .filter(entry => entry.point.z > 0)
    .sort((left, right) => left.point.z - right.point.z);

  const activeProjectedMarker = projectedMarkers.find(entry => entry.marker.id === activeMarker.id);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,222,255,0.12),transparent_32%),radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.05),transparent_18%),linear-gradient(180deg,rgba(3,9,13,0.1),rgba(3,9,13,0.42))]" />
      <div className="absolute left-1/2 top-1/2 h-[64rem] w-[64rem] -translate-x-[42%] -translate-y-[48%] md:-translate-x-[34%]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={event => {
            dragRef.current = {
              startX: event.clientX,
              startY: event.clientY,
              longitude: rotation.longitude,
              latitude: rotation.latitude,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            if (!dragRef.current) {
              return;
            }

            targetRotationRef.current = null;
            const deltaX = event.clientX - dragRef.current.startX;
            const deltaY = event.clientY - dragRef.current.startY;

            setRotation({
              longitude: dragRef.current.longitude - deltaX * 0.3,
              latitude: clamp(dragRef.current.latitude + deltaY * 0.22, -75, 75),
            });
          }}
          onPointerUp={event => {
            dragRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerLeave={event => {
            if (dragRef.current && event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            dragRef.current = null;
          }}
        >
          <defs>
            <radialGradient id="globeFill" cx="38%" cy="30%">
              <stop offset="0%" stopColor="rgba(164,244,255,0.42)" />
              <stop offset="42%" stopColor="rgba(40,129,177,0.3)" />
              <stop offset="100%" stopColor="rgba(6,20,28,0.02)" />
            </radialGradient>
            <radialGradient id="outerGlow" cx="50%" cy="50%">
              <stop offset="55%" stopColor="rgba(52,188,255,0)" />
              <stop offset="100%" stopColor="rgba(52,188,255,0.36)" />
            </radialGradient>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="12" />
            </filter>
          </defs>

          <circle cx={CENTER} cy={CENTER} r={radius + 96} fill="url(#outerGlow)" opacity="0.8" />
          <circle cx={CENTER} cy={CENTER} r={radius} fill="url(#globeFill)" stroke="rgba(160,232,255,0.32)" strokeWidth="1.6" />
          <ellipse
            cx={CENTER}
            cy={CENTER}
            rx={radius}
            ry={radius * 0.98}
            fill="none"
            stroke="rgba(105, 228, 255, 0.10)"
            strokeWidth="30"
            filter="url(#softGlow)"
          />
          <ellipse
            cx={CENTER}
            cy={CENTER}
            rx={radius + 34}
            ry={radius * 1.02}
            fill="none"
            stroke="rgba(133, 235, 255, 0.14)"
            strokeWidth="1.2"
            strokeDasharray="10 12"
          />

          {parallelPaths.map(path => (
            <path key={`parallel-${path}`} d={path} fill="none" stroke="rgba(132, 223, 255, 0.16)" strokeWidth="1.05" />
          ))}

          {meridianPaths.map(path => (
            <path key={`meridian-${path}`} d={path} fill="none" stroke="rgba(132, 223, 255, 0.12)" strokeWidth="1.05" />
          ))}

          {projectedMarkers.map(({ marker, point }) => {
            const isCurrent = marker.emphasis === 'current';
            const isActive = activeMarker.id === marker.id;

            return (
              <g
                key={marker.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredMarkerId(marker.id)}
                onMouseLeave={() => setHoveredMarkerId(current => (current === marker.id ? null : current))}
                onClick={event => {
                  event.stopPropagation();
                  focusMarker(marker);
                }}
              >
                {isActive && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isCurrent ? 34 : 24}
                    fill={isCurrent ? 'rgba(76, 227, 255, 0.22)' : 'rgba(120, 200, 255, 0.18)'}
                    className="marker-pulse"
                  />
                )}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isCurrent ? 14 : isActive ? 12 : 10}
                  fill={isCurrent ? 'rgba(8, 17, 23, 0.86)' : 'rgba(8, 17, 23, 0.78)'}
                  stroke={isCurrent ? 'rgba(141,243,255,0.65)' : 'rgba(214,243,255,0.34)'}
                  strokeWidth="1.3"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isCurrent ? 6 : isActive ? 5.5 : 4.5}
                  fill={isCurrent ? '#8df3ff' : '#f5fbff'}
                  stroke={isCurrent ? 'rgba(141,243,255,0.95)' : 'rgba(141,243,255,0.75)'}
                  strokeWidth={isCurrent ? '1.8' : '1.25'}
                />
                {!isCurrent && (
                  <text x={point.x} y={point.y + 4} textAnchor="middle" fill="#dff8ff" fontSize="12" fontWeight="700">
                    {marker.icon}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {activeProjectedMarker && (
        <div
          className="pointer-events-none absolute z-10 hidden md:block"
          style={{
            left: `${(activeProjectedMarker.point.x / SIZE) * 100}%`,
            top: `${(activeProjectedMarker.point.y / SIZE) * 100}%`,
            transform: 'translate(24px, -112%)',
          }}
        >
          <div className="max-w-[18rem] rounded-[22px] border border-cyan-200/14 bg-slate-950/58 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-[0.34em] text-cyan-100/60">
              {activeMarker.emphasis === 'current' ? 'Detected landmark' : 'World landmark'}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{activeMarker.name}</p>
            <p className="mt-1 text-xs text-slate-300">{activeMarker.region}</p>
            <p className="mt-2 text-xs leading-6 text-slate-300">{activeMarker.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveGlobe;
