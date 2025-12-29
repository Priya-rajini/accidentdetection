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
    const image = imageRef.current;
    
    if (!overlayCanvas) return;
    
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas first
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (!image || detections.length === 0) {
      return;
    }

    // Wait for image to be fully loaded
    if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
      return;
    }

    // Get the container element
    const container = overlayCanvas.parentElement;
    if (!container) return;

    // Get actual displayed image dimensions
    const containerRect = container.getBoundingClientRect();
    const imgRect = image.getBoundingClientRect();
    
    // Set canvas size to match container
    const dpr = window.devicePixelRatio || 1;
    overlayCanvas.width = containerRect.width * dpr;
    overlayCanvas.height = containerRect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Calculate actual displayed image size (object-contain)
    const imgAspect = image.naturalWidth / image.naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;
    
    let displayWidth: number, displayHeight: number, offsetX: number, offsetY: number;
    
    if (imgAspect > containerAspect) {
      // Image is wider - fit to width
      displayWidth = containerRect.width;
      displayHeight = containerRect.width / imgAspect;
      offsetX = 0;
      offsetY = (containerRect.height - displayHeight) / 2;
    } else {
      // Image is taller - fit to height
      displayWidth = containerRect.height * imgAspect;
      displayHeight = containerRect.height;
      offsetX = (containerRect.width - displayWidth) / 2;
      offsetY = 0;
    }

    // Calculate scale factors from original image to displayed image
    const scaleX = displayWidth / image.naturalWidth;
    const scaleY = displayHeight / image.naturalHeight;

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setUploadedImage(imageUrl);
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
        const threshold = 0.3; // Lower threshold to catch detections
        
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
        const threshold = 0.3;
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
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
          <Button
            onClick={detectAccident}
            disabled={!uploadedImage || isDetecting || !session}
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
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ 
                  zIndex: 10,
                  width: '100%',
                  height: '100%'
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <Upload className="h-16 w-16 text-white/40 mx-auto" />
                <p className="text-white/60 text-sm">Upload an image to detect accidents</p>
              </div>
            </div>
          )}
          {detectionResult && detectionResult.includes('Accident Detected') && (
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
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};

export default VideoFeedPanel;