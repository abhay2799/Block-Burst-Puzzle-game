import asyncio
import edge_tts

words = ["wow", "good", "great", "excellent", "amazing", "wonderful", "genius", "master"]

async def main():
    # en-US-GuyNeural is a passionate, deep male voice. 
    # We will use normal speed (rate="+0%") so it doesn't sound robotic or fast.
    voice = "en-US-GuyNeural"
    
    for word in words:
        text = f"{word.capitalize()}!"
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(f"public/assets/audio/voice_{word}.mp3")

if __name__ == "__main__":
    asyncio.run(main())
