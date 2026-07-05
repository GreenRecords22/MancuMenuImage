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

  // 2. विलन ASSETS.fetch को हटाया! अब हम डायरेक्ट ग्लोबल fetch मारेंगे आपके लाइव डोमेन पर
  // इससे क्लाउडफ्लेयर मजबूरन असली फाइल ही लाकर देगा
  const originalImageURL = `https://mancumenuimage.pages.dev${url.pathname}`;
  
  try {
    const response = await fetch(originalImageURL, {
      headers: { "User-Agent": "Cloudflare-Fetch-Fix" }
    });

    if (response.ok) {
      const contentType = response.headers.get("Content-Type") || "";
      
      // सिर्फ तभी सेव करेंगे जब वो सचमुच इमेज हो और उसमें <h1> जैसा टेक्स्ट न हो
      if (contentType.startsWith("image/")) {
        const responseClone = response.clone();
        const arrayBuffer = await responseClone.arrayBuffer();
        
        // सीधे सिंक में सेव करो
        await env.IMAGE_CACHE.put(url.pathname, arrayBuffer);
        
        return new Response(arrayBuffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }
  } catch (err) {
    console.error("Fetch Error: ", err);
  }

  // अगर कुछ गड़बड़ हो तो नॉर्मल एसेट पर जाने दें
  return env.ASSETS.fetch(request);
}
