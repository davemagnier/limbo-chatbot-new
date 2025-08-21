import { getStore } from "@netlify/blobs";

export default async (request, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    // Initialize the store
    const mintStore = getStore("minted-conversations");
    
    // Add a test endpoint
    if (request.url.includes('test')) {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'Mint store function is working' 
      }), { 
        status: 200, 
        headers 
      });
    }
    
    if (request.method === 'POST') {
      const data = await request.json();
      
      // For now, skip authentication to test basic functionality
      if (data.action === 'authenticate') {
        // Simple authentication without signature verification for testing
        const token = Buffer.from(JSON.stringify({
          wallet: data.walletAddress,
          expires: Date.now() + 3600000,
          timestamp: Date.now()
        })).toString('base64');
        
        return new Response(JSON.stringify({ 
          success: true,
          token,
          message: 'Authentication successful (test mode)'
        }), { 
          status: 200, 
          headers 
        });
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
            userAgent: request.headers.get('user-agent') || '',
            ip: context.ip || ''
          }
        };
        
        // Store the record
        await mintStore.set(data.referenceNumber, JSON.stringify(mintRecord));
        
        // Store in user history
        const userKey = `user_${data.walletAddress}`;
        const existingHistory = await mintStore.get(userKey);
        const userHistory = existingHistory ? JSON.parse(existingHistory) : [];
        userHistory.push({
          referenceNumber: data.referenceNumber,
          timestamp: mintRecord.timestamp,
          type: data.type
        });
        await mintStore.set(userKey, JSON.stringify(userHistory));
        
        return new Response(JSON.stringify({ 
          success: true, 
          referenceNumber: data.referenceNumber,
          message: 'Mint record stored successfully'
        }), { 
          status: 200, 
          headers 
        });
      }
    } else if (request.method === 'GET') {
      const url = new URL(request.url);
      const walletAddress = url.searchParams.get('wallet');
      const token = url.searchParams.get('token');
      
      // For testing, skip token validation
      if (walletAddress) {
        const userKey = `user_${walletAddress}`;
        const userHistory = await mintStore.get(userKey);
        
        if (!userHistory) {
          return new Response(JSON.stringify([]), { 
            status: 200, 
            headers 
          });
        }
        
        const history = JSON.parse(userHistory);
        const fullRecords = [];
        
        for (const item of history) {
          const record = await mintStore.get(item.referenceNumber);
          if (record) {
            fullRecords.push(JSON.parse(record));
          }
        }
        
        return new Response(JSON.stringify(fullRecords), { 
          status: 200, 
          headers 
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      error: 'Invalid request' 
    }), { 
      status: 400, 
      headers 
    });
    
  } catch (error) {
    console.error('Mint store error:', error);
    return new Response(JSON.stringify({ 
      error: 'Storage operation failed',
      details: error.message,
      stack: error.stack
    }), { 
      status: 500, 
      headers 
    });
  }
};
