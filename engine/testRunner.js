const { FlowAutomationEngine } = require('./flowAutomation');
const { detectChromeProfiles } = require('./profileDetector');
const path = require('path');
const os = require('os');

async function runAutonomousTest() {
  console.log('=== STARTING AUTONOMOUS END-TO-END TEST ===');

  const profiles = detectChromeProfiles();
  console.log('Detected profiles count:', profiles.length);

  const selectedProfile = profiles.find(p => p.dirName === 'Profile 1') || profiles[0];
  console.log('Testing with Profile:', selectedProfile.displayName);

  const downloadFolder = path.join(os.homedir(), 'Downloads', 'Flow_Test_Videos');
  const testPrompts = ['A cute little red panda playing in fresh snow 4k'];
  const settings = {
    model: 'Omni Flash',
    duration: '10s',
    aspectRatio: '16:9',
    quality: '720p'
  };

  const engine = new FlowAutomationEngine(
    (log) => console.log(`[ENGINE LOG] [${log.type}] ${log.message}`),
    (prog) => console.log(`[PROGRESS]`, JSON.stringify(prog))
  );

  try {
    await engine.runQueue(testPrompts, [selectedProfile], settings, downloadFolder);
    console.log('=== TEST FINISHED SUCCESSFULLY ===');
  } catch (err) {
    console.error('=== TEST FAILED ===', err);
  }
}

runAutonomousTest();
