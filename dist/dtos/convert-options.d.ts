import { VideoCodec } from "../types/video-conversion-types";
export declare class ConvertOptions {
    codec: VideoCodec;
    preset?: Preset;
    width?: number;
    height?: number;
    fastStart?: boolean;
    frameRate?: number;
    bitRate?: number;
}
export declare enum Preset {
    ultrafast = "ultrafast",
    superfast = "superfast",
    veryfast = "veryfast",
    faster = "faster",
    fast = "fast",
    medium = "medium",
    slow = "slow",
    slower = "slower",
    veryslow = "veryslow"
}
