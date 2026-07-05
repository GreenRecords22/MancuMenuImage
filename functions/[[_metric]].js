export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. सबसे पहले KV Cache में चेक करें कि क्या यह इमेज पहले से सेव है
  const cachedImage = await env.IMAGE_CACHE.get(url.pathname, { type: "arrayBuffer" });
  
  if (cachedImage) {
    // अगर मिल गई, तो सीधे KV से सुपर-फास्ट रिस्पॉन्स भेजें
    return new Response(cachedImage, {
      headers: { 
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // 2. अगर KV में नहीं है, तो पेजेस के एसेट से असली फाइल को fetch करें
  const response = await env.ASSETS.fetch(request);

  if (response.ok) {
    const contentType = response.headers.get("Content-Type") || "";
    
    // ⚠️ सुरक्षा कवच: सिर्फ और सिर्फ असली इमेज फाइल को ही KV में डालेंगे, किसी HTML टेक्स्ट को नहीं!
    if (contentType.startsWith("image/") || url.pathname.endsWith(".jpg") || url.pathname.endsWith(".png")) {
      const responseClone = response.clone();
      const arrayBuffer = await responseClone.arrayBuffer();
      
      // बिना बैकग्राउंड के झंझट के, सीधे await करके पक्का सेव करेंगे
      try {
        await env.IMAGE_CACHE.put(url.pathname, arrayBuffer);
      } catch (kvError) {
        console.error("KV Write Error:", kvError);
      }

      // असली इमेज का बाइनरी बफर सही हेडर के साथ ब्राउज़र को भेजें
      return new Response(arrayBuffer, {
        headers: {
          "Content-Type": contentType || "image/jpeg",
          "Cache-Control": "public, max-age=31536000",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }

  // अगर इमेज नहीं है (कोई और फाइल है), तो नॉर्मल रिस्पॉन्स जाने दें
  return response;
}
