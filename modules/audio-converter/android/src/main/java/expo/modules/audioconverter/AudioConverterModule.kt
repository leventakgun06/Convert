package expo.modules.audioconverter

import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.ArrayDeque
import java.util.UUID

class AudioConverterModule : Module() {

  private data class PcmChunk(
    val data: ByteArray,
    var offset: Int,
    val presentationTimeUs: Long
  )

  override fun definition() = ModuleDefinition {

    Name("AudioConverter")

    AsyncFunction("convertMp3ToM4a") { inputUri: String ->

      val context = appContext.reactContext
        ?: throw Exception("Android context bulunamadı.")

      val inputUriParsed = Uri.parse(inputUri)

      val outputFile = File(
        context.cacheDir,
        "audio_convert_${UUID.randomUUID()}.m4a"
      )

      val extractor = MediaExtractor()
      var decoder: MediaCodec? = null
      var encoder: MediaCodec? = null
      var muxer: MediaMuxer? = null

      var decoderStarted = false
      var encoderStarted = false
      var muxerStarted = false
      var success = false

      try {
        if (inputUriParsed.scheme == null) {
          extractor.setDataSource(inputUri)
        } else {
          extractor.setDataSource(context, inputUriParsed, null)
        }

        var audioTrack = -1
        var inputFormat: MediaFormat? = null

        for (i in 0 until extractor.trackCount) {
          val format = extractor.getTrackFormat(i)
          val mime = format.getString(MediaFormat.KEY_MIME) ?: ""

          if (mime.equals("audio/mpeg", ignoreCase = true)) {
            audioTrack = i
            inputFormat = format
            break
          }
        }

        if (audioTrack < 0 || inputFormat == null) {
          throw Exception("Seçilen dosya desteklenen bir MP3 dosyası değil.")
        }

        extractor.selectTrack(audioTrack)

        val decoderMime =
          inputFormat.getString(MediaFormat.KEY_MIME)
            ?: throw Exception("MP3 codec bilgisi okunamadı.")

        decoder = MediaCodec.createDecoderByType(decoderMime)
        decoder.configure(inputFormat, null, null, 0)
        decoder.start()
        decoderStarted = true

        val muxerInstance = MediaMuxer(
          outputFile.absolutePath,
          MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4
        )
        muxer = muxerInstance

        val decoderInfo = MediaCodec.BufferInfo()
        val encoderInfo = MediaCodec.BufferInfo()

        val pendingPcm = ArrayDeque<PcmChunk>()

        var decoderInputDone = false
        var decoderOutputDone = false
        var encoderInputDone = false
        var encoderOutputDone = false

        var sampleRate = 0
        var channelCount = 0
        var pcmEncoding = AudioFormat.ENCODING_PCM_16BIT
        var encoderTrack = -1

        var idleCount = 0

        while (!encoderOutputDone) {

          var madeProgress = false

          // MP3 verisini decoder'a gönder.
          if (!decoderInputDone) {
            val inputIndex = decoder.dequeueInputBuffer(10_000)

            if (inputIndex >= 0) {
              val inputBuffer = decoder.getInputBuffer(inputIndex)
                ?: throw Exception("Decoder giriş tamponu alınamadı.")

              inputBuffer.clear()

              val sampleSize = extractor.readSampleData(inputBuffer, 0)

              if (sampleSize < 0) {
                decoder.queueInputBuffer(
                  inputIndex,
                  0,
                  0,
                  0,
                  MediaCodec.BUFFER_FLAG_END_OF_STREAM
                )
                decoderInputDone = true
              } else {
                decoder.queueInputBuffer(
                  inputIndex,
                  0,
                  sampleSize,
                  extractor.sampleTime,
                  0
                )
                extractor.advance()
              }

              madeProgress = true
            }
          }

          // Decoder çıkışını oku.
          if (!decoderOutputDone) {
            val outputIndex = decoder.dequeueOutputBuffer(
              decoderInfo,
              10_000
            )

            when {
              outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {

                val outputFormat = decoder.outputFormat

                sampleRate = outputFormat.getInteger(
                  MediaFormat.KEY_SAMPLE_RATE
                )

                channelCount = outputFormat.getInteger(
                  MediaFormat.KEY_CHANNEL_COUNT
                )

                pcmEncoding = if (
                  outputFormat.containsKey(MediaFormat.KEY_PCM_ENCODING)
                ) {
                  outputFormat.getInteger(MediaFormat.KEY_PCM_ENCODING)
                } else {
                  AudioFormat.ENCODING_PCM_16BIT
                }

                if (
                  pcmEncoding != AudioFormat.ENCODING_PCM_16BIT &&
                  pcmEncoding != AudioFormat.ENCODING_PCM_FLOAT
                ) {
                  throw Exception("Android cihazın PCM ses biçimi desteklenmiyor.")
                }

                val encoderFormat = MediaFormat.createAudioFormat(
                  MediaFormat.MIMETYPE_AUDIO_AAC,
                  sampleRate,
                  channelCount
                )

                encoderFormat.setInteger(
                  MediaFormat.KEY_AAC_PROFILE,
                  android.media.MediaCodecInfo.CodecProfileLevel.AACObjectLC
                )

                encoderFormat.setInteger(
                  MediaFormat.KEY_BIT_RATE,
                  128_000
                )

                encoderFormat.setInteger(
                  MediaFormat.KEY_MAX_INPUT_SIZE,
                  16_384
                )

                encoderFormat.setInteger(
                  MediaFormat.KEY_PCM_ENCODING,
                  AudioFormat.ENCODING_PCM_16BIT
                )

                encoder = MediaCodec.createEncoderByType(
                  MediaFormat.MIMETYPE_AUDIO_AAC
                )

                encoder.configure(
                  encoderFormat,
                  null,
                  null,
                  MediaCodec.CONFIGURE_FLAG_ENCODE
                )

                encoder.start()
                encoderStarted = true

                madeProgress = true
              }

              outputIndex >= 0 -> {

                val outputBuffer = decoder.getOutputBuffer(outputIndex)

                if (decoderInfo.size > 0 && outputBuffer != null) {

                  val source = outputBuffer.duplicate()

                  source.position(decoderInfo.offset)
                  source.limit(decoderInfo.offset + decoderInfo.size)

                  val pcmBytes = ByteArray(decoderInfo.size)
                  source.get(pcmBytes)

                  val convertedBytes = if (
                    pcmEncoding == AudioFormat.ENCODING_PCM_FLOAT
                  ) {
                    val floatBuffer = ByteBuffer.wrap(pcmBytes)
                      .order(ByteOrder.nativeOrder())
                      .asFloatBuffer()

                    val shortBuffer = ByteBuffer.allocate(
                      floatBuffer.remaining() * 2
                    ).order(ByteOrder.nativeOrder())

                    while (floatBuffer.hasRemaining()) {
                      val value = floatBuffer.get().coerceIn(-1f, 1f)
                      val sample = (value * 32767f).toInt()
                        .coerceIn(-32768, 32767)

                      shortBuffer.putShort(sample.toShort())
                    }

                    shortBuffer.array()
                  } else {
                    pcmBytes
                  }

                  pendingPcm.add(
                    PcmChunk(
                      convertedBytes,
                      0,
                      decoderInfo.presentationTimeUs
                    )
                  )
                }

                val decoderEos =
                  (decoderInfo.flags and
                    MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0

                decoder.releaseOutputBuffer(outputIndex, false)

                if (decoderEos) {
                  decoderOutputDone = true
                }

                madeProgress = true
              }
            }
          }

          // PCM verisini AAC encoder'a gönder.
          if (
            encoderStarted &&
            !encoderInputDone &&
            encoder != null
          ) {
            val encoderInputIndex = encoder.dequeueInputBuffer(10_000)

            if (encoderInputIndex >= 0) {
              val encoderInputBuffer =
                encoder.getInputBuffer(encoderInputIndex)
                  ?: throw Exception("AAC encoder giriş tamponu alınamadı.")

              encoderInputBuffer.clear()

              if (pendingPcm.isNotEmpty()) {

                val chunk = pendingPcm.peekFirst()
                val frameSize = channelCount * 2

                val available = chunk.data.size - chunk.offset
                val capacity = encoderInputBuffer.remaining()

                val writable = minOf(
                  available,
                  capacity - (capacity % frameSize)
                )

                if (writable <= 0) {
                  throw Exception("AAC encoder tamponu yetersiz.")
                }

                encoderInputBuffer.put(
                  chunk.data,
                  chunk.offset,
                  writable
                )

                val framesBeforeChunk =
                  chunk.offset / frameSize

                val chunkTimeUs =
                  chunk.presentationTimeUs +
                    (framesBeforeChunk.toLong() * 1_000_000L /
                      sampleRate)

                encoder.queueInputBuffer(
                  encoderInputIndex,
                  0,
                  writable,
                  chunkTimeUs,
                  0
                )

                chunk.offset += writable

                if (chunk.offset >= chunk.data.size) {
                  pendingPcm.removeFirst()
                }

              } else if (decoderOutputDone) {

                encoder.queueInputBuffer(
                  encoderInputIndex,
                  0,
                  0,
                  0,
                  MediaCodec.BUFFER_FLAG_END_OF_STREAM
                )

                encoderInputDone = true
              } else {
                encoder.queueInputBuffer(
                  encoderInputIndex,
                  0,
                  0,
                  0,
                  0
                )
              }

              madeProgress = true
            }
          }

          // AAC encoder çıkışını M4A dosyasına yaz.
          if (encoderStarted && encoder != null && !encoderOutputDone) {

            val encoderOutputIndex = encoder.dequeueOutputBuffer(
              encoderInfo,
              10_000
            )

            when {
              encoderOutputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {

                if (muxerStarted) {
                  throw Exception("AAC çıktı biçimi beklenmeyen şekilde değişti.")
                }

                encoderTrack = muxerInstance.addTrack(encoder.outputFormat)
                muxerInstance.start()
                muxerStarted = true

                madeProgress = true
              }

              encoderOutputIndex >= 0 -> {

                val outputBuffer =
                  encoder.getOutputBuffer(encoderOutputIndex)

                val isCodecConfig =
                  (encoderInfo.flags and
                    MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0

                if (
                  encoderInfo.size > 0 &&
                  outputBuffer != null &&
                  !isCodecConfig
                ) {
                  if (!muxerStarted) {
                    throw Exception("M4A yazıcısı henüz başlatılmadı.")
                  }

                  outputBuffer.position(encoderInfo.offset)
                  outputBuffer.limit(
                    encoderInfo.offset + encoderInfo.size
                  )

                  muxerInstance.writeSampleData(
                    encoderTrack,
                    outputBuffer,
                    encoderInfo
                  )
                }

                val encoderEos =
                  (encoderInfo.flags and
                    MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0

                encoder.releaseOutputBuffer(encoderOutputIndex, false)

                if (encoderEos) {
                  encoderOutputDone = true
                }

                madeProgress = true
              }
            }
          }

          if (madeProgress) {
            idleCount = 0
          } else {
            idleCount++

            if (idleCount > 60_000) {
              throw Exception("Ses dönüştürme zaman aşımına uğradı.")
            }
          }
        }

        if (!muxerStarted) {
          throw Exception("M4A dosyası oluşturulamadı.")
        }

        muxerInstance.stop()
        muxerStarted = false

        success = true

        Uri.fromFile(outputFile).toString()

      } catch (error: Exception) {
        throw Exception(
          "MP3 → M4A dönüştürme başarısız: ${error.message}",
          error
        )
      } finally {

        if (decoderStarted) {
          try {
            decoder?.stop()
          } catch (_: Exception) {
          }
        }

        if (encoderStarted) {
          try {
            encoder?.stop()
          } catch (_: Exception) {
          }
        }

        if (muxerStarted) {
          try {
            muxer?.stop()
          } catch (_: Exception) {
          }
        }

        decoder?.release()
        encoder?.release()
        muxer?.release()
        extractor.release()

        if (!success) {
          outputFile.delete()
        }
      }
    }
  }
}