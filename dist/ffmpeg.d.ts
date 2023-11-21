/// <reference types="node" />
import { FileInformation } from './file-information';
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
    getPacketNumber(): Promise<Number>;
    convert(): Promise<boolean>;
    /**Quits the FFmpeg process */
    quit(): void;
    /**Kills the process forcefully (might not save the output) */
    kill(): void;
}
