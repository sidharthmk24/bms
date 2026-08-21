const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/v1/credit-copies', {
      bookId: '1234',
      quantity: 1,
      recipientName: 'Test',
      note: ''
    }, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3MjBhMjI3Ny1hOTk3LTQxYmEtYTBlNy0wZmI5YzQ0NTcxNmIiLCJlbWFpbCI6InN1cGVyYWRtaW5AYm1zLmNvbSIsInJvbGVzIjpbIlNVUEVSX0FETUlOIl0sInByaW1hcnlSb2xlIjoiU1VQRVJfQURNSU4iLCJicmFuY2hJZCI6bnVsbCwiaWF0IjoxNzg3Mjk0ODI3LCJleHAiOjE3ODcyOTU3Mjd9.s7k8FaO77RGiOfbMoHpWcYXV8cnc7YVzxjrFJKk5Pjw'
      }
    });
    console.log(res.data);
  } catch (err) {
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', err.response.data);
    } else {
      console.log('Error:', err.message);
    }
  }
}

test();
