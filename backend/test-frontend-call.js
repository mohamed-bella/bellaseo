const axios = require('axios');

async function testFrontendCall() {
  try {
    const res = await axios.get('http://localhost:5000/api/sites', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('Status:', res.status);
    console.log('Body:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('FAILED with status:', err.response.status);
      console.error('Body:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Request failed:', err.message);
    }
  }
}

testFrontendCall();
