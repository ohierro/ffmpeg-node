export class VideoTranscodeOptions {
    width?: number
    height?: number
    codec?: string
    fastStart?: boolean = false     // https://trac.ffmpeg.org/wiki/Encode/H.264#faststartforwebvideo
    preset?: Preset = Preset.medium  // https://trac.ffmpeg.org/wiki/Encode/H.264#Preset
    bitRate?: number                // -b:v 64k
    frameRate?: number              // -r 24
  }

  // https://trac.ffmpeg.org/wiki
  export enum Codec {
    h264    = 'h264',
    h265    = 'h265',
    vp9     = 'vp9',
    ffv1    = 'ffv1',
    av1     = 'av1'
  }
  
  export enum Preset {
    ultrafast   = 'ultrafast',
    superfast   = 'superfast',
    veryfast    = 'veryfast',
    faster      = 'faster',
    fast        = 'fast',
    medium      ='medium',
    slow        ='slow',
    slower      ='slower',
    veryslow    ='veryslow'
  }