// Quick test of polyline decoding with actual API data
const { decodePolyline, isEncodedPolyline } = require('./lib/polyline-decoder');

const actualPolyline = "{|iuHg{pYpW{o@hLahCijCwvJo]azD{wC`kBw}@baB{jA{yBgjE_~CksBip@sxAtXscCx}Cu~BtsAa`Dmh@ejKvmCazDtM_xCxaBi`DcTsx@lhEsOq^ka@nc@grB{dBd^o\\lgArCn|@xkCilAjqBmFdxAdpIjvUj|AnxGlqBhnTfwCniElyC|eH~v@~fTvdE~fXvw@v{B}cDh_BxeCy{A|iCx|AdcCigNneJefYba@ggE_K_dGbkAqjDpbEu~TfYgxEeS{vFz`@_bG|j@kyBqAizAxvBkaLfb@}Ejr@tn@cp@r}@";

console.log('Testing actual polyline from API response:');
console.log('Polyline length:', actualPolyline.length);
console.log('Is valid encoded polyline:', isEncodedPolyline(actualPolyline));

try {
  const coordinates = decodePolyline(actualPolyline);
  console.log('Decoded coordinates count:', coordinates.length);
  console.log('First few coordinates:', coordinates.slice(0, 3));
  console.log('Last few coordinates:', coordinates.slice(-3));
} catch (error) {
  console.error('Decoding failed:', error.message);
}