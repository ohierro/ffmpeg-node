"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ffmpeg_1 = require("./ffmpeg");
const fs = require("fs/promises");
const rxjs_1 = require("rxjs");
const audio_conversion_types_1 = require("./types/audio-conversion-types");
const stream_information_1 = require("./stream-information");
beforeEach(async () => {
    const files = await fs.readdir('files/audio/output');
    for (let file of files) {
        await fs.rm(`files/audio/output/${file}`);
    }
});
// http://samples.mplayerhq.hu/
test('AUDIO basic conversion wav to mp3 (CBR)', async () => {
    const ffmpeg = new ffmpeg_1.FFmpeg();
    let conversions = [
        // 44100 Hz
        [128, 44.1],
        [256, 44.1],
        [320, 44.1],
        // 48000 Hz
        [128, 48],
        [256, 48],
        [321, 48]
    ];
    for (let conversion of conversions) {
        const outputPath = `files/output/sample_cbr_${conversion[0]}_${conversion[1] * 1000}.mp4`;
        await (0, rxjs_1.lastValueFrom)(ffmpeg.transcodeAudio('files/audio/input_short.wav', outputPath, {
            codec: audio_conversion_types_1.AudioCodec.Mp3,
            type: audio_conversion_types_1.AudioConversionType.ConstantRate,
            bitrate: conversion[0],
            frequency: conversion[1]
        }));
        let info = await ffmpeg.getInformation(outputPath);
        expect(info.streams.length).toBe(1);
        expect(info.streams[0]).toBeInstanceOf(stream_information_1.AudioStreamInformation);
        expect(info.streams[0].frequency).toBe(conversion[1] * 1000);
        expect(Math.floor(info.streams[0].bitRate / 1000)).toBeCloseTo(conversion[0]);
    }
}, 600000);
test('AUDIO basic conversion wav to mp3 (VBR)', async () => {
    const ffmpeg = new ffmpeg_1.FFmpeg();
    let conversions = [
        // 44100 Hz
        [2, 44.1],
        [3, 44.1],
        [5, 44.1],
        [8, 44.1],
        // 48000 Hz
        [2, 48],
        [3, 48],
        [5, 48],
        [8, 48]
    ];
    for (let conversion of conversions) {
        const outputPath = `files/output/sample_vbr_${conversion[0]}_${conversion[1] * 1000}.mp4`;
        await (0, rxjs_1.lastValueFrom)(ffmpeg.transcodeAudio('files/audio/input_short.wav', outputPath, {
            codec: audio_conversion_types_1.AudioCodec.Mp3,
            type: audio_conversion_types_1.AudioConversionType.VariableRate,
            frequency: conversion[1],
            quality: conversion[0]
        }));
        let info = await ffmpeg.getInformation(outputPath);
        console.log(`info ${info}`);
        // https://trac.ffmpeg.org/wiki/Encode/MP3#VBREncoding
        // mapping between quality parameter and bitrate ranges
        const expectedBitrate = {
            2: [170, 210],
            3: [150, 195],
            5: [120, 150],
            8: [70, 105],
        };
        expect(info.streams.length).toBe(1);
        expect(info.streams[0]).toBeInstanceOf(stream_information_1.AudioStreamInformation);
        expect(info.streams[0].frequency).toBe(conversion[1] * 1000);
        expect(Math.floor(info.streams[0].bitRate / 1000))
            .toBeGreaterThan(expectedBitrate[conversion[0]][0]);
        expect(Math.floor(info.streams[0].bitRate / 1000))
            .toBeLessThan(expectedBitrate[conversion[0]][1]);
    }
});
//# sourceMappingURL=ffmpeg-audio-conversions.spec.js.map