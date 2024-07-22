"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ffmpeg_1 = require("./ffmpeg");
const fs = require("fs/promises");
const rxjs_1 = require("rxjs");
const video_conversion_types_1 = require("./types/video-conversion-types");
const convert_options_1 = require("./dtos/convert-options");
beforeEach(async () => {
    const files = await fs.readdir('files/output');
    for (let file of files) {
        await fs.rm(`files/output/${file}`);
    }
});
// http://samples.mplayerhq.hu/
test('basic conversions to common sizes', async () => {
    const ffmpeg = new ffmpeg_1.FFmpeg();
    let sizes = [
        [320, 240],
        [640, 480],
        [1024, 768]
    ];
    for (let size of sizes) {
        const outputPath = `files/output/file_${size[0]}x${size[1]}.mp4`;
        await (0, rxjs_1.lastValueFrom)(ffmpeg.convert('files/file_1920x1080.mp4', outputPath, {
            width: size[0],
            height: size[1],
            codec: video_conversion_types_1.VideoCodec.h264,
            preset: convert_options_1.Preset.slow
        }));
        let info = await ffmpeg.getInformation(outputPath);
        let videoStream = info.streams.filter(s => s.type === 'video')[0];
        expect(videoStream.width).toBe(size[0]);
        expect(videoStream.height).toBe(size[1]);
        expect(videoStream.codec).toBe('h264');
    }
}, 600000);
//# sourceMappingURL=ffmpeg-conversions.spec.js.map