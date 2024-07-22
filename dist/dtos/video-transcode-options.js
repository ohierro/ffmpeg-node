"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Preset = exports.Codec = exports.VideoTranscodeOptions = void 0;
class VideoTranscodeOptions {
    constructor() {
        this.fastStart = false; // https://trac.ffmpeg.org/wiki/Encode/H.264#faststartforwebvideo
        this.preset = Preset.medium; // https://trac.ffmpeg.org/wiki/Encode/H.264#Preset
    }
}
exports.VideoTranscodeOptions = VideoTranscodeOptions;
// https://trac.ffmpeg.org/wiki
var Codec;
(function (Codec) {
    Codec["h264"] = "h264";
    Codec["h265"] = "h265";
    Codec["vp9"] = "vp9";
    Codec["ffv1"] = "ffv1";
    Codec["av1"] = "av1";
})(Codec || (exports.Codec = Codec = {}));
var Preset;
(function (Preset) {
    Preset["ultrafast"] = "ultrafast";
    Preset["superfast"] = "superfast";
    Preset["veryfast"] = "veryfast";
    Preset["faster"] = "faster";
    Preset["fast"] = "fast";
    Preset["medium"] = "medium";
    Preset["slow"] = "slow";
    Preset["slower"] = "slower";
    Preset["veryslow"] = "veryslow";
})(Preset || (exports.Preset = Preset = {}));
//# sourceMappingURL=video-transcode-options.js.map