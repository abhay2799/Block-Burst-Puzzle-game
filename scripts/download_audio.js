import fs from 'fs';
import path from 'path';

const AUDIO_DIR = path.join(import.meta.dirname, '../public/assets/audio');

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Map of our game SFX keys to reliable Google Actions Sound Library files
const fileMap = {
  // UI and interactions
  'uiClick.ogg': 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
  'hoverTick.ogg': 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  
  // Game Actions
  'piecePickup.ogg': 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
  'piecePlace.ogg': 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
  'pieceInvalid.ogg': 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg',
  
  // Scoring
  'lineClear.ogg': 'https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg',
  'multiLineClear.ogg': 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg',
  'combo.ogg': 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg',
  'scorePop.ogg': 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
  
  // Events
  'levelComplete.ogg': 'https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg',
  'gameOver.ogg': 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg',
  'newTurn.ogg': 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  
  // BGM - Relaxing Ambient Loop (waves)
  'bgm.ogg': 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg'
};

async function downloadFile(filename, url) {
  const filepath = path.join(AUDIO_DIR, filename);
  console.log(`Downloading ${filename}...`);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    console.log(`Saved: ${filename}`);
  } catch (error) {
    console.error(`Error downloading ${filename}:`, error.message);
  }
}

async function main() {
  console.log('Downloading high-quality placeholder audio files from Google Actions...');
  
  // Clean up old .wav files
  try {
    const files = fs.readdirSync(AUDIO_DIR);
    for (const file of files) {
      if (file.endsWith('.wav')) {
        fs.unlinkSync(path.join(AUDIO_DIR, file));
      }
    }
  } catch (e) {}

  const promises = Object.entries(fileMap).map(([filename, url]) => downloadFile(filename, url));
  await Promise.all(promises);
  console.log('Audio download complete!');
}

main();
