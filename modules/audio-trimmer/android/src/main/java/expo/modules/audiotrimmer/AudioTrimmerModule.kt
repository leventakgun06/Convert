
package expo.modules.audiotrimmer

import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.media.MediaCodec
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.nio.ByteBuffer

class AudioTrimmerModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("AudioTrimmer")

    AsyncFunction("trimAudio") {
      uri: String,
      startTimeMs: Double,
      endTimeMs: Double ->

      require(startTimeMs >= 0 && endTimeMs > startTimeMs) {
        "Geçersiz ses kesme zamanları."
      }

      val context = appContext.reactContext
        ?: throw Exception("Android context bulunamadı.")

      val inputUri = Uri.parse(uri)

      val extractor = MediaExtractor()
      var muxer: MediaMuxer? = null
      var muxerStarted = false
      var success = false

      val outputFile = File(
        context.cacheDir,
        "trimmed_${System.currentTimeMillis()}.m4a"
      )

      try {
        if (inputUri.scheme == null) {
          extractor.setDataSource(uri)
        } else {
          extractor.setDataSource(context, inputUri, null)
        }

        var audioTrackIndex = -1
        var audioFormat: MediaFormat? = null

        for (i in 0 until extractor.trackCount) {
          val format = extractor.getTrackFormat(i)
          val mime = format.getString(MediaFormat.KEY_MIME) ?: ""

          if (mime.startsWith("audio/")) {
            audioTrackIndex = i
            audioFormat = format
            break
          }
        }

        require(audioTrackIndex >= 0 && audioFormat != null) {
          "Dosyada ses kanalı bulunamadı."
        }

        val format = audioFormat
        val durationUs = format.getLong(MediaFormat.KEY_DURATION)

        val startUs = (startTimeMs * 1000).toLong()
        val endUs = (endTimeMs * 1000).toLong()

        require(endUs <= durationUs) {
          "Kesme bitiş süresi ses dosyasının süresini aşamaz."
        }

        extractor.selectTrack(audioTrackIndex)

        extractor.seekTo(
          startUs,
          MediaExtractor.SEEK_TO_PREVIOUS_SYNC
        )

        muxer = MediaMuxer(
          outputFile.absolutePath,
          MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4
        )

        val outputTrackIndex = muxer.addTrack(format)
        muxer.start()
        muxerStarted = true

        val buffer = ByteBuffer.allocate(1024 * 1024)
        val bufferInfo = MediaCodec.BufferInfo()

        var writtenSamples = 0

        while (true) {
          val sampleTrackIndex = extractor.sampleTrackIndex

          if (sampleTrackIndex < 0) break

          val sampleTimeUs = extractor.sampleTime

          if (sampleTimeUs >= endUs) break

          if (sampleTimeUs >= startUs) {
            buffer.clear()

            val sampleSize = extractor.readSampleData(buffer, 0)

            if (sampleSize < 0) break

            bufferInfo.set(
              0,
              sampleSize,
              sampleTimeUs - startUs,
              extractor.sampleFlags
            )

            muxer.writeSampleData(
              outputTrackIndex,
              buffer,
              bufferInfo
            )

            writtenSamples++
          }

          if (!extractor.advance()) break
        }

        require(writtenSamples > 0) {
          "Kesilecek ses verisi bulunamadı."
        }

        muxer.stop()
        muxerStarted = false
        success = true

        mapOf(
          "uri" to Uri.fromFile(outputFile).toString(),
          "size" to outputFile.length(),
          "duration" to (endTimeMs - startTimeMs)
        )

      } finally {
        if (muxerStarted) {
          try {
            muxer?.stop()
          } catch (_: Exception) {
          }
        }

        muxer?.release()
        extractor.release()

        if (!success) {
          outputFile.delete()
        }
      }
    }
  }
}
