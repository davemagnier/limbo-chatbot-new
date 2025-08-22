// mint-store.js - Properly configured for Netlify Blobs
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
    // Initialize the store with proper configuration
    // Netlify automatically provides these in production
    const mintStore = getStore({
      name: "minted-conversations",
      consistency: "strong"
    });
    
    // Test endpoint
    if (event.path.includes('test')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          status: 'ok', 
          message: 'Mint store function is working',
          environment: process.env.CONTEXT || 'unknown'
        })
      };
    }
    
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      
      // Handle authentication
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
            ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || ''
          }
        };
        
        // Store the main record
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
          console.log('No existing history for user');
        }
        
        userHistory.push({
          referenceNumber: data.referenceNumber,
          timestamp: mintRecord.timestamp,
          type: data.type
        });
        
        await mintStore.set(userKey, JSON.stringify(userHistory));
        
        // Also store in daily index for admin access
        const dateKey = `index_${new Date().toISOString().split('T')[0]}`;
        let dailyIndex = [];
        
        try {
          const existingIndex = await mintStore.get(dateKey);
          if (existingIndex) {
            dailyIndex = JSON.parse(existingIndex);
          }
        } catch (e) {
          console.log('No existing daily index');
        }
        
        dailyIndex.push({
          referenceNumber: data.referenceNumber,
          walletAddress: data.walletAddress,
          timestamp: mintRecord.timestamp
        });
        
        await mintStore.set(dateKey, JSON.stringify(dailyIndex));
        
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
      const adminKey = params.adminKey;
      const dateFilter = params.date;
      const referenceNumber = params.ref;
      
      // Admin access - requires admin key
      if (adminKey === process.env.ADMIN_KEY) {
        if (referenceNumber) {
          // Get specific mint by reference
          try {
            const record = await mintStore.get(referenceNumber);
            return {
              statusCode: 200,
              headers,
              body: record || JSON.stringify({ error: 'Mint not found' })
            };
          } catch (e) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Mint not found' })
            };
          }
        }
        
        if (dateFilter) {
          // Get all mints for a specific date
          const dateKey = `index_${dateFilter}`;
          try {
            const dailyIndex = await mintStore.get(dateKey);
            if (dailyIndex) {
              const index = JSON.parse(dailyIndex);
              const fullRecords = [];
              
              for (const item of index) {
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
          } catch (e) {
            console.log('No mints for this date');
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify([])
          };
        }
        
        // Return recent mints (last 100)
        try {
          const allMints = [];
          const { blobs } = await mintStore.list();
          
          for (const blob of blobs.slice(0, 100)) {
            if (blob.key.startsWith('LIMBO-')) {
              try {
                const record = await mintStore.get(blob.key);
                if (record) {
                  allMints.push(JSON.parse(record));
                }
              } catch (e) {
                console.error('Error fetching record:', e);
              }
            }
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(allMints)
          };
        } catch (e) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify([])
          };
        }
      }
      
      // User access - requires authentication
      if (walletAddress && token) {
        // Validate token
        try {
          const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
          
          if (tokenData.wallet !== walletAddress) {
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({ error: 'Invalid token' })
            };
          }
          
          if (tokenData.expires < Date.now()) {
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({ error: 'Token expired' })
            };
          }
        } catch (e) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Invalid token format' })
          };
        }
        
        // Get user's mints
        const userKey = `user_${walletAddress}`;
        let userHistory = [];
        
        try {
          const historyData = await mintStore.get(userKey);
          if (historyData) {
            userHistory = JSON.parse(historyData);
          }
        } catch (e) {
          console.log('No history for user');
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
          error: 'Authentication required' 
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
        details: error.message,
        type: error.constructor.name
      })
    };
  }
};
