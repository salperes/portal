import { fromArrayBuffer } from 'geotiff';
import type { TiffLayer, ParsedTiff } from './types';

export async function parseTiff(buffer: ArrayBuffer): Promise<ParsedTiff> {
  const tiff = await fromArrayBuffer(buffer);
  const imageCount = await tiff.getImageCount();
  const layers: TiffLayer[] = [];

  for (let i = 0; i < imageCount; i++) {
    const image = await tiff.getImage(i);
    const width = image.getWidth();
    const height = image.getHeight();
    const bitsPerSample = image.getBitsPerSample();
    const samplesPerPixel = image.getSamplesPerPixel();
    const rasters = await image.readRasters();

    // Each raster band becomes a separate layer
    const bandCount = rasters.length;
    for (let band = 0; band < bandCount; band++) {
      const bandData = rasters[band] as TiffLayer['data'];
      let min = Infinity;
      let max = -Infinity;
      for (let j = 0; j < bandData.length; j++) {
        const v = bandData[j];
        if (v < min) min = v;
        if (v > max) max = v;
      }

      const name = imageCount > 1 || bandCount > 1
        ? `Image ${i + 1}${bandCount > 1 ? ` - Band ${band + 1}` : ''}`
        : 'Image';

      layers.push({
        index: layers.length,
        name,
        width,
        height,
        data: bandData,
        bitsPerSample: bitsPerSample[band] ?? bitsPerSample[0],
        samplesPerPixel,
        min,
        max,
      });
    }
  }

  return {
    layers,
    width: layers[0]?.width ?? 0,
    height: layers[0]?.height ?? 0,
    fileSize: buffer.byteLength,
  };
}
