import { useState, useRef, useEffect, useCallback } from "react";
import { Video, AlertCircle, Upload, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const VideoFeedPanel = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<string | null>(null);
  const [session, setSession] = useState<InferenceSession | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [detections, setDetections] = useState<BoundingBox[]>([]);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFrameIndex, setVideoFrameIndex] = useState(0);
  const [totalVideoFrames, setTotalVideoFrames] = useState(0);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [videoDetections, setVideoDetections] = useState<Array<{ frameIndex: number; detections: BoundingBox[]; confidence: number }>>([]);

  // Initialize ONNX session on component mount
  useEffect(() => {
    const initModel = async () => {
      setIsModelLoading(true);
      try {
        let modelSession: InferenceSession | null = null;
        let lastError: Error | null = null;

        // Try different backends in order of preference
        const backends = ['wasm', 'webgl', 'cpu'];

        for (const backend of backends) {
          try {
            console.log(`Attempting to load model with ${backend} backend...`);
            const sessionOptions: InferenceSession.SessionOptions = {
              executionProviders: [backend as any],
              graphOptimizationLevel: 'all',
            };

            modelSession = await InferenceSession.create('/best.onnx', sessionOptions);
            console.log(`Model loaded successfully with ${backend} backend`);
            break; // Success, exit loop
          } catch (err) {
            console.warn(`${backend} backend failed:`, err);
            lastError = err instanceof Error ? err : new Error(String(err));
            continue; // Try next backend
          }
        }

        // If all backends failed, try without specifying backend (default)
        if (!modelSession) {
          try {
            console.log('Trying default backend configuration...');
            modelSession = await InferenceSession.create('/best.onnx');
            console.log('Model loaded successfully with default backend');
          } catch (err) {
            console.error('Default backend also failed:', err);
            lastError = err instanceof Error ? err : new Error(String(err));
          }
        }

        if (modelSession) {
          setSession(modelSession);
          console.log('Model loaded successfully');
          console.log('Input names:', modelSession.inputNames);
          console.log('Output names:', modelSession.outputNames);
          if (modelSession.inputMetadata) {
            console.log('Input metadata:', modelSession.inputMetadata);
          }
          if (modelSession.outputMetadata) {
            console.log('Output metadata:', modelSession.outputMetadata);
          }
        } else {
          throw lastError || new Error('Failed to load model with any backend');
        }
      } catch (error) {
        console.error('Failed to load model:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setDetectionResult(`Model Loading Failed: ${errorMessage}. Please check the browser console for details.`);
      } finally {
        setIsModelLoading(false);
      }
    };

    initModel();
  }, []);

  // Draw bounding boxes on overlay canvas
  const drawBoundingBoxes = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;

    // Support either image or video source
    const image = imageRef.current;
    const video = videoRef.current;
    const mediaElement = image || video;

    if (!overlayCanvas) return;

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas first
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (!mediaElement || detections.length === 0) {
      return;
    }

    // Wait for image/video to be ready
    if (image && (!image.complete || image.naturalWidth === 0)) return;
    if (video && (video.readyState < 2)) return;

    // Get the container element
    const container = overlayCanvas.parentElement;
    if (!container) return;

    // Get actual displayed dimensions
    const containerRect = container.getBoundingClientRect();

    // Set canvas size to match container
    const dpr = window.devicePixelRatio || 1;
    overlayCanvas.width = containerRect.width * dpr;
    overlayCanvas.height = containerRect.height * dpr;
    ctx.scale(dpr, dpr);

    // Get natural dimensions
    const naturalWidth = image ? image.naturalWidth : (video ? video.videoWidth : 0);
    const naturalHeight = image ? image.naturalHeight : (video ? video.videoHeight : 0);

    if (!naturalWidth || !naturalHeight) return;

    // Calculate actual displayed image size (object-contain)
    const mediaAspect = naturalWidth / naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;

    let displayWidth: number, displayHeight: number, offsetX: number, offsetY: number;

    if (mediaAspect > containerAspect) {
      // Media is wider - fit to width
      displayWidth = containerRect.width;
      displayHeight = containerRect.width / mediaAspect;
      offsetX = 0;
      offsetY = (containerRect.height - displayHeight) / 2;
    } else {
      // Media is taller - fit to height
      displayWidth = containerRect.height * mediaAspect;
      displayHeight = containerRect.height;
      offsetX = (containerRect.width - displayWidth) / 2;
      offsetY = 0;
    }

    // Calculate scale factors from original coordinates to displayed size
    const scaleX = displayWidth / naturalWidth;
    const scaleY = displayHeight / naturalHeight;

    // Draw bounding boxes
    detections.forEach((detection) => {
      // Scale bounding box coordinates from original image to displayed image
      const x = offsetX + detection.x * scaleX;
      const y = offsetY + detection.y * scaleY;
      const width = detection.width * scaleX;
      const height = detection.height * scaleY;

      // Ensure coordinates are valid
      if (width <= 0 || height <= 0) return;

      // Draw bounding box with thick red border
      ctx.strokeStyle = '#ef4444'; // Red color
      ctx.lineWidth = 4;
      ctx.setLineDash([]); // Solid line
      ctx.strokeRect(x, y, width, height);

      // Draw inner border for better visibility
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

      // Draw very light semi-transparent fill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
      ctx.fillRect(x, y, width, height);

      // Prepare label text
      const confidencePercent = (detection.confidence * 100).toFixed(1);
      const labelText = `${detection.label} ${confidencePercent}%`;

      // Set font
      ctx.font = 'bold 16px Arial, sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const textWidth = textMetrics.width;
      const textHeight = 22;
      const padding = 8;

      // Draw label background
      const labelX = Math.max(0, Math.min(x, containerRect.width - textWidth - padding * 2));
      const labelY = Math.max(textHeight + padding * 2, y);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(
        labelX,
        labelY - textHeight - padding * 2,
        textWidth + padding * 2,
        textHeight + padding * 2
      );

      // Draw label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, labelX + padding, labelY - padding);
    });
  }, [detections]);

  // Redraw bounding boxes when image loads, detections change, or window resizes
  useEffect(() => {
    if (!uploadedImage) {
      // Clear canvas when no image
      const overlayCanvas = overlayCanvasRef.current;
      if (overlayCanvas) {
        const ctx = overlayCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }
      }
      return;
    }

    // Wait for image to load before drawing
    const image = imageRef.current;
    if (image) {
      if (image.complete && image.naturalWidth > 0) {
        // Image already loaded
        const timeoutId = setTimeout(() => {
          drawBoundingBoxes();
        }, 200);

        // Add resize listener with debounce
        let resizeTimeout: NodeJS.Timeout;
        const handleResize = () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            drawBoundingBoxes();
          }, 100);
        };

        window.addEventListener('resize', handleResize);

        return () => {
          clearTimeout(timeoutId);
          clearTimeout(resizeTimeout);
          window.removeEventListener('resize', handleResize);
        };
      } else {
        // Wait for image to load
        const handleImageLoad = () => {
          setTimeout(() => {
            drawBoundingBoxes();
          }, 200);
        };

        image.addEventListener('load', handleImageLoad);

        return () => {
          image.removeEventListener('load', handleImageLoad);
        };
      }
    }
  }, [uploadedImage, detections, drawBoundingBoxes]);

  // Sync video playback with detections + redraw overlay
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !uploadedVideo || videoDetections.length === 0) return;

    const handleTimeUpdate = () => {
      // Calculate current frame (approximate)
      const fps = 30; // Assumed
      const currentFrame = Math.floor(video.currentTime * fps);

      // Find closest detection frame (within a margin of error, e.g., 15 frames)
      // Since we process every 15 frames, we show the detection for the last processed block
      const showingDetection = videoDetections.find(d =>
        Math.abs(d.frameIndex - currentFrame) < 15
      );

      if (showingDetection) {
        // Important: copy array so React re-renders even if reference is unchanged
        setDetections([...showingDetection.detections]);
        setDetectionResult(
          `⚠ Accident Detected at ${video.currentTime.toFixed(1)}s (Confidence: ${(
            showingDetection.confidence * 100
          ).toFixed(0)}%)`,
        );
        // Draw immediately (don't wait for state reconciliation)
        requestAnimationFrame(() => drawBoundingBoxes());
      } else {
        setDetections([]);
        // Clear overlay immediately when no detection applies
        requestAnimationFrame(() => drawBoundingBoxes());
        // Don't clear result text immediately to keep it visible
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleTimeUpdate);
    video.addEventListener('loadeddata', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleTimeUpdate);
      video.removeEventListener('loadeddata', handleTimeUpdate);
    };
  }, [uploadedVideo, videoDetections, drawBoundingBoxes]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setDetectionResult('Please upload an image or video file');
      return;
    }

    if (isVideo) {
      // For videos, create an object URL from the blob
      const videoUrl = URL.createObjectURL(file);
      setUploadedVideo(videoUrl);
      setUploadedImage(null);
      setDetectionResult(null);
      setDetectionResult(null);
      setDetections([]);
      setVideoDetections([]);
      setVideoFrameIndex(0);
      setTotalVideoFrames(0);

      // Initialize video metadata with better error handling
      if (videoRef.current) {
        const videoElement = videoRef.current;

        // Reset previous state
        videoElement.onerror = null;
        videoElement.onloadedmetadata = null;

        // IMPORTANT: Set handlers BEFORE setting src to avoid race conditions
        videoElement.onloadedmetadata = () => {
          const duration = videoElement.duration || 0;
          const estimatedFrames = Math.ceil(duration * 30);
          setTotalVideoFrames(estimatedFrames);
          console.log('Video loaded successfully. Duration:', duration, 'Dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
          setDetectionResult(null); // Clear any previous errors
        };

        videoElement.onerror = (e) => {
          console.error('Video load error event:', e);
          const error = videoElement.error;
          let errorMessage = 'Failed to load video.';
          if (error) {
            switch (error.code) {
              case 1: errorMessage = 'Video loading aborted.'; break;
              case 2: errorMessage = 'Network error while loading video.'; break;
              case 3: errorMessage = 'Video decoding failed. Please try a standard MP4 file.'; break;
              case 4: errorMessage = 'Video format not supported. Please use MP4 (H.264) format.'; break;
              default: errorMessage = `Unknown video error (Code ${error.code}).`;
            }
            errorMessage += ` details: ${error.message}`;
          }
          setDetectionResult(`⚠ ${errorMessage}`);
        };

        // Set src last
        videoElement.src = videoUrl;

        // Explicitly check for error immediately after setting src (just in case)
        if (videoElement.error) {
          console.error('Immediate video error detected');
          videoElement.dispatchEvent(new Event('error'));
        }
      }
    } else {
      // For images, use data URL as before
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setUploadedImage(imageUrl);
        setUploadedVideo(null);
        setDetectionResult(null);
        setDetections([]);

        // Get original image dimensions
        const img = new Image();
        img.onload = () => {
          setOriginalImageSize({ width: img.width, height: img.height });
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const preprocessImage = (image: HTMLImageElement, width: number, height: number): Float32Array => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    // Create input array in CHW format (Channel, Height, Width)
    const input = new Float32Array(3 * width * height);

    // Normalize pixel values to [0, 1] and rearrange to CHW format
    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const r = data[i] / 255.0;
      const g = data[i + 1] / 255.0;
      const b = data[i + 2] / 255.0;

      // CHW format: [R channel, G channel, B channel]
      input[pixelIndex] = r;                    // R channel
      input[width * height + pixelIndex] = g;  // G channel
      input[2 * width * height + pixelIndex] = b; // B channel
    }

    return input;
  };

  const detectAccident = async () => {
    if (!uploadedImage || !session) {
      setDetectionResult('Model not loaded. Please wait...');
      return;
    }

    setIsDetecting(true);
    setDetectionResult(null);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = uploadedImage;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Get model input shape (assuming 640x640, but we'll check the actual model)
      let modelWidth = 640;
      let modelHeight = 640;

      if (session.inputNames.length > 0 && session.inputMetadata) {
        const inputName = session.inputNames[0];
        const inputMeta = session.inputMetadata[inputName];
        if (inputMeta && inputMeta.dims) {
          const inputShape = inputMeta.dims;
          modelWidth = inputShape[inputShape.length - 1] || 640;
          modelHeight = inputShape[inputShape.length - 2] || 640;
        }
      }

      // Preprocess image
      const input = preprocessImage(img, modelWidth, modelHeight);

      // Create tensor with correct shape [batch, channels, height, width]
      const tensor = new Tensor('float32', input, [1, 3, modelHeight, modelWidth]);

      // Get input name from model
      const inputName = session.inputNames[0];
      const feeds = { [inputName]: tensor };

      // Run inference
      const results = await session.run(feeds);

      console.log('Inference results:', results);
      console.log('Output keys:', Object.keys(results));

      // Get the first output
      const outputKey = Object.keys(results)[0];
      const output = results[outputKey];
      const outputData = output.data as Float32Array;
      const outputDims = output.dims;

      console.log('Output shape:', outputDims);
      console.log('Output data sample:', Array.from(outputData.slice(0, 10)));

      // Process output based on model type
      let isAccident = false;
      let newDetections: BoundingBox[] = [];
      let confidence = 0;

      // Get original image dimensions for scaling
      const imgWidth = img.width;
      const imgHeight = img.height;

      // Helper function to clamp confidence between 0 and 1
      const clampConfidence = (val: number): number => {
        // If value is > 1, it might be a percentage, so divide by 100
        if (val > 1) {
          return Math.min(1, Math.max(0, val / 100));
        }
        return Math.min(1, Math.max(0, val));
      };

      // Helper function to normalize coordinates (handle both normalized 0-1 and pixel coordinates)
      const normalizeCoord = (val: number, dimension: number): number => {
        // If value is > 1, it's likely in pixels, normalize it
        if (val > 1) {
          return val / dimension;
        }
        return val;
      };

      console.log('Output dimensions:', outputDims);
      console.log('Output data length:', outputData.length);
      console.log('First 20 values:', Array.from(outputData.slice(0, 20)));

      // Check if it's a binary classification model (single output value)
      if (outputDims.length === 2 && outputDims[1] === 1) {
        // Binary classification: [batch, 1]
        confidence = clampConfidence(outputData[0]);
        isAccident = confidence > 0.5;
        if (isAccident) {
          // For classification, show box around center region (not full image)
          const boxSize = Math.min(imgWidth, imgHeight) * 0.6;
          newDetections = [{
            x: (imgWidth - boxSize) / 2,
            y: (imgHeight - boxSize) / 2,
            width: boxSize,
            height: boxSize,
            confidence: confidence,
            label: 'Accident Detected'
          }];
        }
      } else if (outputDims.length === 2 && outputDims[1] === 2) {
        // Binary classification with 2 classes: [batch, 2]
        // Assuming [no_accident, accident] format
        confidence = clampConfidence(outputData[1]);
        isAccident = confidence > 0.5;
        if (isAccident) {
          const boxSize = Math.min(imgWidth, imgHeight) * 0.6;
          newDetections = [{
            x: (imgWidth - boxSize) / 2,
            y: (imgHeight - boxSize) / 2,
            width: boxSize,
            height: boxSize,
            confidence: confidence,
            label: 'Accident Detected'
          }];
        }
      } else if (outputDims.length === 3 && outputDims[1] > 0) {
        // YOLO-style detection: [batch, num_detections, 6] format
        // Format: [x_center, y_center, width, height, confidence, class]
        const numDetections = outputDims[1];
        const threshold = 0.15; // Lowered threshold for debugging

        for (let i = 0; i < numDetections; i++) {
          const baseIndex = i * outputDims[2];
          if (baseIndex + 5 < outputData.length) {
            // Normalize coordinates if needed
            const xCenterNorm = normalizeCoord(outputData[baseIndex], imgWidth);
            const yCenterNorm = normalizeCoord(outputData[baseIndex + 1], imgHeight);
            const widthNorm = normalizeCoord(outputData[baseIndex + 2], imgWidth);
            const heightNorm = normalizeCoord(outputData[baseIndex + 3], imgHeight);
            const conf = clampConfidence(outputData[baseIndex + 4]);
            const classId = Math.round(outputData[baseIndex + 5]);

            // Convert normalized coordinates to pixels
            const xCenter = xCenterNorm * imgWidth;
            const yCenter = yCenterNorm * imgHeight;
            const width = widthNorm * imgWidth;
            const height = heightNorm * imgHeight;

            // Validate bounding box
            if (conf > threshold && width > 0 && height > 0 &&
              xCenter >= 0 && yCenter >= 0 &&
              xCenter < imgWidth && yCenter < imgHeight) {
              isAccident = true;
              confidence = Math.max(confidence, conf);

              // Calculate top-left corner
              const x = Math.max(0, xCenter - width / 2);
              const y = Math.max(0, yCenter - height / 2);
              const w = Math.min(width, imgWidth - x);
              const h = Math.min(height, imgHeight - y);

              newDetections.push({
                x: x,
                y: y,
                width: w,
                height: h,
                confidence: conf,
                label: 'Accident Detected'
              });
            }
          }
        }
      } else if (outputDims.length === 2 && outputDims[1] > 4) {
        // Alternative YOLO format: [batch, num_detections * 6] or flattened
        const threshold = 0.15; // Lowered threshold for debugging
        const step = outputDims[1] >= 6 ? 6 : outputDims[1];

        for (let i = 0; i < outputData.length; i += step) {
          if (i + 4 < outputData.length) {
            const xCenterNorm = normalizeCoord(outputData[i], imgWidth);
            const yCenterNorm = normalizeCoord(outputData[i + 1], imgHeight);
            const widthNorm = normalizeCoord(outputData[i + 2], imgWidth);
            const heightNorm = normalizeCoord(outputData[i + 3], imgHeight);
            const conf = clampConfidence(outputData[i + 4]);

            const xCenter = xCenterNorm * imgWidth;
            const yCenter = yCenterNorm * imgHeight;
            const width = widthNorm * imgWidth;
            const height = heightNorm * imgHeight;

            if (conf > threshold && width > 0 && height > 0 &&
              xCenter >= 0 && yCenter >= 0 &&
              xCenter < imgWidth && yCenter < imgHeight) {
              isAccident = true;
              confidence = Math.max(confidence, conf);

              const x = Math.max(0, xCenter - width / 2);
              const y = Math.max(0, yCenter - height / 2);
              const w = Math.min(width, imgWidth - x);
              const h = Math.min(height, imgHeight - y);

              newDetections.push({
                x: x,
                y: y,
                width: w,
                height: h,
                confidence: conf,
                label: 'Accident Detected'
              });
            }
          }
        }
      } else {
        // Fallback: check if first value indicates accident
        confidence = clampConfidence(outputData[0]);
        isAccident = confidence > 0.5;
        if (isAccident) {
          const boxSize = Math.min(imgWidth, imgHeight) * 0.6;
          newDetections = [{
            x: (imgWidth - boxSize) / 2,
            y: (imgHeight - boxSize) / 2,
            width: boxSize,
            height: boxSize,
            confidence: confidence,
            label: 'Accident Detected'
          }];
        }
      }

      // Filter and sort detections by confidence, keep only the best ones
      newDetections = newDetections
        .filter(d => d.confidence > 0.3 && d.width > 10 && d.height > 10)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5); // Keep only top 5 detections

      setDetections(newDetections);
      setDetectionResult(isAccident
        ? `Accident Detected${confidence > 0 ? ` (${(confidence * 100).toFixed(1)}%)` : ''}`
        : 'No Accident Detected');
    } catch (error) {
      console.error('Detection failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setDetectionResult(`Detection Failed: ${errorMessage}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const processVideoFrames = async () => {
    if (!uploadedVideo || !session || !videoRef.current) {
      setDetectionResult('⚠ Video or model not ready');
      return;
    }

    const video = videoRef.current;
    let frameDetections: BoundingBox[] = [];

    if (video.error) {
      const err = video.error;
      let msg = 'Unknown error';
      switch (err.code) {
        case 1: msg = 'Aborted'; break;
        case 2: msg = 'Network Error'; break;
        case 3: msg = 'Decoding Error. Please try a standard MP4 file.'; break;
        case 4: msg = 'Format Not Supported. Please convert to MP4 (H.264).'; break;
      }
      setDetectionResult(`⚠ ${msg}`);
      return;
    }

    if (video.readyState < 2) { // HAVE_CURRENT_DATA
      // Try to wait a bit?
      console.log('Video not ready, state:', video.readyState);
      setDetectionResult('Video is loading... please wait a moment.');
      return;
    }

    if (!video.videoWidth || !video.videoHeight || !video.duration) {
      setDetectionResult('⚠ Video metadata missing. Please reload the video.');
      return;
    }

    setIsDetecting(true);
    setIsVideoProcessing(true);
    setDetectionResult('Starting video processing...');

    try {
      console.log('Video element state:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        duration: video.duration,
        readyState: video.readyState
      });

      // Create canvas for frame extraction
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not found');

      // Get model input shape
      let modelWidth = 640;
      let modelHeight = 640;

      if (session.inputNames.length > 0 && session.inputMetadata) {
        const inputName = session.inputNames[0];
        const inputMeta = session.inputMetadata[inputName];
        if (inputMeta && inputMeta.dims) {
          const inputShape = inputMeta.dims;
          modelWidth = inputShape[inputShape.length - 1] || 640;
          modelHeight = inputShape[inputShape.length - 2] || 640;
        }
      }

      canvas.width = modelWidth;
      canvas.height = modelHeight;

      // Sample frames - process every Nth frame (adaptive)
      // Process roughly 2 frames per second to save memory/cpu
      const fps = 30; // Assumed
      const frameInterval = 15; // Process every 15th frame (every 0.5s)
      const videoDuration = video.duration;
      const totalFrames = Math.ceil(videoDuration * fps);
      const detectionsList: Array<{ frameIndex: number; detections: BoundingBox[]; confidence: number }> = [];
      let processedFrames = 0;
      let globalMaxConfidence = 0;
      let lastOutputShape: readonly number[] = [];

      console.log('Processing video - Total frames:', totalFrames, 'Frame interval:', frameInterval);
      setDetectionResult(`Extracting frames... 0/${Math.ceil(totalFrames / frameInterval)}`);

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += frameInterval) {
        try {
          const time = (frameIndex / fps);

          // Pause and seek to specific time
          video.pause();
          video.currentTime = time;

          // Wait for seek to complete
          await new Promise<void>((resolve) => {
            let resolved = false;

            const handleSeeked = () => {
              if (!resolved) {
                resolved = true;
                video.removeEventListener('seeked', handleSeeked);
                clearTimeout(seekTimeout);
                resolve();
              }
            };

            const seekTimeout = setTimeout(() => {
              if (!resolved) {
                resolved = true;
                video.removeEventListener('seeked', handleSeeked);
                console.warn(`Seek timeout at ${time}s, continuing anyway`);
                resolve();
              }
            }, 3000);

            video.addEventListener('seeked', handleSeeked);
          });

          // Verify video is at expected time (within 0.1s tolerance)
          if (Math.abs(video.currentTime - time) > 0.5) {
            console.warn(`Frame ${frameIndex}: Expected time ${time}s but video is at ${video.currentTime}s`);
          }

          // Draw current frame to canvas
          try {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, modelWidth, modelHeight);
            ctx.drawImage(video, 0, 0, modelWidth, modelHeight);
          } catch (drawErr) {
            console.warn(`Cannot draw frame ${frameIndex}:`, drawErr);
            continue;
          }

          // Get image data
          const imageData = ctx.getImageData(0, 0, modelWidth, modelHeight);
          const { data } = imageData;

          // Validate frame has data
          let pixelSum = 0;
          for (let i = 0; i < Math.min(1000, data.length); i++) {
            pixelSum += data[i];
          }

          if (pixelSum === 0) {
            console.warn(`Frame ${frameIndex} has no pixel data`);
            processedFrames++;
            setVideoFrameIndex(processedFrames);
            setDetectionResult(`Extracting frames... ${processedFrames}/${Math.ceil(totalFrames / frameInterval)}`);
            continue;
          }

          console.log(`Frame ${frameIndex}: Time=${time.toFixed(2)}s, PixelSum=${pixelSum}, Ready to process`);

          // Convert to tensor
          const input = new Float32Array(3 * modelWidth * modelHeight);

          for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            input[pixelIndex] = data[i] / 255.0;
            input[modelWidth * modelHeight + pixelIndex] = data[i + 1] / 255.0;
            input[2 * modelWidth * modelHeight + pixelIndex] = data[i + 2] / 255.0;
          }

          // Run inference
          const tensor = new Tensor('float32', input, [1, 3, modelHeight, modelWidth]);
          const inputName = session.inputNames[0];
          const feeds = { [inputName]: tensor };

          console.log(`Running inference for frame ${frameIndex}...`);
          const results = await session.run(feeds);

          // Process results
          const outputKey = Object.keys(results)[0];
          const output = results[outputKey];
          const outputData = output.data as Float32Array;
          const outputDims = output.dims;

          const clampConfidence = (val: number): number => {
            if (val > 1) return Math.min(1, Math.max(0, val / 100));
            return Math.min(1, Math.max(0, val));
          };

          let maxConfidence = 0;
          let isAccident = false;

          if (outputDims.length === 2 && (outputDims[1] === 1 || outputDims[1] === 2)) {
            const confidence = clampConfidence(outputDims[1] === 1 ? outputData[0] : outputData[1]);
            maxConfidence = confidence;
            // Use lower threshold for video to catch brief moments
            isAccident = confidence > 0.3;
          } else if (outputDims.length === 3 && outputDims[1] > 0) {
            // YOLO-style detection for VIDEO: [batch, num_detections, 6+] format
            const numDetections = outputDims[1];
            const numFeatures = outputDims[2]; // e.g., 7
            const threshold = 0.3;

            // Only check top N detections to save performance
            // But we actually need to scan all to find the max confidence
            // Optimization: check with a stride if too many? No, scan all for accuracy.

            for (let i = 0; i < numDetections; i++) {
              const baseIndex = i * numFeatures;
              // Check if we have enough data
              // Index 4 is usually object confidence
              if (baseIndex + 4 < outputData.length) {
                const conf = clampConfidence(outputData[baseIndex + 4]);

                if (conf > maxConfidence) {
                  maxConfidence = conf;
                }

                if (conf > threshold) {
                  isAccident = true;

                  // Extract coordinates
                  const xCenterNorm = outputData[baseIndex];
                  const yCenterNorm = outputData[baseIndex + 1];
                  const widthNorm = outputData[baseIndex + 2];
                  const heightNorm = outputData[baseIndex + 3];

                  // Convert to pixels (handling both normalized and pixel coords)
                  // Use video dimensions for scaling
                  const imgWidth = video.videoWidth;
                  const imgHeight = video.videoHeight;

                  const xCenter = (xCenterNorm > 1 ? xCenterNorm : xCenterNorm * imgWidth);
                  const yCenter = (yCenterNorm > 1 ? yCenterNorm : yCenterNorm * imgHeight);
                  const width = (widthNorm > 1 ? widthNorm : widthNorm * imgWidth);
                  const height = (heightNorm > 1 ? heightNorm : heightNorm * imgHeight);

                  const x = xCenter - width / 2;
                  const y = yCenter - height / 2;

                  frameDetections.push({
                    x, y, width, height,
                    confidence: conf,
                    label: 'Accident'
                  });
                }
              }
            }
          }

          if (isAccident) {
            console.log(`✓ Accident detected in frame ${frameIndex}! Confidence: ${maxConfidence}`);
            detectionsList.push({
              frameIndex,
              detections: [{
                x: 0,
                y: 0,
                width: video.videoWidth,
                height: video.videoHeight,
                confidence: maxConfidence,
                label: 'Accident Detected'
              }],
              confidence: maxConfidence
            });
          } else {
            // Log near misses for debugging
            if (maxConfidence > 0.05) {
              console.log(`Frame ${frameIndex}: Low confidence detection (${maxConfidence.toFixed(3)})`);
            }
          }

          // Track global max for debugging
          let frameMax = 0;
          for (let i = 0; i < outputData.length; i++) {
            if (outputData[i] > frameMax && outputData[i] <= 1.0) frameMax = outputData[i];
          }
          if (frameMax > globalMaxConfidence) globalMaxConfidence = frameMax;
          lastOutputShape = outputDims;

          processedFrames++;
          setVideoFrameIndex(processedFrames);
          const progress = Math.ceil(totalFrames / frameInterval);
          setDetectionResult(`Processing frames... ${processedFrames}/${progress}`);

          // Add a small delay to allow UI updates and Garbage Collection
          await new Promise(resolve => setTimeout(resolve, 20));

        } catch (err) {
          console.error(`Error processing frame ${frameIndex}:`, err);
          processedFrames++;
          setVideoFrameIndex(processedFrames);
        }
      }

      // Final results
      setVideoDetections(detectionsList);

      const debugInfo = `(Debug: Max Conf ${globalMaxConfidence.toFixed(4)}, Shape [${lastOutputShape.join(',')}])`;

      if (detectionsList.length > 0) {
        const maxConfidence = Math.max(...detectionsList.map(d => d.confidence));
        setDetectionResult(`✓ Processing Complete! Accidents detected in ${detectionsList.length} frame(s) | Confidence: ${(maxConfidence * 100).toFixed(1)}% ${debugInfo}`);
      } else {
        setDetectionResult(`✓ Processing Complete - No accidents detected. ${debugInfo}`);
      }
    } catch (error) {
      console.error('Video processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setDetectionResult(`⚠ Failed: ${errorMessage}`);
    } finally {
      setIsDetecting(false);
      setIsVideoProcessing(false);
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
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Media
          </Button>
          {uploadedImage && (
            <Button
              onClick={detectAccident}
              disabled={isDetecting || !session}
              className="flex-1"
            >
              {isDetecting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Detecting...
                </div>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Detect Accident
                </>
              )}
            </Button>
          )}
          {uploadedVideo && (
            <Button
              onClick={processVideoFrames}
              disabled={isDetecting || !session}
              className="flex-1"
            >
              {isDetecting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Process Video
                </>
              )}
            </Button>
          )}
        </div>
        {detectionResult && (
          <Badge variant={detectionResult.includes('Detected') ? 'destructive' : 'secondary'} className="w-full justify-center py-2">
            {detectionResult}
          </Badge>
        )}
        <div className="relative w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden" style={{ minHeight: '600px', height: '70vh' }}>
          {uploadedImage ? (
            <>
              <img
                ref={imageRef}
                src={uploadedImage}
                alt="Uploaded"
                className="w-full h-full object-contain"
                style={{ display: 'block' }}
                onLoad={() => {
                  // Image loaded, redraw bounding boxes after a short delay
                  setTimeout(() => {
                    drawBoundingBoxes();
                  }, 300);
                }}
              />
            </>
          ) : uploadedVideo ? (
            <>
              <video
                ref={videoRef}
                src={uploadedVideo}
                controls
                className="w-full h-full object-contain"
                style={{ display: 'block' }}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <Upload className="h-16 w-16 text-white/40 mx-auto" />
                <p className="text-white/60 text-sm">Upload an image or video to detect accidents</p>
              </div>
            </div>
          )}

          {/* Overlay Canvas - Always present if media exists */}
          {(uploadedImage || uploadedVideo) && (
            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                zIndex: 10,
                width: '100%',
                height: '100%'
              }}
            />
          )}

          {detectionResult && detectionResult.includes('Detected') && (uploadedImage || uploadedVideo) && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-destructive/90 text-white px-4 py-2 rounded-lg shadow-lg alert-glow z-20">
              <AlertCircle className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">{detectionResult}</span>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-xs font-mono z-20">
            {new Date().toLocaleString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })}
          </div>
          {isVideoProcessing && (
            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-xs z-20">
              Frame: {videoFrameIndex}/{totalVideoFrames}
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};

export default VideoFeedPanel;