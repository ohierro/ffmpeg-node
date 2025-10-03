export declare class StreamInformation {
    type: 'audio' | 'video';
    codec: string;
}
export declare class AudioStreamInformation extends StreamInformation {
    bitRate: number;
    frequency: number;
}
export declare class VideoStreamInformation extends StreamInformation {
    aspect_ratio: number;
    width: number;
    height: number;
    landscape: boolean;
}
