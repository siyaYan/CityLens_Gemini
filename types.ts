export interface LandmarkLocation {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

export interface LandmarkData {
  name: string;
  briefIntro: string;
  location: LandmarkLocation;
}

export interface TourDetails {
  overview: string;
  highlights: string[];
  visitTips: string[];
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  IDENTIFIED = 'IDENTIFIED',
  ERROR = 'ERROR'
}
