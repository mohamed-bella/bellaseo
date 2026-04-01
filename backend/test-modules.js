try {
  console.log('Testing modules loading...');
  require('./src/config/database');
  console.log('Database OK');
  require('./src/services/aiService');
  console.log('AI Service OK');
  require('./src/services/promptEngine');
  console.log('Prompt Engine OK');
  require('./src/modules/sites/controller');
  console.log('Sites Controller OK');
  require('./src/modules/workflows/controller');
  console.log('Workflows Controller OK');
  console.log('All modules loaded successfully!');
  process.exit(0);
} catch (err) {
  console.error('FAILED TO LOAD MODULES:', err);
  process.exit(1);
}
