"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoFormat = exports.VideoCodec = void 0;
var VideoCodec;
(function (VideoCodec) {
    VideoCodec["h264"] = "libx264";
    VideoCodec["h265"] = "libx265";
    VideoCodec["vp9"] = "libvpx-vp9";
})(VideoCodec || (exports.VideoCodec = VideoCodec = {}));
var VideoFormat;
(function (VideoFormat) {
    VideoFormat["mov"] = "mov";
    VideoFormat["mp4"] = "mp4";
    VideoFormat["mkv"] = "mkv";
    VideoFormat["webm"] = "webm";
})(VideoFormat || (exports.VideoFormat = VideoFormat = {}));
//# sourceMappingURL=video-conversion-types.js.map