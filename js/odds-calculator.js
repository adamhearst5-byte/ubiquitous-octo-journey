// Odds Calculator and Arbitrage Detection
class OddsCalculator {
    constructor() {
        this.commission = {
            betfair: 0.05, // 5% Betfair commission
            skybet: 0.05,
            paddypower: 0.05,
            betfred: 0.05,
            ladbrokes: 0.05
        };
    }

    // Calculate implied probability from decimal odds
    getImpliedProbability(odds) {
        if (!odds || odds <= 1) return 0;
        return 1 / odds;
    }

    // Calculate overround (bookmaker margin)
    calculateOverround(oddsArray) {
        const totalProbability = oddsArray.reduce((sum, odds) => {
            return sum + this.getImpliedProbability(odds);
        }, 0);
        
        return (totalProbability - 1) * 100; // Return as percentage
    }

    // Find the best odds for each selection across all bookmakers
    findBestOdds(dogOdds) {
        const bookmakers = ['skybet', 'paddypower', 'betfred', 'ladbrokes'];
        const bestOdds = {
            value: 0,
            bookmaker: null,
            betfairBack: dogOdds.betfair?.back || 0,
            betfairLay: dogOdds.betfair?.lay || 0
        };

        // Find best bookmaker odds
        bookmakers.forEach(bookmaker => {
            const odds = dogOdds[bookmaker];
            if (odds && odds > bestOdds.value) {
                bestOdds.value = odds;
                bestOdds.bookmaker = bookmaker;
            }
        });

        return bestOdds;
    }

    // Calculate potential arbitrage opportunities
    calculateArbitrage(raceData) {
        const opportunities = [];

        raceData.dogs.forEach(dog => {
            const bestOdds = this.findBestOdds(dog.odds);
            const betfairBack = dog.odds.betfair?.back || 0;
            const betfairLay = dog.odds.betfair?.lay || 0;

            // Back/Lay arbitrage on Betfair
            if (betfairBack > 0 && betfairLay > 0) {
                const backProb = this.getImpliedProbability(betfairBack);
                const layProb = this.getImpliedProbability(betfairLay);
                const margin = layProb - backProb;

                if (margin > 0.02) { // 2% minimum margin
                    opportunities.push({
                        type: 'betfair_back_lay',
                        dog: dog.name,
                        trap: dog.trap,
                        backOdds: betfairBack,
                        layOdds: betfairLay,
                        margin: margin * 100,
                        race: raceData.id
                    });
                }
            }

            // Bookmaker vs Betfair arbitrage
            if (bestOdds.value > betfairLay) {
                const bookmakerProb = this.getImpliedProbability(bestOdds.value);
                const betfairProb = this.getImpliedProbability(betfairLay);
                const arbitrageMargin = 1 - (bookmakerProb + betfairProb);

                if (arbitrageMargin > 0.01) { // 1% minimum profit
                    opportunities.push({
                        type: 'bookmaker_betfair',
                        dog: dog.name,
                        trap: dog.trap,
                        bookmakerOdds: bestOdds.value,
                        bookmaker: bestOdds.bookmaker,
                        betfairLayOdds: betfairLay,
                        profit: arbitrageMargin * 100,
                        race: raceData.id
                    });
                }
            }
        });

        return opportunities;
    }

    // Calculate optimal stake distribution for arbitrage
    calculateStakes(totalStake, odds1, odds2) {
        const prob1 = this.getImpliedProbability(odds1);
        const prob2 = this.getImpliedProbability(odds2);
        const totalProb = prob1 + prob2;

        const stake1 = (totalStake * prob1) / totalProb;
        const stake2 = (totalStake * prob2) / totalProb;

        return {
            stake1: Math.round(stake1 * 100) / 100,
            stake2: Math.round(stake2 * 100) / 100,
            profit1: Math.round((stake1 * odds1 - totalStake) * 100) / 100,
            profit2: Math.round((stake2 * odds2 - totalStake) * 100) / 100
        };
    }

    // Calculate value bets (when bookmaker odds are higher than fair odds)
    findValueBets(raceData, fairOddsModel = null) {
        const valueBets = [];

        raceData.dogs.forEach(dog => {
            const bestOdds = this.findBestOdds(dog.odds);
            const betfairBack = dog.odds.betfair?.back || 0;

            // Use Betfair back odds as proxy for fair odds (market consensus)
            if (bestOdds.value > betfairBack && betfairBack > 0) {
                const impliedValue = (bestOdds.value / betfairBack - 1) * 100;
                
                if (impliedValue > 5) { // 5% minimum edge
                    valueBets.push({
                        dog: dog.name,
                        trap: dog.trap,
                        bookmakerOdds: bestOdds.value,
                        bookmaker: bestOdds.bookmaker,
                        fairOdds: betfairBack,
                        edge: impliedValue,
                        race: raceData.id
                    });
                }
            }
        });

        return valueBets.sort((a, b) => b.edge - a.edge);
    }

    // Calculate Kelly Criterion stake
    calculateKellyStake(bankroll, odds, winProbability) {
        const q = 1 - winProbability; // Probability of losing
        const b = odds - 1; // Net odds received
        
        const kelly = (b * winProbability - q) / b;
        const kellyPercentage = Math.max(0, Math.min(kelly, 0.25)); // Cap at 25% of bankroll
        
        return {
            kellyFraction: kellyPercentage,
            recommendedStake: bankroll * kellyPercentage,
            expectedValue: (odds * winProbability - 1) * 100
        };
    }

    // Calculate racing-specific metrics
    calculateSpeedRating(time, distance, trackCondition = 'good') {
        // Basic speed rating calculation (simplified)
        const baseTime = distance / 16.5; // Average speed 16.5 m/s
        const trackAdjustment = {
            'fast': -0.2,
            'good': 0,
            'slow': 0.3,
            'heavy': 0.6
        };
        
        const adjustedTime = time + (trackAdjustment[trackCondition] || 0);
        const speedRating = Math.round(100 - ((adjustedTime - baseTime) * 10));
        
        return Math.max(0, Math.min(speedRating, 150));
    }

    // Form analysis helper
    analyzeForm(recentRuns) {
        if (!recentRuns || recentRuns.length === 0) return null;

        const positions = recentRuns.map(run => run.position);
        const averagePosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
        
        const wins = positions.filter(pos => pos === 1).length;
        const places = positions.filter(pos => pos <= 3).length;
        
        return {
            averagePosition: Math.round(averagePosition * 10) / 10,
            winPercentage: (wins / positions.length) * 100,
            placePercentage: (places / positions.length) * 100,
            recentForm: positions.slice(0, 5).join('-')
        };
    }

    // Calculate compound odds for multiple selections
    calculateAccumulatorOdds(selections) {
        return selections.reduce((total, odds) => total * odds, 1);
    }

    // Calculate each-way returns
    calculateEachWayReturns(stake, winOdds, placeOdds, places = 3) {
        const winStake = stake / 2;
        const placeStake = stake / 2;
        
        const winReturn = winStake * winOdds;
        const placeReturn = placeStake * placeOdds;
        
        return {
            winReturn: Math.round(winReturn * 100) / 100,
            placeReturn: Math.round(placeReturn * 100) / 100,
            totalReturn: Math.round((winReturn + placeReturn) * 100) / 100,
            profit: Math.round((winReturn + placeReturn - stake) * 100) / 100
        };
    }

    // Market efficiency score
    calculateMarketEfficiency(raceData) {
        const allOdds = raceData.dogs.map(dog => {
            const bestOdds = this.findBestOdds(dog.odds);
            return bestOdds.value;
        });
        
        const overround = this.calculateOverround(allOdds);
        const efficiency = Math.max(0, 100 - overround);
        
        return {
            efficiency: Math.round(efficiency * 10) / 10,
            overround: Math.round(overround * 10) / 10,
            rating: efficiency > 95 ? 'Excellent' : 
                   efficiency > 90 ? 'Good' : 
                   efficiency > 85 ? 'Fair' : 'Poor'
        };
    }
}

// Export for use in other modules
window.OddsCalculator = OddsCalculator;