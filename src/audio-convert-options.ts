import { AudioCodec, AudioConversionType } from "./types/audio-conversion-types"

export class AudioConvertOptions {
  codec: AudioCodec
  type: AudioConversionType
  frequency?: number
  quality?: number
  bitrate?: number
}