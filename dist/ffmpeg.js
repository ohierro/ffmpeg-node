"use strict";
/*
    ffmpeg -y -r 240 -f x11grab -draw_mouse 0 -s 1920x1080 -i :99 -c:v libvpx -b:v 384k
    -qmin 7 -qmax 25 -maxrate 384k -bufsize 1000k screen.vb8.webm
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FFmpeg = void 0;
const child_process = require("child_process");
const stream_information_1 = require("./stream-information");
const file_information_1 = require("./file-information");
/**Class that does the ffmpeg transformations */
class FFmpeg {
    constructor() {
        this.options = [];
        this.outputFilename = "";
    }
    /**Adds a list of CLI options to the process */
    addOptions(optionsList) {
        optionsList.forEach(option => {
            this.options.push(option);
        });
    }
    /**Adds a single CLI option to the list */
    addOption(option) {
        this.options.push(option);
    }
    /**Sets the output file name */
    setOutputFile(filename) {
        this.outputFilename = filename;
    }
    /**Sets the callback function that is called once the process exits on quits. The first argument to the
     * callback is the exit code (number) and the second argument is the signal (string).
    */
    setOnCloseCallback(callbackFunc) {
        this.runProcess.on('exit', function (code, signal) {
            callbackFunc(code, signal);
        });
    }
    setOutputCallback(customOutput) {
        this.customOutput = customOutput;
    }
    /**Returns the arguments */
    returnCLIArgs() {
        if (this.outputFilename != "") {
            let temp = this.options;
            temp.push(this.outputFilename);
            return temp;
        }
        return this.options;
    }
    /**Begins the FFmpeg process. Accepts an optional silent boolean value which supresses the output */
    run(silent) {
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
    getInformation(absolutePath) {
        // const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0  /home/oliver/projects/04_xaloc/projects/transcoderjs/consumer/test/files/file.mp4`
        return new Promise((resolve, reject) => {
            // ffprobe -v error -show_entries stream=width,height,stream_type,codec_name,codec_type,codec_long_name,display_aspect_ratio -show_entries format=duration,format_name,format_long_name -of json  /home/oliver/projects/04_xaloc/projects/transcoderjs/consumer/test/files/output/output.mp4
            const cmd = 'ffprobe';
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
                absolutePath];
            // ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp4
            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');
            // return {
            //     width: 1920,
            //     height: 1080
            // }
            let response = '';
            runProcess.stdout.on('data', (data) => {
                response += data;
            });
            runProcess.on('exit', function (code, signal) {
                console.log('output resolution: ' + response);
                const jsonResponse = JSON.parse(response);
                const fileInfo = new file_information_1.FileInformation();
                fileInfo.duration = jsonResponse.format.duration,
                    fileInfo.formatName = jsonResponse.format.format_name,
                    fileInfo.formatLongName = jsonResponse.format.format_long_name;
                fileInfo.streams = [];
                for (let jsonStream of jsonResponse.streams) {
                    const streamInfo = new stream_information_1.StreamInformation();
                    streamInfo.type = jsonStream.codec_type;
                    streamInfo.width = jsonStream.width;
                    streamInfo.height = jsonStream.height;
                    streamInfo.codec = jsonStream.codec;
                    if (streamInfo.type === 'video') {
                        streamInfo.aspect_ratio = jsonStream.display_aspect_ratio;
                    }
                    fileInfo.streams.push(streamInfo);
                }
                resolve(fileInfo);
                // resolve({
                //         width: jsonResponse.streams[0].width,
                //         height: jsonResponse.streams[0].height,
                //         duration: jsonResponse.format.duration,
                //         formatName: jsonResponse.format.format_name,
                //         formatLongName: jsonResponse.format.format_long_name
                //     })
            });
        });
    }
    /**Quits the FFmpeg process */
    quit() {
        // Send the `q` key
        if (!this.runProcess.killed) {
            this.runProcess.stdin.write('q');
        }
    }
    /**Kills the process forcefully (might not save the output) */
    kill() {
        if (!this.runProcess.killed) {
            this.runProcess.kill();
        }
    }
}
exports.FFmpeg = FFmpeg;
