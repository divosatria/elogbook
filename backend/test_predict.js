/**
 * Test script: sends a minimal valid JPEG to the Python AI service
 * and prints exactly what happens.
 */
const axios = require('axios');
const FormData = require('form-data');

// Minimal valid 1x1 red JPEG (generated via xxd from a known-good file)
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS' +
  'Ew8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJ' +
  'CQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
  'MjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEA' +
  'AAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEG' +
  'E1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RF' +
  'RkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKj' +
  'pKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP0' +
  '9fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgEC' +
  'BAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLR' +
  'ChYkNOEl8RcYI4Q/RFhHRUYnJCk2NTc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdo' +
  'aWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLD' +
  'xMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEB' +
  '/8QAFAABAAAAAAAAAAAAAAAAAAAAB//aAAgBAQAAPwBN/9k=',
  'base64'
);

const FLASK_URL = 'http://127.0.0.1:5001/api/predict';

async function testDirect() {
  console.log('=== Test 1: Direct to Python (Buffer append with filename) ===');
  console.log(`JPEG buffer size: ${TINY_JPEG.length} bytes`);
  console.log(`First 4 bytes: ${TINY_JPEG.slice(0, 4).toString('hex')}`);

  const form = new FormData();
  form.append('image', TINY_JPEG, {
    filename: 'test.jpg',
    contentType: 'image/jpeg'
  });

  try {
    const resp = await axios.post(FLASK_URL, form, {
      headers: form.getHeaders(),
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    console.log('✅ SUCCESS:', JSON.stringify(resp.data).slice(0, 200));
  } catch (err) {
    console.error('❌ FAILED:', err.response ? JSON.stringify(err.response.data) : err.message);
  }
}

async function testGetBuffer() {
  console.log('\n=== Test 2: Direct to Python (getBuffer method) ===');
  const form = new FormData();
  form.append('image', TINY_JPEG, {
    filename: 'test.jpg',
    contentType: 'image/jpeg'
  });

  const buf = form.getBuffer();
  console.log(`FormData buffer size: ${buf.length} bytes`);

  try {
    const resp = await axios.post(FLASK_URL, buf, {
      headers: {
        ...form.getHeaders(),
        'Content-Length': form.getLengthSync()
      },
      timeout: 30000
    });
    console.log('✅ SUCCESS:', JSON.stringify(resp.data).slice(0, 200));
  } catch (err) {
    console.error('❌ FAILED:', err.response ? JSON.stringify(err.response.data) : err.message);
  }
}

async function testViaNodeBackend() {
  console.log('\n=== Test 3: Via Node.js backend (full flow /api/mobile/predict-fish) ===');
  const form = new FormData();
  form.append('image', TINY_JPEG, {
    filename: 'test.jpg',
    contentType: 'image/jpeg'
  });

  try {
    // First get a token
    const loginResp = await axios.post('http://127.0.0.1:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResp.data.token;
    console.log('Got token:', token ? token.slice(0, 20) + '...' : 'NONE');

    const resp = await axios.post('http://127.0.0.1:5000/api/mobile/predict-fish', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000
    });
    console.log('✅ SUCCESS:', JSON.stringify(resp.data).slice(0, 200));
  } catch (err) {
    console.error('❌ FAILED:', err.response ? JSON.stringify(err.response.data) : err.message);
  }
}

(async () => {
  await testDirect();
  await testGetBuffer();
  await testViaNodeBackend();
})();
