import { AudioCodec, AudioConversionType } from "../types/audio-conversion-types";
export declare class AudioConvertOptions {
    codec: AudioCodec;
    type: AudioConversionType;
    frequency?: number;
    quality?: number;
    bitrate?: number;
}
