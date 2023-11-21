/*
    ffmpeg -y -r 240 -f x11grab -draw_mouse 0 -s 1920x1080 -i :99 -c:v libvpx -b:v 384k
    -qmin 7 -qmax 25 -maxrate 384k -bufsize 1000k screen.vb8.webm
*/

import child_process = require('child_process');
import { StreamInformation } from './stream-information'
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

    getInformation(absolutePath: string) : Promise<FileInformation> {
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

                fileInfo.duration = Number.parseFloat(jsonResponse.format.duration),
                fileInfo.formatName = jsonResponse.format.format_name,
                fileInfo.formatLongName = jsonResponse.format.format_long_name
                fileInfo.streams = []

                for (let jsonStream of jsonResponse.streams) {
                    const streamInfo = new StreamInformation()

                    streamInfo.type = jsonStream.codec_type
                    streamInfo.width = jsonStream.width
                    streamInfo.height = jsonStream.height
                    streamInfo.codec =  jsonStream.codec_name
                    if (streamInfo.type === 'video') {
                        streamInfo.aspect_ratio = jsonStream.display_aspect_ratio
                    }

                    fileInfo.streams.push(streamInfo)
                }

                resolve(fileInfo)
            });
        })
    }

    getPacketNumber(): Promise<Number> {
        // console.log('new promise');

        return new Promise((resolve, reject) => {
            // ffmpeg -y -i file.mp4 test.mp4
            const cmd = 'ffprobe'
            // ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of default=nokey=1:noprint_wrappers=1 files/file.mp4


            const args = ['-v',
                            'error',
                            '-count_packets',
                            '-select_streams',
                            'v:0',
                            '-show_entries',
                            'stream=nb_read_packets',
                            '-of',
                            // 'csv=p=0',
                            'default=nokey=1:noprint_wrappers=1',
                            'files/file.mp4',
                        ]

            // console.log('spawn: ');

            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');

            let response = ''

            runProcess.stdout.on('data', (data) => {
                response += data
                // console.log('data' + data);
            })

            runProcess.stderr.on('data', (data) => {
                // response += data

                // console.log('error' + data);
            })

            runProcess.on('exit', function (code, signal) {
                // console.log('response ' + response);
                // console.log(code);
                // console.log(signal);



                resolve(Number.parseInt(response))
            })
        })
    }

    async convert(): Promise<boolean> { 
        console.log('new promise');

        const totalPackets = await this.getPacketNumber() as number

        return new Promise((resolve, reject) => {
            // ffmpeg -y -i file.mp4 test.mp4
            const cmd = 'ffmpeg'
            const args = [
                            '-v',
                            'info',
                            '-y',
                            '-i',
                            'files/file.mp4',
                            'test.mp4',
                        ]

            // let nbFrames = this.getPacketNumber()

            console.log('spawn');

            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');

            let response = ''

            runProcess.stdout.on('data', (data) => {
                // response += data
                console.log(data);
            })
            runProcess.stderr.on('data', (data) => {
                // console.log(`error ${data}`);
                // frame= 3859 fps=132 q=-1.0 Lsize=   11006kB time=00:02:08.68 bitrate= 700.6kbits/s dup=1 drop=0 speed= 4.4x
                const pattern = /frame=\s*(?<nframe>[0-9]+)\s+fps=\s*(?<nfps>[0-9.]+)\s+q=(?<nq>[0-9.-]+)\s+(L?)\s*size=\s*(?<nsize>[0-9]+)(?<ssize>kB|mB|b)?\s*time=\s*(?<sduration>[0-9:.]+)\s*bitrate=\s*(?<nbitrate>[0-9.]+)(?<sbitrate>bits\/s|mbits\/s|kbits\/s)?.*(dup=(?<ndup>\d+)\s*)?(drop=(?<ndrop>\d+)\s*)?speed=\s*(?<nspeed>[0-9.]+)x/;

                const match = pattern.exec(data);

                if (match) {
                    const {
                        nframe,
                        nfps,
                        nq,
                        nsize,
                        ssize,
                        sduration,
                        nbitrate,
                        sbitrate,
                        ndup,
                        ndrop,
                        nspeed
                    } = match.groups;

                    console.log(JSON.stringify(match.groups));
                    console.log(`total packets ${totalPackets}`);
                    console.log(`percert ${Number.parseInt(match.groups.nframe)/totalPackets}`);

                    // console.log("Frame:", nframe);
                    // console.log("FPS:", nfps);
                    // console.log("Q:", nq);
                    // console.log("Size:", nsize + (ssize || ""));
                    // console.log("Duration:", sduration);
                    // console.log("Bitrate:", nbitrate + (sbitrate || ""));
                    // console.log("Dup:", ndup || "Not specified");
                    // console.log("Drop:", ndrop || "Not specified");
                    // console.log("Speed:", nspeed);
                }

                // if (match) {
                // const {
                //     nframe,
                //     nfps,
                //     nq,
                //     nsize,
                //     ssize,
                //     sduration,
                //     nbitrate,
                //     sbitrate,
                //     ndup,
                //     ndrop,
                //     nspeed
                // } = match.groups;
            })
            runProcess.on('exit', function (code, signal) {
                console.log('exit');

                resolve(true)
            })
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


new FFmpeg().convert()
    .then(data => console.log(data))