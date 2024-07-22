import { VideoCodec, VideoFormat } from "../types/video-conversion-types"

export class ConvertOptions {
  codec: VideoCodec
  preset?: Preset = Preset.medium    // https://trac.ffmpeg.org/wiki/Encode/H.264#Preset
  width?: number
  height?: number
  fastStart?: boolean = false       // https://trac.ffmpeg.org/wiki/Encode/H.264#faststartforwebvideo
  frameRate?: number
  bitRate?: number
}

export enum Preset {
  ultrafast='ultrafast',
  superfast='superfast',
  veryfast='veryfast',
  faster='faster',
  fast='fast',
  medium='medium',
  slow='slow',
  slower='slower',
  veryslow='veryslow'
}