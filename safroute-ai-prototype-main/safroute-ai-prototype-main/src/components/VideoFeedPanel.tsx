import { useState, useRef, useEffect, useCallback } from "react";
import { Video, Info, Upload, Play, AlertTriangle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InferenceSession, Tensor, env } from 'onnxruntime-web';

// Configure ONNX runtime to use CDN for wasm files (more reliable)
// Set wasm paths before any ONNX operations
if (typeof window !== 'undefined') {
  env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';
  // Also allow blob URLs for dynamic imports
  env.wasm.numThreads = 1; // Use single thread to avoid worker issues
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
}

// --- Helper Functions ---

const iou = (box1: BoundingBox, box2: BoundingBox): number => {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const box1Area = box1.width * box1.height;
  const box2Area = box2.width * box2.height;

  return intersectionArea / (box1Area + box2Area - intersectionArea);
};

const nms = (boxes: BoundingBox[], iouThreshold: number = 0.5): BoundingBox[] => {
  if (boxes.length === 0) return [];
  const sortedBoxes = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const selectedBoxes: BoundingBox[] = [];

  while (sortedBoxes.length > 0) {
    const current = sortedBoxes.shift()!;
    selectedBoxes.push(current);
    for (let i = sortedBoxes.length - 1; i >= 0; i--) {
      if (iou(current, sortedBoxes[i]) > iouThreshold) {
        sortedBoxes.splice(i, 1);
      }
    }
  }
  return selectedBoxes;
};

// -------------------------------------------------------------------------------

const VideoFeedPanel = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<string | null>(null);
  const [session, setSession] = useState<InferenceSession | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [detections, setDetections] = useState<BoundingBox[]>([]);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);

  // Detection Threshold (Sensitivity)
  const [threshold, setThreshold] = useState(0.50);

  // State for coordinate mode
  const [coordMode, setCoordMode] = useState<'auto' | 'norm' | 'pixel'>('auto');
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Toggle Handler
  const cycleCoordMode = () => {
    const modes: ('auto' | 'norm' | 'pixel')[] = ['auto', 'norm', 'pixel'];
    const next = modes[(modes.indexOf(coordMode) + 1) % modes.length];
    setCoordMode(next);
    setDetectionResult(`Mode: ${next.toUpperCase()} `);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [isLiveDetecting, setIsLiveDetecting] = useState(false);
  const requestRef = useRef<number>();
  const isProcessingFrame = useRef(false);

  // Initialize ONNX session
  useEffect(() => {
    const initModel = async () => {
      setIsModelLoading(true);
      setDebugInfo("Initializing model...");
      try {
        let modelSession: InferenceSession | null = null;

        // Try default backend first
        try {
          console.log('Loading model with default settings...');
          modelSession = await InferenceSession.create('/best.onnx', { executionProviders: ['wasm'] });
        } catch (err) {
          console.error('Default load failed:', err);
        }

        if (modelSession) {
          setSession(modelSession);
          setDebugInfo(`Model Loaded! Inputs: ${modelSession.inputNames.join(', ')} -> Outputs: ${modelSession.outputNames.join(', ')} `);
        } else {
          throw new Error('Failed to load model');
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        setDetectionResult(`Model Loading Failed: ${msg} `);
        setDebugInfo(`Error: ${msg} `);
      } finally {
        setIsModelLoading(false);
      }
    };
    initModel();
  }, []);

  // NEW: Effect to draw whenever detections change
  useEffect(() => {
    if (detections.length >= 0) {
      requestAnimationFrame(() => drawBoundingBoxes());
    }
  }, [detections, coordMode]);

  // Use existing drawBoundingBoxes logic...
  const drawBoundingBoxes = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;

    // Support either image or video source
    const image = imageRef.current;
    const video = videoRef.current;
    const mediaElement = image || video;

    if (!overlayCanvas) return;
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (!mediaElement || detections.length === 0) return;
    if (image && (!image.complete || image.naturalWidth === 0)) return;
    if (video && (video.readyState < 2)) return;

    const container = overlayCanvas.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    overlayCanvas.width = containerRect.width * dpr;
    overlayCanvas.height = containerRect.height * dpr;
    ctx.scale(dpr, dpr);

    const naturalWidth = image ? image.naturalWidth : (video ? video.videoWidth : 0);
    const naturalHeight = image ? image.naturalHeight : (video ? video.videoHeight : 0);

    if (!naturalWidth || !naturalHeight) return;

    const mediaAspect = naturalWidth / naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;
    let displayWidth: number, displayHeight: number, offsetX: number, offsetY: number;

    if (mediaAspect > containerAspect) {
      displayWidth = containerRect.width;
      displayHeight = containerRect.width / mediaAspect;
      offsetX = 0;
      offsetY = (containerRect.height - displayHeight) / 2;
    } else {
      displayWidth = containerRect.height * mediaAspect;
      displayHeight = containerRect.height;
      offsetX = (containerRect.width - displayWidth) / 2;
      offsetY = 0;
    }

    const scaleX = displayWidth / naturalWidth;
    const scaleY = displayHeight / naturalHeight;

    detections.forEach((detection) => {
      const x = offsetX + detection.x * scaleX;
      const y = offsetY + detection.y * scaleY;
      const width = detection.width * scaleX;
      const height = detection.height * scaleY;

      if (width <= 0 || height <= 0) return;

      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
      ctx.strokeRect(x, y, width, height);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

      ctx.fillStyle = 'rgba(37, 99, 235, 0.05)';
      ctx.fillRect(x, y, width, height);

      const labelText = `Accident ${(detection.confidence * 100).toFixed(1)}% `;
      ctx.font = 'bold 16px Arial, sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const textWidth = textMetrics.width;
      const textHeight = 22;
      const padding = 8;

      const labelX = Math.max(0, Math.min(x, containerRect.width - textWidth - padding * 2));
      const labelY = Math.max(textHeight + padding * 2, y);

      ctx.fillStyle = '#2563eb';
      ctx.fillRect(labelX, labelY - textHeight - padding * 2, textWidth + padding * 2, textHeight + padding * 2);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, labelX + padding, labelY - padding);
    });
  }, [detections]);

  // Handle resizing/redrawing
  useEffect(() => {
    if (!uploadedImage) {
      const overlayCanvas = overlayCanvasRef.current;
      if (overlayCanvas) {
        const ctx = overlayCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      }
      return;
    }
    const image = imageRef.current;
    if (image) {
      if (image.complete && image.naturalWidth > 0) {
        setTimeout(() => drawBoundingBoxes(), 200);
      } else {
        image.addEventListener('load', () => setTimeout(() => drawBoundingBoxes(), 200));
      }
    }
  }, [uploadedImage, detections, drawBoundingBoxes]);

  // Processing logic
  const processFrame = async (
    sourceCanvas: HTMLCanvasElement,
    width: number,
    height: number,
    sourceName: string,
    letterbox?: { scale: number, padX: number, padY: number }
  ) => {
    try {
      if (!session) {
        setDebugInfo("Error: Session not initialized");
        return;
      }

      const ctx = sourceCanvas.getContext('2d');
      if (!ctx) {
        setDebugInfo("Error: No 2D context");
        return;
      }

      const imageData = ctx.getImageData(0, 0, width, height);
      const { data } = imageData;
      const input = new Float32Array(3 * width * height);

      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        input[pixelIndex] = data[i] / 255.0; // R
        input[width * height + pixelIndex] = data[i + 1] / 255.0; // G
        input[2 * width * height + pixelIndex] = data[i + 2] / 255.0; // B
      }

      const tensor = new Tensor('float32', input, [1, 3, height, width]);
      const inputName = session.inputNames[0];

      const start = performance.now();
      let results;
      try {
        results = await session.run({ [inputName]: tensor });
      } catch (runErr) {
        const errMsg = runErr instanceof Error ? runErr.message : String(runErr);
        setDebugInfo(`Inference Error: ${errMsg} `);
        console.error(runErr);
        return;
      }
      const end = performance.now();

      // Check outputs
      if (!results || Object.keys(results).length === 0) {
        setDebugInfo("Error: No output from model");
        return;
      }

      const outputKey = Object.keys(results)[0];
      const output = results[outputKey];
      const outputData = output.data as Float32Array;
      const outputDims = output.dims;

      // DEBUG: Calculate Input/Output Stats
      let maxInput = 0;
      for (let i = 0; i < input.length; i += 100) if (input[i] > maxInput) maxInput = input[i];

      let maxOutput = 0;
      let minOutput = 0;
      for (let i = 0; i < outputData.length; i++) {
        const val = outputData[i];
        if (val > maxOutput) maxOutput = val;
        if (val < minOutput) minOutput = val;
      }

      // ... (rest of the logic remains similar but wrapped)
      // To save tokens, I will re-inject the previous logic here, but with safety.

      let newDetections: BoundingBox[] = [];
      let maxConf = 0;
      let stats = { maxObj: 0, maxCls: 0, maxMult: 0, bestAnchorIndex: -1 };

      const dim1 = outputDims[1];
      const dim2 = outputDims[2];

      let numAnchors = 0;
      let numFeatures = 0;
      let isAnchorFirst = false;

      if (dim1 > dim2) {
        numAnchors = dim1;
        numFeatures = dim2;
        isAnchorFirst = true;
      } else {
        numFeatures = dim1;
        numAnchors = dim2;
        isAnchorFirst = false;
      }

      let overallMaxProb = 0;
      for (let i = 0; i < numAnchors; i++) {
        let cx, cy, w, h, confidence;
        let isAccidentDominant = true;

        if (isAnchorFirst) {
          const offset = i * numFeatures;
          cx = outputData[offset + 0];
          cy = outputData[offset + 1];
          w = outputData[offset + 2];
          h = outputData[offset + 3];

          if (numFeatures === 5) {
            confidence = outputData[offset + 4];
          } else {
            const objConf = outputData[offset + 4];
            const cls0Conf = outputData[offset + 5];
            confidence = objConf * cls0Conf;
            for (let c = 1; c < Math.min(numFeatures - 5, 5); c++) {
              if (outputData[offset + 5 + c] > cls0Conf) { isAccidentDominant = false; break; }
            }
          }
        } else {
          cx = outputData[0 * numAnchors + i];
          cy = outputData[1 * numAnchors + i];
          w = outputData[2 * numAnchors + i];
          h = outputData[3 * numAnchors + i];

          if (numFeatures === 5) {
            confidence = outputData[4 * numAnchors + i];
          } else {
            const objConf = outputData[4 * numAnchors + i];
            const cls0Conf = outputData[5 * numAnchors + i];
            confidence = objConf * cls0Conf;
            for (let c = 1; c < Math.min(numFeatures - 5, 5); c++) {
              if (outputData[(5 + c) * numAnchors + i] > cls0Conf) { isAccidentDominant = false; break; }
            }
          }
        }

        if (confidence > overallMaxProb) overallMaxProb = confidence;

        if (confidence > threshold && isAccidentDominant) {
          let finalX, finalY, finalW, finalH;
          if (letterbox) {
            finalX = (cx - letterbox.padX) / letterbox.scale;
            finalY = (cy - letterbox.padY) / letterbox.scale;
            finalW = w / letterbox.scale;
            finalH = h / letterbox.scale;
          } else {
            const imgWidth = sourceName === 'video' ? videoRef.current!.videoWidth : imageRef.current!.naturalWidth;
            const imgHeight = sourceName === 'video' ? videoRef.current!.videoHeight : imageRef.current!.naturalHeight;
            const scaleX = imgWidth / width;
            const scaleY = imgHeight / height;
            finalX = cx * scaleX;
            finalY = cy * scaleY;
            finalW = w * scaleX;
            finalH = h * scaleY;
          }

          newDetections.push({
            x: finalX - finalW / 2,
            y: finalY - finalH / 2,
            width: finalW,
            height: finalH,
            confidence: confidence,
            label: 'Accident'
          });
        }
      }

      const rawFinal = nms(newDetections, 0.25); // TIGHTER NMS

      if (sourceName === 'video') {
        detectionHistory.current.push(rawFinal);
        if (detectionHistory.current.length > MAX_HISTORY) detectionHistory.current.shift();

        const activeFrames = detectionHistory.current.filter(f => f.length > 0).length;

        if (activeFrames >= 3) { // Require 3 stable frames
          setDetections(rawFinal);
          if (rawFinal.length > 0) {
            setDetectionResult(`Accident Detected! ${(rawFinal[0].confidence * 100).toFixed(0)}%`);
          }
        } else {
          setDetections([]);
          setDetectionResult(activeFrames > 0 ? "Analyzing..." : `No Accident (Max:${(overallMaxProb * 100).toFixed(0)}%)`);
        }
        setDebugInfo(`Feat:${numFeatures} | Match:${activeFrames}/${MAX_HISTORY} | Raw:${newDetections.length}`);
      } else {
        setDetections(rawFinal);
        setDetectionResult(rawFinal.length > 0 ? `Accident Detected! ${(rawFinal[0].confidence * 100).toFixed(0)}%` : "No Accident Detected");
        setDebugInfo(`Image Mode | Count: ${rawFinal.length}`);
      }

    } catch (err) {
      console.error(err);
    }
  };

  const detectFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended || !isLiveDetecting || !session || isProcessingFrame.current) {
      if (video && !video.paused && isLiveDetecting) requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }
    isProcessingFrame.current = true;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Letterboxing: Fill background with black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 640, 640);

        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;
        const scale = Math.min(640 / vWidth, 640 / vHeight);
        const newW = vWidth * scale;
        const newH = vHeight * scale;
        const padX = (640 - newW) / 2;
        const padY = (640 - newH) / 2;

        ctx.drawImage(video, padX, padY, newW, newH);

        // Pass letterbox info to processFrame
        await processFrame(canvas, 640, 640, 'video', { scale, padX, padY });
      }
    } catch (e) {
      console.error(e);
    } finally {
      isProcessingFrame.current = false;
      if (isLiveDetecting) requestRef.current = requestAnimationFrame(detectFrame);
    }
  }, [isLiveDetecting, session]);

  useEffect(() => {
    if (isLiveDetecting) {
      detectFrame();
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isLiveDetecting, detectFrame]);

  // Auto-draw when detections change
  useEffect(() => {
    if (detections.length >= 0) {
      requestAnimationFrame(() => drawBoundingBoxes());
    }
  }, [detections]);

  const detectAccident = async () => {
    if (!uploadedImage || !session) return;
    setIsDetecting(true);
    const img = new Image();
    img.src = uploadedImage;
    await new Promise(r => img.onload = r);

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Letterboxing for images
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 640, 640);

      const iWidth = img.naturalWidth;
      const iHeight = img.naturalHeight;
      const scale = Math.min(640 / iWidth, 640 / iHeight);
      const newW = iWidth * scale;
      const newH = iHeight * scale;
      const padX = (640 - newW) / 2;
      const padY = (640 - newH) / 2;

      ctx.drawImage(img, padX, padY, newW, newH);
      await processFrame(canvas, 640, 640, 'image', { scale, padX, padY });
    }
    setIsDetecting(false);
  };

  // ... (Other handlers identical to before: handleFileUpload, toggleLiveDetection, etc.)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    if (isVideo) {
      const videoUrl = URL.createObjectURL(file);
      setUploadedVideo(videoUrl);
      setUploadedImage(null);
      setDetectionResult(null);
      setDetections([]);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setUploadedVideo(null);
        setDetectionResult(null);
        setDetections([]);
      }
      reader.readAsDataURL(file);
    }
  };

  const toggleLiveDetection = () => {
    const newState = !isLiveDetecting;
    setIsLiveDetecting(newState);

    if (newState) {
      setDetectionResult("Live Detection Enabled");
      if (videoRef.current) {
        videoRef.current.play().catch(e => console.error("Auto-play failed:", e));
      }
    } else {
      setDetectionResult(null);
      setDetections([]);
      if (videoRef.current) videoRef.current.pause();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Video Feed & Accident Detection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        <div className="flex gap-2">
          <input type="file" accept="image/*,video/*" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
            <Upload className="h-4 w-4 mr-2" /> Upload Media
          </Button>
          {uploadedImage && (
            <Button onClick={detectAccident} disabled={isDetecting || !session} className="flex-1">
              {isDetecting ? "Detecting..." : <><Play className="h-4 w-4 mr-2" /> Verify Image</>}
            </Button>
          )}
          {uploadedVideo && (
            <Button onClick={toggleLiveDetection} disabled={!session} variant={isLiveDetecting ? "destructive" : "default"} className="flex-1">
              {isLiveDetecting ? "Stop Live" : "Start Live"}
            </Button>
          )}
        </div>

        {/* Sensitivity Control moved above buttons */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Sensitivity: {(threshold * 100).toFixed(0)}%
            </Label>
            <span className="text-[10px] text-slate-400 font-mono">
              {debugInfo || "Model Ready"}
            </span>
          </div>
          <Slider
            value={[threshold]}
            onValueChange={(val) => setThreshold(val[0])}
            min={0.10}
            max={0.90}
            step={0.05}
          />
        </div>

        {detectionResult && (
          <Badge variant={detectionResult.includes('Detected') && !detectionResult.includes('No') ? 'destructive' : 'secondary'} className="w-full justify-center py-2 text-md">
            {detectionResult}
          </Badge>
        )}

        <div className="relative w-full bg-slate-900 rounded-lg overflow-hidden" style={{ minHeight: '600px', height: '85vh' }}>
          {uploadedImage && <img ref={imageRef} src={uploadedImage} className="w-full h-full object-contain" />}
          {uploadedVideo && (
            <video
              ref={videoRef}
              src={uploadedVideo}
              controls
              className="w-full h-full object-contain"
              onPlay={() => setIsLiveDetecting(true)}
              onPause={() => setIsLiveDetecting(false)}
              onEnded={() => setIsLiveDetecting(false)}
            />
          )}

          {(uploadedImage || uploadedVideo) && (
            <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 pointer-events-none" style={{ zIndex: 10, width: '100%', height: '100%' }} />
          )}

          {!uploadedImage && !uploadedVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/60">Upload media to begin</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoFeedPanel;