"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Preset = exports.ConvertOptions = void 0;
class ConvertOptions {
    constructor() {
        this.preset = Preset.medium; // https://trac.ffmpeg.org/wiki/Encode/H.264#Preset
        this.fastStart = false; // https://trac.ffmpeg.org/wiki/Encode/H.264#faststartforwebvideo
    }
}
exports.ConvertOptions = ConvertOptions;
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
//# sourceMappingURL=convert-options.js.map