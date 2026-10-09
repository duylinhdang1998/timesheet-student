import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Android package id. iOS uses com.student.timesheet.9learning (set in the Xcode project to match
  // the App Store provisioning profiles); Android ids can't have a segment starting with a digit.
  appId: 'com.student.timesheet.ninelearning',
  appName: 'Lịch học',
  webDir: 'dist',
  backgroundColor: '#f8fafc',
}

export default config
