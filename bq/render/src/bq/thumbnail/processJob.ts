import Queue from 'bee-queue'
import { admin } from '../../firebase'
import { scene, encoding } from '../../three'
import { v4 as uuid } from 'uuid'
import jimp from 'jimp'
import fs from 'fs'

type RenderThumbnailImageQueueJobData = {
  graphId: string
  solutionId: string
  revision: string
  graphJson: string // json string of nodepen graph elements
  graphBinaries: string // base64 string of bytearray
  graphSolution: string // json string of solution geometry and messages
}

export const processJob = async (
  job: Queue.Job<RenderThumbnailImageQueueJobData>
): Promise<unknown> => {
  const {
    graphId,
    solutionId,
    graphBinaries,
    graphJson,
    graphSolution,
    revision,
  } = job.data

  const jobId = job.id.padStart(4, '0')
  const jobLabel = `[ JOB ${jobId} ] [ RQ:THUMBNAIL ]`

  console.log(`${jobLabel} [ START ]`)

  const bucket = admin.storage().bucket('np-graphs')
  const pathRoot = `${graphId}/${solutionId}`

  // Begin creating thumbnails
  const model = await scene.createScene(
    JSON.parse(graphJson),
    JSON.parse(graphSolution)
  )
  const camera = scene.getThumbnailCamera()

  scene.setCameraOrbit(camera, -135)

  const renderer = new encoding.Renderer()
  const image = encoding.toPNG(model, camera, renderer.getRenderer())

  const thumbnailFilePath = `${pathRoot}/${uuid()}.png`
  const thumbFile = bucket.file(thumbnailFilePath)

  // Write to storage
  const stream = thumbFile.createWriteStream()
  image.pack().pipe(stream)

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`${jobLabel} Uploaded ${thumbnailFilePath}`)
      resolve()
    })
    stream.on('error', () => {
      reject()
    })
  })

  // Update firestore record with the thumbnail's location
  const revisionRef = admin
    .firestore()
    .collection('graphs')
    .doc(graphId)
    .collection('revisions')
    .doc(revision.toString())
  const revisionDoc = await revisionRef.get()

  if (!revisionDoc.exists) {
    console.error(
      `${jobLabel} [ ERROR ] Failed to update revision doc because it does not exist.`
    )
  } else {
    await revisionRef.update('files.thumbnailImage', thumbnailFilePath)
  }

  // Create socials thumbnail
  fs.mkdirSync(`./temp/social/${solutionId}`, { recursive: true })

  const frame = encoding.toPNG(model, camera, renderer.getRenderer())
  const frameStream = fs.createWriteStream(
    `./temp/social/${solutionId}/twitter-frame.png`
  )
  frame.pack().pipe(frameStream, { end: true })

  await new Promise<void>((resolve) => {
    const handleResolve = () => {
      resolve()
    }

    frameStream.on('finish', handleResolve)
    frameStream.on('close', handleResolve)
    frameStream.on('error', (e) => {
      console.log(e)
      handleResolve()
    })
  })

  const barlowBold = await jimp.loadFont('./fonts/Barlow-Bold.fnt')
  const barlowMedium = await jimp.loadFont('./fonts/Barlow-Medium.fnt')

  const title = 'Twisty Tower'

  const card = await jimp.read('./img/np-thumb-bg.png')
  card.print(barlowBold, 509, 35, title, 225)

  const h = jimp.measureTextHeight(barlowBold, title, 225)
  card.print(barlowMedium, 509, 35 + h + 6, 'by chuck', 225)

  const thumb = await jimp.read(`./temp/social/${solutionId}/twitter-frame.png`)

  const base = new jimp(750, 375, '#EFF2F2')
  base.blit(thumb, 37, 37)
  base.blit(card, 0, 0)

  base.write(`./temp/social/${solutionId}/twitter.png`)

  const socialsBucket = admin.storage().bucket('np-thumbnails')
  const socialThumbnailFile = socialsBucket.file(`${graphId}/twitter.png`)
  const socialThumbnailData = fs.readFileSync(
    `./temp/social/${solutionId}/twitter.png`
  )
  await socialThumbnailFile.save(socialThumbnailData)

  // Cleanup
  renderer.destroy()
  model.clear()

  return job.data
}
