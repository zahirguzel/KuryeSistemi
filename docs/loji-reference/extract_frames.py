import cv2
import os
import numpy as np

def extract_key_frames(video_path, output_dir, sample_interval_sec=5, min_diff_threshold=0.08, max_interval_sec=40):
    os.makedirs(output_dir, exist_ok=True)
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Cannot open video {video_path}")
        return
        
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps
    print(f"Total duration: {duration_sec/60:.2f} min ({duration_sec:.1f} s), FPS: {fps}")
    
    sample_step_frames = int(fps * sample_interval_sec)
    max_interval_frames = int(fps * max_interval_sec)
    
    last_saved_frame_gray = None
    last_saved_pos = -max_interval_frames
    saved_count = 0
    
    current_frame_pos = 0
    
    while current_frame_pos < total_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame_pos)
        ret, frame = cap.read()
        if not ret:
            break
            
        time_sec = current_frame_pos / fps
        min_part = int(time_sec // 60)
        sec_part = int(time_sec % 60)
        
        # Resize small for fast difference comparison
        small = cv2.resize(frame, (160, 90))
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        
        should_save = False
        diff_score = 0.0
        
        if last_saved_frame_gray is None:
            should_save = True
        else:
            # Normalized absolute difference
            diff = cv2.absdiff(gray, last_saved_frame_gray)
            diff_score = np.mean(diff) / 255.0
            
            frames_since_last = current_frame_pos - last_saved_pos
            if diff_score > min_diff_threshold or frames_since_last >= max_interval_frames:
                should_save = True
                
        if should_save:
            saved_count += 1
            filename = f"frame_{saved_count:03d}_{min_part:02d}m{sec_part:02d}s.jpg"
            out_path = os.path.join(output_dir, filename)
            
            # Save at 1600x900 for high readability of text with moderate size
            h, w = frame.shape[:2]
            target_w = 1600
            target_h = int(h * (target_w / w))
            resized = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
            
            cv2.imwrite(out_path, resized, [cv2.IMWRITE_JPEG_QUALITY, 85])
            print(f"Saved: {filename} (Diff: {diff_score:.3f}, Time: {min_part:02d}:{sec_part:02d})")
            
            last_saved_frame_gray = gray
            last_saved_pos = current_frame_pos
            
        current_frame_pos += sample_step_frames
        
    cap.release()
    print(f"\nDone! Saved {saved_count} frames to {output_dir}")

if __name__ == "__main__":
    import os
    base = os.path.dirname(os.path.abspath(__file__))
    video = os.path.join(base, "loji.mp4")
    out = os.path.join(base, "loji_frames")
    extract_key_frames(video, out, sample_interval_sec=5, min_diff_threshold=0.06, max_interval_sec=40)
