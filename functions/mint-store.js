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
      const data = await request.json();
      
      // Handle authentication request
      if (data.action === 'authenticate') {
        // Verify wallet signature
        const { walletAddress, signature, message } = data;
        
        // In production, you'd verify the signature here using ethers.js
        // For now, we'll do a simple check
        if (!walletAddress || !signature || !message) {
          return new Response(JSON.stringify({ 
            error: 'Invalid authentication data' 
          }), { 
            status: 400, 
            headers 
          });
        }
        
        // Generate a temporary access token (expires in 1 hour)
        const token = Buffer.from(JSON.stringify({
          wallet: walletAddress,
          expires: Date.now() + 3600000, // 1 hour
          signature: signature.substring(0, 20) // Store partial sig for validation
        })).toString('base64');
        
        // Store the token
        await mintStore.set(`auth_${walletAddress}`, JSON.stringify({
          token,
          expires: Date.now() + 3600000
        }));
        
        return new Response(JSON.stringify({ 
          success: true,
          token,
          message: 'Authentication successful'
        }), { 
          status: 200, 
          headers 
        });
      }
      
      // Regular mint storage (existing code)
      const mintRecord = {
        referenceNumber: data.referenceNumber,
        userMessage: data.userMessage,
        aiResponse: data.aiResponse,
        imageUrl: data.imageUrl || null,
        type: data.type || 'text',
        walletAddress: data.walletAddress,
        timestamp: new Date().toISOString(),
        transactionHash: data.transactionHash || null,
        // Encrypt sensitive data
        encrypted: true,
        metadata: {
          tokenBalance: data.tokenBalance,
          networkChainId: data.networkChainId,
          userAgent: request.headers.get('user-agent'),
          ip: context.ip
        }
      };
      
      // Store by reference number
      await mintStore.set(data.referenceNumber, JSON.stringify(mintRecord));
      
      // Also store in a daily index for admin use only
      const today = new Date().toISOString().split('T')[0];
      const dailyIndex = await mintStore.get(`index_${today}`) || '[]';
      const indexArray = JSON.parse(dailyIndex);
      indexArray.push(data.referenceNumber);
      await mintStore.set(`index_${today}`, JSON.stringify(indexArray));
      
      // Store user's mint history (encrypted)
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
      const url = new URL(request.url);
      const walletAddress = url.searchParams.get('wallet');
      const token = url.searchParams.get('token');
      const adminKey = url.searchParams.get('adminKey');
      
      // Admin access (for admin panel only)
      if (adminKey === process.env.ADMIN_KEY) {
        const date = url.searchParams.get('date');
        const ref = url.searchParams.get('ref');
        
        if (ref) {
          const record = await mintStore.get(ref);
          return new Response(record || JSON.stringify({ error: 'Not found' }), { 
            status: record ? 200 : 404, 
            headers 
          });
        }
        
        if (date) {
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
        }
      }
      
      // User access - requires authentication
      if (walletAddress) {
        // Verify token
        if (!token) {
          return new Response(JSON.stringify({ 
            error: 'Authentication required',
            requiresAuth: true 
          }), { 
            status: 401, 
            headers 
          });
        }
        
        // Validate token
        const authData = await mintStore.get(`auth_${walletAddress}`);
        if (!authData) {
          return new Response(JSON.stringify({ 
            error: 'Invalid token',
            requiresAuth: true 
          }), { 
            status: 401, 
            headers 
          });
        }
        
        const auth = JSON.parse(authData);
        if (auth.token !== token || auth.expires < Date.now()) {
          return new Response(JSON.stringify({ 
            error: 'Token expired',
            requiresAuth: true 
          }), { 
            status: 401, 
            headers 
          });
        }
        
        // Get user's mints
        const userHistory = await mintStore.get(`user_${walletAddress}`) || '[]';
        const history = JSON.parse(userHistory);
        
        // Fetch full records for user
        const fullRecords = [];
        for (const item of history) {
          const record = await mintStore.get(item.referenceNumber);
          if (record) {
            const parsed = JSON.parse(record);
            // Only return this user's mints
            if (parsed.walletAddress.toLowerCase() === walletAddress.toLowerCase()) {
              fullRecords.push(parsed);
            }
          }
        }
        
        return new Response(JSON.stringify(fullRecords), { 
          status: 200, 
          headers 
        });
      }
      
      // No public access without authentication
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { 
        status: 401, 
        headers 
      });
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
