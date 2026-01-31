import cv2
import numpy as np
import onnxruntime as ort
import argparse
import os

def preprocess(frame, input_width, input_height):
    """
    Preprocess the imageFrame for YOLOv8 model input.
    - Resize matches model input.
    - Normalize (0-1).
    - Convert BHWC to BCHW.
    """
    # Resize
    img = cv2.resize(frame, (input_width, input_height))
    
    # Convert BGR to RGB (OpenCV uses BGR, but models typically expect RGB)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Normalize
    img = img.astype(np.float32) / 255.0
    
    # Transpose to Channel-First (CHW)
    img = img.transpose(2, 0, 1)
    
    # Add batch dimension (NCHW)
    img = np.expand_dims(img, axis=0)
    
    return img

def iou(box1, box2):
    """Calculate Intersection over Union (IoU) of two bounding boxes."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[0] + box1[2], box2[0] + box2[2])
    y2 = min(box1[1] + box1[3], box2[1] + box2[3])

    intersection_area = max(0, x2 - x1) * max(0, y2 - y1)
    box1_area = box1[2] * box1[3]
    box2_area = box2[2] * box2[3]

    union_area = box1_area + box2_area - intersection_area
    
    if union_area == 0:
        return 0
    return intersection_area / union_area

def nms(boxes, scores, iou_threshold=0.45):
    """Apply Non-Maximum Suppression."""
    indices = cv2.dnn.NMSBoxes(boxes, scores, score_threshold=0.25, nms_threshold=iou_threshold)
    if len(indices) > 0:
        return indices.flatten()
    return []

def main(video_path, model_path, output_path):
    print(f"Loading model from {model_path}...")
    try:
        session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    # Get model info
    model_inputs = session.get_inputs()
    input_shape = model_inputs[0].shape
    input_height = input_shape[2]
    input_width = input_shape[3]
    input_name = model_inputs[0].name
    
    print(f"Model loaded. Input shape: {input_shape} ({input_width}x{input_height})")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error opening video file: {video_path}")
        return

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"Processing video: {width}x{height} @ {fps}fps, {total_frames} frames")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        if frame_count % 10 == 0:
            print(f"Processing frame {frame_count}/{total_frames}...")

        # Preprocess
        input_tensor = preprocess(frame, input_width, input_height)

        # Inference
        outputs = session.run(None, {input_name: input_tensor})
        output = outputs[0] # Shape [1, 84, 8400] usually for YOLOv8
        
        # Post-Processing
        # Output is typically [batch, channels, anchors] -> [1, 4+classes, 8400]
        # Transpose to [1, 8400, 4+classes] for easier processing
        predictions = np.transpose(output[0], (1, 0))
        
        boxes = []
        confidences = []
        class_ids = []

        # Scaling factors
        x_scale = width / input_width
        y_scale = height / input_height

        for pred in predictions:
            # YOLOv8 format: [x_center, y_center, width, height, class_probs...]
            # If binary class, detection might be different. Let's assume standard object detection.
            # Usually index 4 is confidence for class 0, etc.
            
            # Find class with max confidence
            classes_scores = pred[4:]
            if len(classes_scores) > 0:
                class_id = np.argmax(classes_scores)
                confidence = classes_scores[class_id]
            else:
                # If model structure is different (e.g. only 5 outputs: x,y,w,h,conf)
                confidence = pred[4]
                class_id = 0 # Default class

        if confidence > 0.25: # Confidence threshold
                x_center, y_center, w, h = pred[0], pred[1], pred[2], pred[3]
                
                # Scale back to original image
                x = int((x_center - w/2) * x_scale)
                y = int((y_center - h/2) * y_scale)
                w = int(w * x_scale)
                h = int(h * y_scale)
                
                boxes.append([x, y, w, h])
                confidences.append(float(confidence))
                class_ids.append(class_id)

        # Apply NMS
        indices = nms(boxes, confidences)

        # Draw Annotations
        for i in indices:
            box = boxes[i]
            x, y, w, h = box[0], box[1], box[2], box[3]
            conf = confidences[i]
            
            # Blue Box (#2563eb is approx (235, 99, 37) in BGR)
            color = (235, 99, 37) 
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 4)
            
            # Inner white border
            cv2.rectangle(frame, (x + 2, y + 2), (x + w - 4, y + h - 4), (255, 255, 255), 2)
            
            # Label
            label = f"accident {conf:.2f}"
            (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)
            
            # Label Background
            cv2.rectangle(frame, (x, y - text_h - 10), (x + text_w + 10, y), color, -1)
            
            # Label Text
            cv2.putText(frame, label, (x + 5, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        # Show "Instant" Live Feed
        cv2.imshow("Accident Detection (Press 'q' to quit)", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("Processing stopped by user.")
            break

        out.write(frame)

    cap.release()
    out.release()
    cv2.destroyAllWindows()
    print(f"Done! Output saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Detect accidents in video using YOLO ONNX model.")
    parser.add_argument("--video", type=str, required=True, help="Path to input video file")
    parser.add_argument("--model", type=str, default="backend/best.onnx", help="Path to .onnx model file")
    parser.add_argument("--output", type=str, default="output.mp4", help="Path to output video file")
    
    args = parser.parse_args()
    
    # Check if files exist
    if not os.path.exists(args.video):
        print(f"Error: Video file not found at {args.video}")
        exit(1)
        
    if not os.path.exists(args.model):
        print(f"Error: Model file not found at {args.model}")
        # Try looking in other likely places
        if os.path.exists("public/best.onnx"):
            args.model = "public/best.onnx"
            print(f"Found model at {args.model}")
        else:
            exit(1)

    main(args.video, args.model, args.output)
