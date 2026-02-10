import type { TiffLayer } from './types';

/**
 * Normalize raw TIFF layer data (potentially 16-bit/float) to 8-bit RGBA ImageData.
 */
export function normalizeToImageData(layer: TiffLayer): ImageData {
  const { data, width, height, min, max } = layer;
  const imageData = new ImageData(width, height);
  const pixels = imageData.data;
  const range = max - min || 1;

  for (let i = 0; i < data.length; i++) {
    const val = Math.round(((data[i] - min) / range) * 255);
    const clamped = val < 0 ? 0 : val > 255 ? 255 : val;
    const offset = i * 4;
    pixels[offset] = clamped;
    pixels[offset + 1] = clamped;
    pixels[offset + 2] = clamped;
    pixels[offset + 3] = 255;
  }

  return imageData;
}

/**
 * Apply brightness and contrast adjustment to ImageData.
 * brightness: -100 to +100
 * contrast: -100 to +100
 * Returns a new ImageData.
 */
export function adjustBrightnessContrast(
  src: ImageData,
  brightness: number,
  contrast: number,
): ImageData {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const pixels = out.data;

  // Contrast factor: maps [-100, +100] to [0, ~4]
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const brightnessOffset = brightness * 2.55; // map to [-255, 255]

  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let val = pixels[i + c];
      // Apply contrast (centered at 128)
      val = contrastFactor * (val - 128) + 128;
      // Apply brightness
      val += brightnessOffset;
      pixels[i + c] = val < 0 ? 0 : val > 255 ? 255 : val;
    }
  }

  return out;
}

/**
 * Invert image colors.
 */
export function invertImage(src: ImageData): ImageData {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const pixels = out.data;
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255 - pixels[i];
    pixels[i + 1] = 255 - pixels[i + 1];
    pixels[i + 2] = 255 - pixels[i + 2];
  }
  return out;
}

/**
 * Compute 256-bin histogram from grayscale ImageData (uses R channel).
 */
export function computeHistogram(imageData: ImageData): number[] {
  const histogram = new Array(256).fill(0);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    histogram[pixels[i]]++;
  }
  return histogram;
}

/**
 * Histogram equalization. Returns a new ImageData.
 */
export function equalizeHistogram(src: ImageData): ImageData {
  const histogram = computeHistogram(src);
  const totalPixels = src.width * src.height;

  // Build CDF
  const cdf = new Array(256);
  cdf[0] = histogram[0];
  for (let i = 1; i < 256; i++) {
    cdf[i] = cdf[i - 1] + histogram[i];
  }

  // Find minimum non-zero CDF value
  let cdfMin = 0;
  for (let i = 0; i < 256; i++) {
    if (cdf[i] > 0) { cdfMin = cdf[i]; break; }
  }

  // Build lookup table
  const lut = new Uint8Array(256);
  const denom = totalPixels - cdfMin || 1;
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(((cdf[i] - cdfMin) / denom) * 255);
  }

  // Apply LUT
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const pixels = out.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const mapped = lut[pixels[i]];
    pixels[i] = mapped;
    pixels[i + 1] = mapped;
    pixels[i + 2] = mapped;
  }

  return out;
}

/**
 * Histogram clipping (window/level): remap pixel values from [clipLow, clipHigh] to [0, 255].
 * Values below clipLow become 0, above clipHigh become 255.
 */
export function clipHistogram(src: ImageData, clipLow: number, clipHigh: number): ImageData {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const pixels = out.data;
  const range = clipHigh - clipLow || 1;

  for (let i = 0; i < pixels.length; i += 4) {
    const val = pixels[i];
    let mapped: number;
    if (val <= clipLow) mapped = 0;
    else if (val >= clipHigh) mapped = 255;
    else mapped = Math.round(((val - clipLow) / range) * 255);
    pixels[i] = mapped;
    pixels[i + 1] = mapped;
    pixels[i + 2] = mapped;
  }

  return out;
}

/**
 * Rotate ImageData by 90, 180, or 270 degrees.
 */
export function rotateImage(src: ImageData, degrees: 0 | 90 | 180 | 270): ImageData {
  if (degrees === 0) return src;

  const { width: sw, height: sh, data: srcPixels } = src;

  if (degrees === 180) {
    const out = new ImageData(sw, sh);
    const dst = out.data;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const si = (y * sw + x) * 4;
        const di = ((sh - 1 - y) * sw + (sw - 1 - x)) * 4;
        dst[di] = srcPixels[si];
        dst[di + 1] = srcPixels[si + 1];
        dst[di + 2] = srcPixels[si + 2];
        dst[di + 3] = srcPixels[si + 3];
      }
    }
    return out;
  }

  // 90 or 270: width and height swap
  const dw = sh;
  const dh = sw;
  const out = new ImageData(dw, dh);
  const dst = out.data;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const si = (y * sw + x) * 4;
      let dx: number, dy: number;
      if (degrees === 90) {
        dx = sh - 1 - y;
        dy = x;
      } else { // 270
        dx = y;
        dy = sw - 1 - x;
      }
      const di = (dy * dw + dx) * 4;
      dst[di] = srcPixels[si];
      dst[di + 1] = srcPixels[si + 1];
      dst[di + 2] = srcPixels[si + 2];
      dst[di + 3] = srcPixels[si + 3];
    }
  }

  return out;
}

/**
 * Deinterlace (super resolution normalization).
 * X-Ray TIR scanners produce interlaced images where alternating lines
 * have different brightness levels (one line high, next line low).
 * This algorithm detects the brightness difference between odd and even
 * scan lines, then normalizes them to produce a uniform image.
 *
 * Algorithm:
 * 1. Compute average brightness of even rows and odd rows
 * 2. Compute per-row average brightness
 * 3. Normalize each row's brightness to the global average
 * 4. Apply gentle vertical smoothing to reduce remaining banding
 */
export function deinterlace(src: ImageData): ImageData {
  const { width, height } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), width, height);
  const pixels = out.data;

  // Step 1: Compute per-row average brightness
  const rowAvg = new Float64Array(height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      sum += pixels[(y * width + x) * 4];
    }
    rowAvg[y] = sum / width;
  }

  // Step 2: Compute global average and even/odd averages
  let globalSum = 0;
  for (let y = 0; y < height; y++) globalSum += rowAvg[y];
  const globalAvg = globalSum / height;

  // Step 3: Normalize each row to global average
  for (let y = 0; y < height; y++) {
    const avg = rowAvg[y];
    if (avg < 1) continue; // skip black rows
    const factor = globalAvg / avg;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const val = Math.round(pixels[idx + c] * factor);
        pixels[idx + c] = val < 0 ? 0 : val > 255 ? 255 : val;
      }
    }
  }

  // Step 4: Gentle vertical smoothing (3-tap [0.25, 0.5, 0.25]) to reduce residual banding
  const temp = new Uint8ClampedArray(pixels);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const above = ((y - 1) * width + x) * 4;
      const below = ((y + 1) * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        pixels[idx + c] = Math.round(
          temp[above + c] * 0.25 + temp[idx + c] * 0.5 + temp[below + c] * 0.25,
        );
      }
    }
  }

  return out;
}

/**
 * Sobel edge detection. Returns a new ImageData with edge magnitudes.
 */
export function sobelEdgeDetection(src: ImageData): ImageData {
  const { width, height, data: pixels } = src;
  const out = new ImageData(width, height);
  const outPixels = out.data;

  // Sobel kernels
  const Gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const Gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sumX = 0;
      let sumY = 0;
      let ki = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const val = pixels[idx]; // grayscale, R channel
          sumX += val * Gx[ki];
          sumY += val * Gy[ki];
          ki++;
        }
      }

      const magnitude = Math.min(255, Math.sqrt(sumX * sumX + sumY * sumY));
      const idx = (y * width + x) * 4;
      outPixels[idx] = magnitude;
      outPixels[idx + 1] = magnitude;
      outPixels[idx + 2] = magnitude;
      outPixels[idx + 3] = 255;
    }
  }

  return out;
}

/**
 * Gaussian blur (3x3 kernel) - helper for Canny.
 */
function gaussianBlur3x3(src: ImageData): ImageData {
  const { width, height, data: pixels } = src;
  const out = new ImageData(new Uint8ClampedArray(pixels), width, height);
  const outPixels = out.data;
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kernelSum = 16;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += pixels[((y + ky) * width + (x + kx)) * 4] * kernel[ki++];
        }
      }
      const val = Math.round(sum / kernelSum);
      const idx = (y * width + x) * 4;
      outPixels[idx] = val;
      outPixels[idx + 1] = val;
      outPixels[idx + 2] = val;
    }
  }

  return out;
}

/**
 * Canny edge detection (simplified).
 * Steps: Gaussian blur -> Sobel -> Non-maximum suppression -> Hysteresis thresholding
 */
export function cannyEdgeDetection(
  src: ImageData,
  lowThreshold = 30,
  highThreshold = 80,
): ImageData {
  const { width, height } = src;

  // 1. Gaussian blur
  const blurred = gaussianBlur3x3(src);
  const pixels = blurred.data;

  // 2. Sobel gradients (magnitude + direction)
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);

  const Gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const Gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sumX = 0, sumY = 0, ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const val = pixels[((y + ky) * width + (x + kx)) * 4];
          sumX += val * Gx[ki];
          sumY += val * Gy[ki];
          ki++;
        }
      }
      const idx = y * width + x;
      magnitude[idx] = Math.sqrt(sumX * sumX + sumY * sumY);
      direction[idx] = Math.atan2(sumY, sumX);
    }
  }

  // 3. Non-maximum suppression
  const suppressed = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = ((direction[idx] * 180) / Math.PI + 180) % 180;
      const mag = magnitude[idx];

      let n1 = 0, n2 = 0;
      if (angle < 22.5 || angle >= 157.5) {
        n1 = magnitude[idx - 1];
        n2 = magnitude[idx + 1];
      } else if (angle < 67.5) {
        n1 = magnitude[(y - 1) * width + (x + 1)];
        n2 = magnitude[(y + 1) * width + (x - 1)];
      } else if (angle < 112.5) {
        n1 = magnitude[(y - 1) * width + x];
        n2 = magnitude[(y + 1) * width + x];
      } else {
        n1 = magnitude[(y - 1) * width + (x - 1)];
        n2 = magnitude[(y + 1) * width + (x + 1)];
      }

      suppressed[idx] = (mag >= n1 && mag >= n2) ? mag : 0;
    }
  }

  // 4. Hysteresis thresholding
  const out = new ImageData(width, height);
  const outPixels = out.data;
  const STRONG = 255;
  const WEAK = 75;

  // Mark strong and weak edges
  const edgeMap = new Uint8Array(width * height);
  for (let i = 0; i < suppressed.length; i++) {
    if (suppressed[i] >= highThreshold) edgeMap[i] = STRONG;
    else if (suppressed[i] >= lowThreshold) edgeMap[i] = WEAK;
  }

  // Connect weak edges that touch strong edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (edgeMap[idx] === WEAK) {
        // Check 8-neighbors for strong edge
        let hasStrong = false;
        for (let ky = -1; ky <= 1 && !hasStrong; ky++) {
          for (let kx = -1; kx <= 1 && !hasStrong; kx++) {
            if (edgeMap[(y + ky) * width + (x + kx)] === STRONG) hasStrong = true;
          }
        }
        if (!hasStrong) edgeMap[idx] = 0;
      }
    }
  }

  // Output
  for (let i = 0; i < edgeMap.length; i++) {
    const val = edgeMap[i] > 0 ? 255 : 0;
    const offset = i * 4;
    outPixels[offset] = val;
    outPixels[offset + 1] = val;
    outPixels[offset + 2] = val;
    outPixels[offset + 3] = 255;
  }

  return out;
}
