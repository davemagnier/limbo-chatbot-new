// mint-store.js - With explicit Netlify Blobs configuration
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
    // Explicit configuration for Netlify Blobs
    // These values MUST be set as environment variables in Netlify
    const siteID = process.env.SITE_ID;
    const token = process.env.NETLIFY_AUTH_TOKEN;
    
    if (!siteID || !token) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ 
          error: 'Configuration missing',
          message: 'SITE_ID and NETLIFY_AUTH_TOKEN environment variables are required',
          setup: 'Please add these in Netlify Dashboard > Site configuration > Environment variables'
        })
      };
    }
    
    // Initialize the store with explicit configuration
    const mintStore = getStore({
      name: "minted-conversations",
      siteID: siteID,
      token: token
    });
    
    // Test endpoint
    if (event.path.includes('test')) {
      try {
        // Test write and read
        await mintStore.set('test-connection', 'working');
        const testValue = await mintStore.get('test-connection');
        await mintStore.delete('test-connection');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            status: 'ok',
            message: 'Mint store working correctly',
            storage: 'netlify-blobs',
            testResult: testValue === 'working' ? 'passed' : 'failed'
          })
        };
      } catch (testError) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            status: 'error',
            message: 'Function running but storage test failed',
            error: testError.message
          })
        };
      }
    }
    
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      
      // Handle authentication
      if (data.action === 'authenticate') {
        const authToken = Buffer.from(JSON.stringify({
          wallet: data.walletAddress,
          expires: Date.now() + 3600000,
          timestamp: Date.now()
        })).toString('base64');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true,
            token: authToken,
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
        
        // Store the main record using setJSON
        await mintStore.setJSON(data.referenceNumber, mintRecord);
        
        // Store in user history
        const userKey = `user_${data.walletAddress}`;
        let userHistory = [];
        
        try {
          const existingHistory = await mintStore.get(userKey, { type: 'json' });
          if (existingHistory) {
            userHistory = existingHistory;
          }
        } catch (e) {
          console.log('No existing history for user');
        }
        
        userHistory.push({
          referenceNumber: data.referenceNumber,
          timestamp: mintRecord.timestamp,
          type: data.type
        });
        
        await mintStore.setJSON(userKey, userHistory);
        
        // Also store in daily index for admin access
        const dateKey = `index_${new Date().toISOString().split('T')[0]}`;
        let dailyIndex = [];
        
        try {
          const existingIndex = await mintStore.get(dateKey, { type: 'json' });
          if (existingIndex) {
            dailyIndex = existingIndex;
          }
        } catch (e) {
          console.log('No existing daily index');
        }
        
        dailyIndex.push({
          referenceNumber: data.referenceNumber,
          walletAddress: data.walletAddress,
          timestamp: mintRecord.timestamp
        });
        
        await mintStore.setJSON(dateKey, dailyIndex);
        
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
      const authToken = params.token;
      const adminKey = params.adminKey;
      const dateFilter = params.date;
      const referenceNumber = params.ref;
      
      // Admin access - requires admin key
      if (adminKey && adminKey === process.env.ADMIN_KEY) {
        if (referenceNumber) {
          // Get specific mint by reference
          try {
            const record = await mintStore.get(referenceNumber, { type: 'json' });
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(record || { error: 'Mint not found' })
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
            const dailyIndex = await mintStore.get(dateKey, { type: 'json' });
            if (dailyIndex) {
              const fullRecords = [];
              
              for (const item of dailyIndex) {
                try {
                  const record = await mintStore.get(item.referenceNumber, { type: 'json' });
                  if (record) {
                    fullRecords.push(record);
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
          
          // Filter for mint records (start with LIMBO-)
          const mintBlobs = blobs.filter(b => b.key.startsWith('LIMBO-')).slice(0, 100);
          
          for (const blob of mintBlobs) {
            try {
              const record = await mintStore.get(blob.key, { type: 'json' });
              if (record) {
                allMints.push(record);
              }
            } catch (e) {
              console.error('Error fetching record:', e);
            }
          }
          
          // Sort by timestamp (newest first)
          allMints.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(allMints)
          };
        } catch (e) {
          console.error('Error listing mints:', e);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify([])
          };
        }
      }
      
      // User access - requires authentication
      if (walletAddress && authToken) {
        // Validate token
        try {
          const tokenData = JSON.parse(Buffer.from(authToken, 'base64').toString());
          
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
          userHistory = await mintStore.get(userKey, { type: 'json' });
          if (!userHistory) {
            userHistory = [];
          }
        } catch (e) {
          console.log('No history for user');
        }
        
        const fullRecords = [];
        
        for (const item of userHistory) {
          try {
            const record = await mintStore.get(item.referenceNumber, { type: 'json' });
            if (record) {
              fullRecords.push(record);
            }
          } catch (e) {
            console.error('Error fetching record:', e);
          }
        }
        
        // Sort by timestamp (newest first)
        fullRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
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
