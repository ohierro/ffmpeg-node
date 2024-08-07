import exp = require("constants")
import { FFmpeg } from "./ffmpeg"
import { fail } from "assert"
import * as fs from 'fs/promises'
import { VideoStreamInformation } from "./dtos/stream-information"
import { VideoCodec, VideoFormat } from "./types/video-conversion-types"

beforeAll(async () => {
  try {
    await fs.rmdir('files/output')
    await fs.mkdir('files/output')
    await fs.mkdir('files/output/img')
  } catch (err) {}
})

test('get basic information', async () => {
  const ffmpeg = new FFmpeg()
  let info = await ffmpeg.getInformation('files/file.mp4')

  const videoInformation = info.streams.filter(s => s.type === 'video')[0]
  const audioInformation = info.streams.filter(s => s.type === 'audio')[0]

  expect(info.duration).toBe(128.683)
  expect(info.formatName).toBe('mov,mp4,m4a,3gp,3g2,mj2')
  expect(info.formatLongName).toBe('QuickTime / MOV')
  expect(info.streams.length).toBe(2)
  expect((videoInformation as VideoStreamInformation).width).toBe(1920)
  expect((videoInformation as VideoStreamInformation).height).toBe(1080)
  expect(videoInformation.codec).toBe('h264')
  // TODO: change variable name
  expect((videoInformation as VideoStreamInformation).aspect_ratio).toBe('16:9')

  expect(audioInformation.codec).toBe('aac')
})

// todo: test with non-existent file
test('get basic packet information', async () => {
  const ffmpeg = new FFmpeg()
  let nbFrames = await ffmpeg.getPacketNumber('files/file.mp4')

  expect(nbFrames).toBe(3858)
}, 60000)

// test('basic conversion', (done) => {
//   const ffmpeg = new FFmpeg()

//   ffmpeg.convert('files/file.mp4', 'output/file_320x240.mp4', { width: 320, height: 240, codec: 'h264' })
//         .subscribe({
//           complete: () => {
//             done()
//           },
//           error: () => {
//             fail('error with conversion')
//           }
//         })
// }, 15000)

test('error converting because output path does not exists', (done) => {
  const ffmpeg = new FFmpeg()

  // ensure output_path does not exists
  ffmpeg.convert('files/file.mp4', 'files/invalid_output_path/file_320x240.mp4', { width: 320, height: 240, codec: VideoCodec.h264 })
        .subscribe({
          complete: () => {
            // done()
            fail('This test must fail')
          },
          error: (e) => {
            console.log(`error ${e}`);
            done()
            // fail('error with conversion')
          }
        })
}, 15000)

test('error converting because input path does not exists', (done) => {
  const ffmpeg = new FFmpeg()

  // ensure output_path does not exists
  ffmpeg.convert('files/invalid_input_path/file.mp4', 'files/output/file_320x240.mp4', { width: 320, height: 240, codec: VideoCodec.h264 })
        .subscribe({
          complete: () => {
            // done()
            fail('This test must fail')
          },
          error: (e) => {
            console.log(`error ${e}`);
            done()
            // fail('error with conversion')
          }
        })
}, 15000)

test('basic conversion', (done) => {
  const ffmpeg = new FFmpeg()

  let progress = 0
  // ensure output_path does not exists
  ffmpeg.convert('files/file.mp4', 'files/output/file_320x240.mp4', { width: 320, height: 240, codec: VideoCodec.h264 })
        .subscribe({
          next: (value) => {
            // if (value.percentage < progress) {
            //   fail('progress should be always positive')
            // }

            // progress = value as number
          },
          complete: () => {
            if (progress >= 1) {
              done()
            } else {
              fail('progress not complete')
            }
          },
          error: (e) => {
            console.log(`error ${e}`);
            fail(e)
          }
        })
}, 25000)

test('get basic thumbnail from video', async () => {
  const ffmpeg = new FFmpeg()
  const INPUT_PATH = 'files/file_1920x1080.mp4'
  const OUTPUT_PATH = 'files/output/img/thumb_file_1920x1080.png'

  let progress = 0

  await ffmpeg.getImageThumbnailAt(INPUT_PATH, '00:01:36', OUTPUT_PATH)

  console.log('test');
}, 15000)