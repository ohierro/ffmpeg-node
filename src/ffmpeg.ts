/*
    ffmpeg -y -r 240 -f x11grab -draw_mouse 0 -s 1920x1080 -i :99 -c:v libvpx -b:v 384k
    -qmin 7 -qmax 25 -maxrate 384k -bufsize 1000k screen.vb8.webm
*/

import child_process = require('child_process');
import { StreamInformation } from './stream-information'
import { json } from 'stream/consumers';
import { FileInformation } from './file-information';

/**Class that does the ffmpeg transformations */
export class FFmpeg {
    private options: string[]
    private runProcess: child_process.ChildProcess
    private outputFilename: string
    private customOutput: NodeJS.WritableStream

    constructor() {
        this.options = [];
        this.outputFilename = "";
    }
    /**Adds a list of CLI options to the process */
    addOptions(optionsList: string[]): void {
        optionsList.forEach(option => {
            this.options.push(option);
        });
    }
    /**Adds a single CLI option to the list */
    addOption(option: string): void {
        this.options.push(option);
    }
    /**Sets the output file name */
    setOutputFile(filename: string): void {
        this.outputFilename = filename;
    }
    /**Sets the callback function that is called once the process exits on quits. The first argument to the
     * callback is the exit code (number) and the second argument is the signal (string).
    */
    setOnCloseCallback(callbackFunc: Function): void {
        this.runProcess.on('exit', function (code, signal) {
            callbackFunc(code, signal);
        });
    }

    setOutputCallback(customOutput: NodeJS.WritableStream) {
        this.customOutput = customOutput;
    }

    /**Returns the arguments */
    private returnCLIArgs(): string[] {
        if (this.outputFilename != "") {
            let temp = this.options;
            temp.push(this.outputFilename);
            return temp;
        }

        return this.options;
    }
    /**Begins the FFmpeg process. Accepts an optional silent boolean value which supresses the output */
    run(silent?: boolean): void {
        // Run the command here
        this.runProcess = child_process.spawn('ffmpeg', this.returnCLIArgs());
        this.runProcess.stdin.setDefaultEncoding('utf-8');
        if (this.customOutput) {
            this.runProcess.stdout.pipe(this.customOutput);
        }
        if (!silent) {
            this.runProcess.stdout.pipe(process.stderr);
            this.runProcess.stderr.pipe(process.stderr);
        }
    }

    getInformation(absolutePath: string) : Promise<FileIN> {
        return new Promise((resolve, reject) => {
            const cmd = 'ffprobe'
            const args = ['-v',
                            'error',
                            // '-select_streams',
                            // 'v:0',
                            '-show_entries',
                            'stream=width,height,codec_name,codec_type,display_aspect_ratio',
                            '-show_entries',
                            'format=duration,format_name,format_long_name',
                            '-of',
                            'json',
                            // 'csv=s=x:p=0',
                            absolutePath]

            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');

            let response = ''

            runProcess.stdout.on('data', (data) => {
                response += data
            })

            runProcess.on('exit', function (code, signal) {
                console.log('output resolution: ' + response);

                const jsonResponse = JSON.parse(response)

                const fileInfo = new FileInformation()

                fileInfo.duration = jsonResponse.format.duration,
                fileInfo.formatName = jsonResponse.format.format_name,
                fileInfo.formatLongName = jsonResponse.format.format_long_name
                fileInfo.streams = []

                for (let jsonStream of jsonResponse.streams) {
                    const streamInfo = new StreamInformation()

                    streamInfo.type = jsonStream.codec_type
                    streamInfo.width = jsonStream.width
                    streamInfo.height = jsonStream.height
                    streamInfo.codec =  jsonStream.codec
                    if (streamInfo.type === 'video') {
                        streamInfo.aspect_ratio = jsonStream.display_aspect_ratio
                    }

                    fileInfo.streams.push(streamInfo)
                }

                resolve(fileInfo)
            });
        })

    }


    /**Quits the FFmpeg process */
    quit(): void {
        // Send the `q` key
        if (!this.runProcess.killed) {
            this.runProcess.stdin.write('q');
        }
    }
    /**Kills the process forcefully (might not save the output) */
    kill(): void {
        if (!this.runProcess.killed) {
            this.runProcess.kill();
        }
    }
}
