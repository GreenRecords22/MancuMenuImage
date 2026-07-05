export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. सबसे पहले KV Cache में चेक करें
  const cachedImage = await env.IMAGE_CACHE.get(url.pathname, { type: "arrayBuffer" });
  
  if (cachedImage) {
    return new Response(cachedImage, {
      headers: { 
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // 2. अगर KV में नहीं है, तो पेजेस के ओरिजिनल एसेट से इमेज उठाएं
  const response = await env.ASSETS.fetch(request);

  if (response.ok) {
    const responseClone = response.clone();
    const arrayBuffer = await responseClone.arrayBuffer();
    
    // 🔥 बदलाव: बैकग्राउंड के बजाय सीधे 'await' करके पहले KV में सेव करेंगे
    try {
      await env.IMAGE_CACHE.put(url.pathname, arrayBuffer);
    } catch (kvError) {
      console.error("KV Save Error:", kvError);
    }
    
    // ओरिजिनल रिस्पॉन्स को सही हेडर्स के साथ वापस भेजें
    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  return response;
}
