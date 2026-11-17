/*
 * car-engine.js — 게임용 자동차 엔진 소리 (Web Audio, 의존성 없음)
 * CarEngines(buntine, CC0)의 두 방법을 게임에서 바로 쓰게 묶었어요.
 *
 *   const eng = new CarEngine({ mode: 'synth' });       // 'synth' 파일 없이 합성 | 'sample' 녹음 반복
 *   button.onclick = () => eng.start();                  // 브라우저는 클릭/터치 뒤에만 소리를 켜요
 *   eng.setRpm(rpm01);                                   // 매 프레임 0(공회전) ~ 1(최고 회전)
 *   eng.setThrottle(0~1); eng.setVolume(0~1); eng.stop();
 *
 * sample 모드: new CarEngine({ mode: 'sample', url: 'engine.wav' }) 또는 { buffer: ArrayBuffer }
 * 차마다 다르게: synth 는 { idleHz, maxHz, cylinders, rough }, sample 은 { minRate, maxRate }
 */
(function (root) {
  'use strict';
  class CarEngine {
    constructor(o = {}) {
      this.o = Object.assign({ mode: 'synth', idleHz: 38, maxHz: 150, cylinders: 2, rough: 0.35, minRate: 0.8, maxRate: 2.2, volume: 0.35 }, o);
      this.rpm = 0; this.target = 0; this.throttle = 0; this.on = false;
    }
    async start() {
      if (this.on) return;
      const AC = root.AudioContext || root.webkitAudioContext;
      const ctx = this.ctx = this.ctx || new AC();
      if (ctx.state === 'suspended') await ctx.resume();
      const out = this.out = ctx.createGain(); out.gain.value = 0;
      const lp = this.lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.7;
      lp.connect(out); out.connect(ctx.destination);
      if (this.o.mode === 'sample') {
        let buf = this.o.buffer;
        if (!buf && this.o.url) buf = await (await fetch(this.o.url)).arrayBuffer();
        const audio = await ctx.decodeAudioData(buf.slice ? buf.slice(0) : buf);
        const src = this.src = ctx.createBufferSource(); src.buffer = audio; src.loop = true;
        src.connect(lp); src.start();
      } else {
        // 톱니파 두 개(조금 어긋난 음) + 배기음 펄스(사각파)로 '부릉' 소리
        this.oscs = [0, 1].map((i) => { const s = ctx.createOscillator(); s.type = 'sawtooth'; s.detune.value = i ? 9 : -6; s.connect(lp); s.start(); return s; });
        const pulse = this.pulse = ctx.createOscillator(); pulse.type = 'square';
        const pg = this.pg = ctx.createGain(); pg.gain.value = this.o.rough * 0.5;
        pulse.connect(pg); pg.connect(out.gain); pulse.start(); // 볼륨을 떨게 해서 실린더 박자감
      }
      out.gain.setTargetAtTime(this.o.volume, ctx.currentTime, 0.15);
      this.on = true; this._apply(true);
    }
    setRpm(v) { this.target = Math.max(0, Math.min(1, v)); this._apply(); }
    setThrottle(v) { this.throttle = Math.max(0, Math.min(1, v)); this._apply(); }
    setVolume(v) { this.o.volume = v; if (this.on) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); }
    _apply(now) {
      if (!this.on) return;
      const t = this.ctx.currentTime, k = now ? 0.01 : 0.06, r = this.target, o = this.o;
      if (this.src) this.src.playbackRate.setTargetAtTime(o.minRate + (o.maxRate - o.minRate) * r, t, k);
      if (this.oscs) {
        const hz = o.idleHz + (o.maxHz - o.idleHz) * r;
        this.oscs.forEach((s) => s.frequency.setTargetAtTime(hz, t, k));
        this.pulse.frequency.setTargetAtTime(hz / o.cylinders, t, k);
      }
      // 밟을수록 밝은 소리
      this.lp.frequency.setTargetAtTime(600 + 2400 * Math.max(r * 0.6, this.throttle), t, 0.08);
    }
    stop() {
      if (!this.on) return;
      const t = this.ctx.currentTime; this.out.gain.setTargetAtTime(0, t, 0.1);
      const nodes = [this.src, this.pulse].concat(this.oscs || []).filter(Boolean);
      setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch (e) {} }), 400);
      this.src = this.oscs = this.pulse = null; this.on = false;
    }
  }
  root.CarEngine = CarEngine;
  if (typeof module !== 'undefined' && module.exports) module.exports = CarEngine;
})(typeof window !== 'undefined' ? window : globalThis);
