export interface TiffLayer {
  index: number;
  name: string;
  width: number;
  height: number;
  data: Float32Array | Float64Array | Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array;
  bitsPerSample: number;
  samplesPerPixel: number;
  min: number;
  max: number;
}

export interface ParsedTiff {
  layers: TiffLayer[];
  width: number;
  height: number;
  fileSize: number;
}

export interface ViewerState {
  brightness: number;       // -100 to +100
  contrast: number;         // -100 to +100
  histogramEqualized: boolean;
  edgeDetection: 'none' | 'sobel' | 'canny';
  activeLayer: number;
  invert: boolean;
  rotation: 0 | 90 | 180 | 270;
  clipLow: number;          // histogram left clip 0-255
  clipHigh: number;         // histogram right clip 0-255
  deinterlace: boolean;
}

export const DEFAULT_VIEWER_STATE: ViewerState = {
  brightness: 0,
  contrast: 0,
  histogramEqualized: false,
  edgeDetection: 'none',
  activeLayer: 0,
  invert: false,
  rotation: 0,
  clipLow: 0,
  clipHigh: 255,
  deinterlace: false,
};
