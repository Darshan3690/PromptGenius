const fs = require('fs');
const path = require('path');

describe('generateCRISPE (file-level)', () => {
  test('promptEnhancer.js contains generateCRISPE and CRISPE headings', () => {
    const enhancerPath = path.join(__dirname, '..', 'promptEnhancer.js');
    const content = fs.readFileSync(enhancerPath, 'utf8');
    expect(content).toMatch(/function generateCRISPE\(/);
    expect(content).toMatch(/# Expert Role Assignment/);
    expect(content).toMatch(/# Task & Purpose/);
    expect(content).toMatch(/# Content Structure/);
    expect(content).toMatch(/# Required Elements/);
  });
});
