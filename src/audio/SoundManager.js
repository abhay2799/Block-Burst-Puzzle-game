import { zzfx } from 'zzfx';

let muted = false;

try {
  const savedMute = localStorage.getItem('blockblast_muted');
  if (savedMute === 'true') muted = true;
} catch (e) { /* ignore */ }

function play(params) {
  if (muted || document.hidden) return;
  try {
    zzfx(...params);
  } catch (e) { /* audio context not ready */ }
}

function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) { /* not supported */ }
}

function delayedPlay(params, delay) {
  setTimeout(() => {
    if (!document.hidden) play(params);
  }, delay);
}

export const SoundManager = {
  isMuted() {
    return muted;
  },

  toggleMute() {
    muted = !muted;
    try {
      localStorage.setItem('blockblast_muted', muted.toString());
    } catch (e) { /* ignore */ }
    return muted;
  },

  setMuted(val) {
    muted = val;
    try {
      localStorage.setItem('blockblast_muted', muted.toString());
    } catch (e) { /* ignore */ }
  },

  piecePickup() {
    play([1.2,,300,.005,.02,.03,1,1.8,,,,,,,,,,.7,.01]);
    vibrate(15);
  },

  hoverTick() {
    play([0.2,,900,.005,,.01,1,0.3,,,,,,,,,,,.005]);
  },

  piecePlace() {
    play([1.5,,120,.01,.04,.12,1,2.5,,,,,,,,,,,.04]);
    delayedPlay([0.6,,600,.005,.02,.05,1,1.2,,,,,,,,,,,.02], 40);
    vibrate([20, 15, 35]);
  },

  pieceInvalid() {
    play([0.6,,180,.01,.02,.12,3,1.5,,,,,,8,,,,.4,.02]);
    vibrate([30, 10, 30]);
  },

  lineClear(lineIndex = 0) {
    const baseFreq = 550 + lineIndex * 120;
    play([1.2,,baseFreq,.01,.06,.18,1,1.8,,,,,.04,,,,,.85,.04]);
    delayedPlay([0.8,,baseFreq * 1.5,.005,.04,.1,1,1.2,,,,,,,,,,,.03], 60);
    vibrate([20, 12, 40]);
  },

  multiLineClear(count) {
    for (let i = 0; i < count; i++) {
      delayedPlay([1.8,,440 + i * 130,.01,.08,.22,1,1.5,,,250,.04,.08,,,,,.9,.04], i * 70);
    }
    delayedPlay([2,,800,.01,.1,.3,1,0.8,,,400,.05,.1,,,,,.9,.06], count * 70 + 50);
    const pattern = [];
    for (let i = 0; i < count; i++) {
      pattern.push(30, 20);
    }
    pattern.push(60);
    vibrate(pattern);
  },

  combo(level) {
    const freq = 350 + level * 100;
    play([2.2,,freq,.008,.12,.28,2,2.2,,,,,.04,,,,,.92,.06]);
    delayedPlay([1.8,,freq * 1.5,.008,.08,.2,1,1.8,,,300,.03,.05,,,,,.85,.05], 90);
    delayedPlay([1.2,,freq * 2,.005,.06,.15,1,1.2,,,,,,,,,,,.04], 160);
    vibrate([15, 10, 20, 10, 50]);
  },

  levelComplete() {
    play([2,,500,.02,.15,.35,1,1.2,,,,,,.1,,,,,.08]);
    delayedPlay([1.8,,650,.02,.12,.3,1,1,,,,,,,,,,,.06], 150);
    delayedPlay([2.2,,800,.02,.2,.4,1,0.8,,,200,.05,.1,,,,,.95,.08], 300);
    delayedPlay([1.5,,1000,.01,.15,.3,1,1.2,,,,,,,,,,,.06], 450);
    vibrate([20, 30, 20, 30, 20, 30, 60]);
  },

  gameOver() {
    play([2,,500,.04,.2,.4,1,0.6,,-2,,,.08,,,,.15,.7,.15]);
    delayedPlay([1.5,,350,.04,.25,.5,1,0.5,,-3,,,.06,,,,.1,.5,.2], 350);
    delayedPlay([1.2,,200,.05,.3,.6,1,0.4,,-2,,,.05,,,,.08,.4,.25], 700);
    vibrate([60, 50, 100, 50, 150]);
  },

  newTurn() {
    play([0.6,,80,.03,.04,.12,3,1.2,,,-150,.04,.04,,,,,.5,.08]);
    vibrate(10);
  },

  uiClick() {
    play([1.2,,550,.005,.015,.04,1,1.8,,,,,,,,,,.75,.01]);
    vibrate(12);
  },

  scorePop() {
    play([0.8,,700,.005,.03,.08,1,1.5,,,,,,,,,,,.03]);
  }
};
