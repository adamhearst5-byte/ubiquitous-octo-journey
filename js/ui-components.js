// UI Components and Rendering
class UIComponents {
    constructor() {
        this.elements = {
            raceContainer: document.getElementById('raceContainer'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            errorMessage: document.getElementById('errorMessage'),
            noDataMessage: document.getElementById('noDataMessage'),
            connectionStatus: document.getElementById('connectionStatus'),
            lastUpdate: document.getElementById('lastUpdate'),
            trackFilter: document.getElementById('trackFilter'),
            timeFilter: document.getElementById('timeFilter'),
            toggleArbitrage: document.getElementById('toggleArbitrage'),
            toggleLayout: document.getElementById('toggleLayout'),
            refreshBtn: document.getElementById('refreshBtn'),
            retryBtn: document.getElementById('retryBtn')
        };
        
        this.state = {
            showOnlyArbitrage: false,
            gridView: false,
            selectedTrack: '',
            selectedTime: 'all'
        };
        
        this.oddsCalculator = new OddsCalculator();
        this.bindEvents();
    }

    bindEvents() {
        // Filter controls
        this.elements.trackFilter.addEventListener('change', (e) => {
            this.state.selectedTrack = e.target.value;
            this.filterRaces();
        });

        this.elements.timeFilter.addEventListener('change', (e) => {
            this.state.selectedTime = e.target.value;
            this.filterRaces();
        });

        // View controls
        this.elements.toggleArbitrage.addEventListener('click', () => {
            this.state.showOnlyArbitrage = !this.state.showOnlyArbitrage;
            this.elements.toggleArbitrage.classList.toggle('active');
            this.elements.toggleArbitrage.textContent = 
                this.state.showOnlyArbitrage ? 'Show All Races' : 'Show Only Arbitrage';
            this.filterRaces();
        });

        this.elements.toggleLayout.addEventListener('click', () => {
            this.state.gridView = !this.state.gridView;
            this.elements.toggleLayout.classList.toggle('active');
            this.elements.toggleLayout.textContent = 
                this.state.gridView ? 'List View' : 'Grid View';
            this.elements.raceContainer.classList.toggle('grid-layout', this.state.gridView);
        });

        // Refresh button
        this.elements.refreshBtn.addEventListener('click', () => {
            window.app?.refreshData();
        });

        // Retry button
        this.elements.retryBtn.addEventListener('click', () => {
            window.app?.retryConnection();
        });
    }

    showLoading() {
        this.hideAllStates();
        this.elements.loadingIndicator.classList.remove('hidden');
    }

    showError(message) {
        this.hideAllStates();
        this.elements.errorMessage.classList.remove('hidden');
        document.getElementById('errorText').textContent = message;
    }

    showNoData() {
        this.hideAllStates();
        this.elements.noDataMessage.classList.remove('hidden');
    }

    showRaces() {
        this.hideAllStates();
        this.elements.raceContainer.classList.remove('hidden');
    }

    hideAllStates() {
        this.elements.loadingIndicator.classList.add('hidden');
        this.elements.errorMessage.classList.add('hidden');
        this.elements.noDataMessage.classList.add('hidden');
        this.elements.raceContainer.classList.add('hidden');
    }

    updateConnectionStatus(status) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        statusDot.className = 'status-dot';
        
        switch (status) {
            case 'connected':
                statusDot.classList.add('connected');
                statusText.textContent = 'Connected';
                break;
            case 'connecting':
                statusText.textContent = 'Connecting...';
                break;
            case 'disconnected':
                statusDot.classList.add('disconnected');
                statusText.textContent = 'Disconnected';
                break;
            default:
                statusText.textContent = 'Unknown';
        }
    }

    updateLastUpdate() {
        this.elements.lastUpdate.textContent = new Date().toLocaleTimeString();
    }

    populateTrackFilter(races) {
        const tracks = [...new Set(races.map(race => race.track))].sort();
        
        // Clear existing options except "All Tracks"
        this.elements.trackFilter.innerHTML = '<option value="">All Tracks</option>';
        
        tracks.forEach(track => {
            const option = document.createElement('option');
            option.value = track;
            option.textContent = track;
            this.elements.trackFilter.appendChild(option);
        });
    }

    renderRaces(races) {
        if (!races || races.length === 0) {
            this.showNoData();
            return;
        }

        this.populateTrackFilter(races);
        
        const container = this.elements.raceContainer;
        container.innerHTML = '';

        races.forEach(race => {
            const raceCard = this.createRaceCard(race);
            container.appendChild(raceCard);
        });

        this.showRaces();
        this.filterRaces();
    }

    createRaceCard(race) {
        const arbitrageOpportunities = this.oddsCalculator.calculateArbitrage(race);
        const hasArbitrage = arbitrageOpportunities.length > 0;
        
        const card = document.createElement('div');
        card.className = `race-card ${hasArbitrage ? 'arbitrage-opportunity' : ''}`;
        card.dataset.track = race.track;
        card.dataset.time = race.time;
        card.dataset.hasArbitrage = hasArbitrage;

        const raceTime = new Date(race.time);
        const timeUntilRace = this.getTimeUntilRace(raceTime);

        card.innerHTML = `
            <div class="race-header">
                <div class="race-info">
                    <h3>${race.track} - ${race.distance}m</h3>
                    <div class="race-time">
                        🕐 ${raceTime.toLocaleTimeString()} 
                        <span class="time-until">(${timeUntilRace})</span>
                    </div>
                </div>
                <div class="race-distance">
                    ${race.type} - ${race.distance}m
                    ${hasArbitrage ? '<span class="arbitrage-badge">💰 ARBITRAGE</span>' : ''}
                </div>
            </div>
            
            <div class="odds-section">
                ${this.createOddsTable(race)}
            </div>
            
            ${hasArbitrage ? this.createArbitrageAlert(arbitrageOpportunities) : ''}
        `;

        return card;
    }

    createOddsTable(race) {
        const bookmakers = ['Betfair (Back)', 'Betfair (Lay)', 'Sky Bet', 'PaddyPower', 'Betfred', 'Ladbrokes'];
        
        let tableHTML = `
            <table class="odds-table">
                <thead>
                    <tr>
                        <th>Dog</th>
                        ${bookmakers.map(bm => `<th>${bm}</th>`).join('')}
                        <th>Best</th>
                    </tr>
                </thead>
                <tbody>
        `;

        race.dogs.forEach(dog => {
            const bestOdds = this.oddsCalculator.findBestOdds(dog.odds);
            
            tableHTML += `
                <tr>
                    <td class="dog-info">
                        <span class="trap-number trap-${dog.trap}">${dog.trap}</span>
                        <span class="dog-name">${dog.name}</span>
                    </td>
                    <td class="odds-cell">
                        <div class="odds-value ${this.isCompetitiveOdds(dog.odds.betfair?.back, bestOdds.value) ? 'best-odds' : ''}">
                            ${this.formatOddsDisplay(dog.odds.betfair?.back)}
                        </div>
                    </td>
                    <td class="odds-cell">
                        <div class="odds-value">
                            ${this.formatOddsDisplay(dog.odds.betfair?.lay)}
                        </div>
                    </td>
                    <td class="odds-cell">
                        <div class="odds-value ${dog.odds.skybet === bestOdds.value ? 'best-odds' : ''}">
                            ${this.formatOddsDisplay(dog.odds.skybet)}
                        </div>
                    </td>
                    <td class="odds-cell">
                        <div class="odds-value ${dog.odds.paddypower === bestOdds.value ? 'best-odds' : ''}">
                            ${this.formatOddsDisplay(dog.odds.paddypower)}
                        </div>
                    </td>
                    <td class="odds-cell">
                        <div class="odds-value ${dog.odds.betfred === bestOdds.value ? 'best-odds' : ''}">
                            ${this.formatOddsDisplay(dog.odds.betfred)}
                        </div>
                    </td>
                    <td class="odds-cell">
                        <div class="odds-value ${dog.odds.ladbrokes === bestOdds.value ? 'best-odds' : ''}">
                            ${this.formatOddsDisplay(dog.odds.ladbrokes)}
                        </div>
                    </td>
                    <td class="odds-cell best-odds-cell">
                        <div class="odds-value best-odds">
                            ${bestOdds.value > 0 ? bestOdds.value.toFixed(2) : 'N/A'}
                        </div>
                        ${bestOdds.bookmaker ? `<div class="bookmaker-name">${this.formatBookmakerName(bestOdds.bookmaker)}</div>` : ''}
                    </td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        return tableHTML;
    }

    createArbitrageAlert(opportunities) {
        let alertHTML = '<div class="arbitrage-alert"><h4>🚨 Arbitrage Opportunities</h4><ul>';
        
        opportunities.forEach(opp => {
            switch (opp.type) {
                case 'betfair_back_lay':
                    alertHTML += `
                        <li>
                            <strong>${opp.dog}</strong> (Trap ${opp.trap}): 
                            Back ${opp.backOdds} / Lay ${opp.layOdds} 
                            <span class="profit">+${opp.margin.toFixed(2)}%</span>
                        </li>
                    `;
                    break;
                case 'bookmaker_betfair':
                    alertHTML += `
                        <li>
                            <strong>${opp.dog}</strong> (Trap ${opp.trap}): 
                            ${this.formatBookmakerName(opp.bookmaker)} ${opp.bookmakerOdds} vs Betfair Lay ${opp.betfairLayOdds} 
                            <span class="profit">+${opp.profit.toFixed(2)}%</span>
                        </li>
                    `;
                    break;
            }
        });
        
        alertHTML += '</ul></div>';
        return alertHTML;
    }

    formatOddsDisplay(odds) {
        if (!odds || odds <= 0) return 'N/A';
        return odds.toFixed(2);
    }

    formatBookmakerName(bookmaker) {
        const names = {
            'skybet': 'Sky Bet',
            'paddypower': 'PaddyPower',
            'betfred': 'Betfred',
            'ladbrokes': 'Ladbrokes',
            'betfair': 'Betfair'
        };
        return names[bookmaker] || bookmaker;
    }

    isCompetitiveOdds(odds, bestOdds) {
        if (!odds || !bestOdds) return false;
        return Math.abs(odds - bestOdds) < 0.1; // Within 0.1 of best odds
    }

    getTimeUntilRace(raceTime) {
        const now = new Date();
        const diff = raceTime - now;
        
        if (diff < 0) return 'Started';
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m`;
        }
    }

    filterRaces() {
        const raceCards = document.querySelectorAll('.race-card');
        const now = new Date();
        
        raceCards.forEach(card => {
            let show = true;
            
            // Track filter
            if (this.state.selectedTrack && card.dataset.track !== this.state.selectedTrack) {
                show = false;
            }
            
            // Time filter
            if (this.state.selectedTime !== 'all') {
                const raceTime = new Date(card.dataset.time);
                const timeDiff = raceTime - now;
                
                switch (this.state.selectedTime) {
                    case 'next-hour':
                        if (timeDiff > 3600000) show = false; // 1 hour
                        break;
                    case 'next-30min':
                        if (timeDiff > 1800000) show = false; // 30 minutes
                        break;
                }
            }
            
            // Arbitrage filter
            if (this.state.showOnlyArbitrage && card.dataset.hasArbitrage !== 'true') {
                show = false;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    }

    // Utility method to create toast notifications
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            zIndex: '10000',
            minWidth: '250px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        // Set background color based on type
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };
        toast.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Add CSS for grid layout
    addGridLayoutStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .race-container.grid-layout {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
                gap: 20px;
            }
            
            .arbitrage-alert {
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin-top: 15px;
            }
            
            .arbitrage-alert h4 {
                margin-bottom: 10px;
                font-size: 1.1rem;
            }
            
            .arbitrage-alert ul {
                list-style: none;
                margin: 0;
                padding: 0;
            }
            
            .arbitrage-alert li {
                margin-bottom: 8px;
                padding: 8px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
            }
            
            .profit {
                float: right;
                font-weight: bold;
                background: rgba(255,255,255,0.2);
                padding: 2px 8px;
                border-radius: 12px;
            }
            
            .arbitrage-badge {
                background: #4CAF50;
                color: white;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: bold;
                margin-left: 10px;
            }
            
            .best-odds-cell {
                background: #f0f8ff;
                font-weight: bold;
            }
            
            .bookmaker-name {
                font-size: 0.7rem;
                color: #666;
                text-transform: uppercase;
                margin-top: 2px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Export for use in other modules
window.UIComponents = UIComponents;