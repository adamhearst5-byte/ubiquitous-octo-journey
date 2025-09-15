// Main Application Controller
class GreyhoundOddsApp {
    constructor() {
        this.apiManager = new APIManager();
        this.oddsCalculator = new OddsCalculator();
        this.ui = new UIComponents();
        
        this.state = {
            races: [],
            lastUpdate: null,
            isConnected: false,
            updateInterval: null,
            retryCount: 0,
            maxRetries: 5
        };
        
        this.config = {
            refreshInterval: 30000, // 30 seconds
            retryDelay: 5000, // 5 seconds
            maxDataAge: 300000 // 5 minutes
        };
        
        this.init();
    }

    async init() {
        console.log('Initializing Greyhound Odds Comparison App...');
        
        // Add grid layout styles
        this.ui.addGridLayoutStyles();
        
        // Set up error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.handleError(e.error);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.handleError(e.reason);
        });
        
        // Start the application
        await this.start();
    }

    async start() {
        this.ui.showLoading();
        this.ui.updateConnectionStatus('connecting');
        
        try {
            await this.loadInitialData();
            this.startRealTimeUpdates();
            this.ui.updateConnectionStatus('connected');
            this.state.isConnected = true;
            this.state.retryCount = 0;
            
            this.ui.showToast('Connected successfully! Live odds updating...', 'success');
            
        } catch (error) {
            console.error('Failed to start application:', error);
            this.handleError(error);
        }
    }

    async loadInitialData() {
        try {
            console.log('Loading initial race data...');
            const response = await this.apiManager.getRaceData();
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.state.races = response.data || [];
            this.state.lastUpdate = new Date();
            
            if (this.state.races.length === 0) {
                this.ui.showNoData();
            } else {
                this.ui.renderRaces(this.state.races);
                this.ui.updateLastUpdate();
                this.analyzeMarkets();
            }
            
            // Log loaded data for debugging
            console.log(`Loaded ${this.state.races.length} races from ${new Set(this.state.races.map(r => r.track)).size} tracks`);
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            throw error;
        }
    }

    startRealTimeUpdates() {
        // Clear any existing interval
        if (this.state.updateInterval) {
            clearInterval(this.state.updateInterval);
        }
        
        console.log(`Starting real-time updates every ${this.config.refreshInterval / 1000} seconds`);
        
        this.state.updateInterval = setInterval(async () => {
            try {
                await this.updateData();
            } catch (error) {
                console.error('Update failed:', error);
                this.handleUpdateError(error);
            }
        }, this.config.refreshInterval);
    }

    async updateData() {
        try {
            const response = await this.apiManager.getRaceData();
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            const newRaces = response.data || [];
            
            // Check if data has changed
            const hasChanges = this.hasSignificantChanges(this.state.races, newRaces);
            
            if (hasChanges) {
                console.log('Significant changes detected, updating UI');
                this.state.races = newRaces;
                this.ui.renderRaces(this.state.races);
                this.analyzeMarkets();
                
                // Show notification for new arbitrage opportunities
                this.checkForNewArbitrageOpportunities(newRaces);
            }
            
            this.state.lastUpdate = new Date();
            this.ui.updateLastUpdate();
            
            // Update connection status if previously disconnected
            if (!this.state.isConnected) {
                this.state.isConnected = true;
                this.ui.updateConnectionStatus('connected');
                this.ui.showToast('Connection restored!', 'success');
                this.state.retryCount = 0;
            }
            
        } catch (error) {
            throw error;
        }
    }

    hasSignificantChanges(oldRaces, newRaces) {
        if (!oldRaces || !newRaces) return true;
        if (oldRaces.length !== newRaces.length) return true;
        
        // Check for odds changes > 5%
        for (let i = 0; i < Math.min(oldRaces.length, newRaces.length); i++) {
            const oldRace = oldRaces[i];
            const newRace = newRaces[i];
            
            if (oldRace.id !== newRace.id) return true;
            
            for (let j = 0; j < oldRace.dogs.length; j++) {
                const oldDog = oldRace.dogs[j];
                const newDog = newRace.dogs[j];
                
                if (this.hasSignificantOddsChange(oldDog.odds, newDog.odds)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    hasSignificantOddsChange(oldOdds, newOdds) {
        const threshold = 0.05; // 5% change threshold
        
        const bookmakers = ['skybet', 'paddypower', 'betfred', 'ladbrokes'];
        
        for (const bookmaker of bookmakers) {
            const oldValue = oldOdds[bookmaker];
            const newValue = newOdds[bookmaker];
            
            if (oldValue && newValue) {
                const change = Math.abs(oldValue - newValue) / oldValue;
                if (change > threshold) return true;
            }
        }
        
        // Check Betfair odds
        if (oldOdds.betfair && newOdds.betfair) {
            const backChange = Math.abs(oldOdds.betfair.back - newOdds.betfair.back) / oldOdds.betfair.back;
            const layChange = Math.abs(oldOdds.betfair.lay - newOdds.betfair.lay) / oldOdds.betfair.lay;
            
            if (backChange > threshold || layChange > threshold) return true;
        }
        
        return false;
    }

    checkForNewArbitrageOpportunities(races) {
        const allOpportunities = [];
        
        races.forEach(race => {
            const opportunities = this.oddsCalculator.calculateArbitrage(race);
            allOpportunities.push(...opportunities);
        });
        
        if (allOpportunities.length > 0) {
            const bestOpportunity = allOpportunities.reduce((best, current) => {
                const currentProfit = current.margin || current.profit || 0;
                const bestProfit = best.margin || best.profit || 0;
                return currentProfit > bestProfit ? current : best;
            });
            
            this.ui.showToast(
                `New arbitrage: ${bestOpportunity.dog} - ${(bestOpportunity.margin || bestOpportunity.profit).toFixed(2)}% profit!`,
                'warning'
            );
        }
    }

    analyzeMarkets() {
        console.log('Analyzing markets for opportunities...');
        
        let totalArbitrageOpportunities = 0;
        let totalValueBets = 0;
        
        this.state.races.forEach(race => {
            const arbitrageOpportunities = this.oddsCalculator.calculateArbitrage(race);
            const valueBets = this.oddsCalculator.findValueBets(race);
            const efficiency = this.oddsCalculator.calculateMarketEfficiency(race);
            
            totalArbitrageOpportunities += arbitrageOpportunities.length;
            totalValueBets += valueBets.length;
            
            console.log(`${race.track} - ${race.distance}m: ${arbitrageOpportunities.length} arbitrage, ${valueBets.length} value bets, ${efficiency.efficiency}% efficient`);
        });
        
        console.log(`Total: ${totalArbitrageOpportunities} arbitrage opportunities, ${totalValueBets} value bets across ${this.state.races.length} races`);
    }

    handleError(error) {
        console.error('Application error:', error);
        
        this.state.isConnected = false;
        this.ui.updateConnectionStatus('disconnected');
        
        const errorMessage = error.message || 'An unexpected error occurred';
        this.ui.showError(errorMessage);
        
        // Don't show error toast for initial load failures
        if (this.state.lastUpdate) {
            this.ui.showToast('Connection lost. Retrying...', 'error');
        }
    }

    handleUpdateError(error) {
        this.state.retryCount++;
        
        if (this.state.retryCount >= this.config.maxRetries) {
            console.error('Max retries reached, stopping updates');
            this.stopRealTimeUpdates();
            this.handleError(new Error('Connection lost - max retries exceeded'));
            return;
        }
        
        console.log(`Update failed (attempt ${this.state.retryCount}/${this.config.maxRetries}), retrying...`);
        this.state.isConnected = false;
        this.ui.updateConnectionStatus('connecting');
    }

    stopRealTimeUpdates() {
        if (this.state.updateInterval) {
            clearInterval(this.state.updateInterval);
            this.state.updateInterval = null;
            console.log('Real-time updates stopped');
        }
    }

    async refreshData() {
        console.log('Manual refresh requested');
        this.ui.showToast('Refreshing data...', 'info');
        
        try {
            this.ui.updateConnectionStatus('connecting');
            await this.updateData();
            this.ui.showToast('Data refreshed successfully!', 'success');
        } catch (error) {
            console.error('Manual refresh failed:', error);
            this.ui.showToast('Refresh failed. Please try again.', 'error');
            this.handleError(error);
        }
    }

    async retryConnection() {
        console.log('Retry connection requested');
        this.state.retryCount = 0;
        
        try {
            await this.start();
        } catch (error) {
            console.error('Retry failed:', error);
            this.ui.showToast('Retry failed. Please check your connection.', 'error');
        }
    }

    // Utility methods for external access
    getCurrentRaces() {
        return this.state.races;
    }

    getConnectionStatus() {
        return this.state.isConnected;
    }

    getLastUpdate() {
        return this.state.lastUpdate;
    }

    // Method to export data for analysis
    exportData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            races: this.state.races,
            arbitrageOpportunities: [],
            valueBets: [],
            marketEfficiency: []
        };
        
        this.state.races.forEach(race => {
            exportData.arbitrageOpportunities.push(...this.oddsCalculator.calculateArbitrage(race));
            exportData.valueBets.push(...this.oddsCalculator.findValueBets(race));
            exportData.marketEfficiency.push({
                raceId: race.id,
                ...this.oddsCalculator.calculateMarketEfficiency(race)
            });
        });
        
        return exportData;
    }

    // Cleanup method
    destroy() {
        this.stopRealTimeUpdates();
        console.log('Application destroyed');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting Greyhound Odds Comparison App');
    
    // Make app globally accessible for debugging
    window.app = new GreyhoundOddsApp();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'r':
                    e.preventDefault();
                    window.app.refreshData();
                    break;
                case 'e':
                    e.preventDefault();
                    console.log('Export data:', window.app.exportData());
                    break;
            }
        }
    });
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Page hidden, pausing updates');
            window.app.stopRealTimeUpdates();
        } else {
            console.log('Page visible, resuming updates');
            window.app.startRealTimeUpdates();
            window.app.refreshData(); // Refresh immediately when page becomes visible
        }
    });
    
    // Handle online/offline events
    window.addEventListener('online', () => {
        console.log('Connection restored');
        window.app.retryConnection();
    });
    
    window.addEventListener('offline', () => {
        console.log('Connection lost');
        window.app.handleError(new Error('Internet connection lost'));
    });
    
    // Mobile menu functionality
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const filterControls = document.getElementById('filterControls');
    const viewControls = document.getElementById('viewControls');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuToggle.classList.toggle('active');
            filterControls.classList.toggle('show');
            viewControls.classList.toggle('show');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.controls')) {
                mobileMenuToggle.classList.remove('active');
                filterControls.classList.remove('show');
                viewControls.classList.remove('show');
            }
        });
        
        // Close mobile menu when window is resized to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                mobileMenuToggle.classList.remove('active');
                filterControls.classList.remove('show');
                viewControls.classList.remove('show');
            }
        });
    }
});

// Export for use in other modules
window.GreyhoundOddsApp = GreyhoundOddsApp;