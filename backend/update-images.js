const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'methali.json');
let methaliData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const categoryImages = {
  'Subira': [
    '1500382017468-9049fed747ef', // calm water
    '1499750310107-5fef28a66643', // peaceful sunset
    '1447069387593-a5de0862481e', // sprout growing
  ],
  'Uvumilivu': [
    '1500382017468-9049fed747ef', // calm water
    '1499750310107-5fef28a66643', // peaceful sunset
    '1447069387593-a5de0862481e', // sprout growing
  ],
  'Urafiki': [
    '1529156069898-49953e39b3ac', // friends laughing
    '1529154691717-330608dd63f2', // team hands
    '1511632765486-a96c7530e85b', // community gathering
  ],
  'Jamii': [
    '1511632765486-a96c7530e85b', // community gathering
    '1529156069898-49953e39b3ac', // friends laughing
    '1529154691717-330608dd63f2', // team hands
  ],
  'Ushirikiano': [
    '1529154691717-330608dd63f2', // team hands
    '1469571486292-0ba58a3f068b', // helping hands
    '1511632765486-a96c7530e85b', // community
  ],
  'Utulivu': [
    '1506126613408-eca07ce68773', // zen stones
    '1515694346937-94d85e41e6f0', // meditation
    '1475924156734-49818ce52011', // peaceful landscape
  ],
  'Ukarimu': [
    '1531206715517-5c0ba140b2b8', // giving/sharing
    '1488521787991-ed7bbaae773c', // charity
    '1518398092300-5cca33f1b0a8', // holding hands, care
  ],
  'Akili': [
    '1456513080510-7bf3a84b82f8', // books
    '1532012197267-da84d127e765', // chess
    '1493836512294-502baa1986e2', // lightbulb/idea
  ],
  'Uelewa': [
    '1456513080510-7bf3a84b82f8', // books
    '1493836512294-502baa1986e2', // lightbulb/idea
    '1544928147-79a2dbc1f389', // old wise path
  ],
  'Maadili': [
    '1544928147-79a2dbc1f389', // old wise path
    '1456513080510-7bf3a84b82f8', // books
    '1532012197267-da84d127e765', // chess
  ],
  'Maisha': [
    '1465146344425-f00d5f5c8f07', // path in woods
    '1502472584811-0a2f2feb8968', // sunrise
    '1470071131384-001b85755b36', // beautiful nature landscape
  ],
  'Kazi': [
    '1504328345606-18bbc8c9d7d1', // tools / workshop
    '1425913397330-cf8af2ff40a1', // farmer/field
    '1581091226825-a6a2a5aee158', // hands working
    '1521737604893-d14cc237f11d', // hard work
  ],
  'Ujasiri': [
    '1517849845537-4d257902454a', // lion
    '1522204523234-8729aa6e3d5f', // mountain peak conquer
    '1501286353178-1ce2be9d5c14', // boldness
  ]
};

// Fallback images if category is unknown
const fallbackImages = [
  '1465146344425-f00d5f5c8f07',
  '1502472584811-0a2f2feb8968',
  '1470071131384-001b85755b36',
];

// Track used images per category to ensure round-robin distribution
const categoryCounters = {};

methaliData = methaliData.map(item => {
  const cat = item.category;
  const imageList = categoryImages[cat] || fallbackImages;
  
  if (categoryCounters[cat] === undefined) {
    categoryCounters[cat] = 0;
  }
  
  const imageId = imageList[categoryCounters[cat] % imageList.length];
  categoryCounters[cat]++;
  
  item.image = `https://images.unsplash.com/photo-${imageId}?auto=format&fit=crop&w=800&q=80`;
  return item;
});

fs.writeFileSync(dataPath, JSON.stringify(methaliData, null, 2), 'utf8');
console.log('Successfully updated methali.json with category-specific images.');
