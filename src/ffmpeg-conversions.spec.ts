import exp = require("constants")
import { FFmpeg } from "./ffmpeg"
import { fail } from "assert"
import * as fs from 'fs/promises'
import { lastValueFrom } from "rxjs"

beforeEach(async () => {
  const files = await fs.readdir('files/output')
  for (let file of files) {
    await fs.rm(`files/output/${file}`)
  }
})

test('basic conversions to common sizes', async () => {
  const ffmpeg = new FFmpeg()

  let sizes = [
    [320, 240],
    [640, 480],
    [1024, 768]
  ]

  for (let size of sizes) {

    const outputPath = `files/output/file_${size[0]}x${size[1]}.mp4`
    await lastValueFrom(
            ffmpeg.convert('files/file_1920x1080.mp4',
              outputPath,
              {
                width: size[0],
                height: size[1],
                codec: 'h264'
              })
          )

    let info = await ffmpeg.getInformation(outputPath)

    let videoStream = info.streams.filter(s => s.type === 'video')[0]
    expect(videoStream.width).toBe(size[0])
    expect(videoStream.height).toBe(size[1])
    expect(videoStream.codec).toBe('h264')
  }
}, 600000)

// test('basic conversions to 640x480 test', async () => {
//   const ffmpeg = new FFmpeg()

//   await lastValueFrom(
//           ffmpeg.convert('files/file.mp4',
//             'files/output/file_640x480.mp4',
//             {
//               width: 320,
//               height: 240,
//               codec: 'h264'
//             })
//         )

//   let info = await ffmpeg.getInformation('files/output/file_320x240.mp4')

//   let videoStream = info.streams.filter(s => s.type === 'video')[0]
//   expect(videoStream.width).toBe(320)
//   expect(videoStream.height).toBe(240)
//   expect(videoStream.codec).toBe('h264')
// }, 45000)