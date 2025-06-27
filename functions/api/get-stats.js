import { createAuthenticatedIRacingAPI } from '../helpers/iracing-helper.js';
import iRacing from 'iracing-api';

export async function onRequestPost(context) {
  try {
    const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
    const iRacingAPI = await createAuthenticatedIRacingAPI(IRACING_EMAIL, IRACING_PASSWORD);

    const body = await context.request.json();
    const { custId, year, season } = body;

    if (!custId || !year || !season) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Corrected: Fetch member's recent races instead of searching series for a more reliable race list.
    const [recap, memberInfo, yearlyStats, allCategories, recentRaces] = await Promise.all([
        iRacingAPI.stats.getMemberRecap({ customerId: custId, year, season }),
        iRacingAPI.member.getMemberData({ customerIds: [custId], includeLicenses: true }),
        iRacingAPI.stats.getMemberYearlyStats({ customerId: custId }),
        new iRacing().constants.getCategories(), // Non-authed call
        iRacingAPI.stats.getMemberRecentRaces({ cust_id: custId })
    ]);
    
    // Manually filter the recent races to only include those from the selected season.
    if(recentRaces && recentRaces.races && recentRaces.races.length > 0) {
        recap.races = recentRaces.races.filter(race => {
            const raceDate = new Date(race.startTime);
            const raceYear = raceDate.getUTCFullYear();
            // iRacing seasons are 1-4, 12 weeks each (3 months).
            const raceSeason = Math.floor(raceDate.getUTCMonth() / 3) + 1;
            return raceYear === year && raceSeason === season;
        });
    } else {
        recap.races = []; // Ensure races is always an array.
    }

    // Determine the most-raced category to fetch chart data for
    let mostRacedCategory = { categoryId: 5, name: 'sports_car' }; // Default to Sports Car
    if (recap.races && recap.races.length > 0) {
        const categoryCounts = recap.races.reduce((acc, race) => {
            const categoryName = race.seriesName.toLowerCase().includes('oval') ? 'oval' : 'road'; // Simplified logic
            acc[categoryName] = (acc[categoryName] || 0) + 1;
            return acc;
        }, {});
        const topCategoryName = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b);
        const categoriesArray = Array.isArray(allCategories) ? allCategories : [];
        const topCategory = categoriesArray.find(c => c.label.toLowerCase().replace(/ /g, '_') === topCategoryName);
        if(topCategory) {
            mostRacedCategory = { categoryId: topCategory.categoryId, name: topCategoryName };
        }
    }
    
    // Fetch iRating and Safety Rating chart data
    const [iRatingData, safetyRatingData] = await Promise.all([
        iRacingAPI.member.getMemberChartData({ customerId: custId, categoryId: mostRacedCategory.categoryId, chartType: 1 }),
        iRacingAPI.member.getMemberChartData({ customerId: custId, categoryId: mostRacedCategory.categoryId, chartType: 3 }),
    ]);

    // Add latest value to chart data for easy display on the front-end
    if(iRatingData && iRatingData.points && iRatingData.points.length > 0) {
        iRatingData.displayValue = iRatingData.points[iRatingData.points.length - 1].value;
    }
    if(safetyRatingData && safetyRatingData.points && safetyRatingData.points.length > 0) {
        const lastSR = safetyRatingData.points[safetyRatingData.points.length - 1].value;
        safetyRatingData.displayValue = (lastSR / 100).toFixed(2);
    }

    const responseData = {
        recap,
        memberInfo: memberInfo.members[0] || {},
        iRatingData,
        safetyRatingData,
        allCategories: Array.isArray(allCategories) ? allCategories : [], 
        yearlyStats: yearlyStats.stats,
        mostRacedCategoryName: mostRacedCategory.name
    };
    
    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Function error:", { message: error.message, stack: error.stack });
    return new Response('Error in get-stats function: ' + error.message, { status: 500 });
  }
}
