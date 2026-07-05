export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. सबसे पहले KV Cache में चेक करें कि इमेज पहले से है या नहीं
  const cachedImage = await env.IMAGE_CACHE.get(url.pathname, { type: "stream" });
  
  if (cachedImage) {
    // अगर मिल गई, तो यहीं से सुपर-फास्ट स्पीड में इमेज रिटर्न कर दें
    return new Response(cachedImage, {
      headers: { 
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000" 
      }
    });
  }

  // 2. अगर KV में नहीं है, तो पेजेस के ओरिजिनल फोल्डर से इमेज उठाएं
  const response = await env.ASSETS.fetch(request);

  if (response.ok) {
    // इमेज को भविष्य के लिए KV स्टोरेज में सेव कर लें
    const responseClone = response.clone();
    const arrayBuffer = await responseClone.arrayBuffer();
    await env.IMAGE_CACHE.put(url.pathname, arrayBuffer);
  }

  return response;
}
