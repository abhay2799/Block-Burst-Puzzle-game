import os

# We will use GuyNeural which is a natural, deep male voice.
# We REMOVE the pitch and rate modifiers so it sounds 100% human and NOT robotic/fast.
voice = "en-US-GuyNeural"
words = ["wow", "good", "great", "excellent", "amazing", "wonderful", "genius", "master"]

for word in words:
    cmd = f'python -m edge_tts --voice {voice} --text "{word.capitalize()}!" --write-media "public/assets/audio/voice_{word}.mp3"'
    os.system(cmd)
