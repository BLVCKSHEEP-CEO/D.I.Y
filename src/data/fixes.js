export const playbooks = [
  {
    title: 'No-POST GPU Flow',
    summary: 'Power rail triage, thermal checks, and staged isolation order.',
    level: 'Advanced',
    format: 'Checklist'
  },
  {
    title: 'Mobile Crash Capture',
    summary: 'Repro matrix and symbolized stack collection across Android and iOS.',
    level: 'Intermediate',
    format: 'Template'
  },
  {
    title: 'I2C Noise Mitigation',
    summary: 'Cable routing, pull-up tuning, and scope probes for unstable buses.',
    level: 'Beginner',
    format: 'Guide'
  }
];

export const commonFixes = [
  {
    id: 'stem-microcontroller-upload-fail',
    domain: 'S.T.E.M',
    problem: 'Microcontroller firmware upload fails with sync timeout',
    symptoms: ['avrdude: stk500_recv() timeout', 'Board resets but upload never starts'],
    steps: [
      'Confirm correct target board and USB serial port in the toolchain settings.',
      'Press reset once just before upload starts.',
      'Remove wiring from pins 0 and 1 during upload.',
      'Swap USB cable and avoid charge-only cables.',
      'Reflash bootloader with ISP if all above fail.'
    ],
    safety: 'Power board from USB only while testing to prevent ground mismatch.'
  },
  {
    id: 'pc-no-display',
    domain: 'PC Repair',
    problem: 'Desktop powers on but no display output',
    symptoms: ['Fans spin with black screen', 'No BIOS splash or beep code'],
    steps: [
      'Reseat RAM and test one stick at a time in slot A2.',
      'Check monitor input source and GPU power connectors.',
      'Clear CMOS and boot with minimum hardware.',
      'Try motherboard video output if CPU has integrated graphics.',
      'Inspect motherboard debug LEDs and cross-check manual.'
    ],
    safety: 'Always power off and discharge before reseating parts.'
  },
  {
    id: 'phone-not-charging',
    domain: 'Phone Repair',
    problem: 'Phone charges intermittently or not at all',
    symptoms: ['Charging icon flickers', 'Cable only works at one angle'],
    steps: [
      'Inspect and clean charging port with a non-metal pick and air.',
      'Test with known-good cable and 5V certified adapter.',
      'Check for moisture lock notifications in system settings.',
      'Boot in safe mode to rule out rogue power-management apps.',
      'If unstable after cleaning, inspect daughterboard/port assembly.'
    ],
    safety: 'Do not use metal tools inside powered charging ports.'
  }
];







