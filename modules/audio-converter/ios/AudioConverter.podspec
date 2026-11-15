Pod::Spec.new do |s|
  s.name           = 'AudioConverter'
  s.version        = '1.0.0'
  s.summary        = 'Native MP3 to M4A audio converter'
  s.description    = 'Expo native module for MP3 to M4A conversion'
  s.author         = 'Convert'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
