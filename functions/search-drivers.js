// By exporting onRequestPost, this function will ONLY run for POST requests.
// This is the idiomatic Cloudflare Pages way and fixes the 405 error.
export async function onRequestPost(context) {
  // context.env contains your secret variables
  const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
  
  try {
    const body = await context.request.json();
    const searchTerm = body.searchTerm;

    const apiRequestBody = {
      email: IRACING_EMAIL,
      password: IRACING_PASSWORD,
      search: searchTerm
    };

    const response = await fetch("https://members-api.iracing.com/driver/get", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequestBody)
    });

    // It's good practice to check if the API call itself was successful
    if (!response.ok) {
        const errorText = await response.text();
        console.error("iRacing API error:", errorText);
        return new Response(`Error from iRacing API: ${response.statusText}`, { status: response.status });
    }

    const data = await response.json();
    
    // Return the data to your front-end
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response('Error in search-drivers function: ' + error.message, { status: 500 });
  }
}