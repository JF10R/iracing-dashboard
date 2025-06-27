import { createAuthenticatedIRacingAPI } from '../helpers/iracing-helper.js';

export async function onRequestPost(context) {
  try {
    const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
    const iRacingAPI = await createAuthenticatedIRacingAPI(IRACING_EMAIL, IRACING_PASSWORD);

    const body = await context.request.json();
    const { custId, year, season } = body;

    if (!custId || !year || !season) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Use the single authenticated instance for all data fetching
    const [recap, memberInfo, yearlyStats, allCategories] = await Promise.all([
        iRacingAPI.stats.getMemberRecap({ customerId: custId, year, season }),
        iRacingAPI.member.getMemberData({ customerIds: [custId], includeLicenses: true }),
        iRacingAPI.stats.getMemberYearlyStats({ customerId: custId }),
        iRacingAPI.constants.getCategories() // No need for a separate instance
    ]);
    
    // Determine the most-raced category to fetch chart data for
    let mostRacedCategory = { categoryId: 5, name: 'sports_car' }; // Default to Sports Car
    if (recap && recap.races && recap.races.length > 0) {
        const categoryCounts = recap.races.reduce((acc, race) => {
            const categoryName = race.category.toLowerCase().replace(' ', '_');
            acc[categoryName] = (acc[categoryName] || 0) + 1;
            return acc;
        }, {});
        const topCategoryName = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b);
        
        // Ensure allCategories is an array before using .find()
        const categoriesArray = Array.isArray(allCategories) ? allCategories : [];
        const topCategory = categoriesArray.find(c => c.label.toLowerCase().replace(' ', '_') === topCategoryName);

        if(topCategory) {
            mostRacedCategory = { categoryId: topCategory.categoryId, name: topCategoryName };
        }
    }
    
    // Fetch iRating and Safety Rating chart data for that category
    const [iRatingData, safetyRatingData] = await Promise.all([
        iRacingAPI.member.getMemberChartData({ customerId: custId, categoryId: mostRacedCategory.categoryId, chartType: 1 }),
        iRacingAPI.member.getMemberChartData({ customerId: custId, categoryId: mostRacedCategory.categoryId, chartType: 3 }),
    ]);

    // Combine all data into a single response object
    const responseData = {
        recap,
        memberInfo: memberInfo.members[0] || {}, // Data is nested under a `members` key
        iRatingData,
        safetyRatingData,
        // Corrected: Ensure allCategories is always an array in the response
        allCategories: Array.isArray(allCategories) ? allCategories : [], 
        yearlyStats: yearlyStats.stats,
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
