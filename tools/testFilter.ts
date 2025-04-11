import axios from 'axios';

const API_URL = process.env.API_URL || 'https://your-api-url.execute-api.eu-west-1.amazonaws.com/prod';

interface ErrorResponse {
  response?: {
    data?: any;
  };
  message?: string;
}

async function testImageFilter() {
  const testCases = [
    // Test status filter
    {
      status: 'Pass'
    },
    // Test date range filter
    {
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31'
      }
    },
    // Test photographer filter
    {
      photographer: 'test@example.com'
    },
    // Test combined filters
    {
      status: 'Pass',
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31'
      },
      photographer: 'test@example.com'
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log('\nTesting filter with criteria:', testCase);
      const response = await axios.post(`${API_URL}/filter`, testCase);
      console.log('Response:', response.data);
    } catch (error) {
      const err = error as ErrorResponse;
      console.error('Error testing filter:', err.response?.data || err.message);
    }
  }
}

testImageFilter().catch(console.error); 