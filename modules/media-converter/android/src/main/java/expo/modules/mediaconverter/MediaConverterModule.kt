
package expo.modules.mediaconverter

import android.net.Uri
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.ReturnCode
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.UUID
import android.graphics.Bitmap
import android.graphics.BitmapFactory

class MediaConverterModule : Module() {

  override fun definition() = ModuleDefinition {

    Name("MediaConverter")

    // MOV / diğer video formatlarını H.264 MP4'e dönüştür
    AsyncFunction("convertVideoToMp4") {
      inputUri: String,
      promise: Promise ->

      val context = appContext.reactContext

      if (context == null) {
        promise.reject(
          "ERR_CONTEXT",
          "Android context bulunamadı.",
          null
        )
        return@AsyncFunction
      }

      val parsedUri = Uri.parse(inputUri)

      val inputFile = File(
        context.cacheDir,
        "video_input_${UUID.randomUUID()}.tmp"
      )

      val outputFile = File(
        context.cacheDir,
        "convert_mp4_${UUID.randomUUID()}.mp4"
      )

      try {
        val sourceStream = when (parsedUri.scheme?.lowercase()) {

          "content" -> {
            context.contentResolver.openInputStream(parsedUri)
              ?: throw Exception("Seçilen video dosyası açılamadı.")
          }

          "file" -> {
            val sourceFile = File(
              parsedUri.path
                ?: throw Exception("Video dosya yolu okunamadı.")
            )

            if (!sourceFile.exists()) {
              throw Exception("Kaynak video bulunamadı.")
            }

            sourceFile.inputStream()
          }

          null -> {
            val sourceFile = File(inputUri)

            if (!sourceFile.exists()) {
              throw Exception("Kaynak video bulunamadı.")
            }

            sourceFile.inputStream()
          }

          else -> {
            throw Exception("Desteklenmeyen video adresi.")
          }
        }

        sourceStream.use { input ->
          inputFile.outputStream().buffered().use { output ->
            input.copyTo(output, 64 * 1024)
          }
        }

        if (!inputFile.exists() || inputFile.length() == 0L) {
          throw Exception("Video dosyası okunamadı veya boş.")
        }

        val arguments = arrayOf(
          "-y",
          "-i", inputFile.absolutePath,
          "-map", "0:v:0",
          "-map", "0:a:0?",
          "-vf", "scale=-2:1080",
          "-c:v", "h264_mediacodec",
          "-b:v", "4M",
          "-g", "60",
          "-pix_fmt", "yuv420p",
          "-tag:v", "avc1",
          "-c:a", "aac",
          "-b:a", "128k",
          "-ac", "2",
          "-movflags", "+faststart",
          outputFile.absolutePath
        )

        FFmpegKit.executeWithArgumentsAsync(arguments) { session ->

          inputFile.delete()

          val returnCode = session.getReturnCode()

          if (
            ReturnCode.isSuccess(returnCode) &&
            outputFile.exists() &&
            outputFile.length() > 0L
          ) {
            promise.resolve(
              Uri.fromFile(outputFile).toString()
            )
          } else {
            outputFile.delete()

            val errorMessage = buildString {
              appendLine("FFmpeg Return Code: $returnCode")
              appendLine(session.getFailStackTrace() ?: "Fail stack trace yok.")
              appendLine(session.getOutput() ?: "FFmpeg çıktısı yok.")
            }

            promise.reject(
              "ERR_VIDEO_CONVERSION",
              errorMessage,
              null
            )
          }
        }

      } catch (error: Exception) {

        inputFile.delete()
        outputFile.delete()

        promise.reject(
          "ERR_VIDEO_CONVERSION",
          error.message ?: "MOV → MP4 dönüştürme başarısız oldu.",
          error
        )
      }
    }

    // M4A dosyasına albüm kapağı ekle
    AsyncFunction("addAlbumArtwork") {
      audioUri: String,
      imageUri: String,
      promise: Promise ->

      val context = appContext.reactContext

      if (context == null) {
        promise.reject(
          "ERR_CONTEXT",
          "Android context bulunamadı.",
          null
        )
        return@AsyncFunction
      }

      val audioFile = File(
        context.cacheDir,
        "artwork_audio_${UUID.randomUUID()}.m4a"
      )

      val imageFile = File(
        context.cacheDir,
        "artwork_image_${UUID.randomUUID()}.jpg"
      )

      val outputFile = File(
        context.cacheDir,
        "artwork_output_${UUID.randomUUID()}.m4a"
      )

      fun copyUri(uriString: String, destination: File) {
        val uri = Uri.parse(uriString)

        val input = when (uri.scheme?.lowercase()) {
          "content" -> {
            context.contentResolver.openInputStream(uri)
              ?: throw Exception("Dosya açılamadı.")
          }

          "file" -> {
            File(
              uri.path ?: throw Exception("Dosya yolu okunamadı.")
            ).inputStream()
          }

          null -> {
            File(uriString).inputStream()
          }

          else -> {
            throw Exception("Desteklenmeyen dosya adresi.")
          }
        }

        input.use { source ->
          destination.outputStream().buffered().use { target ->
            source.copyTo(target, 64 * 1024)
          }
        }

        if (!destination.exists() || destination.length() == 0L) {
          throw Exception("Dosya okunamadı veya boş.")
        }
      }

      try {
        copyUri(audioUri, audioFile)
        copyUri(imageUri, imageFile)

        val bitmap = BitmapFactory.decodeFile(imageFile.absolutePath)
  ?: throw Exception("Albüm kapağı görseli okunamadı.")

try {
  imageFile.outputStream().buffered().use { output ->
    val success = bitmap.compress(
      Bitmap.CompressFormat.JPEG,
      95,
      output
    )

    if (!success) {
      throw Exception("Albüm kapağı JPEG formatına dönüştürülemedi.")
    }
  }
} finally {
  bitmap.recycle()
}

        val arguments = arrayOf(
          "-y",
          "-i", audioFile.absolutePath,
          "-i", imageFile.absolutePath,
          "-map", "0:a:0",
          "-map", "1:v:0",
          "-map_metadata", "0",
          "-c:a", "copy",
          "-c:v", "mjpeg",
          "-frames:v", "1",
          "-disposition:v:0", "attached_pic",
          "-metadata:s:v", "title=Album cover",
          "-metadata:s:v", "comment=Cover (front)",
          "-f", "ipod",
          outputFile.absolutePath
        )

        FFmpegKit.executeWithArgumentsAsync(arguments) { session ->

          audioFile.delete()
          imageFile.delete()

          val returnCode = session.getReturnCode()

          if (
            ReturnCode.isSuccess(returnCode) &&
            outputFile.exists() &&
            outputFile.length() > 0L
          ) {
            promise.resolve(
              Uri.fromFile(outputFile).toString()
            )
          } else {
            outputFile.delete()

            val errorMessage = buildString {
              appendLine("FFmpeg Return Code: $returnCode")
              appendLine(session.getFailStackTrace() ?: "Fail stack trace yok.")
              appendLine(session.getOutput() ?: "FFmpeg çıktısı yok.")
            }

            promise.reject(
              "ERR_ALBUM_ARTWORK",
              errorMessage,
              null
            )
          }
        }

      } catch (error: Exception) {

        audioFile.delete()
        imageFile.delete()
        outputFile.delete()

        promise.reject(
          "ERR_ALBUM_ARTWORK",
          error.message ?: "M4A albüm kapağı eklenemedi.",
          error
        )
      }
    }
  }
}
