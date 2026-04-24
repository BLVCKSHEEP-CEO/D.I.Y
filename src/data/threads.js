export const categories = [
  'Hardware',
  'Software',
  'Networking',
  'Soldering',
  'Guide',
  'S.T.E.M',
  'PC Repair',
  'Phone Repair'
];

export const topics = [
  {
    id: 101,
    slug: 'smart-speaker-no-power-after-adapter-short',
    title: 'Smart speaker no power after adapter short',
    excerpt: 'Speaker stays dead after a wrong adapter event. Need board-level checks.',
    body:
      'A 19V adapter was briefly plugged into a 12V smart speaker dock and now the device will not boot. Need a reliable diagnostic order for DC input stage, protection components, and regulator rails.',
    status: 'in_progress',
    category: 'Hardware',
    tags: ['SmartDevice', 'Power', 'Regulator'],
    difficulty: 'advanced',
    author: 'nari_87',
    repliesCount: 7,
    watchers: 29,
    solved: false,
    updatedAt: '2h ago'
  },
  {
    id: 102,
    slug: 'react-native-camera-crash-after-os-update',
    title: 'React Native camera crash after OS update',
    excerpt: 'App exits immediately when camera view mounts on Android 15 beta.',
    body:
      'Crash began after upgrading test device firmware. Stack trace points to permission flow mismatch with newer lifecycle callbacks.',
    status: 'open',
    category: 'Software',
    tags: ['React', 'Android', 'Crash'],
    difficulty: 'intermediate',
    author: 'stackmint',
    repliesCount: 4,
    watchers: 17,
    solved: false,
    updatedAt: '34m ago'
  },
  {
    id: 103,
    slug: 'raspberry-pi-i2c-ghost-device',
    title: 'Raspberry Pi I2C ghost device at 0x2f',
    excerpt: 'Unexpected address appears only under load; suspect pull-up mismatch.',
    body:
      'I2C scan is stable until motor driver engages. Then phantom 0x2f appears and sensor reads corrupt. Looking for bus-hardening tips.',
    status: 'solved',
    category: 'Networking',
    tags: ['RaspberryPi', 'I2C', 'EMI'],
    difficulty: 'beginner',
    author: 'voltparcel',
    repliesCount: 12,
    watchers: 46,
    solved: true,
    updatedAt: '1d ago'
  },
  {
    id: 104,
    slug: 'microcontroller-upload-timeout-on-usb-serial',
    title: 'Microcontroller upload timeout on USB serial',
    excerpt: 'Firmware upload fails with sync timeout after adding sensor wiring.',
    body:
      'Firmware toolchain cannot upload and reports sync timeouts. Serial monitor is unstable after connecting a sensor harness. Looking for best isolation order for cable quality, bootloader state, and pin conflicts.',
    status: 'open',
    category: 'S.T.E.M',
    tags: ['Microcontroller', 'USB', 'Bootloader'],
    difficulty: 'beginner',
    author: 'protojun',
    repliesCount: 5,
    watchers: 21,
    solved: false,
    updatedAt: '22m ago'
  },
  {
    id: 105,
    slug: 'desktop-no-display-after-ram-upgrade',
    title: 'Desktop no display after RAM upgrade',
    excerpt: 'System powers on but never reaches BIOS after adding two DIMMs.',
    body:
      'After adding 2 new RAM sticks, the machine powers on with black screen and no POST. Need a quick, reliable troubleshooting sequence.',
    status: 'in_progress',
    category: 'PC Repair',
    tags: ['RAM', 'POST', 'BIOS'],
    difficulty: 'intermediate',
    author: 'casebolt',
    repliesCount: 9,
    watchers: 33,
    solved: false,
    updatedAt: '11m ago'
  },
  {
    id: 106,
    slug: 'phone-charging-port-only-works-at-angle',
    title: 'Phone charging port only works at one angle',
    excerpt: 'Cable disconnects unless pushed upward; likely lint or worn port.',
    body:
      'Charging is intermittent and connection drops with slight movement. Tried multiple cables. Need safe cleaning and part-replacement guidance.',
    status: 'open',
    category: 'Phone Repair',
    tags: ['USB-C', 'Charging', 'Port'],
    difficulty: 'beginner',
    author: 'pockettrace',
    repliesCount: 6,
    watchers: 27,
    solved: false,
    updatedAt: '8m ago'
  }
];

export const threadByTopicId = {
  101: {
    id: 1,
    author: 'nari_87',
    category: 'Soldering',
    errorCode: '0xA7',
    createdAt: '2h ago',
    tags: ['SmartDevice', 'Power', 'Regulator'],
    content:
      'My smart speaker is completely dead after a wrong adapter event. Looking for board-level advice before replacing the entire mainboard.',
    reactions: { helpful: 4, unclear: 0 },
    accepted: false,
    replies: [
      {
        id: 2,
        author: 'framefuse',
        category: 'Hardware',
        errorCode: '0x1C',
        createdAt: '95m ago',
        tags: ['Multimeter'],
        content:
          'Start with resistance checks on the 12V rail and compare against known-good values. If near-short, isolate phases one by one.',
        reactions: { helpful: 8, unclear: 1 },
        accepted: false,
        replies: [
          {
            id: 3,
            author: 'chipherd',
            category: 'Guide',
            errorCode: '0x2E',
            createdAt: '70m ago',
            tags: ['MOSFET', 'Pad View'],
            content:
              'I posted a pad map and continuity points in the docs channel. Probe around the low-side MOSFET cluster first.',
            reactions: { helpful: 12, unclear: 0 },
            accepted: true,
            replies: []
          }
        ]
      },
      {
        id: 4,
        author: 'sigstack',
        category: 'Software',
        errorCode: '0x09',
        createdAt: '45m ago',
        tags: ['Linux', 'Driver'],
        content:
          'Dump VBIOS and test with Linux live USB to rule out firmware and profile glitches.',
        reactions: { helpful: 3, unclear: 2 },
        accepted: false,
        replies: []
      }
    ]
  },
  102: {
    id: 10,
    author: 'stackmint',
    category: 'Software',
    errorCode: '0x33',
    createdAt: '34m ago',
    tags: ['React', 'Android', 'Crash'],
    content:
      'Camera mount crashes after OS update. Existing permission request sequence may be stale.',
    reactions: { helpful: 2, unclear: 0 },
    accepted: false,
    replies: []
  },
  103: {
    id: 20,
    author: 'voltparcel',
    category: 'Guide',
    errorCode: '0x14',
    createdAt: '1d ago',
    tags: ['RaspberryPi', 'I2C', 'EMI'],
    content:
      'Solved by lowering line speed to 100kHz, improving cable routing, and tightening pull-up values.',
    reactions: { helpful: 9, unclear: 0 },
    accepted: true,
    replies: []
  },
  104: {
    id: 30,
    author: 'protojun',
    category: 'S.T.E.M',
    errorCode: '0x52',
    createdAt: '22m ago',
    tags: ['Microcontroller', 'USB', 'Bootloader'],
    content:
      'Microcontroller firmware upload fails with sync timeout. Serial only works intermittently after attaching a sensor shield.',
    reactions: { helpful: 1, unclear: 0 },
    accepted: false,
    replies: []
  },
  105: {
    id: 40,
    author: 'casebolt',
    category: 'PC Repair',
    errorCode: '0x18',
    createdAt: '11m ago',
    tags: ['RAM', 'POST', 'BIOS'],
    content:
      'No display after RAM upgrade. Fans spin and RGB works, but no BIOS screen or keyboard lights.',
    reactions: { helpful: 1, unclear: 1 },
    accepted: false,
    replies: []
  },
  106: {
    id: 50,
    author: 'pockettrace',
    category: 'Phone Repair',
    errorCode: '0x0D',
    createdAt: '8m ago',
    tags: ['USB-C', 'Charging', 'Port'],
    content:
      'Charging only works at an angle and drops when moved. Need safe diagnostics before replacing port assembly.',
    reactions: { helpful: 2, unclear: 0 },
    accepted: false,
    replies: []
  }
};







