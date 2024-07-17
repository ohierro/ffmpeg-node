import exp = require("constants")
import { FFmpeg } from "./ffmpeg"
import * as fs from 'fs/promises'
import { lastValueFrom } from "rxjs"
import { AudioCodec, AudioConversionType } from "./types/audio-conversion-types"
import { AudioStreamInformation } from "./dtos/stream-information"
import { AudioNormalization } from "./types/audio-normalization"

beforeEach(async () => {
  const files = await fs.readdir('files/audio/output')
  for (let file of files) {
    await fs.rm(`files/audio/output/${file}`)
  }
})


// http://samples.mplayerhq.hu/
test('AUDIO basic conversion wav to mp3 (CBR)', async () => {
  const ffmpeg = new FFmpeg()

  let conversions = [
    // 44100 Hz
    [128, 44.1],
    [256, 44.1],
    [320, 44.1],
    // 48000 Hz
    [128, 48],
    [256, 48],
    [321, 48]
  ]

  for (let conversion of conversions) {
    const outputPath = `files/output/sample_cbr_${conversion[0]}_${conversion[1]*1000}.mp4`
    await lastValueFrom(
        ffmpeg.transcodeAudio('files/audio/input_short.wav', outputPath,{
        codec: AudioCodec.Mp3,
        type: AudioConversionType.ConstantRate,
        bitrate: conversion[0],
        frequency: conversion[1]
      })
    )

    let info = await ffmpeg.getInformation(outputPath)

    expect(info.streams.length).toBe(1)
    expect(info.streams[0]).toBeInstanceOf(AudioStreamInformation)
    expect((info.streams[0] as AudioStreamInformation).frequency).toBe(conversion[1]*1000)
    expect(Math.floor((info.streams[0] as AudioStreamInformation).bitRate/1000)).toBeCloseTo(conversion[0])
  }
}, 600000)

test('AUDIO basic conversion wav to mp3 (VBR)', async () => {
  const ffmpeg = new FFmpeg()

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
  ]

  for (let conversion of conversions) {
    const outputPath = `files/output/sample_vbr_${conversion[0]}_${conversion[1]*1000}.mp4`
    await lastValueFrom(
        ffmpeg.transcodeAudio('files/audio/input_short.wav', outputPath,{
        codec: AudioCodec.Mp3,
        type: AudioConversionType.VariableRate,
        frequency: conversion[1],
        quality: conversion[0]
      })
    )

    let info = await ffmpeg.getInformation(outputPath)
    console.log(`info ${info}`);

    // https://trac.ffmpeg.org/wiki/Encode/MP3#VBREncoding
    // mapping between quality parameter and bitrate ranges
    const expectedBitrate = {
      2: [170,210],
      3: [150,195],
      5: [120,150],
      8: [70,105],
    }

    expect(info.streams.length).toBe(1)
    expect(info.streams[0]).toBeInstanceOf(AudioStreamInformation)
    expect((info.streams[0] as AudioStreamInformation).frequency).toBe(conversion[1]*1000)
    expect(Math.floor((info.streams[0] as AudioStreamInformation).bitRate/1000))
      .toBeGreaterThan(expectedBitrate[conversion[0]][0])
    expect(Math.floor((info.streams[0] as AudioStreamInformation).bitRate/1000))
      .toBeLessThan(expectedBitrate[conversion[0]][1])
  }
})

test('AUDIO basic conversion wav to mp3 (CBR) with basic normalization', async () => {
  const ffmpeg = new FFmpeg()

  let conversions = [
    // 48000 Hz
    [192, 48],
    [256, 48],
    [321, 48]
  ]

  for (let conversion of conversions) {
    const outputPath = `files/output/sample_cbr_${conversion[0]}_${conversion[1]*1000}_normalized.mp4`
    // const normalizationValues: AudioNormalization = {
    //   type: 'ebuR128',
    //   inputI: -23,
    //   inputLRA: 7.0,
    //   inputTP: -2
    // }

    // 16:TP=-1.5:LRA=11
    const normalizationValues: AudioNormalization = {
      type: 'ebuR128',
      inputI: -16,
      inputLRA: 11,
      inputTP: -1.5
    }

    await lastValueFrom(
        ffmpeg.transcodeAudio('files/audio/input_short.wav', outputPath,{
        codec: AudioCodec.Mp3,
        type: AudioConversionType.ConstantRate,
        bitrate: conversion[0],
        frequency: conversion[1],
      }, normalizationValues)
    )

    let info = await ffmpeg.getInformation(outputPath)
    console.log(`info ${info}`);

    // let normalizationInfo = await ffmpeg.getNormalizationValues(outputPath, normalizationValues)
    let normalizationInfo = await lastValueFrom(ffmpeg.getAudioInformation(outputPath, normalizationValues))

    // output format should not be changed
    expect(info.streams.length).toBe(1)
    expect(info.streams[0]).toBeInstanceOf(AudioStreamInformation)
    expect((info.streams[0] as AudioStreamInformation).frequency).toBe(conversion[1]*1000)
    expect(Math.floor((info.streams[0] as AudioStreamInformation).bitRate/1000)).toBeCloseTo(conversion[0])

    // checks

// https://tech.ebu.ch/docs/r/r128.pdf

//     h) that the Programme Loudness Level shall be normalised to a Target Level of −23.0 LUFS. Where
// attaining the Target Level is not achievable practically (for example, live programmes), a tolerance
// of ±1.0 LU is permitted. A broadcaster should ensure that a deviation from the Target Level towards
// the limits of the tolerance does not become standard practice


//     m) and that the True Peak Level of a programme shall not exceed −1 dBTP (dB True Peak) during
// production (linear audio), measured with a meter compliant with ITU-R BS.1770 and EBU Tech 3341.
// The measurement tolerance is ±0.3 dB (for signals with a bandwidth limited to 20 kHz). Permitted
// Maximum True Peak Levels may be lower for different distribution systems and data reduction rates.
// A broadcaster should check EBU Tech 3344 [5] for details;


    // normalizationInfo
    // expect(Math.trunc(normalizationInfo.outputI)).toBe(normalizationValues.inputI)
    // expect(Math.trunc(normalizationInfo.outputTP)).toBe(normalizationValues.inputTP)
    // not sure if we should check this againts input or agains a normalized value as '3'...?
    // expect(Math.trunc(normalizationInfo.outputLRA)).toBe(normalizationValues.inputLRA)
  }
}, 600000)