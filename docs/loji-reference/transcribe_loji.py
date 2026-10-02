import os
import subprocess
import imageio_ffmpeg
import speech_recognition as sr
import json

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
import os
base = os.path.dirname(os.path.abspath(__file__))
mp4_path = os.path.join(base, "loji.mp4")
temp_wav = os.path.join(base, "temp_chunk.wav")
output_file = os.path.join(base, "loji_audio_transcript.txt")

# Total duration ~27m09s = 1629s
chunk_duration = 45 # seconds per chunk
overlap = 2 # seconds overlap
total_duration = 1630

r = sr.Recognizer()
results = []

print(f"Starting audio transcription for {mp4_path}...")
current_start = 0

with open(output_file, "w", encoding="utf-8") as out_f:
    out_f.write("=== LOJI.MP4 SES DEŞİFRESİ (AUDIO TRANSCRIPT) ===\n\n")

while current_start < total_duration:
    end_time = min(current_start + chunk_duration, total_duration)
    m_start = int(current_start // 60)
    s_start = int(current_start % 60)
    m_end = int(end_time // 60)
    s_end = int(end_time % 60)
    time_label = f"[{m_start:02d}:{s_start:02d} - {m_end:02d}:{s_end:02d}]"
    
    # Extract chunk
    cmd = [
        ffmpeg_exe, "-y",
        "-ss", str(current_start),
        "-t", str(chunk_duration),
        "-i", mp4_path,
        "-ar", "16000",
        "-ac", "1",
        temp_wav
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    recognized_text = ""
    if os.path.exists(temp_wav) and os.path.getsize(temp_wav) > 1000:
        try:
            with sr.AudioFile(temp_wav) as source:
                # adjust for ambient noise
                audio_data = r.record(source)
                recognized_text = r.recognize_google(audio_data, language="tr-TR")
        except sr.UnknownValueError:
            recognized_text = "" # silence or unintelligible
        except Exception as e:
            recognized_text = f"(Hata: {e})"
    
    if recognized_text:
        line = f"{time_label} {recognized_text}\n"
        print(line.strip())
        with open(output_file, "a", encoding="utf-8") as out_f:
            out_f.write(line)
        results.append({"time": time_label, "text": recognized_text})
    else:
        print(f"{time_label} (Sessiz / Konuşma yok)")
    
    current_start += chunk_duration

if os.path.exists(temp_wav):
    os.remove(temp_wav)

print(f"\nDeşifre tamamlandı! Toplam {len(results)} konuşma bloğu bulundu. Dosya: {output_file}")
