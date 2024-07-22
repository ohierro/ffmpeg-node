export declare class VideoTranscodeOptions {
    width?: number;
    height?: number;
    codec?: string;
    fastStart?: boolean;
    preset?: Preset;
    bitRate?: number;
    frameRate?: number;
}
export declare enum Codec {
    h264 = "h264",
    h265 = "h265",
    vp9 = "vp9",
    ffv1 = "ffv1",
    av1 = "av1"
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
