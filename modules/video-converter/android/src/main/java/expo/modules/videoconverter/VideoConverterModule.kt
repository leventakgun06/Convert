
package expo.modules.videoconverter

import android.net.Uri
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.ReturnCode
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.UUID

class VideoConverterModule : Module() {

  override fun definition() = ModuleDefinition {

    Name("VideoConverter")

    AsyncFunction("convertMp4ToMov") {
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

      val outputFile = File(
        context.cacheDir,
        "video_convert_${UUID.randomUUID()}.mov"
      )

      var inputFile: File? = null

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

        val temporaryInputFile = File(
          context.cacheDir,
          "video_input_${UUID.randomUUID()}.mp4"
        )

        inputFile = temporaryInputFile

        sourceStream.use { input ->
          temporaryInputFile.outputStream().buffered().use { output ->
            input.copyTo(output, 64 * 1024)
          }
        }

        if (
          !temporaryInputFile.exists() ||
          temporaryInputFile.length() == 0L
        ) {
          throw Exception("Video dosyası okunamadı veya boş.")
        }

        val arguments = arrayOf(
          "-y",
          "-i", temporaryInputFile.absolutePath,
          "-map", "0:v?",
          "-map", "0:a?",
          "-c", "copy",
          outputFile.absolutePath
        )

        FFmpegKit.executeWithArgumentsAsync(arguments) { session ->

          temporaryInputFile.delete()

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

            val errorMessage =
              session.getFailStackTrace()
                ?: "MP4 → MOV dönüştürme başarısız oldu."

            promise.reject(
              "ERR_VIDEO_CONVERSION",
              errorMessage,
              null
            )
          }
        }

      } catch (error: Exception) {

        inputFile?.delete()
        outputFile.delete()

        promise.reject(
          "ERR_VIDEO_CONVERSION",
          error.message ?: "MP4 → MOV dönüştürme başarısız oldu.",
          error
        )
      }
    }
  }
}
