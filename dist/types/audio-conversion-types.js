"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioCodec = exports.AudioConversionType = void 0;
var AudioConversionType;
(function (AudioConversionType) {
    AudioConversionType[AudioConversionType["ConstantRate"] = 0] = "ConstantRate";
    AudioConversionType[AudioConversionType["VariableRate"] = 1] = "VariableRate";
})(AudioConversionType || (exports.AudioConversionType = AudioConversionType = {}));
var AudioCodec;
(function (AudioCodec) {
    AudioCodec["Wav"] = "wav";
    AudioCodec["Mp3"] = "libmp3lame";
    AudioCodec["Aac"] = "aac";
    AudioCodec["Ogg"] = "ogg";
    AudioCodec["Flac"] = "flacc";
    AudioCodec["Aiff"] = "aiff";
})(AudioCodec || (exports.AudioCodec = AudioCodec = {}));
//# sourceMappingURL=audio-conversion-types.js.map