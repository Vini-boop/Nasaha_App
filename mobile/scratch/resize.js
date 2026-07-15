const { Jimp } = require('jimp');

async function resize() {
  try {
    const image = await Jimp.read('../assets/icon-nasaha.png');
    // Resize to 512x512, ensuring it is a perfect square
    image.resize({ w: 512, h: 512 });
    await image.write('../assets/icon-nasaha.png');
    console.log('Successfully resized icon to 512x512!');
  } catch (err) {
    console.error('Error resizing image:', err);
  }
}

resize();
