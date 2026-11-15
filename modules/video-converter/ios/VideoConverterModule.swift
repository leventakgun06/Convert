import ExpoModulesCore
import Foundation
import ffmpegkit

public class VideoConverterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VideoConverter")

    AsyncFunction("convertMp4ToMov") { (inputUri: String) async throws -> String in
      let inputURL: URL

      if let url = URL(string: inputUri), url.isFileURL {
        inputURL = url
      } else {
        inputURL = URL(fileURLWithPath: inputUri)
      }

      guard FileManager.default.fileExists(atPath: inputURL.path) else {
        throw NSError(
          domain: "VideoConverter",
          code: 1,
          userInfo: [
            NSLocalizedDescriptionKey: "Kaynak MP4 dosyası bulunamadı."
          ]
        )
      }

      let cacheDirectory = FileManager.default.urls(
        for: .cachesDirectory,
        in: .userDomainMask
      )[0]

      let outputURL = cacheDirectory.appendingPathComponent(
        "video_convert_\(UUID().uuidString).mov"
      )

      let arguments = [
        "-y",
        "-i", inputURL.path,
        "-map", "0:v?",
        "-map", "0:a?",
        "-c", "copy",
        outputURL.path,
      ]

      do {
        try await withCheckedThrowingContinuation {
          (continuation: CheckedContinuation<Void, Error>) in

          FFmpegKit.execute(
            withArgumentsAsync: arguments,
            withCompleteCallback: { session in
              guard let session = session else {
                continuation.resume(
                  throwing: NSError(
                    domain: "VideoConverter",
                    code: 5,
                    userInfo: [
                      NSLocalizedDescriptionKey: "FFmpeg oturumu başlatılamadı."
                    ]
                  )
                )
                return
              }

              let returnCode = session.getReturnCode()

              if ReturnCode.isSuccess(returnCode) {
                continuation.resume(returning: ())
              } else {
                let errorMessage =
                  session.getFailStackTrace()
                  ?? "MP4 → MOV dönüştürme başarısız oldu."

                continuation.resume(
                  throwing: NSError(
                    domain: "VideoConverter",
                    code: 3,
                    userInfo: [
                      NSLocalizedDescriptionKey: errorMessage
                    ]
                  )
                )
              }
            }
          )
        }

        guard FileManager.default.fileExists(atPath: outputURL.path) else {
          throw NSError(
            domain: "VideoConverter",
            code: 4,
            userInfo: [
              NSLocalizedDescriptionKey:
                "MOV çıktı dosyası oluşturulamadı."
            ]
          )
        }

        return outputURL.absoluteString

      } catch {
        try? FileManager.default.removeItem(at: outputURL)
        throw error
      }
    }
  }
}
