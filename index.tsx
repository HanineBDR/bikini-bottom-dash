import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

// --- Types ---
type GameState = "START" | "PLAYING" | "PAUSED" | "GAMEOVER";
type CharacterId = "spongebob" | "patrick" | "squidward" | "krabs" | "sandy" | "plankton" | "karen" | "gary";

interface Character {
  id: CharacterId;
  name: string;
  color: string;
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) => void;
}

// --- Style Definitions (Bikini Bottom Style Guide) ---
const CHARACTER_STYLES: Record<CharacterId, {
    bg: string;
    border: string;
    text: string;
    btnClass: string;
    btnHover: string;
    description: string;
}> = {
    spongebob: {
        bg: "linear-gradient(135deg, #FFF04D 0%, #F7DC6F 100%)",
        border: "#F39C12",
        text: "#8B4513",
        btnClass: "bg-[#FFF04D] border-[3px] border-[#F39C12] text-[#8B4513] shadow-[0_4px_0_#E67E22]",
        btnHover: "hover:-translate-y-0.5 hover:shadow-[0_6px_0_#E67E22] active:translate-y-0.5 active:shadow-[0_2px_0_#E67E22]",
        description: "I'm Ready! Bright and cheerful."
    },
    patrick: {
        bg: "linear-gradient(135deg, #FF99AA 0%, #FFC0CB 100%)",
        border: "#E84393",
        text: "#8B0049",
        btnClass: "bg-[#FF99AA] border-[3px] border-[#E84393] text-[#8B0049]",
        btnHover: "hover:scale-105 hover:bg-[#FFC0CB]",
        description: "Is mayonnaise an instrument?"
    },
    squidward: {
        bg: "linear-gradient(135deg, #A0D8C8 0%, #B2EBF2 100%)",
        border: "#00897B",
        text: "#004D40",
        btnClass: "bg-[#A0D8C8] border-[3px] border-[#00897B] text-[#004D40] font-serif",
        btnHover: "hover:bg-[#B2DFDB] hover:shadow-lg",
        description: "Refined taste... whatever."
    },
    krabs: {
        bg: "linear-gradient(135deg, #EF4444 0%, #F87171 100%)",
        border: "#991B1B",
        text: "#7F1D1D",
        btnClass: "bg-[#EF4444] border-[3px] border-[#FFD700] text-white shadow-[0_0_10px_rgba(255,215,0,0.5)]",
        btnHover: "hover:bg-[#DC2626] hover:scale-110 hover:shadow-[0_0_20px_rgba(255,215,0,0.8)]",
        description: "Money money money!"
    },
    sandy: {
        bg: "linear-gradient(135deg, #FCD34D 0%, #FDE047 100%)",
        border: "#B45309",
        text: "#451A03",
        btnClass: "bg-[#FCD34D] border-[3px] border-[#B45309] text-[#451A03] font-mono",
        btnHover: "hover:bg-[#F59E0B] hover:shadow-lg",
        description: "Yee-haw! Science rules!"
    },
    plankton: {
        bg: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)",
        border: "#14532D",
        text: "#DCFCE7",
        btnClass: "bg-[#15803D] border-[3px] border-[#14532D] text-[#DCFCE7] uppercase tracking-wider",
        btnHover: "hover:bg-[#166534] hover:border-[#86EFAC]",
        description: "I went to college!"
    },
    karen: {
        bg: "linear-gradient(135deg, #06B6D4 0%, #67E8F9 100%)",
        border: "#0E7490",
        text: "#155E75",
        btnClass: "bg-[#06B6D4] border-[3px] border-[#0E7490] text-white",
        btnHover: "hover:bg-[#22D3EE] hover:shadow-[0_0_15px_#22D3EE]",
        description: "Analyzing route..."
    },
    gary: {
        bg: "linear-gradient(135deg, #FB7185 0%, #FDA4AF 100%)",
        border: "#BE123C",
        text: "#881337",
        btnClass: "bg-[#FB7185] border-[3px] border-[#BE123C] text-white",
        btnHover: "hover:rotate-3 transition-transform",
        description: "Meow."
    }
};

// --- Constants ---
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const GROUND_HEIGHT = 120;
const INITIAL_SPEED = 9;
const SPEED_INCREMENT = 0.003;
const MAX_JUMP_COUNT = 2;

// --- Audio System ---
class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    try {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtor) {
        this.ctx = new AudioCtor();
      }
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.error(e));
    }
  }

  playJump(charId: CharacterId) {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      // Character specific jump sounds
      switch (charId) {
          case 'patrick':
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(150, t);
              osc.frequency.exponentialRampToValueAtTime(300, t + 0.2);
              break;
          case 'krabs':
              osc.type = 'square';
              osc.frequency.setValueAtTime(600, t);
              osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
              break;
          case 'squidward':
              osc.type = 'sine';
              osc.frequency.setValueAtTime(200, t);
              osc.frequency.linearRampToValueAtTime(180, t + 0.3); // Sad slide
              break;
          case 'karen':
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(400, t);
              osc.frequency.linearRampToValueAtTime(800, t + 0.1);
              break;
          default: // SpongeBob & others
              osc.type = 'sine';
              osc.frequency.setValueAtTime(300, t);
              osc.frequency.linearRampToValueAtTime(600, t + 0.15);
              break;
      }
      
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      
      osc.start();
      osc.stop(t + 0.2);
    } catch (e) { /* ignore */ }
  }

  playCollision() {
      if (!this.ctx || this.isMuted) return;
      try {
          const t = this.ctx.currentTime;
          // Noise buffer for crash
          const bufferSize = this.ctx.sampleRate * 0.3; // 300ms
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
          }

          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;
          const noiseGain = this.ctx.createGain();
          noise.connect(noiseGain);
          noiseGain.connect(this.ctx.destination);
          
          noiseGain.gain.setValueAtTime(0.3, t);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
          noise.start();

          // Low thud
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(100, t);
          osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
          gain.gain.setValueAtTime(0.5, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.3);
          osc.start();
          osc.stop(t + 0.3);

      } catch (e) { /* ignore */ }
  }

  playGameOver() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.8);
      
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.8);
      
      osc.start();
      osc.stop(t + 0.8);
    } catch (e) { /* ignore */ }
  }
}

const soundManager = new SoundManager();

// --- Drawing Helpers (Enhanced & Scaled Up) ---
// Base scale is roughly 1.5x previous size (approx 80px width, 96px height)

const drawSpongeBob = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, f: number) => {
  const bobY = y + Math.sin(f * 0.1) * 2;
  const colors = {
    body: "#FFF04D",
    pore: "#B5C82E",
    shirt: "#FFFFFF",
    pants: "#A05A2C",
    tie: "#EC1C24",
    eyeBlue: "#74C3DC",
    stroke: "#000000"
  };

  const bodyH = h * 0.72;
  ctx.lineWidth = 4; // Thicker lines for bigger char
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colors.stroke;

  // 1. Legs behind
  const legOffset = Math.sin(f * 0.5) * 8;
  const drawLeg = (lx: number, offset: number) => {
      ctx.fillStyle = colors.body;
      ctx.beginPath();
      ctx.rect(lx, bobY + bodyH + 20 + 15, 8, 18); // leg skin
      ctx.fill(); ctx.stroke();
      
      // Sock
      const sockY = bobY + bodyH + 20 + 25;
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.rect(lx, sockY + offset, 8, 14); ctx.fill(); ctx.stroke();
      // Stripes
      ctx.fillStyle = "#33CCFF"; ctx.fillRect(lx, sockY + offset + 3, 8, 3);
      ctx.fillStyle = "#FF3333"; ctx.fillRect(lx, sockY + offset + 8, 8, 3);
      
      // Shoe
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.moveTo(lx - 3, sockY + offset + 14);
      ctx.lineTo(lx + 11, sockY + offset + 14);
      ctx.quadraticCurveTo(lx + 15, sockY + offset + 19, lx + 11, sockY + offset + 24);
      ctx.lineTo(lx - 3, sockY + offset + 24);
      ctx.quadraticCurveTo(lx - 5, sockY + offset + 19, lx - 3, sockY + offset + 14);
      ctx.fill(); ctx.stroke();
      // Shine
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.ellipse(lx + 8, sockY + offset + 18, 3, 1.5, -0.5, 0, Math.PI*2);
      ctx.fill();
  };
  drawLeg(x + w * 0.35, legOffset);
  drawLeg(x + w * 0.65, -legOffset);

  // 2. Sponge Body (Wavy)
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  const waveSize = 3;
  // Top
  ctx.moveTo(x, bobY);
  for(let i=0; i<w; i+=12) ctx.quadraticCurveTo(x + i + 6, bobY - waveSize, x + i + 12, bobY);
  // Right
  for(let i=0; i<bodyH; i+=12) ctx.quadraticCurveTo(x + w + waveSize, bobY + i + 6, x + w, bobY + i + 12);
  // Bottom line (straight connection to clothes)
  ctx.lineTo(x, bobY + bodyH);
  // Left
  for(let i=bodyH; i>0; i-=12) ctx.quadraticCurveTo(x - waveSize, bobY + i - 6, x, bobY + i - 12);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // 3. Pores
  ctx.fillStyle = colors.pore;
  const pores = [[0.15, 0.15, 7], [0.85, 0.2, 6], [0.2, 0.8, 6], [0.8, 0.7, 5], [0.9, 0.4, 3]];
  pores.forEach(([px, py, r]) => {
      ctx.beginPath();
      ctx.arc(x + w*px, bobY + bodyH*py, r, 0, Math.PI*2);
      ctx.fill();
  });

  // 4. Face
  const eyeY = bobY + bodyH * 0.35;
  const eyeR = w * 0.16;
  
  // Eyes (Touching)
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x + w * 0.5 - eyeR + 3, eyeY, eyeR, 0, Math.PI*2); // Left
  ctx.arc(x + w * 0.5 + eyeR - 3, eyeY, eyeR, 0, Math.PI*2); // Right
  ctx.fill(); ctx.stroke();

  // Pupils
  const drawPupil = (ex: number, ey: number) => {
      ctx.fillStyle = colors.eyeBlue;
      ctx.beginPath(); ctx.arc(ex, ey, eyeR * 0.45, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "black";
      ctx.beginPath(); ctx.arc(ex, ey, eyeR * 0.2, 0, Math.PI*2); ctx.fill();
  };
  drawPupil(x + w * 0.5 - eyeR + 6, eyeY);
  drawPupil(x + w * 0.5 + eyeR - 6, eyeY);

  // Eyelashes
  ctx.lineWidth = 3;
  const lashes = [-12, 0, 12];
  lashes.forEach(off => {
      ctx.beginPath(); ctx.moveTo(x + w * 0.5 - eyeR + 3 + off, eyeY - eyeR); ctx.lineTo(x + w * 0.5 - eyeR + 3 + off * 1.5, eyeY - eyeR - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.5 + eyeR - 3 + off, eyeY - eyeR); ctx.lineTo(x + w * 0.5 + eyeR - 3 + off * 1.5, eyeY - eyeR - 10); ctx.stroke();
  });
  ctx.lineWidth = 4;

  // Nose
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5 - 6, eyeY + 12);
  ctx.quadraticCurveTo(x + w * 0.5 + 18, eyeY + 6, x + w * 0.5 + 6, eyeY + 18);
  ctx.quadraticCurveTo(x + w * 0.5, eyeY + 18, x + w * 0.5 - 6, eyeY + 12);
  ctx.fill(); ctx.stroke();

  // Mouth
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, bobY + bodyH * 0.65);
  ctx.bezierCurveTo(x + w * 0.4, bobY + bodyH * 0.85, x + w * 0.6, bobY + bodyH * 0.85, x + w * 0.75, bobY + bodyH * 0.65);
  ctx.stroke();

  // Cheeks
  ctx.strokeStyle = "#CC3333";
  ctx.beginPath();
  ctx.moveTo(x + w*0.25, bobY + bodyH * 0.65); ctx.quadraticCurveTo(x+w*0.2, bobY+bodyH*0.58, x+w*0.15, bobY+bodyH*0.62); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w*0.75, bobY + bodyH * 0.65); ctx.quadraticCurveTo(x+w*0.8, bobY+bodyH*0.58, x+w*0.85, bobY+bodyH*0.62); ctx.stroke();
  ctx.strokeStyle = "black"; // Reset

  // Teeth
  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.rect(x + w*0.4, bobY + bodyH*0.75, 10, 12); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(x + w*0.52, bobY + bodyH*0.75, 10, 12); ctx.fill(); ctx.stroke();

  // 5. Clothes
  const shirtY = bobY + bodyH;
  // Shirt
  ctx.fillStyle = colors.shirt;
  ctx.beginPath(); ctx.rect(x, shirtY, w, 24); ctx.fill(); ctx.stroke();
  // Pants
  ctx.fillStyle = colors.pants;
  ctx.beginPath(); ctx.rect(x, shirtY + 24, w, 24); ctx.fill(); ctx.stroke();
  // Belt
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, shirtY + 36); ctx.lineTo(x + w, shirtY + 36); ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 4;

  // Tie
  ctx.fillStyle = colors.tie;
  ctx.beginPath();
  ctx.moveTo(x + w*0.5, shirtY + 6);
  ctx.lineTo(x + w*0.5 + 8, shirtY + 14);
  ctx.lineTo(x + w*0.5, shirtY + 22);
  ctx.lineTo(x + w*0.5 - 8, shirtY + 14);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w*0.5, shirtY + 22);
  ctx.lineTo(x + w*0.5 + 6, shirtY + 38);
  ctx.lineTo(x + w*0.5 - 6, shirtY + 38);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Collar
  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.moveTo(x + w*0.3, shirtY); ctx.lineTo(x + w*0.45, shirtY+12); ctx.lineTo(x + w*0.4, shirtY); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w*0.7, shirtY); ctx.lineTo(x + w*0.55, shirtY+12); ctx.lineTo(x + w*0.6, shirtY); ctx.fill(); ctx.stroke();

  // Arms
  const armY = shirtY + 6;
  ctx.fillStyle = "white"; // sleeve
  ctx.beginPath(); ctx.moveTo(x, armY); ctx.lineTo(x-10, armY+12); ctx.lineTo(x, armY+18); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+w, armY); ctx.lineTo(x+w+10, armY+12); ctx.lineTo(x+w, armY+18); ctx.fill(); ctx.stroke();
  
  ctx.fillStyle = colors.body; // arm
  ctx.beginPath(); ctx.rect(x-8, armY+18, 5, 24); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(x+w+3, armY+18, 5, 24); ctx.fill(); ctx.stroke();
};

const drawPatrick = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, f: number) => {
  const patY = y + Math.sin(f * 0.1) * 3;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "black";
  ctx.lineJoin = 'round';
  
  // Body Shape
  ctx.fillStyle = "#FF99AA"; // Starfish Pink
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, patY); // Top tip
  ctx.quadraticCurveTo(x + w * 0.9, patY + h * 0.4, x + w, patY + h * 0.6); // Right arm top
  ctx.quadraticCurveTo(x + w * 0.8, patY + h * 0.7, x + w * 0.75, patY + h * 0.7); // Right arm under
  ctx.lineTo(x + w * 0.75, patY + h); // Right leg
  ctx.lineTo(x + w * 0.25, patY + h); // Left leg
  ctx.lineTo(x + w * 0.25, patY + h * 0.7); // Left arm under
  ctx.quadraticCurveTo(x + w * 0.2, patY + h * 0.7, x, patY + h * 0.6); // Left arm top
  ctx.quadraticCurveTo(x + w * 0.1, patY + h * 0.4, x + w * 0.5, patY); // Back to top
  ctx.fill(); ctx.stroke();

  // Shorts
  ctx.fillStyle = "#B3E33B"; // Lime Green
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, patY + h * 0.7);
  ctx.lineTo(x + w * 0.75, patY + h * 0.7);
  ctx.lineTo(x + w * 0.75, patY + h * 0.85);
  ctx.lineTo(x + w * 0.25, patY + h * 0.85);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Flowers on shorts
  ctx.fillStyle = "#9366B4"; // Purple
  const drawFlower = (fx: number, fy: number) => {
      ctx.beginPath();
      ctx.moveTo(fx, fy-4); ctx.lineTo(fx+3, fy); ctx.lineTo(fx+1, fy+4); ctx.lineTo(fx-1, fy+4); ctx.lineTo(fx-3, fy);
      ctx.fill();
  };
  drawFlower(x + w * 0.35, patY + h * 0.75);
  drawFlower(x + w * 0.65, patY + h * 0.8);

  // Legs (Skin)
  const legOffset = Math.sin(f * 0.5) * 6;
  ctx.fillStyle = "#FF99AA";
  ctx.beginPath(); ctx.ellipse(x + w * 0.35, patY + h * 0.9 + legOffset, 10, 12, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + w * 0.65, patY + h * 0.9 - legOffset, 10, 12, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

  // Face
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.4, patY + h * 0.3, 10, 15, 0, 0, Math.PI*2); // Left Eye
  ctx.ellipse(x + w * 0.6, patY + h * 0.3, 10, 15, 0, 0, Math.PI*2); // Right Eye
  ctx.fill(); ctx.stroke();

  // Pupils
  ctx.fillStyle = "black";
  ctx.beginPath(); ctx.arc(x + w * 0.42, patY + h * 0.3, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + w * 0.58, patY + h * 0.3, 3, 0, Math.PI*2); ctx.fill();

  // Eyebrows (Z shape)
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + w * 0.35, patY + h * 0.2); ctx.lineTo(x + w * 0.4, patY + h * 0.22); ctx.lineTo(x + w * 0.45, patY + h * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.55, patY + h * 0.2); ctx.lineTo(x + w * 0.6, patY + h * 0.22); ctx.lineTo(x + w * 0.65, patY + h * 0.2); ctx.stroke();
  ctx.lineWidth = 4;

  // Mouth
  ctx.beginPath(); ctx.arc(x + w * 0.5, patY + h * 0.4, 10, 0, Math.PI, false); ctx.stroke();
  
  // Navel
  ctx.beginPath(); ctx.arc(x + w * 0.5, patY + h * 0.6, 2.5, 0, Math.PI, true); ctx.stroke();
};

const drawSquidward = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, f: number) => {
  const sqY = y + Math.sin(f * 0.1) * 2;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "black";
  
  // Head (Bulbous)
  ctx.fillStyle = "#A0D8C8";
  ctx.beginPath();
  ctx.arc(x + w * 0.5, sqY + h * 0.25, w * 0.4, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();

  // Eyes (Bored)
  ctx.fillStyle = "#FFFEF2"; // Yellowish white
  ctx.beginPath(); ctx.ellipse(x + w * 0.35, sqY + h * 0.2, 12, 16, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + w * 0.65, sqY + h * 0.2, 12, 16, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  
  // Eyelids
  ctx.fillStyle = "#A0D8C8";
  ctx.beginPath(); ctx.moveTo(x + w * 0.25, sqY + h * 0.18); ctx.lineTo(x + w * 0.45, sqY + h * 0.18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.55, sqY + h * 0.18); ctx.lineTo(x + w * 0.75, sqY + h * 0.18); ctx.stroke();

  // Pupils (Rectangular)
  ctx.fillStyle = "#932626";
  ctx.fillRect(x + w * 0.34, sqY + h * 0.2, 5, 5);
  ctx.fillRect(x + w * 0.64, sqY + h * 0.2, 5, 5);

  // Nose (Droopy)
  ctx.fillStyle = "#A0D8C8";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.45, sqY + h * 0.28);
  ctx.bezierCurveTo(x + w * 0.3, sqY + h * 0.45, x + w * 0.7, sqY + h * 0.45, x + w * 0.55, sqY + h * 0.28);
  ctx.fill(); ctx.stroke();

  // Shirt
  ctx.fillStyle = "#C27B36"; // Brown
  ctx.beginPath(); ctx.rect(x + w * 0.25, sqY + h * 0.45, w * 0.5, h * 0.25); ctx.fill(); ctx.stroke();

  // Tentacles
  ctx.fillStyle = "#A0D8C8";
  for(let i=0; i<4; i++) {
      const offsetX = x + w * 0.25 + (i * 12);
      const wiggle = Math.sin(f * 0.5 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(offsetX, sqY + h * 0.7);
      ctx.lineTo(offsetX, sqY + h + wiggle);
      ctx.lineTo(offsetX + 10, sqY + h + wiggle);
      ctx.lineTo(offsetX + 10, sqY + h * 0.7);
      ctx.fill(); ctx.stroke();
  }
};

const drawKrabs = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, f: number) => {
  const kY = y + Math.sin(f * 0.2) * 2;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "black";
  
  // Eye Stalks
  ctx.fillStyle = "#EF4444";
  ctx.beginPath(); ctx.rect(x + w*0.35, kY, 6, 24); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(x + w*0.6, kY, 6, 24); ctx.fill(); ctx.stroke();
  
  // Eyes
  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.ellipse(x + w * 0.35 + 3, kY, 10, 14, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + w * 0.6 + 3, kY, 10, 14, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "black";
  ctx.beginPath(); ctx.arc(x + w * 0.35 + 3, kY, 4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + w * 0.6 + 3, kY, 4, 0, Math.PI*2); ctx.fill();

  // Body (Jagged Shell)
  ctx.fillStyle = "#EF4444";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, kY + h * 0.4);
  ctx.quadraticCurveTo(x + w, kY + h * 0.5, x + w * 0.8, kY + h * 0.7);
  ctx.lineTo(x + w * 0.5, kY + h * 0.85);
  ctx.lineTo(x + w * 0.2, kY + h * 0.7);
  ctx.quadraticCurveTo(x, kY + h * 0.5, x + w * 0.5, kY + h * 0.4);
  ctx.fill(); ctx.stroke();

  // Clothes
  ctx.fillStyle = "#60A5FA"; // Blue Shirt
  ctx.beginPath(); ctx.rect(x + w * 0.25, kY + h * 0.55, w * 0.5, 24); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#4338CA"; // Pants
  ctx.beginPath(); ctx.rect(x + w * 0.25, kY + h * 0.55 + 24, w * 0.5, 12); ctx.fill(); ctx.stroke();
  // Gold Buckle
  ctx.fillStyle = "#FCD34D";
  ctx.fillRect(x + w * 0.45, kY + h * 0.55 + 24, 12, 12);

  // Claws
  ctx.fillStyle = "#EF4444";
  const armWiggle = Math.sin(f*0.2) * 10;
  const drawClaw = (cx: number, cy: number, flip: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(flip * 0.5);
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12, -12); ctx.stroke(); // Open claw
      ctx.restore();
  }
  drawClaw(x + 12, kY + h * 0.5 + armWiggle, -1);
  drawClaw(x + w - 12, kY + h * 0.5 - armWiggle, 1);

  // Legs (Pegs)
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x + w * 0.4, kY + h * 0.85); ctx.lineTo(x + w * 0.35, kY + h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.6, kY + h * 0.85); ctx.lineTo(x + w * 0.65, kY + h); ctx.stroke();
};

const drawSandy = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, f: number) => {
  const sY = y + Math.sin(f * 0.1) * 2;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "black";

  // Tail
  ctx.fillStyle = "#B45309";
  ctx.beginPath();
  ctx.ellipse(x + 12, sY + h * 0.8, 14, 24, 0.5, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();

  // Helmet (Back)
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath(); ctx.arc(x + w * 0.5, sY + h * 0.3, w * 0.35, 0, Math.PI*2); ctx.fill();

  // Head
  ctx.fillStyle = "#B45309";
  ctx.beginPath(); ctx.ellipse(x + w * 0.5, sY + h * 0.35, 16, 14, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Face
  ctx.fillStyle = "#FDE68A";
  ctx.beginPath(); ctx.ellipse(x + w * 0.5, sY + h * 0.38, 12, 10, 0, 0, Math.PI*2); ctx.fill();

  // Flower
  ctx.fillStyle = "#EC4899";
  ctx.beginPath(); ctx.arc(x + w * 0.72, sY + h * 0.15, 8, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#FCD34D";
  ctx.beginPath(); ctx.arc(x + w * 0.72, sY + h * 0.15, 3, 0, Math.PI*2); ctx.fill();

  // Helmet (Front outline)
  ctx.beginPath(); ctx.arc(x + w * 0.5, sY + h * 0.3, w * 0.35, 0, Math.PI*2); ctx.stroke();
  // Shine
  ctx.strokeStyle = "white"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + w * 0.5, sY + h * 0.3, w * 0.3, 3.8, 4.5); ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = "black";

  // Suit
  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.rect(x + w * 0.25, sY + h * 0.5, w * 0.5, h * 0.35); ctx.fill(); ctx.stroke();
  // Acorn Logo
  ctx.fillStyle = "#F59E0B";
  ctx.beginPath(); ctx.arc(x + w * 0.45, sY + h * 0.6, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();

  // Boots
  ctx.fillStyle = "#94A3B8";
  const legOffset = Math.sin(f * 0.5) * 8;
  ctx.fillRect(x + w * 0.3, sY + h * 0.85 + legOffset, 16, 14); ctx.strokeRect(x + w * 0.3, sY + h * 0.85 + legOffset, 16, 14);
  ctx.fillRect(x + w * 0.55, sY + h * 0.85 - legOffset, 16, 14); ctx.strokeRect(x + w * 0.55, sY + h * 0.85 - legOffset, 16, 14);
};

const drawPlankton = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, f: number) => {
  const pSize = w * 0.35;
  const pX = x + (w - pSize) / 2;
  const pY = y + h - pSize * 2 - Math.abs(Math.sin(f*0.2)*20);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "black";

  // Antennae
  const antWiggle = Math.sin(f * 0.5) * 6;
  ctx.beginPath(); ctx.moveTo(pX + 5, pY); ctx.quadraticCurveTo(pX - 12 + antWiggle, pY - 35, pX - 6, pY - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pX + pSize - 5, pY); ctx.quadraticCurveTo(pX + pSize + 12 + antWiggle, pY - 35, pX + pSize + 6, pY - 40); ctx.stroke();

  // Body
  ctx.fillStyle = "#15803D"; // Deep Green
  ctx.beginPath();
  ctx.ellipse(pX + pSize/2, pY + pSize, pSize/2, pSize, 0, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();
  
  // Eye (Cyclops)
  ctx.fillStyle = "#FEF9C3";
  ctx.beginPath(); ctx.arc(pX + pSize/2, pY + pSize * 0.5, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#DC2626";
  ctx.beginPath(); ctx.arc(pX + pSize/2, pY + pSize * 0.5, 5, 0, Math.PI*2); ctx.fill();

  // Eyebrow
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(pX, pY + pSize * 0.2); ctx.lineTo(pX + pSize, pY + pSize * 0.3); ctx.stroke();
};

const drawKaren = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, f: number) => {
    const kY = y + Math.sin(f*0.1)*3;
    ctx.lineWidth = 4; ctx.strokeStyle = "black";
    
    // Monitor
    ctx.fillStyle = "#E5E7EB";
    ctx.beginPath(); ctx.rect(x + 6, kY, w - 12, h * 0.45); ctx.fill(); ctx.stroke();
    
    // Screen
    ctx.fillStyle = "#111827";
    ctx.fillRect(x + 12, kY + 6, w - 24, h * 0.45 - 12);
    
    // Wavelength Face
    ctx.strokeStyle = "#22D3EE"; ctx.lineWidth = 3;
    ctx.beginPath();
    for(let i=0; i<w-24; i+=6) {
        const wy = kY + 6 + (h * 0.45 - 12)/2 + Math.sin((i + f*5)*0.3) * 10;
        if(i===0) ctx.moveTo(x+12+i, wy); else ctx.lineTo(x+12+i, wy);
    }
    ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = "black";

    // Neck
    ctx.fillStyle = "#9CA3AF";
    ctx.beginPath(); ctx.rect(x + w * 0.4, kY + h * 0.45, w * 0.2, h * 0.4); ctx.fill(); ctx.stroke();

    // Wheels
    ctx.fillStyle = "#374151";
    ctx.beginPath(); ctx.arc(x + 24, kY + h - 6, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + w - 24, kY + h - 6, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
};

const drawGary = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, f: number) => {
  const gY = y + Math.sin(f * 0.1) * 2;
  ctx.lineWidth = 4; ctx.strokeStyle = "black";
  
  // Shell
  ctx.fillStyle = "#F472B6";
  ctx.beginPath(); ctx.arc(x + w * 0.45, gY + h * 0.5, w * 0.35, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  
  // Spiral
  ctx.strokeStyle = "#9D174D"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x + w * 0.45, gY + h * 0.5, w * 0.2, 0, Math.PI*2); ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = "black";
  
  // Body
  ctx.fillStyle = "#93C5FD";
  const slime = Math.sin(f*0.2)*3;
  ctx.beginPath(); ctx.ellipse(x + w * 0.5, gY + h * 0.85, w * 0.45, 14 + slime, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

  // Eye Stalks
  ctx.beginPath(); ctx.moveTo(x + w * 0.65, gY + h * 0.75); ctx.lineTo(x + w * 0.8, gY + h * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.55, gY + h * 0.75); ctx.lineTo(x + w * 0.65, gY + h * 0.25); ctx.stroke();

  // Eyes
  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.arc(x + w * 0.8, gY + h * 0.2, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + w * 0.65, gY + h * 0.25, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  
  ctx.fillStyle = "#EF4444";
  ctx.beginPath(); ctx.arc(x + w * 0.8, gY + h * 0.2, 4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + w * 0.65, gY + h * 0.25, 4, 0, Math.PI*2); ctx.fill();
};

const drawObstacle = (ctx: CanvasRenderingContext2D, obs: any, frame: number) => {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    ctx.lineJoin = "round";

    if (obs.type === 'jellyfish') {
        const bob = Math.sin(frame * 0.1 + obs.bobOffset) * 15;
        ctx.translate(0, bob);
        
        // Head
        ctx.fillStyle = "rgba(236, 72, 153, 0.9)"; // Pink
        ctx.beginPath();
        ctx.arc(obs.width/2, obs.height/2, obs.width/2, Math.PI, 0);
        ctx.lineTo(obs.width, obs.height * 0.8);
        ctx.bezierCurveTo(obs.width*0.75, obs.height*0.6, obs.width*0.25, obs.height*0.6, 0, obs.height*0.8);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        
        // Spots
        ctx.fillStyle = "#BE185D";
        ctx.beginPath(); ctx.arc(obs.width*0.3, obs.height*0.25, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(obs.width*0.7, obs.height*0.35, 4, 0, Math.PI*2); ctx.fill();

        // Tentacles
        ctx.strokeStyle = "#EC4899";
        for(let i=1; i<=3; i++) {
            ctx.beginPath();
            ctx.moveTo(obs.width * 0.25 * i, obs.height * 0.8);
            ctx.quadraticCurveTo(obs.width * 0.25 * i + Math.sin(frame*0.2)*6, obs.height, obs.width * 0.25 * i, obs.height + 20);
            ctx.stroke();
        }

    } else if (obs.type === 'patty') {
         // Krabby Patty
         // Bottom Bun
         ctx.fillStyle = "#FDBA74"; ctx.beginPath(); ctx.rect(0, 25, obs.width, 12); ctx.fill(); ctx.stroke();
         // Meat
         ctx.fillStyle = "#5D4037"; ctx.beginPath(); ctx.rect(3, 18, obs.width-6, 7); ctx.fill(); ctx.stroke();
         // Cheese
         ctx.fillStyle = "#FACC15"; ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(obs.width, 18); ctx.lineTo(obs.width, 22); ctx.lineTo(0, 15); ctx.fill();
         // Lettuce
         ctx.fillStyle = "#22C55E";
         ctx.beginPath(); ctx.moveTo(0, 15); for(let i=0; i<obs.width; i+=6) ctx.lineTo(i, 12 + Math.random()*5); ctx.lineTo(obs.width, 15); ctx.fill(); ctx.stroke();
         // Top Bun
         ctx.fillStyle = "#FDBA74"; 
         ctx.beginPath(); ctx.moveTo(0, 12); ctx.quadraticCurveTo(obs.width/2, -12, obs.width, 12); ctx.fill(); ctx.stroke();
         // Sesame Seeds
         ctx.fillStyle = "#FDE047";
         for(let i=0; i<6; i++) {
             ctx.beginPath(); ctx.arc(10 + Math.random()*(obs.width-20), 0 + Math.random()*12, 1.5, 0, Math.PI*2); ctx.fill();
         }

    } else if (obs.type === 'anchor') {
        ctx.fillStyle = "#4B5563"; // Metal Grey
        ctx.beginPath();
        // Ring
        ctx.arc(obs.width/2, 0, 10, 0, Math.PI*2); 
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(obs.width/2, 0, 4, 0, Math.PI*2); ctx.fill();
        
        // Shank
        ctx.fillStyle = "#4B5563";
        ctx.beginPath(); ctx.rect(obs.width/2 - 5, 10, 10, obs.height - 25); ctx.fill(); ctx.stroke();
        
        // Stock (Crossbar)
        ctx.beginPath(); ctx.rect(6, 18, obs.width-12, 8); ctx.fill(); ctx.stroke();

        // Flukes (Bottom)
        ctx.beginPath();
        ctx.arc(obs.width/2, obs.height - 30, 30, 0, Math.PI, false);
        ctx.lineTo(obs.width/2, obs.height - 18);
        ctx.fill(); ctx.stroke();

    } else {
         // Coral
         ctx.fillStyle = obs.color;
         ctx.beginPath();
         ctx.moveTo(obs.width/2, obs.height);
         ctx.quadraticCurveTo(obs.width/2, obs.height/2, obs.width, obs.height*0.2); // Right branch
         ctx.quadraticCurveTo(obs.width*0.8, obs.height*0.4, obs.width/2, obs.height/2);
         ctx.quadraticCurveTo(obs.width/2, obs.height/3, 0, obs.height*0.1); // Left branch
         ctx.quadraticCurveTo(obs.width*0.2, obs.height*0.4, obs.width/2, obs.height);
         ctx.fill(); ctx.stroke();
         // Texture
         ctx.fillStyle = "rgba(0,0,0,0.1)";
         ctx.beginPath(); ctx.arc(obs.width/2, obs.height*0.8, 4, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(obs.width*0.6, obs.height*0.5, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
};

const CHARACTERS: Character[] = [
  { id: "spongebob", name: "SpongeBob", color: "#FACC15", draw: drawSpongeBob },
  { id: "patrick", name: "Patrick", color: "#FDA4AF", draw: drawPatrick },
  { id: "squidward", name: "Squidward", color: "#99F6E4", draw: drawSquidward },
  { id: "krabs", name: "Mr. Krabs", color: "#DC2626", draw: drawKrabs },
  { id: "sandy", name: "Sandy", color: "#FFFFFF", draw: drawSandy },
  { id: "plankton", name: "Plankton", color: "#15803D", draw: drawPlankton },
  { id: "karen", name: "Karen", color: "#22D3EE", draw: drawKaren },
  { id: "gary", name: "Gary", color: "#EC4899", draw: drawGary },
];

const OBSTACLES = [
  { type: "jellyfish", yOffset: 100, width: 60, height: 60, color: "#DB2777" },
  { type: "anchor", yOffset: 0, width: 70, height: 90, color: "#1F2937" },
  { type: "coral", yOffset: 0, width: 60, height: 75, color: "#EC4899" },
  { type: "patty", yOffset: 0, width: 65, height: 45, color: "#78350F" }
];

// --- Components ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>("START");
  const [selectedCharId, setSelectedCharId] = useState<CharacterId>("spongebob");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("bikini-bottom-dash-hiscore");
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("bikini-bottom-dash-hiscore", score.toString());
    }
  }, [score, highScore]);

  const startGame = () => {
    setScore(0);
    setGameState("PLAYING");
    soundManager.resume();
  };
  
  const restartGame = () => {
      setGameState("START");
      setTimeout(() => startGame(), 0);
  };

  const handleGameOver = (finalScore: number) => {
    setScore(Math.floor(finalScore));
    setGameState("GAMEOVER");
    soundManager.playGameOver();
  };

  const handleHome = () => {
      setGameState("START");
      setScore(0);
  }

  const togglePause = () => {
      if (gameState === "PLAYING") {
          setGameState("PAUSED");
      } else if (gameState === "PAUSED") {
          setGameState("PLAYING");
      }
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      {/* Game Canvas */}
      <GameCanvas
        character={CHARACTERS.find((c) => c.id === selectedCharId)!}
        gameState={gameState}
        onGameOver={handleGameOver}
        onScoreUpdate={setScore}
      />

      {/* UI Overlays */}
      {gameState === "START" && (
        <StartScreen
          onStart={startGame}
          selectedCharId={selectedCharId}
          onSelectChar={setSelectedCharId}
          highScore={highScore}
        />
      )}

      {/* Pause Menu */}
      {gameState === "PAUSED" && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white/90 p-8 rounded-[30px] shadow-2xl flex flex-col gap-4 items-center border-4 border-[#38BDF8]">
                  <h2 className="text-4xl font-black text-[#0284C7] mb-2 font-comic uppercase tracking-wider">Paused</h2>
                  
                  <button onClick={togglePause} className="w-48 py-3 bg-[#FACC15] border-[3px] border-[#EAB308] rounded-full text-[#713F12] font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                      </svg>
                      Resume
                  </button>

                  <button onClick={restartGame} className="w-48 py-3 bg-[#4ADE80] border-[3px] border-[#16A34A] rounded-full text-[#064E3B] font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                         <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" />
                      </svg>
                      Restart
                  </button>

                  <button onClick={handleHome} className="w-48 py-3 bg-white border-[3px] border-gray-300 rounded-full text-gray-600 font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                         <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                         <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                      </svg>
                      Home
                  </button>
              </div>
          </div>
      )}

      {gameState === "GAMEOVER" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-50 text-white animate-in fade-in duration-300">
          <h2 className="text-6xl font-black mb-4 text-[#FACC15] drop-shadow-[0_4px_0_#78350F] tracking-wide stroke-black">BARNACLES!</h2>
          <p className="text-3xl mb-8 font-bold font-comic">Score: {score}</p>
          
          <div className="flex gap-4">
              <button
                onClick={startGame}
                className="px-8 py-3 bg-[#FACC15] text-[#78350F] rounded-full font-bold text-2xl hover:scale-110 transition-transform shadow-[0_4px_0_#B45309] active:translate-y-1 active:shadow-none font-comic"
              >
                Try Again
              </button>
              
              <button
                onClick={handleHome}
                className="w-16 h-16 flex items-center justify-center bg-white text-[#1a4c6e] rounded-full font-bold hover:scale-110 transition-transform shadow-[0_4px_0_#94A3B8] active:translate-y-1 active:shadow-none"
                aria-label="Home"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </button>
          </div>
        </div>
      )}

      {/* HUD */}
      {(gameState === "PLAYING" || gameState === "PAUSED") && (
        <>
            <div className="absolute top-6 left-6 z-40">
                <button 
                    onClick={togglePause}
                    className="w-12 h-12 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform border-2 border-[#0284C7]"
                    aria-label="Pause"
                >
                    {gameState === 'PAUSED' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#0284C7]">
                          <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#0284C7]">
                            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
            </div>
            
            <div className="absolute top-6 right-6 flex gap-6 text-white font-black text-2xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] z-40 font-comic">
              <div className="opacity-80">HI {highScore.toString().padStart(5, '0')}</div>
              <div>{score.toString().padStart(5, '0')}</div>
            </div>
        </>
      )}
      
      {/* Mobile Input Overlay */}
      {gameState === "PLAYING" && (
        <div 
          className="absolute inset-0 z-30 touch-manipulation" 
          onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', {'code': 'Space'})); }}
          onMouseDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', {'code': 'Space'})); }}
        ></div>
      )}
    </div>
  );
}

// Helper Component: Animated Character Preview
function CharacterPreview({ character }: { character: Character }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let animationId: number;

    const render = () => {
      // Clear with transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw character centered and scaled up relative to game size
      // Canvas 200x200. Character Size approx 80x96.
      // Scaled 1.2x for preview: 96x115
      character.draw(ctx, 52, 42, 96, 115, frame);
      
      frame++;
      animationId = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(animationId);
  }, [character]);

  return <canvas ref={canvasRef} width={200} height={200} className="w-32 h-32 md:w-52 md:h-52 drop-shadow-2xl" />;
}

function StartScreen({
  onStart,
  selectedCharId,
  onSelectChar,
  highScore
}: {
  onStart: () => void;
  selectedCharId: CharacterId;
  onSelectChar: (id: CharacterId) => void;
  highScore: number;
}) {
  const currentStyle = CHARACTER_STYLES[selectedCharId];

  return (
    <div className="absolute inset-0 flex flex-col items-center overflow-y-auto p-4 md:justify-center z-50">
      {/* Container matching style guide */}
      <div className="max-w-2xl w-full bg-white/95 rounded-[30px] p-4 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95 duration-300 flex flex-col items-center border-4 border-white/50 backdrop-blur-sm mt-4 md:mt-0">
         
         {/* Title */}
         <h1 className="text-center text-[#FF6B35] text-4xl md:text-6xl mb-2 md:mb-4 drop-shadow-[3px_3px_0_#FFE66D] -rotate-2 font-black tracking-wide">
             Welcome to Bikini Bottom
         </h1>

         {/* Character Preview (Large & Top) */}
         <div className="mb-3 md:mb-6 relative group cursor-pointer shrink-0" onClick={onStart}>
             <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-white/20 rounded-full blur-xl transform scale-150 opacity-50"></div>
             <CharacterPreview character={CHARACTERS.find(c => c.id === selectedCharId)!} />
             <div className="absolute bottom-0 w-full text-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold text-gray-500">Tap to Start</div>
         </div>

         {/* Character Selection Grid */}
         <div className="w-full mb-4 md:mb-6 shrink-0">
             <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-[#4A90E2] text-center uppercase tracking-wider">Choose Your Runner</h3>
             <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                {CHARACTERS.map((char) => {
                    const charStyle = CHARACTER_STYLES[char.id];
                    const isSelected = selectedCharId === char.id;
                    return (
                        <button
                            key={char.id}
                            onClick={() => onSelectChar(char.id)}
                            className={`w-12 h-12 md:w-16 md:h-16 rounded-xl transition-all duration-300 flex items-center justify-center border-4 relative group ${
                                isSelected ? 'scale-110 -translate-y-2 z-10' : 'hover:scale-105 opacity-80 hover:opacity-100'
                            }`}
                            style={{
                                background: charStyle.bg,
                                borderColor: isSelected ? charStyle.border : 'transparent',
                                color: charStyle.text,
                                boxShadow: isSelected ? `0 6px 0 ${charStyle.border}` : 'none'
                            }}
                        >
                            <span className="font-bold text-lg md:text-xl">{char.name[0]}</span>
                            {isSelected && (
                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full border-2 border-green-500 text-green-500 flex items-center justify-center text-xs shadow-sm">
                                    ✓
                                </div>
                            )}
                        </button>
                    )
                })}
             </div>
         </div>

         {/* Description Box */}
         <div 
            className="w-full p-3 md:p-4 rounded-[20px] border-4 mb-4 md:mb-6 transition-colors duration-300 text-center relative shrink-0"
            style={{
                background: currentStyle.bg,
                borderColor: currentStyle.border,
                color: currentStyle.text
            }}
         >
             <h2 className="text-xl md:text-2xl font-black mb-1">{CHARACTERS.find(c => c.id === selectedCharId)?.name}</h2>
             <p className="text-base md:text-lg font-bold opacity-90 italic leading-tight">"{currentStyle.description}"</p>
         </div>

         {/* Start Button - Always Visible */}
         <div className="flex justify-center w-full mt-auto">
            <button
                onClick={onStart}
                className={`w-full md:w-auto px-8 md:px-16 py-3 md:py-5 rounded-full text-2xl md:text-3xl font-black transition-all duration-300 transform shadow-xl hover:-translate-y-1 animate-pulse ${currentStyle.btnClass} ${currentStyle.btnHover}`}
            >
                START GAME
            </button>
         </div>
         
         <div className="text-center mt-3 text-gray-500 font-bold font-comic text-sm">
            Best Run: {highScore}
         </div>

      </div>
    </div>
  );
}

// --- Game Logic ---

function GameCanvas({
  character,
  gameState,
  onGameOver,
  onScoreUpdate,
}: {
  character: Character;
  gameState: GameState;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (Mutable)
  const scoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const distanceRef = useRef(0);
  const frameRef = useRef(0);
  
  // Player State
  const playerY = useRef(0);
  const playerVelY = useRef(0);
  const jumpCount = useRef(0);
  const rotationRef = useRef(0);
  
  // Death Animation State
  // 0 = alive, >0 = dying frame count
  const isDying = useRef(0);

  // Entities
  const obstacles = useRef<any[]>([]);
  const particles = useRef<any[]>([]);
  const backgroundFlowers = useRef<any[]>([]);
  const backgroundDunes = useRef<any[]>([]);

  // Current Character Ref (allows hot-swapping without loop reset)
  const charRef = useRef(character);
  charRef.current = character;

  const callbacks = useRef({ onGameOver, onScoreUpdate });
  callbacks.current = { onGameOver, onScoreUpdate };

  const prevGameState = useRef<GameState>(gameState);

  const initBackground = (width: number, height: number) => {
      const flowers = [];
      const colors = ["#d946ef", "#8b5cf6", "#f43f5e", "#0ea5e9"];
      for (let i = 0; i < 6; i++) {
          flowers.push({
              x: (width / 6) * i + Math.random() * 100,
              y: Math.random() * (height * 0.4) + 50,
              color: colors[Math.floor(Math.random() * colors.length)],
              scale: 0.6 + Math.random() * 0.6,
              rotation: Math.random() * Math.PI * 2
          });
      }
      
      const dunes = [];
      for(let i=0; i<3; i++) {
          dunes.push({
              x: i * (width/2),
              y: height - GROUND_HEIGHT,
              width: width/1.5,
              height: 100 + Math.random() * 100
          });
      }

      return { flowers, dunes };
  };

  const resetGame = (width: number, height: number) => {
    playerY.current = height - GROUND_HEIGHT - 90; // Adjusted for bigger char
    playerVelY.current = 0;
    jumpCount.current = 0;
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    distanceRef.current = 0;
    frameRef.current = 0;
    rotationRef.current = 0;
    isDying.current = 0;
    obstacles.current = [];
    particles.current = [];
    
    const bg = initBackground(width, height);
    backgroundFlowers.current = bg.flowers;
    backgroundDunes.current = bg.dunes;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    handleResize();
    window.addEventListener('resize', handleResize);

    if (backgroundFlowers.current.length === 0) {
        const bg = initBackground(canvas.width, canvas.height);
        backgroundFlowers.current = bg.flowers;
        backgroundDunes.current = bg.dunes;
    }

    const handleJump = () => {
      if (gameState !== "PLAYING" || isDying.current > 0) return;
      
      if (jumpCount.current < MAX_JUMP_COUNT) {
        playerVelY.current = JUMP_FORCE;
        jumpCount.current++;
        soundManager.playJump(charRef.current.id);
        
        // Spawn jump particles
        for (let i = 0; i < 8; i++) {
            particles.current.push({
                x: 100 + 40,
                y: playerY.current + 90,
                vx: (Math.random() - 0.5) * 8,
                vy: Math.random() * 3,
                life: 30,
                color: "#FDE047",
                size: Math.random() * 5 + 3
            });
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleJump();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    let animationFrameId: number;

    const loop = () => {
      const width = canvas.width;
      const height = canvas.height;
      const groundY = height - GROUND_HEIGHT;

      if (gameState === "PLAYING" && (prevGameState.current === "START" || prevGameState.current === "GAMEOVER")) {
          resetGame(width, height);
      }
      prevGameState.current = gameState;

      if (gameState === "PLAYING") {
          // --- Physics Update ---
          playerVelY.current += GRAVITY;
          playerY.current += playerVelY.current;

          // Death Animation
          if (isDying.current > 0) {
             isDying.current++;
             rotationRef.current += 0.2; // Spin
             // Fall off screen
             if (playerY.current > height + 200) {
                 callbacks.current.onGameOver(scoreRef.current);
             }
          } else {
             // Normal Ground Collision
             if (playerY.current > groundY - 90) {
                playerY.current = groundY - 90;
                playerVelY.current = 0;
                jumpCount.current = 0;
                rotationRef.current = 0;
             }
             // Air Rotation
             if (playerY.current < groundY - 90) {
                 rotationRef.current = Math.min(Math.max(playerVelY.current * 0.05, -0.4), 0.4);
             }

             // Progression
             speedRef.current += SPEED_INCREMENT;
             distanceRef.current += speedRef.current;
             scoreRef.current += 0.1;
             
             if (Math.floor(scoreRef.current) > Math.floor(scoreRef.current - 0.1)) {
                callbacks.current.onScoreUpdate(Math.floor(scoreRef.current));
             }

             // --- Obstacles ---
             const lastObstacle = obstacles.current[obstacles.current.length - 1];
             const minGap = 450 + speedRef.current * 12; // Wider gap for bigger obstacles
          
             if (!lastObstacle || (width - lastObstacle.x > minGap)) {
                if (Math.random() < 0.04) { 
                   const obsType = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
                   obstacles.current.push({
                     ...obsType,
                     x: width + 100,
                     y: groundY - obsType.height - obsType.yOffset,
                     passed: false,
                     bobOffset: Math.random() * Math.PI * 2
                   });
                }
             }

             // Update Obstacles & Collision
             for (let i = obstacles.current.length - 1; i >= 0; i--) {
                const obs = obstacles.current[i];
                obs.x -= speedRef.current;

                // Scaled Player Hitbox (80x96 visual, ~60x80 hitbox)
                const hitboxPadding = 15;
                const playerH = 96;
                const playerW = 80;
            
                if (
                  100 + hitboxPadding < obs.x + obs.width - hitboxPadding &&
                  100 + playerW - hitboxPadding > obs.x + hitboxPadding &&
                  playerY.current + hitboxPadding < obs.y + obs.height - hitboxPadding &&
                  playerY.current + playerH - hitboxPadding > obs.y + hitboxPadding
                ) {
                   if (isDying.current === 0) {
                       // Trigger death
                       isDying.current = 1;
                       playerVelY.current = -15; // Bounce up
                       soundManager.playCollision();
                   }
                }

                if (obs.x + obs.width < -150) obstacles.current.splice(i, 1);
             }
          }
      }

      // --- Rendering ---
      ctx.clearRect(0, 0, width, height);

      // 1. Sky Gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#38BDF8");
      gradient.addColorStop(1, "#0284C7");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // 2. Distant Dunes (Background)
      ctx.fillStyle = "#0369A1"; // Darker blue/sand for distance
      backgroundDunes.current.forEach(dune => {
          if (gameState === "PLAYING" && isDying.current === 0) dune.x -= speedRef.current * 0.1;
          if (dune.x + dune.width < 0) dune.x = width;
          
          ctx.beginPath();
          ctx.moveTo(dune.x, dune.y);
          ctx.quadraticCurveTo(dune.x + dune.width/2, dune.y - dune.height, dune.x + dune.width, dune.y);
          ctx.fill();
      });

      // 3. Light Rays
      ctx.save();
      ctx.rotate(-0.2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      for(let i=0; i<width + 500; i+=200) {
          ctx.fillRect(i - 200, -100, 80, height * 2);
      }
      ctx.restore();

      // 4. Background Flowers (Parallax)
      backgroundFlowers.current.forEach((flower: any) => {
          flower.x -= (gameState === "PLAYING" && isDying.current === 0 ? speedRef.current * 0.2 : 0);
          if (flower.x < -100) flower.x = width + 100;
          drawFlower(ctx, flower.x, flower.y, flower.color, flower.scale, flower.rotation + frameRef.current * 0.01);
      });

      // 5. Ground
      ctx.fillStyle = "#FDE047";
      ctx.fillRect(0, groundY, width, GROUND_HEIGHT);
      ctx.fillStyle = "#EAB308"; // Sand Texture
      const textureOffset = Math.floor(distanceRef.current) % 150;
      for (let x = -textureOffset; x < width; x += 150) {
          ctx.beginPath();
          ctx.arc(x, groundY + 30, 4, 0, Math.PI * 2);
          ctx.arc(x + 70, groundY + 60, 6, 0, Math.PI * 2);
          ctx.arc(x + 110, groundY + 20, 3, 0, Math.PI * 2);
          ctx.fill();
      }

      // 6. Obstacles
      obstacles.current.forEach(obs => {
        drawObstacle(ctx, obs, frameRef.current);
      });

      // 7. Player
      if (gameState !== "GAMEOVER" || isDying.current > 0) {
         ctx.save();
         // Center pivot point
         ctx.translate(100 + 40, playerY.current + 48);
         ctx.rotate(rotationRef.current);
         // Draw scaled up char (80x96)
         charRef.current.draw(ctx, -40, -48, 80, 96, frameRef.current);
         ctx.restore();
      }

      // 8. Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        if (gameState === "PLAYING") {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vy += 0.2;
        }
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (p.life <= 0) particles.current.splice(i, 1);
      }
      
      if (gameState === "PLAYING") {
          frameRef.current++;
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  return <canvas ref={canvasRef} className="block w-full h-full" />;
}

// Procedural Flower Drawer (Bikini Bottom Style)
function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale: number, rotation: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(rotation);

    ctx.fillStyle = color;
    for(let i=0; i<5; i++) {
        const angle = (i * 2 * Math.PI) / 5;
        const dist = 24;
        ctx.beginPath();
        ctx.ellipse(Math.cos(angle) * dist, Math.sin(angle) * dist, 16, 10, angle, 0, Math.PI*2);
        ctx.fill();
    }
    
    ctx.fillStyle = "#FDBA74"; // Center
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI*2);
    ctx.fill();
    
    // Center dots
    ctx.fillStyle = "#C2410C";
    ctx.beginPath();
    ctx.arc(-4, -4, 2.5, 0, Math.PI*2);
    ctx.arc(4, 3, 2, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}