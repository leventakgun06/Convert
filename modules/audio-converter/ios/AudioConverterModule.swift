import AVFoundation
import ExpoModulesCore
import Foundation

public class AudioConverterModule: Module {

  public func definition() -> ModuleDefinition {

    Name("AudioConverter")

    AsyncFunction("convertMp3ToM4a") {
      (inputUri: String) async throws -> String in

      let inputURL: URL

      if let url = URL(string: inputUri), url.isFileURL {
        inputURL = url
      } else {
        inputURL = URL(fileURLWithPath: inputUri)
      }

      guard FileManager.default.fileExists(atPath: inputURL.path) else {
        throw NSError(
          domain: "AudioConverter",
          code: 1,
          userInfo: [
            NSLocalizedDescriptionKey: "Kaynak MP3 dosyası bulunamadı."
          ]
        )
      }

      let asset = AVURLAsset(url: inputURL)

      let audioTracks = try await asset.loadTracks(withMediaType: .audio)

      guard !audioTracks.isEmpty else {
        throw NSError(
          domain: "AudioConverter",
          code: 2,
          userInfo: [
            NSLocalizedDescriptionKey: "Dosyada ses kanalı bulunamadı."
          ]
        )
      }

      guard
        let exportSession = AVAssetExportSession(
          asset: asset,
          presetName: AVAssetExportPresetAppleM4A
        )
      else {
        throw NSError(
          domain: "AudioConverter",
          code: 3,
          userInfo: [
            NSLocalizedDescriptionKey: "M4A dönüştürme oturumu oluşturulamadı."
          ]
        )
      }

      guard exportSession.supportedFileTypes.contains(.m4a) else {
        throw NSError(
          domain: "AudioConverter",
          code: 4,
          userInfo: [
            NSLocalizedDescriptionKey: "M4A formatı desteklenmiyor."
          ]
        )
      }

      let cacheDirectory = FileManager.default.urls(
        for: .cachesDirectory,
        in: .userDomainMask
      )[0]

      let outputURL = cacheDirectory.appendingPathComponent(
        "audio_convert_\(UUID().uuidString).m4a"
      )

      exportSession.outputURL = outputURL
      exportSession.outputFileType = .m4a
      exportSession.shouldOptimizeForNetworkUse = true

      do {
        try await withCheckedThrowingContinuation {
          (continuation: CheckedContinuation<Void, Error>) in

          exportSession.exportAsynchronously {

            switch exportSession.status {

            case .completed:
              continuation.resume(returning: ())

            case .failed:
              continuation.resume(
                throwing: exportSession.error
                  ?? NSError(
                    domain: "AudioConverter",
                    code: 5,
                    userInfo: [
                      NSLocalizedDescriptionKey:
                        "MP3 → M4A dönüştürme başarısız oldu."
                    ]
                  )
              )

            case .cancelled:
              continuation.resume(
                throwing: NSError(
                  domain: "AudioConverter",
                  code: 6,
                  userInfo: [
                    NSLocalizedDescriptionKey:
                      "Ses dönüştürme işlemi iptal edildi."
                  ]
                )
              )

            default:
              continuation.resume(
                throwing: NSError(
                  domain: "AudioConverter",
                  code: 7,
                  userInfo: [
                    NSLocalizedDescriptionKey:
                      "Beklenmeyen ses dışa aktarma durumu."
                  ]
                )
              )
            }
          }
        }

      } catch {
        try? FileManager.default.removeItem(at: outputURL)
        throw error
      }

      return outputURL.absoluteString
    }
  }
}
