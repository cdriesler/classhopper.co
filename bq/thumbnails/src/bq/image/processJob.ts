import Queue from 'bee-queue'
import atob from 'atob'
import fs from 'fs'
import { Converter } from 'ffmpeg-stream'
import { admin } from '../../firebase'
import { v4 as uuid } from 'uuid'

type ThumbnailImageQueueJobData = {
  graphId: string
  solutionId: string
  revision: string
  graphJson: string // json string of nodepen graph elements
  graphBinaries: string // base64 string of bytearray
  graphSolution: string // json string of solution geometry and messages
}

export const processJob = async (
  job: Queue.Job<ThumbnailImageQueueJobData>
): Promise<unknown> => {
  const {
    graphId,
    solutionId,
    graphBinaries,
    graphJson,
    graphSolution,
    revision,
  } = job.data

  console.log(
    ` [ JOB ] [ GH:STORE ] [ START ] [ OPERATION ${job.id.padStart(9, '0')}]`
  )

  const bucket = admin.storage().bucket('np-graphs')

  const pathRoot = `${graphId}/${solutionId}`

  // Create graph .json file
  const jsonFilePath = `${pathRoot}/${uuid()}.json`
  const jsonFile = bucket.file(jsonFilePath)

  const jsonFileData = JSON.stringify(JSON.parse(graphJson), null, 2)

  // Create solution .json file
  const solutionFilePath = `${pathRoot}/${uuid()}.json`
  const solutionFile = bucket.file(solutionFilePath)

  const solutionFileData = JSON.stringify(JSON.parse(graphSolution), null, 2)

  // Create .gh file
  const ghFilePath = `${pathRoot}/${uuid()}.gh`
  const ghFile = bucket.file(ghFilePath)

  let ghFileData: any = atob(graphBinaries)

  const bytes = new Array(ghFileData.length)
  for (let i = 0; i < ghFileData.length; i++) {
    bytes[i] = ghFileData.charCodeAt(i)
  }
  ghFileData = new Uint8Array(bytes)

  // Upload graph files
  const uploadResult = await Promise.allSettled([
    jsonFile.save(jsonFileData),
    solutionFile.save(solutionFileData),
    ghFile.save(ghFileData),
  ])

  // Update revision record
  const fb = admin.firestore()

  const versionRef = fb
    .collection('graphs')
    .doc(graphId)
    .collection('revisions')
    .doc(revision.toString())
  const versionDoc = await versionRef.get()

  if (versionDoc.exists) {
    await versionRef.update('files.json', jsonFilePath, 'files.gh', ghFilePath)
  }

  // Broadcast that save has been completed
  // db.client.publish('SAVE_FINISH')

  // Begin creating thumbnails
  const img = await createThumbnailImage()

  const thumbnailFilePath = `${pathRoot}/thumb.png`
  const thumbFile = bucket.file(thumbnailFilePath)

  const stream = thumbFile.createWriteStream()
  img.pack().pipe(stream)

  // command.size('400x300')

  const frames: string[] = []

  if (!fs.existsSync('./.frames')) {
    fs.mkdirSync('./.frames')
  }

  if (!fs.existsSync(`./.frames/${solutionId}`)) {
    fs.mkdirSync(`./.frames/${solutionId}`)
  }

  const conv = new Converter() // create converter
  // const input = conv.createInputStream({
  //   f: 'image2',
  //   r: '30',
  //   i: `./.frames/${solutionId}/%d.png`,
  // }) // create input writable stream

  conv.createInputFromFile(`./.frames/${solutionId}/%d.png`, {
    f: 'image2',
    r: '60',
  })
  // const input = conv.createInputFromFile()
  // conv.createOutputToFile('./out.mkv', {})
  conv.createOutputToFile('./out.mp4', {
    vcodec: 'libx264',
    pix_fmt: 'yuv420p',
  }) // output to file

  // input.on('close', () => console.log('closed!'))

  // for every frame create a function that returns a promise

  const writes: any[] = []

  for (const i of Array(600)
    .fill('')
    .map((_, n) => n)) {
    const frame = await createThumbnailImage(i)

    const key = `./.frames/${solutionId}/${i}.png`
    frames.push(key)

    console.log(key)

    // frame.pack().pipe(input, { end: false })
    // frame.pack().pipe(input)

    // writes.push(fs.writeFile(key, ))

    await new Promise<void>((resolve) => {
      const frameStream = fs.createWriteStream(key)
      frame.pack().pipe(frameStream)

      frameStream.on('close', () => {
        // fs.createReadStream(key).pipe(input, { end: false })
        resolve()
      })
    })

    // command.addInput(key)
  }

  // input.end()
  conv.run()

  return { ...job.data }
}
