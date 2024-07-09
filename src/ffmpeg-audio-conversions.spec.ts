import exp = require("constants")
import { FFmpeg } from "./ffmpeg"
import * as fs from 'fs/promises'
import { lastValueFrom } from "rxjs"
import { AudioCodec, AudioConversionType } from "./types/audio-conversion-types"
import { AudioStreamInformation } from "./stream-information"

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