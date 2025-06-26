import { createAuthenticatedIRacingAPI } from '../helpers/iracing-helper.js';
import iRacing from 'iracing-api'; // Still need top-level for non-authed calls

export async function onRequestPost(context) {
  try {
    const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
    const iRacingAPI = await createAuthenticatedIRacingAPI(IRACING_EMAIL, IRACING_PASSWORD);

    const body = await context.request.json();
    const { custId, year, season } = body;

    if (!custId || !year || !season) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Fetch all required data points in parallel for efficiency
    const [recap, memberInfo] = await Promise.all([
        iRacingAPI.stats.getMemberRecap({ customerId: custId, year, season }),
        iRacingAPI.member.get({ customerIds: [custId], includeLicenses: true })
    ]);
    
    // Create a temporary, non-authed instance for the constants call
    const iRacingConstantsAPI = new iRacing();
    const allCategories = await iRacingConstantsAPI.constants.getCategories();

    // Determine the most-raced category to fetch chart data for
    let mostRacedCategory = { categoryId: 5, name: 'sports_car' }; // Corrected: Default to Sports Car (categoryId 5 is a guess, name is what matters)
    if (recap && recap.races && recap.races.length > 0) {
        const categoryCounts = recap.races.reduce((acc, race) => {
            const categoryName = race.category.toLowerCase().replace(' ', '_');
            acc[categoryName] = (acc[categoryName] || 0) + 1;
            return acc;
        }, {});
        const topCategoryName = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b);
        
        const topCategory = allCategories.find(c => c.label.toLowerCase().replace(' ', '_') === topCategoryName);
        if(topCategory) {
            mostRacedCategory = { categoryId: topCategory.categoryId, name: topCategoryName };
        }
    }
    
    // Fetch iRating and Safety Rating chart data for that category
    const [iRacingData, safetyRatingData] = await Promise.all([
        iRacingAPI.member.getChartData({ customerId: custId, categoryId: mostRacedCategory.categoryId, chartType: 1 }),
        iRacingAPI.member.getChartData({ customerId: custId, categoryId: mostRacedCategory.categoryId, chartType: 3 }),
    ]);

    // Combine all data into a single response object
    const responseData = {
        recap,
        memberInfo: memberInfo[0] || {},
        iRatingData,
        safetyRatingData,
        allCategories,
        mostRacedCategoryName: mostRacedCategory.name
    };
    
    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Function error:", { message: error.message, stack: error.stack });
     if (error.message === 'Authentication secrets not configured') {
        return new Response(error.message, { status: 500 });
    }
    return new Response('Error in get-stats function: ' + error.message, { status: 500 });
  }
}
