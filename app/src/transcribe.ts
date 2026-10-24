import { initWhisper, WhisperContext } from 'whisper.rn/index';
import { Directory, File, Paths } from 'expo-file-system';
import { SAMPLE_RATE } from './recorder';

export type ModelId = 'tiny.en' | 'base.en';

export const MODELS: Record<ModelId, { url: string; label: string }> = {
  'tiny.en': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    label: 'tiny.en (~75 MB, fastest)',
  },
  'base.en': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    label: 'base.en (~142 MB, more accurate)',
  },
};

/** base.en passed the on-device test (RTF 0.08 on a real phone), so the app uses it. */
export const DEFAULT_MODEL: ModelId = 'base.en';

export type TranscribeResult = { text: string; ms: number };

const modelsDir = () => new Directory(Paths.document, 'models');
const modelFile = (id: ModelId) => new File(modelsDir(), `ggml-${id}.bin`);

export const isModelDownloaded = (id: ModelId) => modelFile(id).exists;

export async function downloadModel(id: ModelId): Promise<void> {
  const dir = modelsDir();
  if (!dir.exists) dir.create();
  const target = modelFile(id);
  if (target.exists) return;
  await File.downloadFileAsync(MODELS[id].url, target);
}

let ctx: WhisperContext | null = null;
let ctxId: ModelId | null = null;

export async function loadModel(id: ModelId): Promise<void> {
  if (ctx && ctxId === id) return;
  if (ctx) await ctx.release();
  ctx = await initWhisper({ filePath: modelFile(id).uri });
  ctxId = id;
}

export const isModelReady = () => ctx !== null;

let preparing: Promise<void> | null = null;

/** Downloads (first run only) and loads the default model. Safe to call many times. */
export function ensureModel(): Promise<void> {
  if (ctx) return Promise.resolve();
  preparing ??= (async () => {
    await downloadModel(DEFAULT_MODEL);
    await loadModel(DEFAULT_MODEL);
  })().finally(() => {
    preparing = null;
  });
  return preparing;
}

/** pcm: raw 16 kHz mono signed 16-bit PCM. Swap this function for a hosted Whisper call if local fails. */
export async function transcribe(pcm: ArrayBuffer): Promise<TranscribeResult> {
  if (!ctx) throw new Error('Model not loaded');
  const start = Date.now();
  const { promise } = ctx.transcribeData(pcm, { language: 'en' });
  const { result } = await promise;
  const ms = Date.now() - start;
  const audioSec = pcm.byteLength / 2 / SAMPLE_RATE;
  console.log(`[whisper] model=${ctxId} audio=${audioSec.toFixed(1)}s took=${(ms / 1000).toFixed(1)}s`);
  return { text: result.trim(), ms };
}
