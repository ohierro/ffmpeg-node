import child_process = require('child_process');
import { AudioStreamInformation, StreamInformation, VideoStreamInformation } from './stream-information'
import { FileInformation } from './file-information';
import { from, Observable } from 'rxjs';
import { ConvertOptions } from './convert-options';
import { AudioConvertOptions } from './audio-convert-options';
import { AudioCodec, AudioConversionType } from './types/audio-conversion-types';
import { TranscodeProgressEvent } from './types/transcode-progress-event';
import { AudioNormalizacionInformation } from './types/audio-normalization-information';
import { AudioNormalization } from './types/audio-normalization';
import { createLogger, transports, format, Logger, level } from "winston";
import addProcessId from './log/add-process-id';


/**Class that does the ffmpeg transformations */
export class FFmpeg {
    private options: string[]
    private runProcess: child_process.ChildProcess
    private outputFilename: string
    private customOutput: NodeJS.WritableStream
    private logger: Logger

    constructor() {
        this.options = [];
        this.outputFilename = "";
        this.logger = createLogger({
            transports: [
                new transports.Console()
            ],
            defaultMeta: { service: 'ffmpeg-node' },
            format: format.combine(
                addProcessId(),
                format.timestamp(),
                format.json(),
            ),
            level: 'debug'
            // format: format.combine(
            //   format.timestamp(),
            //   format.printf(({ timestamp, level, message, service }) => {
            //     return `[${timestamp}] ${service} ${level}: ${message}`;
            //   })
            // ),
            // defaultMeta: {
            //   service: "WinstonExample",
            // },
          });
    }

    getInformation(absolutePath: string) : Promise<FileInformation> {
        this.logger.info(`getInformation :: call with ${absolutePath}`)

        return new Promise((resolve, reject) => {
            const cmd = 'ffprobe'
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
                            absolutePath]

            this.logger.debug(`getInformation :: spawn ${cmd} with ${args.join(' ')}`)
            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');

            let response = ''

            runProcess.stdout.on('data', (data) => {
                response += data
            })

            runProcess.on('exit', (code, signal) => {
                // console.log('output resolution: ' + response);
                this.logger.debug(`getInformation :: output information ${response}`)
                try {

                    const jsonResponse = JSON.parse(response)

                    const fileInfo = new FileInformation()

                    fileInfo.duration = Number.parseFloat(jsonResponse.format.duration),
                    fileInfo.formatName = jsonResponse.format.format_name,
                    fileInfo.formatLongName = jsonResponse.format.format_long_name
                    fileInfo.streams = []

                    this.logger.debug(`getInformation :: streams ${jsonResponse.streams.length}`)

                    for (let jsonStream of jsonResponse.streams) {
                        let streamInfo: StreamInformation;

                        this.logger.debug(`getInformation :: stream type ${jsonStream.codec_type}`)

                        if (jsonStream.codec_type === 'audio') {
                            const audioInfo =  new AudioStreamInformation()
                            audioInfo.type = 'audio'
                            audioInfo.codec = jsonStream.codec_name
                            audioInfo.bitRate = Number(jsonStream.bit_rate)
                            audioInfo.frequency = Number(jsonStream.sample_rate)

                            streamInfo = audioInfo
                        } else {
                            const videoStreamInfo = new VideoStreamInformation()
                            videoStreamInfo.type = jsonStream.codec_type
                            videoStreamInfo.width = jsonStream.width
                            videoStreamInfo.height = jsonStream.height
                            videoStreamInfo.codec =  jsonStream.codec_name
                            // if (streamInfo.type === 'video') {
                            videoStreamInfo.aspect_ratio = jsonStream.display_aspect_ratio
                            // }
                            streamInfo = videoStreamInfo
                        }

                        this.logger.debug(`getInformation :: stream parsed ${streamInfo}`)
                        fileInfo.streams.push(streamInfo)
                    }

                    resolve(fileInfo)
                } catch (error) {
                    reject(error)
                }
            });
        })
    }

    /**
     * Get duration of the stream in seconds 
     * 
     * @param inputPath Absolute path to file
     * @param isVideo If input is audio, this should be false. Default: true
     */
    getStreamDuration(inputPath: string, isVideo = true): Promise<number> {
        this.logger.info(`getStreamDuration :: call with ${inputPath}, ${isVideo}`)

        return new Promise((resolve, reject) => {
            const cmd = 'ffprobe'

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
            ]
            
            this.logger.info(`getStreamDuration :: spawn ${cmd} with ${args}`)
            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');

            let response = ''

            runProcess.stdout.on('data', (data) => {
                response += data
                this.logger.verbose(`getStreamDuration :: data`)
            })

            runProcess.stderr.on('data', (data) => {
                // console.log('error' + data);
                this.logger.verbose(`getStreamDuration :: stderr ${data}`)
            })

            runProcess.on('exit', (code, signal) => {
                this.logger.debug(`getStreamDuration :: resolve with ${response}`)
                resolve(Number.parseInt(response))
            })
        })
    }

    getAudioInformation(inputPath: string, target: AudioNormalization): Observable<TranscodeProgressEvent | AudioNormalizacionInformation> {
        this.logger.info(`getAudioInformation :: call with ${inputPath}, ${target}`)
        return new Observable((subscriber) => {
            this.getStreamDuration(inputPath, false)
                .then(duration => {
                    const cmd = 'ffmpeg'

                    const args = [
                        '-progress',
                        '-',
                        '-i',
                        inputPath,
                        '-af',
                        `loudnorm=I=${target.inputI}:LRA=${target.inputLRA}:tp=${target.inputTP}:print_format=json`,
                        '-f', 'null',
                        '-'
                    ]
                    
                    this.logger.info(`getAudioInformation :: spawn ${cmd} with ${args.join(' ')}`)
                    const runProcess = child_process.spawn(cmd, args);
                    runProcess.stdin.setDefaultEncoding('utf-8');

                    let response = ''

                    runProcess.stdout.on('data', (data) => {
                        const pattern = /out_time=(?<currentTime>.*)/
                        const match = pattern.exec(data.toString())

                        if (match) {
                            const { currentTime } = match.groups

                            this.logger.info(`getAudioInformation :: currentTime ${currentTime}`)

                            subscriber.next({
                                total: duration,
                                percentage: Math.round((this.parseTimeToSeconds(currentTime) * 100 / duration)),
                            } as TranscodeProgressEvent)
                        }
                    })

                    runProcess.stderr.on('data', (data) => {
                        response += data.toString()
                    })

                    runProcess.on('exit', (code, signal) => {
                        this.logger.debug(`getAudioInformation :: end of process`)

                        const output = response.split('\n')
                        // console.log(`output to parse ${output.slice(output.length-13)}`);
                        this.logger.debug(`getAudioInformation :: output to parse ${output.slice(output.length-13)}`)

                        const data = JSON.parse(output.slice(output.length-13).join(''))
                        subscriber.next({
                                inputI: Number(data['input_i']),
                                inputLRA: Number(data['input_lra']),
                                inputThresh: Number(data['input_thresh']),
                                inputTP: Number(data['input_tp']),
                                normalizationType: data['normalization_type'],
                                targetOffset: Number(data['target_offset']),
                                outputI: Number(data['output_i']),
                                outputTP: Number(data['output_tp']),
                                outputThresh: Number(data['output_thresh'])
                            })
                        subscriber.complete()
                    })
                })
        })
    }
    /**
     * Get the number of packets (length) of the `inputPath` file
     *
     * @param inputPath Absolute path to file
     * @returns A Promise resolved with the number of packets of the file
     */
    getPacketNumber(inputPath: string, isVideo = true): Promise<number> {
        return new Promise((resolve, reject) => {
            const cmd = 'ffprobe'

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
                        ]

            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');

            let response = ''

            runProcess.stdout.on('data', (data) => {
                response += data
                // console.log('data' + data);
            })

            runProcess.stderr.on('data', (data) => {
                // console.log('error' + data);
            })

            runProcess.on('exit', function (code, signal) {
                resolve(Number.parseInt(response))
            })
        })
    }

    convert(inputPath: string, outputPath: string, options: ConvertOptions): Observable<Number> {
        return new Observable((subscriber) => {
            this.getPacketNumber(inputPath)
                .then(totalPackets => {
                    const cmd = 'ffmpeg'

                    const argsVerbose = ['-v', 'error', '-progress','-']
                    const argsInput = ['-i', inputPath]
                    const argsOutput = ['-y', outputPath]
                    let argsScale = []

                    if (options.width && options.height) {
                        argsScale = ['-vf', `scale=${options.width}:${options.height}`]
                    }

                    const args = [...argsVerbose, ...argsInput, ...argsScale, ...argsOutput]
                    console.log('spawn');

                    const runProcess = child_process.spawn(cmd, args);
                    runProcess.stdin.setDefaultEncoding('utf-8');

                    let response = ''

                    runProcess.stdout.on('data', (data) => {
                        // console.log(data);
                        const pattern = /frame=(?<nframe>\d+)/

                        const match = pattern.exec(data.toString())

                        if (match) {
                            const { nframe } = match.groups
                            subscriber.next(parseInt(nframe)/totalPackets)
                        }
                        // parse data
                    })
                    runProcess.stderr.on('data', (data) => {
                        subscriber.error(data.toString())
                        runProcess.kill()
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
                    })
                    runProcess.on('message', function(code, signal) {
                        console.log(`message ${code}, ${signal}`);
                    })
                    runProcess.on('error', function(code, signal) {
                        console.log(`error ${code}, ${signal}`);
                    })
                    runProcess.on('exit', function (code, signal) {
                        console.log('exit');

                        subscriber.complete()
                    })
                })
        })
    }

    transcodeAudio(inputPath: string, outputPath: string, options: AudioConvertOptions, normalization?: AudioNormalization): Observable<TranscodeProgressEvent> {
        this.logger.info(`transcodeAudio :: call with ${inputPath} - ${outputPath}`)

        return new Observable( (subscriber) => { 
            const durationObsv = from(this.getStreamDuration(inputPath))
            const normalizationObsv = this.getAudioInformation(inputPath, normalization)

            this.getStreamDuration(inputPath)
                .then(duration => {
                    this.logger.debug(`transcodeAudio :: stream duration ${duration}`)

                    if (normalization) {
                        this.logger.debug(`transcodeAudio :: normalization enabled`)
                        let normalizationInformation = null

                        let lastPercentage = -1

                        this.getAudioInformation(inputPath, normalization)
                            .subscribe({
                                next: (event) => {
                                    if ('percentage' in event) {
                                        let currentPercentage = Math.floor(event.percentage / 2)

                                        this.logger.verbose(`transcodeAudio :: currentPercenage ${currentPercentage}`)

                                        if ( currentPercentage > lastPercentage ) {
                                            subscriber.next({
                                                percentage: event.percentage,
                                                total: currentPercentage,
                                                stage: 'obtaining normalization values'
                                            })
                                            
                                            lastPercentage = currentPercentage
                                        }
                                    } else {
                                        this.logger.debug(`transcodeAudio :: normalizationInformation = ${JSON.stringify(event)}`)

                                        normalizationInformation = event
                                    }
                                },
                                complete: () => {
                                    // do transcode
                                    lastPercentage = -1
                                    this.logger.debug(`transcodeAudio :: normalization information completed`)

                                    this._transcodeAudio(inputPath, outputPath, options, duration, normalization, normalizationInformation)
                                        .subscribe({
                                            next: (event) => {
                                                let currentPercentage = Math.floor(event.percentage / 2)

                                                this.logger.verbose(`transcodeAudio :: currentPercenage ${currentPercentage}`)

                                                if ( currentPercentage > lastPercentage ) {
                                                    subscriber.next({
                                                        percentage: event.percentage,
                                                        total: 50 + currentPercentage,
                                                        stage: 'transcoding'
                                                    })

                                                    lastPercentage = currentPercentage
                                                }
                                            },
                                            complete: () => {
                                                this.logger.debug(`transcodeAudio :: transcode complete`)

                                                subscriber.complete()
                                            }

                                        })
                                }
                            })
                    } else {
                        this.logger.debug(`transcodeAudio :: normalization disabled`)

                        this._transcodeAudio(inputPath, outputPath, options, duration)
                            .subscribe({
                                next: (event) => {
                                    subscriber.next(event)
                                },
                                complete: () => {
                                    subscriber.complete()
                                }

                            })
                    }
                })
        })
    }

    private _transcodeAudio(inputPath: string, 
                            outputPath: string, 
                            options: AudioConvertOptions, 
                            duration: number, 
                            normalization?: AudioNormalization, 
                            normalizationValues?: AudioNormalizacionInformation): Observable<TranscodeProgressEvent> {
        
        this.logger.debug(`_transcodeAudio :: call`)
        
        return new Observable((subscriber) => {
            const cmd = 'ffmpeg'

            const argsVerbose = ['-v', 'error', '-progress','-']
            const argsInput = ['-i', inputPath]
            const argsOutput = ['-y', outputPath]
            const argsCodec = ['-codec:a', options.codec]
            
            const argsQuality = []

            const argsFilters = []

            if (options.type === AudioConversionType.ConstantRate) {
                if (options.bitrate === undefined) throw new Error('Bitrate is mandatory when CBR is selected')

                argsQuality.push(...[
                    '-b:a', `${options.bitrate}k`
                ])
            } else {
                if (options.quality === undefined) throw new Error('Quality is mandatory when VBR is selected')

                argsQuality.push(...[
                    '-q:a', options.quality
                ])
            }

            if (options.frequency) {
                argsQuality.push(...[
                    '-ar', `${options.frequency}k`
                ])
            }

            if (normalization) {
                let values = normalizationValues

                // TODO: should we apply also :linear=true:??
                // see: https://k.ylo.ph/2016/04/04/loudnorm.html
                // We can then use these stats to call FFmpeg for a second time. Supplying the filter with these stats allow it to 
                // make more intelligent normalization decisions, as well as normalize linearly if possible.
                argsFilters.push(...[
                    '-af',
                    `loudnorm=I=${normalization.inputI}:LRA=${normalization.inputLRA}:tp=${normalization.inputTP}:measured_I=${values.inputI}:measured_tp=${values.inputTP}:measured_thresh=${values.inputThresh}:offset=${values.targetOffset}:linear=true`
                ])
            }
            
            const args = [...argsVerbose, ...argsInput, ...argsCodec, ...argsQuality, ...argsFilters, ...argsOutput]
            this.logger.debug(`_transcodeAudio :: span with ${args.join(' ')}`)

            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');

            runProcess.stdout.on('data', (data) => {
                const pattern = /out_time=(?<currentTime>.*)/
                const match = pattern.exec(data.toString())

                if (match) {
                    const { currentTime } = match.groups

                    this.logger.verbose(`_transcodeAudio :: currentTime ${currentTime}`)

                    subscriber.next({
                        total: duration,
                        percentage: Math.round((this.parseTimeToSeconds(currentTime) * 100 / duration)),
                        stage: 'transcoding'
                    })
                    
                }
            })
            runProcess.stderr.on('data', (data) => {
                this.logger.error(`_transcodeAudio :: error transcoding by stderr info: ${data}`)

                subscriber.error({ msg: data.toString() })
                runProcess.kill()
            })
            runProcess.on('message', (code, signal) => {
                this.logger.verbose(`_transcodeAudio :: message: ${code} - ${signal}`)
            })
            runProcess.on('error', (code, signal) => {
                this.logger.error(`_transcodeAudio :: error transcoding: ${code} - ${signal}`)
                subscriber.error({ code, signal })
                runProcess.kill()
            })
            runProcess.on('exit', (code, signal) => {
                this.logger.debug(`_transcodeAudio :: end transcoding`)

                subscriber.complete()
            })
        })
    }

    createThumbnailsCarousel() {
        //  ffmpeg -skip_frame nokey -i file.mp4 -vsync 0 -frame_pts true out%d.png
        throw Error('Not yet implemented!!')
    }

    getImageThumbnailAt(inputPath: string, at: string, outputPath: string) {
        this.logger.info(`getImageThumbnailAt :: call with ${inputPath}, ${at}, ${outputPath}`)

        return new Promise<void>((resolve, reject) => {
            const cmd = 'ffmpeg'
            
            const args = ['-v',
                            'error',
                            '-i',
                            inputPath,
                            '-ss',
                            at,
                            '-vframes',
                            '1',
                            '-y', // overwrite
                            outputPath
                        ]

            this.logger.info(`getImageThumbnailAt :: spawn ${cmd} with ${args.join(' ')}`)
            const runProcess = child_process.spawn(cmd, args);
            runProcess.stdin.setDefaultEncoding('utf-8');

            runProcess.stderr.on('data', (data) => {
                this.logger.error(`getImageThumbnailAt :: error ${data}`)
                reject(data)
            })

            runProcess.on('exit', (code, signal) => {
                this.logger.info(`getImageThumbnailAt :: end`)
                resolve()
            })
        })
    }

    private parseTimeToSeconds(time: string): number {
        // Separamos la parte de la hora de la parte de los milisegundos
        const [timePart, millisecondsPart] = time.split('.');
        
        // Separamos las horas, minutos y segundos
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        
        // Convertimos todo a segundos
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        
        return totalSeconds;
    }
}


// // new FFmpeg().getInformation('files/input.wav')
// // new FFmpeg().getAudioInformation('files/audio/input_medium.wav', {
// //         type: 'ebuR128',
// //         inputI: -23,
// //         inputLRA: 7.0,
// //         inputTP: -2
// //     }).subscribe({
// //             next: (e: TranscodeProgressEvent) => {
// //                 // console.log('event' + e)
// //                 console.log(`progress: ${e.percentage}`);
                
// //             },
// //             error: (e) => {
// //                 console.log('error: ' + e);
// //             },
// //             complete: () => console.log('complete')
// //         })


// // new FFmpeg()
// //     .audioNormalize('files/output/sample_cbr_320_44100.mp4', 'files/output/sample_cbr_320_44100_normalized.mp4')
// //     .then(normalized  => {
// //         console.log('normalizado');
        
// //     })
// //     .catch(error => {
// //         console.log('error');
// //     });

// new FFmpeg().transcodeAudio('files/audio/input_medium.wav', 'files/output/sample_cbr_320_44100.mp4', {
//     type: AudioConversionType.ConstantRate,
//     codec: AudioCodec.Mp3,
//     bitrate: 320,
//     frequency: 44.1
// },  {
//     type: 'ebuR128',
//     inputI: -23,
//     inputLRA: 7.0,
//     inputTP: -2
// })  .subscribe({
//     next: (e: TranscodeProgressEvent) => {
//         // console.log('event' + e)
//         // console.log(`${e.stage} - progress: ${e.percentage} - total: ${e.total}`);
        
//     },
//     error: (e) => {
//         console.log('error: ' + e);
//     },
//     complete: () => console.log('complete')
// })

// // new FFmpeg().transcodeAudio('files/audio/input_short.wav', 'files/output/sample_cbr_320_44100_normalized.mp4', {
// //     type: AudioConversionType.ConstantRate,
// //     codec: AudioCodec.Mp3,
// //     bitrate: 320,
// //     frequency: 44.1
// // }, {
// //     type: 'ebuR128',
// //     inputI: -23,
// //     inputLRA: 7.0,
// //     inputTP: -2
// // })  .subscribe({
// //     next: (e: TranscodeProgressEvent) => {
// //         // console.log('event' + e)
// //         console.log(`progress: ${e.percentage}`);
        
// //     },
// //     error: (e) => {
// //         console.log('error: ' + e);
// //     },
// //     complete: () => console.log('complete')
// // })

// // new FFmpeg().getAudioInformation('files/output/sample_cbr_320_44100.mp4', { type: 'ebuR128', inputI: -23, inputLRA: 7, inputTP: -2})
// //     .then(data => {
// //         console.log(data);
        
// //     })

// // new FFmpeg().convert('')
// //     .then(data => console.log(data))
// // new FFmpeg().convert('files/file.mp4', 'files/output/sample.mp4', { width: 640, height: 480, codec: 'h264' })
// //     .subscribe({
// //         next: (e) => {
// //             console.log('event' + e)
// //         },
// //         error: (e) => {
// //             console.log('error: ' + e);
// //         },
// //         complete: () => console.log('complete')
// //     })