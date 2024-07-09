/// <reference types="node" />
import { FileInformation } from './file-information';
import { Observable } from 'rxjs';
import { ConvertOptions } from './convert-options';
import { AudioConvertOptions } from './audio-convert-options';
import { TranscodeProgressEvent } from './types/transcode-progress-event';
/**Class that does the ffmpeg transformations */
export declare class FFmpeg {
    private options;
    private runProcess;
    private outputFilename;
    private customOutput;
    constructor();
    /**Adds a list of CLI options to the process */
    addOptions(optionsList: string[]): void;
    /**Adds a single CLI option to the list */
    addOption(option: string): void;
    /**Sets the output file name */
    setOutputFile(filename: string): void;
    /**Sets the callback function that is called once the process exits on quits. The first argument to the
     * callback is the exit code (number) and the second argument is the signal (string).
    */
    setOnCloseCallback(callbackFunc: Function): void;
    setOutputCallback(customOutput: NodeJS.WritableStream): void;
    /**Returns the arguments */
    private returnCLIArgs;
    /**Begins the FFmpeg process. Accepts an optional silent boolean value which supresses the output */
    run(silent?: boolean): void;
    getInformation(absolutePath: string): Promise<FileInformation>;
    /**
     * Get duration of the stream in seconds
     *
     * @param inputPath Absolute path to file
     * @param isVideo If input is audio, this should be false. Default: true
     */
    getStreamDuration(inputPath: string, isVideo?: boolean): Promise<number>;
    /**
     * Get the number of packets (length) of the `inputPath` file
     *
     * @param inputPath Absolute path to file
     * @returns A Promise resolved with the number of packets of the file
     */
    getPacketNumber(inputPath: string, isVideo?: boolean): Promise<number>;
    convert(inputPath: string, outputPath: string, options: ConvertOptions): Observable<Number>;
    transcodeAudio(inputPath: string, outputPath: string, options: AudioConvertOptions): Observable<TranscodeProgressEvent>;
    createThumbnailsCarousel(): void;
    getImageThumbnailAt(inputPath: string, at: string, outputPath: string): Promise<void>;
    private parseTimeToSeconds;
    /**Quits the FFmpeg process */
    quit(): void;
    /**Kills the process forcefully (might not save the output) */
    kill(): void;
}
