export interface LandmarkData {
  name: string;
  visualDescription: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface LandmarkDetails {
  history: string;
  visitorInfo: string;
  sources: GroundingSource[];
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  FETCHING_DETAILS = 'FETCHING_DETAILS',
  READY = 'READY',
  ERROR = 'ERROR'
}
