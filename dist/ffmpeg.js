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
const rxjs_1 = require("rxjs");
const audio_conversion_types_1 = require("./types/audio-conversion-types");
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
        return new Promise((resolve, reject) => {
            const cmd = 'ffprobe';
            const args = ['-v',
                'error',
                // '-select_streams',
                // 'v:0',
                '-show_entries',
                'stream=width,height,codec_name,codec_type,display_aspect_ratio,bit_rate,sample_rate',
                '-show_entries',
                'format=duration,format_name,format_long_name',
                '-of',
                'json',
                // 'csv=s=x:p=0',
                absolutePath];
            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');
            let response = '';
            runProcess.stdout.on('data', (data) => {
                response += data;
            });
            runProcess.on('exit', function (code, signal) {
                console.log('output resolution: ' + response);
                const jsonResponse = JSON.parse(response);
                const fileInfo = new file_information_1.FileInformation();
                fileInfo.duration = Number.parseFloat(jsonResponse.format.duration),
                    fileInfo.formatName = jsonResponse.format.format_name,
                    fileInfo.formatLongName = jsonResponse.format.format_long_name;
                fileInfo.streams = [];
                for (let jsonStream of jsonResponse.streams) {
                    let streamInfo;
                    if (jsonStream.codec_type === 'audio') {
                        const audioInfo = new stream_information_1.AudioStreamInformation();
                        audioInfo.type = 'audio';
                        audioInfo.codec = jsonStream.codec_name;
                        audioInfo.bitRate = Number(jsonStream.bit_rate);
                        audioInfo.frequency = Number(jsonStream.sample_rate);
                        streamInfo = audioInfo;
                    }
                    else {
                        const videoStreamInfo = new stream_information_1.VideoStreamInformation();
                        videoStreamInfo.type = jsonStream.codec_type;
                        videoStreamInfo.width = jsonStream.width;
                        videoStreamInfo.height = jsonStream.height;
                        videoStreamInfo.codec = jsonStream.codec_name;
                        // if (streamInfo.type === 'video') {
                        videoStreamInfo.aspect_ratio = jsonStream.display_aspect_ratio;
                        // }
                        streamInfo = videoStreamInfo;
                    }
                    fileInfo.streams.push(streamInfo);
                }
                resolve(fileInfo);
            });
        });
    }
    /**
     * Get duration of the stream in seconds
     *
     * @param inputPath Absolute path to file
     * @param isVideo If input is audio, this should be false. Default: true
     */
    getStreamDuration(inputPath, isVideo = true) {
        return new Promise((resolve, reject) => {
            const cmd = 'ffprobe';
            const args = ['-v',
                'error',
                '-count_packets',
                '-select_streams',
                isVideo ? 'v:0' : 'a:0',
                '-show_entries',
                'format=duration',
                '-of',
                // 'csv=p=0',
                'default=nokey=1:noprint_wrappers=1',
                inputPath,
            ];
            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');
            let response = '';
            runProcess.stdout.on('data', (data) => {
                response += data;
            });
            runProcess.stderr.on('data', (data) => {
                console.log('error' + data);
            });
            runProcess.on('exit', function (code, signal) {
                resolve(Number.parseInt(response));
            });
        });
    }
    getAudioInformation(inputPath, target) {
        // -af loudnorm=I=-23:LRA=7:tp=-2:print_format=json -f null - 
        return new Promise((resolve, reject) => {
            const cmd = 'ffmpeg';
            const args = [
                '-i',
                inputPath,
                '-af',
                `loudnorm=I=${target.inputI}:LRA=${target.inputLRA}:tp=${target.inputTP}:print_format=json`,
                '-f', 'null',
                '-'
            ];
            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');
            let response = '';
            runProcess.stdout.on('data', (data) => {
                response += data;
            });
            runProcess.stderr.on('data', (data) => {
                // console.log('error' + data);
                response += data.toString();
                // response += 'my data'
            });
            runProcess.on('exit', function (code, signal) {
                // resolve(Number.parseInt(response))
                const output = response.split('\n');
                console.log(`output to parse ${output.slice(output.length - 13)}`);
                const data = JSON.parse(output.slice(output.length - 13).join(''));
                resolve({
                    inputI: Number(data['input_i']),
                    inputLRA: Number(data['input_lra']),
                    inputThresh: Number(data['input_thresh']),
                    inputTP: Number(data['input_tp']),
                    normalizationType: data['normalization_type'],
                    targetOffset: Number(data['target_offset']),
                    outputI: Number(data['output_i']),
                    outputTP: Number(data['output_tp']),
                    outputThresh: Number(data['output_thresh'])
                });
            });
        });
    }
    /**
     * Get the number of packets (length) of the `inputPath` file
     *
     * @param inputPath Absolute path to file
     * @returns A Promise resolved with the number of packets of the file
     */
    getPacketNumber(inputPath, isVideo = true) {
        // console.log('new promise');
        return new Promise((resolve, reject) => {
            // ffmpeg -y -i file.mp4 test.mp4
            const cmd = 'ffprobe';
            // ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of default=nokey=1:noprint_wrappers=1 files/file.mp4
            const args = ['-v',
                'error',
                '-count_packets',
                '-select_streams',
                isVideo ? 'v:0' : 'a:0',
                '-show_entries',
                'stream=nb_read_packets',
                '-of',
                // 'csv=p=0',
                'default=nokey=1:noprint_wrappers=1',
                inputPath,
            ];
            // console.log('spawn: ');
            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');
            let response = '';
            runProcess.stdout.on('data', (data) => {
                response += data;
                // console.log('data' + data);
            });
            runProcess.stderr.on('data', (data) => {
                // response += data
                // console.log('error' + data);
            });
            runProcess.on('exit', function (code, signal) {
                // console.log('response ' + response);
                // console.log(code);
                // console.log(signal);
                resolve(Number.parseInt(response));
            });
        });
    }
    convert(inputPath, outputPath, options) {
        return new rxjs_1.Observable((subscriber) => {
            this.getPacketNumber(inputPath)
                .then(totalPackets => {
                const cmd = 'ffmpeg';
                const argsVerbose = ['-v', 'error', '-progress', '-'];
                const argsInput = ['-i', inputPath];
                const argsOutput = ['-y', outputPath];
                let argsScale = [];
                if (options.width && options.height) {
                    argsScale = ['-vf', `scale=${options.width}:${options.height}`];
                }
                const args = [...argsVerbose, ...argsInput, ...argsScale, ...argsOutput];
                console.log('spawn');
                const runProcess = child_process.spawn(cmd, args);
                runProcess.stdin.setDefaultEncoding('utf-8');
                let response = '';
                runProcess.stdout.on('data', (data) => {
                    // console.log(data);
                    const pattern = /frame=(?<nframe>\d+)/;
                    const match = pattern.exec(data.toString());
                    if (match) {
                        const { nframe } = match.groups;
                        subscriber.next(parseInt(nframe) / totalPackets);
                    }
                    // parse data
                });
                runProcess.stderr.on('data', (data) => {
                    subscriber.error(data.toString());
                    runProcess.kill();
                    // const pattern = /frame=\s*(?<nframe>[0-9]+)\s+fps=\s*(?<nfps>[0-9.]+)\s+q=(?<nq>[0-9.-]+)\s+(L?)\s*size=\s*(?<nsize>[0-9]+)(?<ssize>kB|mB|b)?\s*time=\s*(?<sduration>[0-9:.]+)\s*bitrate=\s*(?<nbitrate>[0-9.]+)(?<sbitrate>bits\/s|mbits\/s|kbits\/s)?.*(dup=(?<ndup>\d+)\s*)?(drop=(?<ndrop>\d+)\s*)?speed=\s*(?<nspeed>[0-9.]+)x/;
                    // const match = pattern.exec(data);
                    // if (match) {
                    //         // const {
                    //         //                     nframe,
                    //         //                     nfps,
                    //         //                     nq,
                    //         //                     nsize,
                    //         //                     ssize,
                    //         //                     sduration,
                    //         //                     nbitrate,
                    //         //                     sbitrate,
                    //         //                     ndup,
                    //         //                     ndrop,
                    //         //                     nspeed
                    //         //                 } = match.groups;
                    //     const {
                    //         nframe,
                    //     } = match.groups;
                    //     subscriber.next(Number.parseInt(match.groups.nframe)/totalPackets)
                    // }
                });
                runProcess.on('message', function (code, signal) {
                    console.log(`message ${code}, ${signal}`);
                });
                runProcess.on('error', function (code, signal) {
                    console.log(`error ${code}, ${signal}`);
                });
                runProcess.on('exit', function (code, signal) {
                    console.log('exit');
                    subscriber.complete();
                });
            });
        });
    }
    transcodeAudio(inputPath, outputPath, options, normalization) {
        return new rxjs_1.Observable((subscriber) => {
            Promise.all([
                this.getStreamDuration(inputPath, false),
                this.getNormalizationValues(inputPath, normalization)
            ])
                .then(([duration, normalizationValues]) => {
                console.log(`total packets ${duration}`);
                const cmd = 'ffmpeg';
                const argsVerbose = ['-v', 'error', '-progress', '-'];
                const argsInput = ['-i', inputPath];
                const argsOutput = ['-y', outputPath];
                const argsCodec = ['-codec:a', options.codec];
                const argsQuality = [];
                const argsFilters = [];
                if (options.type === audio_conversion_types_1.AudioConversionType.ConstantRate) {
                    if (options.bitrate === undefined)
                        throw new Error('Bitrate is mandatory when CBR is selected');
                    argsQuality.push(...[
                        '-b:a', `${options.bitrate}k`
                    ]);
                }
                else {
                    if (options.quality === undefined)
                        throw new Error('Quality is mandatory when VBR is selected');
                    argsQuality.push(...[
                        '-q:a', options.quality
                    ]);
                }
                if (options.frequency) {
                    argsQuality.push(...[
                        '-ar', `${options.frequency}k`
                    ]);
                }
                if (normalization) {
                    // const values = await this.getNormalizationValues(inputPath, normalization)
                    let values = normalizationValues;
                    // TODO: should we apply also :linear=true:??
                    // see: https://k.ylo.ph/2016/04/04/loudnorm.html
                    // We can then use these stats to call FFmpeg for a second time. Supplying the filter with these stats allow it to 
                    // make more intelligent normalization decisions, as well as normalize linearly if possible.
                    argsFilters.push(...[
                        '-af',
                        `loudnorm=I=${normalization.inputI}:LRA=${normalization.inputLRA}:tp=${normalization.inputTP}:measured_I=${values.inputI}:measured_tp=${values.inputTP}:measured_thresh=${values.inputThresh}:offset=${values.targetOffset}:linear=true`
                    ]);
                }
                const args = [...argsVerbose, ...argsInput, ...argsCodec, ...argsQuality, ...argsFilters, ...argsOutput];
                console.log(`spawn with ${args.join(' ')}`);
                const runProcess = child_process.spawn(cmd, args);
                runProcess.stdin.setDefaultEncoding('utf-8');
                let response = '';
                runProcess.stdout.on('data', (data) => {
                    // console.log(data.toString());
                    const pattern = /out_time=(?<currentTime>.*)/;
                    const match = pattern.exec(data.toString());
                    if (match) {
                        const { currentTime } = match.groups;
                        // console.log(`time ${currentTime}`);
                        // console.log(`time in seconds: ${this.parseTimeToSeconds(currentTime)}`)
                        // console.log(`percentage ${this.parseTimeToSeconds(currentTime)/duration}`);
                        subscriber.next({
                            total: duration,
                            current: this.parseTimeToSeconds(currentTime),
                            percentage: Math.round((this.parseTimeToSeconds(currentTime) * 100 / duration)),
                        });
                    }
                });
                runProcess.stderr.on('data', (data) => {
                    subscriber.error(data.toString());
                    runProcess.kill();
                });
                runProcess.on('message', function (code, signal) {
                    console.log(`message ${code}, ${signal}`);
                });
                runProcess.on('error', function (code, signal) {
                    console.log(`error ${code}, ${signal}`);
                });
                runProcess.on('exit', function (code, signal) {
                    console.log('exit');
                    subscriber.complete();
                });
            });
        });
    }
    async getNormalizationValues(inputPath, normalization) {
        // -af loudnorm=I=-23:LRA=7:tp=-2:measured_I=-24.17:measured_LRA=6.1:measured_tp=-8.58:measured_thresh=-34.37:offset=-1.15
        if (normalization === undefined) {
            return null;
        }
        return this.getAudioInformation(inputPath, normalization);
    }
    createThumbnailsCarousel() {
        //  ffmpeg -skip_frame nokey -i file.mp4 -vsync 0 -frame_pts true out%d.png
    }
    getImageThumbnailAt(inputPath, at, outputPath) {
        // ffmpeg -i input.mp4 -ss 00:00:01.000 -vframes 1 output.png
        return new Promise((resolve, reject) => {
            // ffmpeg -y -i file.mp4 test.mp4
            const cmd = 'ffmpeg';
            // ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of default=nokey=1:noprint_wrappers=1 files/file.mp4
            const args = ['-v',
                'error',
                '-i',
                inputPath,
                '-ss',
                at,
                '-vframes',
                '1',
                '-y',
                outputPath
            ];
            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');
            let response = '';
            runProcess.stderr.on('data', (data) => {
                reject(data);
            });
            runProcess.on('exit', function (code, signal) {
                resolve();
            });
        });
    }
    parseTimeToSeconds(time) {
        // Separamos la parte de la hora de la parte de los milisegundos
        const [timePart, millisecondsPart] = time.split('.');
        // Separamos las horas, minutos y segundos
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        // Convertimos todo a segundos
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        return totalSeconds;
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
// new FFmpeg().getInformation('files/output/sample_cbr_128_44100.mp3')
// new FFmpeg()
//     .audioNormalize('files/output/sample_cbr_320_44100.mp4', 'files/output/sample_cbr_320_44100_normalized.mp4')
//     .then(normalized  => {
//         console.log('normalizado');
//     })
//     .catch(error => {
//         console.log('error');
//     });
// new FFmpeg().transcodeAudio('files/audio/input_short.wav', 'files/output/sample_cbr_320_44100.mp4', {
//     type: AudioConversionType.ConstantRate,
//     codec: AudioCodec.Mp3,
//     bitrate: 320,
//     frequency: 44.1
// })  .subscribe({
//     next: (e: TranscodeProgressEvent) => {
//         // console.log('event' + e)
//         console.log(`progress: ${e.percentage}`);
//     },
//     error: (e) => {
//         console.log('error: ' + e);
//     },
//     complete: () => console.log('complete')
// })
// new FFmpeg().transcodeAudio('files/audio/input_short.wav', 'files/output/sample_cbr_320_44100_normalized.mp4', {
//     type: AudioConversionType.ConstantRate,
//     codec: AudioCodec.Mp3,
//     bitrate: 320,
//     frequency: 44.1
// }, {
//     type: 'ebuR128',
//     inputI: -23,
//     inputLRA: 7.0,
//     inputTP: -2
// })  .subscribe({
//     next: (e: TranscodeProgressEvent) => {
//         // console.log('event' + e)
//         console.log(`progress: ${e.percentage}`);
//     },
//     error: (e) => {
//         console.log('error: ' + e);
//     },
//     complete: () => console.log('complete')
// })
// new FFmpeg().getAudioInformation('files/output/sample_cbr_320_44100.mp4', { type: 'ebuR128', inputI: -23, inputLRA: 7, inputTP: -2})
//     .then(data => {
//         console.log(data);
//     })
// new FFmpeg().convert('')
//     .then(data => console.log(data))
// new FFmpeg().convert('files/file.mp4', 'files/output/sample.mp4', { width: 640, height: 480, codec: 'h264' })
//     .subscribe({
//         next: (e) => {
//             console.log('event' + e)
//         },
//         error: (e) => {
//             console.log('error: ' + e);
//         },
//         complete: () => console.log('complete')
//     })
//# sourceMappingURL=ffmpeg.js.map