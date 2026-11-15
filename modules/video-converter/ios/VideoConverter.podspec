Pod::Spec.new do |s|
  s.name = 'VideoConverter'
  s.version = '1.0.0'
  s.summary = 'FFmpegKitNext video converter'
  s.description = 'MP4 to MOV conversion using FFmpegKitNext'
  s.author = 'Convert'
  s.homepage = 'https://docs.expo.dev/modules/'
  s.license = { :type => 'LGPL-3.0' }

  s.platforms = {
    :ios => '16.4'
  }

  s.source = { :git => '' }

  s.dependency 'ExpoModulesCore'

  s.vendored_frameworks = %w[
    Frameworks/ffmpegkit.xcframework
    Frameworks/libavdevice.xcframework
    Frameworks/libavcodec.xcframework
    Frameworks/libavfilter.xcframework
    Frameworks/libavformat.xcframework
    Frameworks/libavutil.xcframework
    Frameworks/libswscale.xcframework
    Frameworks/libswresample.xcframework
  ]

  s.frameworks = 'Foundation', 'CoreVideo'
  s.libraries = 'c++'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_VERSION' => '5.0'
  }

  s.source_files = 'VideoConverterModule.swift'
end
