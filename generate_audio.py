import os

words = ["good", "great", "excellent", "amazing", "wonderful", "genius", "master"]
for word in words:
    cmd = f'python -m edge_tts --voice en-US-AriaNeural --rate=+10% --pitch=+20Hz --text "{word.capitalize()}!" --write-media "public/assets/audio/voice_{word}.mp3"'
    os.system(cmd)
