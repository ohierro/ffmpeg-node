import exp = require("constants")
import { FFmpeg } from "./ffmpeg"
import * as fs from 'fs/promises'
import { lastValueFrom } from "rxjs"
import { VideoStreamInformation } from "./stream-information"

beforeEach(async () => {
  const files = await fs.readdir('files/output')
  for (let file of files) {
    await fs.rm(`files/output/${file}`)
  }
})


// http://samples.mplayerhq.hu/
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
    expect((videoStream as VideoStreamInformation).width).toBe(size[0])
    expect((videoStream as VideoStreamInformation).height).toBe(size[1])
    expect(videoStream.codec).toBe('h264')
  }
}, 600000)