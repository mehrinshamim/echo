import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
// @ts-ignore - package ships loose typings
import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';

export const SAMPLE_RATE = 16000;

let chunks: Uint8Array[] = [];
let paused = false;

export async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

// The native module releases its AudioRecord (and nulls it) every time stop() runs,
// so init() must be called again for every recording or the next start() is a silent no-op.
// 4 KB buffers (~0.13 s) because the native side drops the first two buffers of each recording.
export async function startRecording(): Promise<void> {
  chunks = [];
  paused = false;
  await LiveAudioStream.init({
    sampleRate: SAMPLE_RATE,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6,
    bufferSize: 4096,
    wavFile: '',
  });
  LiveAudioStream.on('data', (b64: string) => {
    if (paused) return;
    chunks.push(new Uint8Array(Buffer.from(b64, 'base64')));
  });
  LiveAudioStream.start();
}

// Pause keeps the native stream running and just drops incoming buffers, so resume needs no re-init.
export const pauseRecording = () => {
  paused = true;
};

export const resumeRecording = () => {
  paused = false;
};

/** Stops and returns the whole recording as raw PCM16 plus its duration in seconds. */
export async function stopRecording(): Promise<{ pcm: ArrayBuffer; seconds: number }> {
  await LiveAudioStream.stop();
  await new Promise((r) => setTimeout(r, 300)); // let the native thread release the mic
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  chunks = [];
  return { pcm: out.buffer, seconds: total / 2 / SAMPLE_RATE };
}
