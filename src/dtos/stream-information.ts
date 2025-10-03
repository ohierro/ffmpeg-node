export class StreamInformation {
  type: 'audio' | 'video'
  codec: string
  // aspect_ratio?: string
  // width: number;
  // height: number;
  // duration: string;
  // formatName: string;
  // formatLongName: string;
}

export class AudioStreamInformation extends StreamInformation {
  bitRate: number
  frequency: number
}

export class VideoStreamInformation extends StreamInformation {
  aspect_ratio: number
  width: number;
  height: number;
  landscape: boolean
}