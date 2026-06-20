import os

# We'll use RogerNeural which is listed as "Lively" or GuyNeural "Passion"
# Let's use GuyNeural with increased rate and pitch for an excited tone.
voice = "en-US-RogerNeural"
words = ["wow", "good", "great", "excellent", "amazing", "wonderful", "genius", "master"]

for word in words:
    # +15% rate and +25Hz pitch makes it sound more energetic and excited
    cmd = f'python -m edge_tts --voice {voice} --rate=+15% --pitch=+25Hz --text "{word.capitalize()}!" --write-media "public/assets/audio/voice_{word}.mp3"'
    os.system(cmd)
