
import AVFoundation
import ExpoModulesCore
import Foundation

public class AudioTrimmerModule: Module {

  public func definition() -> ModuleDefinition {
    Name("AudioTrimmer")

    AsyncFunction("trimAudio") {
      (uri: String, startTimeMs: Double, endTimeMs: Double) async throws -> [String: Any] in

      guard startTimeMs >= 0, endTimeMs > startTimeMs else {
        throw NSError(
          domain: "AudioTrimmer",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Geçersiz ses kesme zamanları."]
        )
      }

      let inputURL: URL

      if let parsedURL = URL(string: uri), parsedURL.scheme != nil {
        inputURL = parsedURL
      } else {
        inputURL = URL(fileURLWithPath: uri)
      }

      let asset = AVURLAsset(url: inputURL)

      let durationTime = try await asset.load(.duration)
      let durationMs = CMTimeGetSeconds(durationTime) * 1000

      guard endTimeMs <= durationMs else {
        throw NSError(
          domain: "AudioTrimmer",
          code: 2,
          userInfo: [NSLocalizedDescriptionKey: "Kesme bitiş süresi ses dosyasının süresini aşamaz."]
        )
      }

      let audioTracks = try await asset.loadTracks(withMediaType: .audio)

      guard let sourceTrack = audioTracks.first else {
        throw NSError(
          domain: "AudioTrimmer",
          code: 3,
          userInfo: [NSLocalizedDescriptionKey: "Dosyada ses kanalı bulunamadı."]
        )
      }

      let composition = AVMutableComposition()

      guard let compositionTrack = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
      ) else {
        throw NSError(
          domain: "AudioTrimmer",
          code: 4,
          userInfo: [NSLocalizedDescriptionKey: "Ses kanalı oluşturulamadı."]
        )
      }

      let startTime = CMTime(
        seconds: startTimeMs / 1000,
        preferredTimescale: 1000
      )

      let endTime = CMTime(
        seconds: endTimeMs / 1000,
        preferredTimescale: 1000
      )

      let timeRange = CMTimeRange(
        start: startTime,
        end: endTime
      )

      try compositionTrack.insertTimeRange(
        timeRange,
        of: sourceTrack,
        at: .zero
      )

      let outputURL = FileManager.default.temporaryDirectory
        .appendingPathComponent(UUID().uuidString)
        .appendingPathExtension("m4a")

      guard let exportSession = AVAssetExportSession(
        asset: composition,
        presetName: AVAssetExportPresetPassthrough
      ) else {
        throw NSError(
          domain: "AudioTrimmer",
          code: 5,
          userInfo: [NSLocalizedDescriptionKey: "Ses dışa aktarma oturumu oluşturulamadı."]
        )
      }

      exportSession.outputURL = outputURL
      exportSession.outputFileType = .m4a
      exportSession.shouldOptimizeForNetworkUse = true

      try await withCheckedThrowingContinuation {
        (continuation: CheckedContinuation<Void, Error>) in

        exportSession.exportAsynchronously {
          switch exportSession.status {
          case .completed:
            continuation.resume()

          case .failed:
            continuation.resume(
              throwing: exportSession.error ?? NSError(
                domain: "AudioTrimmer",
                code: 6,
                userInfo: [NSLocalizedDescriptionKey: "Ses kesme işlemi başarısız."]
              )
            )

          case .cancelled:
            continuation.resume(
              throwing: NSError(
                domain: "AudioTrimmer",
                code: 7,
                userInfo: [NSLocalizedDescriptionKey: "Ses kesme işlemi iptal edildi."]
              )
            )

          default:
            continuation.resume(
              throwing: NSError(
                domain: "AudioTrimmer",
                code: 8,
                userInfo: [NSLocalizedDescriptionKey: "Ses dışa aktarma tamamlanamadı."]
              )
            )
          }
        }
      }

      let attributes = try FileManager.default.attributesOfItem(
        atPath: outputURL.path
      )

      let fileSize = (attributes[.size] as? NSNumber)?.int64Value ?? 0

      return [
        "uri": outputURL.absoluteString,
        "size": fileSize,
        "duration": endTimeMs - startTimeMs
      ]
    }
  }
}
