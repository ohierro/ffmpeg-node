import exp = require("constants")
import { FFmpeg } from "./ffmpeg"

xtest('get basic information', async () => {
  const ffmpeg = new FFmpeg()
  let info = await ffmpeg.getInformation('files/file.mp4')

  const videoInformation = info.streams.filter(s => s.type === 'video')[0]
  const audioInformation = info.streams.filter(s => s.type === 'audio')[0]

  expect(info.duration).toBe(128.683)
  expect(info.formatName).toBe('mov,mp4,m4a,3gp,3g2,mj2')
  expect(info.formatLongName).toBe('QuickTime / MOV')
  expect(info.streams.length).toBe(2)
  expect(videoInformation.width).toBe(1920)
  expect(videoInformation.height).toBe(1080)
  expect(videoInformation.codec).toBe('h264')
  // TODO: change variable name
  expect(videoInformation.aspect_ratio).toBe('16:9')

  expect(audioInformation.codec).toBe('aac')
})

// todo: test with non-existent file
test('get basic packet information', async () => {
  const ffmpeg = new FFmpeg()
  let nbFrames = await ffmpeg.getPacketNumber()

  expect(nbFrames).toBe(3858)
}, 60000)

xtest('basic conversion', async () => {
  const ffmpeg = new FFmpeg()
  // let info = await ffmpeg.getInformation('files/file.mp4')

  await ffmpeg.convert()

})