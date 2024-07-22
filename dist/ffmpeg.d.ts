import { FileInformation } from './dtos/file-information';
import { Observable } from 'rxjs';
import { ConvertOptions } from './dtos/convert-options';
import { AudioConvertOptions } from './dtos/audio-convert-options';
import { TranscodeProgressEvent } from './types/transcode-progress-event';
import { AudioNormalizacionInformation } from './types/audio-normalization-information';
import { AudioNormalization } from './types/audio-normalization';
/**Class that does the ffmpeg transformations */
export declare class FFmpeg {
    private options;
    private runProcess;
    private outputFilename;
    private customOutput;
    private logger;
    constructor();
    getInformation(absolutePath: string): Promise<FileInformation>;
    /**
     * Get duration of the stream in seconds
     *
     * @param inputPath Absolute path to file
     * @param isVideo If input is audio, this should be false. Default: true
     */
    getStreamDuration(inputPath: string, isVideo?: boolean): Promise<number>;
    getAudioInformation(inputPath: string, target: AudioNormalization): Observable<TranscodeProgressEvent | AudioNormalizacionInformation>;
    /**
     * Get the number of packets (length) of the `inputPath` file
     *
     * @param inputPath Absolute path to file
     * @returns A Promise resolved with the number of packets of the file
     */
    getPacketNumber(inputPath: string, isVideo?: boolean): Promise<number>;
    convert(inputPath: string, outputPath: string, options: ConvertOptions): Observable<TranscodeProgressEvent>;
    transcodeVideo(inputPath: string, outputPath: string, options: ConvertOptions): Observable<TranscodeProgressEvent>;
    private _transcodeVideo;
    transcodeAudio(inputPath: string, outputPath: string, options: AudioConvertOptions, normalization?: AudioNormalization): Observable<TranscodeProgressEvent>;
    private _transcodeAudio;
    createThumbnailsCarousel(): void;
    getImageThumbnailAt(inputPath: string, at: string, outputPath: string): Promise<void>;
    private parseTimeToSeconds;
}
