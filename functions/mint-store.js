// mint-store.js
const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    // Initialize the store
    const mintStore = getStore("minted-conversations");
    
    // Test endpoint
    if (event.path.includes('test')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          status: 'ok', 
          message: 'Mint store function is working' 
        })
      };
    }
    
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      
      // Simple authentication for testing
      if (data.action === 'authenticate') {
        const token = Buffer.from(JSON.stringify({
          wallet: data.walletAddress,
          expires: Date.now() + 3600000,
          timestamp: Date.now()
        })).toString('base64');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true,
            token,
            message: 'Authentication successful'
          })
        };
      }
      
      // Store mint record
      if (data.referenceNumber) {
        const mintRecord = {
          referenceNumber: data.referenceNumber,
          userMessage: data.userMessage || '',
          aiResponse: data.aiResponse || '',
          imageUrl: data.imageUrl || null,
          type: data.type || 'text',
          walletAddress: data.walletAddress || 'unknown',
          timestamp: new Date().toISOString(),
          transactionHash: data.transactionHash || null,
          metadata: {
            tokenBalance: data.tokenBalance || 0,
            networkChainId: data.networkChainId || '',
            userAgent: event.headers['user-agent'] || '',
            ip: context.ip || ''
          }
        };
        
        // Store the record
        await mintStore.set(data.referenceNumber, JSON.stringify(mintRecord));
        
        // Store in user history
        const userKey = `user_${data.walletAddress}`;
        let userHistory = [];
        
        try {
          const existingHistory = await mintStore.get(userKey);
          if (existingHistory) {
            userHistory = JSON.parse(existingHistory);
          }
        } catch (e) {
          // No existing history
        }
        
        userHistory.push({
          referenceNumber: data.referenceNumber,
          timestamp: mintRecord.timestamp,
          type: data.type
        });
        
        await mintStore.set(userKey, JSON.stringify(userHistory));
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            referenceNumber: data.referenceNumber,
            message: 'Mint record stored successfully'
          })
        };
      }
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'No reference number provided' 
        })
      };
      
    } else if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const walletAddress = params.wallet;
      const token = params.token;
      
      // For testing, skip token validation
      if (walletAddress) {
        const userKey = `user_${walletAddress}`;
        let userHistory = [];
        
        try {
          const historyData = await mintStore.get(userKey);
          if (historyData) {
            userHistory = JSON.parse(historyData);
          }
        } catch (e) {
          // No history found
        }
        
        const fullRecords = [];
        
        for (const item of userHistory) {
          try {
            const record = await mintStore.get(item.referenceNumber);
            if (record) {
              fullRecords.push(JSON.parse(record));
            }
          } catch (e) {
            console.error('Error fetching record:', e);
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(fullRecords)
        };
      }
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Wallet address required' 
        })
      };
    }
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Invalid request method' 
      })
    };
    
  } catch (error) {
    console.error('Mint store error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Storage operation failed',
        details: error.message
      })
    };
  }
};
