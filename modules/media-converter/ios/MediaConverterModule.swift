
import ExpoModulesCore
import AVFoundation
import CoreMedia
import UIKit

public class MediaConverterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MediaConverter")

    // MOV / diğer desteklenen videolar -> MP4
    AsyncFunction("convertVideoToMp4") { (inputUri: String) async throws -> String in

      let inputURL: URL

      if let url = URL(string: inputUri), url.isFileURL {
        inputURL = url
      } else {
        inputURL = URL(fileURLWithPath: inputUri)
      }

      guard FileManager.default.fileExists(atPath: inputURL.path) else {
        throw NSError(
          domain: "MediaConverter",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Kaynak video bulunamadı."]
        )
      }

      let asset = AVURLAsset(url: inputURL)

      guard let exportSession = AVAssetExportSession(
        asset: asset,
        presetName: AVAssetExportPresetHighestQuality
      ) else {
        throw NSError(
          domain: "MediaConverter",
          code: 2,
          userInfo: [NSLocalizedDescriptionKey: "Video dışa aktarma oturumu oluşturulamadı."]
        )
      }

      guard exportSession.supportedFileTypes.contains(.mp4) else {
        throw NSError(
          domain: "MediaConverter",
          code: 3,
          userInfo: [NSLocalizedDescriptionKey: "Bu video MP4 formatına dönüştürülemiyor."]
        )
      }

      let cacheDirectory = FileManager.default.urls(
        for: .cachesDirectory,
        in: .userDomainMask
      )[0]

      let outputURL = cacheDirectory.appendingPathComponent(
        "convert_mp4_\(UUID().uuidString).mp4"
      )

      exportSession.outputURL = outputURL
      exportSession.outputFileType = .mp4
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
                throwing: exportSession.error ?? NSError(
                  domain: "MediaConverter",
                  code: 4,
                  userInfo: [NSLocalizedDescriptionKey: "Video dönüştürme başarısız."]
                )
              )

            case .cancelled:
              continuation.resume(
                throwing: NSError(
                  domain: "MediaConverter",
                  code: 5,
                  userInfo: [NSLocalizedDescriptionKey: "Video dönüştürme iptal edildi."]
                )
              )

            default:
              continuation.resume(
                throwing: NSError(
                  domain: "MediaConverter",
                  code: 6,
                  userInfo: [NSLocalizedDescriptionKey: "Beklenmeyen dışa aktarma durumu."]
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

    // M4A dosyasına albüm kapağı ekle
    AsyncFunction("addAlbumArtwork") {
      (audioUri: String, imageUri: String) async throws -> String in

      func fileURL(_ uri: String) -> URL {
        if let url = URL(string: uri), url.isFileURL {
          return url
        }
        return URL(fileURLWithPath: uri)
      }

      let audioURL = fileURL(audioUri)
      let imageURL = fileURL(imageUri)

      guard FileManager.default.fileExists(atPath: audioURL.path) else {
        throw NSError(
          domain: "MediaConverter",
          code: 10,
          userInfo: [NSLocalizedDescriptionKey: "M4A dosyası bulunamadı."]
        )
      }

      guard let image = UIImage(contentsOfFile: imageURL.path),
            let imageData = image.jpegData(compressionQuality: 0.90) else {
        throw NSError(
          domain: "MediaConverter",
          code: 11,
          userInfo: [NSLocalizedDescriptionKey: "Kapak fotoğrafı okunamadı."]
        )
      }

      let asset = AVURLAsset(url: audioURL)

      guard let exportSession = AVAssetExportSession(
        asset: asset,
        presetName: AVAssetExportPresetAppleM4A
      ) else {
        throw NSError(
          domain: "MediaConverter",
          code: 12,
          userInfo: [NSLocalizedDescriptionKey: "Ses dışa aktarma oturumu oluşturulamadı."]
        )
      }

      guard exportSession.supportedFileTypes.contains(.m4a) else {
        throw NSError(
          domain: "MediaConverter",
          code: 13,
          userInfo: [NSLocalizedDescriptionKey: "M4A formatı desteklenmiyor."]
        )
      }

      let artwork = AVMutableMetadataItem()
      artwork.key = AVMetadataKey.commonKeyArtwork as NSString
      artwork.keySpace = .common
      artwork.value = imageData as NSData
      artwork.dataType = kCMMetadataBaseDataType_JPEG as String

      exportSession.metadata = [artwork]

      let cacheDirectory = FileManager.default.urls(
        for: .cachesDirectory,
        in: .userDomainMask
      )[0]

      let outputURL = cacheDirectory.appendingPathComponent(
        "convert_artwork_\(UUID().uuidString).m4a"
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

            case .failed, .cancelled:
              continuation.resume(
                throwing: exportSession.error ?? NSError(
                  domain: "MediaConverter",
                  code: 14,
                  userInfo: [NSLocalizedDescriptionKey: "Albüm kapağı eklenemedi."]
                )
              )

            default:
              continuation.resume(
                throwing: NSError(
                  domain: "MediaConverter",
                  code: 15,
                  userInfo: [NSLocalizedDescriptionKey: "Beklenmeyen dışa aktarma durumu."]
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
