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

  // 2. 🔥 ALTERNATE METHOD: बिना बैकटिक के सीधे स्ट्रिंग जोड़ना (ताकि स्पेस का कोई चांस ही न बचे)
  const githubRawURL = "https://raw.githubusercontent.com/GreenRecords22/MancuMenuImage/main" + url.pathname;
  
  try {
    const response = await fetch(githubRawURL);

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      
      // KV के अंदर राइट करें
      await env.IMAGE_CACHE.put(url.pathname, arrayBuffer);
      
      let contentType = response.headers.get("Content-Type") || "image/jpeg";
      if (contentType.includes("text/plain")) {
        contentType = url.pathname.endsWith(".png") ? "image/png" : "image/jpeg";
      }

      return new Response(arrayBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  } catch (err) {
    console.error("GitHub Fetch Error: ", err);
  }

  return env.ASSETS.fetch(request);
}
