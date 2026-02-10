/**
 * Canvas 2D renderer with zoom/pan support.
 * Uses an offscreen canvas for the processed image and draws it
 * to the visible canvas with a transform matrix for zoom/pan.
 */
export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offCanvas: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private currentImage: ImageData | null = null;

  private _zoom = 1;
  private _panX = 0;
  private _panY = 0;
  private _imageWidth = 0;
  private _imageHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.offCanvas = document.createElement('canvas');
    const offCtx = this.offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx) throw new Error('Offscreen Canvas 2D context not available');
    this.offCtx = offCtx;
  }

  get zoom() { return this._zoom; }
  get panX() { return this._panX; }
  get panY() { return this._panY; }
  get imageWidth() { return this._imageWidth; }
  get imageHeight() { return this._imageHeight; }

  /**
   * Set processed image data on the offscreen canvas.
   */
  setImage(imageData: ImageData): void {
    this._imageWidth = imageData.width;
    this._imageHeight = imageData.height;
    this.offCanvas.width = imageData.width;
    this.offCanvas.height = imageData.height;
    this.offCtx.putImageData(imageData, 0, 0);
    this.currentImage = imageData;
  }

  /**
   * Draw the offscreen canvas onto the visible canvas with current transform.
   */
  draw(): void {
    const { canvas, ctx, offCanvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    // Clear with dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Apply zoom/pan transform
    ctx.translate(this._panX, this._panY);
    ctx.scale(this._zoom, this._zoom);

    // Nearest-neighbor for sharp pixels when zoomed in
    ctx.imageSmoothingEnabled = this._zoom < 2;

    ctx.drawImage(offCanvas, 0, 0);
    ctx.restore();
  }

  /**
   * Set image + draw in one call.
   */
  render(imageData: ImageData): void {
    this.setImage(imageData);
    this.draw();
  }

  /**
   * Update transform and redraw (no re-processing needed).
   */
  setTransform(zoom: number, panX: number, panY: number): void {
    this._zoom = zoom;
    this._panX = panX;
    this._panY = panY;
    if (this.currentImage) this.draw();
  }

  /**
   * Fit image to canvas viewport with padding.
   */
  fitToView(): { zoom: number; panX: number; panY: number } {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const iw = this._imageWidth;
    const ih = this._imageHeight;

    if (!iw || !ih) return { zoom: 1, panX: 0, panY: 0 };

    const padding = 20;
    const scaleX = (cw - padding * 2) / iw;
    const scaleY = (ch - padding * 2) / ih;
    const zoom = Math.min(scaleX, scaleY, 1); // don't upscale beyond 1:1

    const panX = (cw - iw * zoom) / 2;
    const panY = (ch - ih * zoom) / 2;

    this._zoom = zoom;
    this._panX = panX;
    this._panY = panY;

    if (this.currentImage) this.draw();

    return { zoom, panX, panY };
  }

  /**
   * Convert canvas coordinates to image pixel coordinates.
   */
  canvasToImage(canvasX: number, canvasY: number): { x: number; y: number } {
    const x = Math.floor((canvasX - this._panX) / this._zoom);
    const y = Math.floor((canvasY - this._panY) / this._zoom);
    return { x, y };
  }

  /**
   * Get pixel value at image coordinates (R channel, grayscale).
   */
  getPixelValue(x: number, y: number): number | null {
    if (!this.currentImage) return null;
    if (x < 0 || x >= this._imageWidth || y < 0 || y >= this._imageHeight) return null;
    return this.currentImage.data[(y * this._imageWidth + x) * 4];
  }

  /**
   * Resize the visible canvas to match its container.
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.currentImage) this.draw();
  }

  dispose(): void {
    this.currentImage = null;
  }
}
