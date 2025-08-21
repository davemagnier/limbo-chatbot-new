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
    const mintStore = getStore("minted-conversations");
    
    if (request.method === 'POST') {
      // Store new minted item
      const data = await request.json();
      
      const mintRecord = {
        referenceNumber: data.referenceNumber,
        userMessage: data.userMessage,
        aiResponse: data.aiResponse,
        imageUrl: data.imageUrl || null,
        type: data.type || 'text',
        walletAddress: data.walletAddress,
        timestamp: new Date().toISOString(),
        transactionHash: data.transactionHash || null,
        metadata: {
          tokenBalance: data.tokenBalance,
          networkChainId: data.networkChainId,
          userAgent: request.headers.get('user-agent'),
          ip: context.ip
        }
      };
      
      // Store by reference number
      await mintStore.set(data.referenceNumber, JSON.stringify(mintRecord));
      
      // Also store in a daily index for easy retrieval
      const today = new Date().toISOString().split('T')[0];
      const dailyIndex = await mintStore.get(`index_${today}`) || '[]';
      const indexArray = JSON.parse(dailyIndex);
      indexArray.push(data.referenceNumber);
      await mintStore.set(`index_${today}`, JSON.stringify(indexArray));
      
      // Store user's mint history
      const userHistory = await mintStore.get(`user_${data.walletAddress}`) || '[]';
      const userArray = JSON.parse(userHistory);
      userArray.push({
        referenceNumber: data.referenceNumber,
        timestamp: mintRecord.timestamp,
        type: data.type
      });
      await mintStore.set(`user_${data.walletAddress}`, JSON.stringify(userArray));
      
      return new Response(JSON.stringify({ 
        success: true, 
        referenceNumber: data.referenceNumber,
        message: 'Mint record stored successfully'
      }), { 
        status: 200, 
        headers 
      });
      
    } else if (request.method === 'GET') {
      // Retrieve minted items
      const url = new URL(request.url);
      const referenceNumber = url.searchParams.get('ref');
      const walletAddress = url.searchParams.get('wallet');
      const date = url.searchParams.get('date');
      
      if (referenceNumber) {
        // Get specific mint by reference
        const record = await mintStore.get(referenceNumber);
        if (record) {
          return new Response(record, { status: 200, headers });
        } else {
          return new Response(JSON.stringify({ error: 'Reference not found' }), { 
            status: 404, 
            headers 
          });
        }
      } else if (walletAddress) {
        // Get all mints by wallet
        const userHistory = await mintStore.get(`user_${walletAddress}`) || '[]';
        return new Response(userHistory, { status: 200, headers });
      } else if (date) {
        // Get all mints for a date
        const dailyIndex = await mintStore.get(`index_${date}`) || '[]';
        const indexArray = JSON.parse(dailyIndex);
        const records = [];
        
        for (const ref of indexArray) {
          const record = await mintStore.get(ref);
          if (record) {
            records.push(JSON.parse(record));
          }
        }
        
        return new Response(JSON.stringify(records), { status: 200, headers });
      } else {
        return new Response(JSON.stringify({ 
          error: 'Please provide ref, wallet, or date parameter' 
        }), { 
          status: 400, 
          headers 
        });
      }
    }
    
  } catch (error) {
    console.error('Mint store error:', error);
    return new Response(JSON.stringify({ 
      error: 'Storage operation failed',
      details: error.message 
    }), { 
      status: 500, 
      headers 
    });
  }
};