import time
import sys
from pathlib import Path
from google import genai
from google.genai import types

def main():
    client = genai.Client()
    op_name = 'models/veo-3.1-fast-generate-preview/operations/atabfxrh9nbf'
    op = types.GenerateVideosOperation(name=op_name)
    
    print(f"Monitoring operation {op_name}...")
    start_time = time.time()
    
    while True:
        status = client.operations.get(op)
        elapsed = int(time.time() - start_time)
        print(f"[{elapsed}s] Done status: {status.done}")
        
        if status.done:
            if hasattr(status, 'error') and status.error:
                print("Error during video generation:", status.error)
                sys.exit(1)
            
            print("Video generated successfully!")
            video_item = status.response.generated_videos[0]
            out_path = Path(r"C:\Users\hghon\Desktop\sprite-generator\veo_commando_run.mp4")
            print(f"Downloading to {out_path}...")
            client.files.download(file=video_item.video, destination=str(out_path))
            print(f"Downloaded! File size: {out_path.stat().st_size} bytes")
            break
            
        time.sleep(10)

if __name__ == "__main__":
    main()
