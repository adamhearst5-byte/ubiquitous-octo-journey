// API Configuration and Handlers
class APIManager {
    constructor() {
        this.endpoints = {
            // Demo endpoints for development (using mock data)
            races: 'https://api.example.com/greyhound/races',
            betfair: 'https://api.betfair.com/exchange/betting/json-rpc/v1',
            skybet: 'https://api.skybet.com/api/v1',
            paddypower: 'https://api.paddypower.com/api/v1'
        };
        
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    // Mock data for demonstration since we can't access real APIs without authentication
    getMockRaceData() {
        const tracks = ['Sheffield', 'Romford', 'Belle Vue', 'Hove', 'Crayford', 'Monmore'];
        const races = [];
        const now = new Date();
        
        for (let i = 0; i < 8; i++) {
            const raceTime = new Date(now.getTime() + (i * 15 + 10) * 60000); // Every 15 mins starting in 10 mins
            const track = tracks[Math.floor(Math.random() * tracks.length)];
            const distance = [480, 500, 525, 575, 650][Math.floor(Math.random() * 5)];
            
            const dogs = [];
            for (let j = 1; j <= 6; j++) {
                const dogNames = [
                    'Swift Lightning', 'Thunder Bolt', 'Racing Spirit', 'Speed Demon',
                    'Flying Arrow', 'Rapid Fire', 'Quick Silver', 'Flash Gordon',
                    'Wind Runner', 'Storm Chaser', 'Blazing Star', 'Rocket Man'
                ];
                
                const name = dogNames[Math.floor(Math.random() * dogNames.length)] + ` ${j}`;
                const baseOdds = 2 + Math.random() * 8; // 2.0 to 10.0
                
                dogs.push({
                    trap: j,
                    name: name,
                    odds: {
                        betfair: {
                            back: +(baseOdds + (Math.random() - 0.5) * 0.4).toFixed(2),
                            lay: +(baseOdds + (Math.random() - 0.5) * 0.4 + 0.1).toFixed(2)
                        },
                        skybet: +(baseOdds + (Math.random() - 0.5) * 0.6).toFixed(2),
                        paddypower: +(baseOdds + (Math.random() - 0.5) * 0.8).toFixed(2),
                        betfred: +(baseOdds + (Math.random() - 0.5) * 0.7).toFixed(2),
                        ladbrokes: +(baseOdds + (Math.random() - 0.5) * 0.9).toFixed(2)
                    }
                });
            }
            
            races.push({
                id: `race_${i}`,
                track: track,
                time: raceTime.toISOString(),
                distance: distance,
                type: 'Flat',
                dogs: dogs,
                status: 'upcoming'
            });
        }
        
        return {
            success: true,
            data: races,
            timestamp: new Date().toISOString(),
            next_update: new Date(now.getTime() + 30000).toISOString()
        };
    }

    async fetchWithRetry(url, options = {}, attempt = 1) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: { ...this.headers, ...options.headers }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (attempt < this.retryAttempts) {
                console.log(`Attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.fetchWithRetry(url, options, attempt + 1);
            }
            throw error;
        }
    }

    async getRaceData() {
        const cacheKey = 'race_data';
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        try {
            // For demo purposes, return mock data
            // In production, this would fetch from real APIs
            const data = this.getMockRaceData();
            
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error('Failed to fetch race data:', error);
            
            // Return cached data if available, even if stale
            if (cached) {
                return { ...cached.data, stale: true };
            }
            
            throw new Error(`Unable to fetch race data: ${error.message}`);
        }
    }

    async getBetfairOdds(marketIds) {
        // Mock Betfair API response
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 200));
            
            return {
                success: true,
                result: marketIds.map(id => ({
                    marketId: id,
                    runners: [
                        { selectionId: 1, fullImage: { availableToBack: [{ price: 2.5, size: 100 }], availableToLay: [{ price: 2.6, size: 150 }] }},
                        { selectionId: 2, fullImage: { availableToBack: [{ price: 3.2, size: 80 }], availableToLay: [{ price: 3.3, size: 120 }] }}
                    ]
                }))
            };
        } catch (error) {
            console.error('Betfair API error:', error);
            throw error;
        }
    }

    async getBookmakerOdds(bookmaker, markets) {
        // Mock bookmaker API responses
        try {
            await new Promise(resolve => setTimeout(resolve, 150));
            
            return {
                success: true,
                bookmaker: bookmaker,
                markets: markets.map(market => ({
                    marketId: market,
                    selections: [
                        { id: 1, odds: 2.4 + Math.random() * 0.4 },
                        { id: 2, odds: 3.1 + Math.random() * 0.6 }
                    ]
                }))
            };
        } catch (error) {
            console.error(`${bookmaker} API error:`, error);
            throw error;
        }
    }

    // Simulate real-time updates
    startRealTimeUpdates(callback, interval = 30000) {
        const updateInterval = setInterval(async () => {
            try {
                // Clear cache to force fresh data
                this.cache.clear();
                const data = await this.getRaceData();
                callback(data);
            } catch (error) {
                console.error('Real-time update failed:', error);
                callback({ error: error.message });
            }
        }, interval);

        return () => clearInterval(updateInterval);
    }

    // Health check for APIs
    async checkAPIHealth() {
        const results = {
            betfair: false,
            skybet: false,
            paddypower: false,
            timestamp: new Date().toISOString()
        };

        // For demo, simulate random API availability
        results.betfair = Math.random() > 0.1; // 90% uptime
        results.skybet = Math.random() > 0.15; // 85% uptime
        results.paddypower = Math.random() > 0.2; // 80% uptime

        return results;
    }

    // Format odds for display
    formatOdds(odds, format = 'decimal') {
        if (!odds || isNaN(odds)) return 'N/A';
        
        switch (format) {
            case 'decimal':
                return odds.toFixed(2);
            case 'fractional':
                const fraction = this.decimalToFractional(odds);
                return fraction;
            case 'american':
                return this.decimalToAmerican(odds);
            default:
                return odds.toFixed(2);
        }
    }

    decimalToFractional(decimal) {
        if (decimal <= 1) return '0/1';
        
        const numerator = Math.round((decimal - 1) * 100);
        const denominator = 100;
        const gcd = this.greatestCommonDivisor(numerator, denominator);
        
        return `${numerator / gcd}/${denominator / gcd}`;
    }

    decimalToAmerican(decimal) {
        if (decimal >= 2) {
            return `+${Math.round((decimal - 1) * 100)}`;
        } else {
            return `-${Math.round(100 / (decimal - 1))}`;
        }
    }

    greatestCommonDivisor(a, b) {
        return b === 0 ? a : this.greatestCommonDivisor(b, a % b);
    }
}

// Export for use in other modules
window.APIManager = APIManager;