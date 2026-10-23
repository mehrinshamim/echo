import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
// @ts-ignore - package ships loose typings
import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';

export const SAMPLE_RATE = 16000;

let chunks: Uint8Array[] = [];
let initialized = false;

export async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

export function startRecording() {
  chunks = [];
  if (!initialized) {
    LiveAudioStream.init({
      sampleRate: SAMPLE_RATE,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      bufferSize: 16 * 1024,
      wavFile: '',
    });
    LiveAudioStream.on('data', (b64: string) => {
      chunks.push(new Uint8Array(Buffer.from(b64, 'base64')));
    });
    initialized = true;
  }
  LiveAudioStream.start();
}

/** Stops and returns the whole recording as raw PCM16 plus its duration in seconds. */
export async function stopRecording(): Promise<{ pcm: ArrayBuffer; seconds: number }> {
  await LiveAudioStream.stop();
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
