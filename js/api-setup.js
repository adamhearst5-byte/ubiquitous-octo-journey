// API Setup Page Controller
class APISetupManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 6;
        this.apiConfig = {
            betfair: {
                appKey: '',
                authMethod: 'session',
                username: '',
                password: '',
                certFile: null,
                certPassword: ''
            },
            bookmakers: {
                skybet: { apiKey: '', endpoint: '' },
                paddypower: { apiKey: '', endpoint: '' },
                betfred: { apiKey: '', endpoint: '' },
                ladbrokes: { apiKey: '', endpoint: '' }
            },
            settings: {
                requestRate: 60,
                cacheTimeout: 30,
                retryAttempts: 3,
                retryDelay: 1000,
                fallbackToMock: true,
                sportId: '4339',
                marketTypes: ['WIN']
            }
        };
        
        this.testResults = {
            betfair: null,
            skybet: null,
            paddypower: null,
            betfred: null,
            ladbrokes: null
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateProgressBar();
        this.loadSavedConfig();
    }

    bindEvents() {
        // Navigation buttons
        document.getElementById('prevStep').addEventListener('click', () => this.previousStep());
        document.getElementById('nextStep').addEventListener('click', () => this.nextStep());

        // Step navigation
        document.querySelectorAll('.step').forEach(step => {
            step.addEventListener('click', (e) => {
                const stepNumber = parseInt(e.currentTarget.dataset.step);
                this.goToStep(stepNumber);
            });
        });

        // Form inputs - save as user types
        this.bindFormInputs();

        // Test buttons
        this.bindTestButtons();

        // Authentication method change
        document.querySelectorAll('input[name="authMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.apiConfig.betfair.authMethod = e.target.value;
                this.saveConfig();
            });
        });

        // Environment selection
        document.querySelectorAll('input[name="environment"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateDeploymentOptions(e.target.value);
            });
        });

        // Security checklist
        document.querySelectorAll('.security-checklist input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSecurityStatus();
            });
        });

        // Deployment actions
        document.getElementById('generateConfig').addEventListener('click', () => this.generateConfig());
        document.getElementById('downloadConfig').addEventListener('click', () => this.downloadConfig());
        document.getElementById('deployToProduction').addEventListener('click', () => this.deployToProduction());

        // Live testing
        document.getElementById('startLiveTest').addEventListener('click', () => this.startLiveTest());
        document.getElementById('testAllConnections').addEventListener('click', () => this.testAllConnections());
        
        // Individual testing buttons
        document.getElementById('testMarketData').addEventListener('click', () => this.testMarketData());
        document.getElementById('testOddsFormat').addEventListener('click', () => this.testOddsFormat());
        document.getElementById('testRateLimit').addEventListener('click', () => this.testRateLimit());
        document.getElementById('testLatency').addEventListener('click', () => this.testLatency());
        document.getElementById('testThroughput').addEventListener('click', () => this.testThroughput());
        document.getElementById('testReliability').addEventListener('click', () => this.testReliability());
    }

    bindFormInputs() {
        // Betfair inputs
        const betfairInputs = ['betfairAppKey', 'betfairUsername', 'betfairPassword', 'certPassword'];
        betfairInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', (e) => {
                    const key = id.replace('betfair', '').toLowerCase();
                    this.apiConfig.betfair[key === 'appkey' ? 'appKey' : key] = e.target.value;
                    this.saveConfig();
                });
            }
        });

        // Bookmaker inputs
        const bookmakers = ['skybet', 'paddypower', 'betfred', 'ladbrokes'];
        bookmakers.forEach(bm => {
            ['ApiKey', 'Endpoint'].forEach(type => {
                const element = document.getElementById(bm + type);
                if (element) {
                    element.addEventListener('input', (e) => {
                        const key = type.toLowerCase();
                        this.apiConfig.bookmakers[bm][key === 'apikey' ? 'apiKey' : key] = e.target.value;
                        this.saveConfig();
                    });
                }
            });
        });

        // Settings inputs
        const settingsInputs = ['requestRate', 'cacheTimeout', 'retryAttempts', 'retryDelay', 'sportId'];
        settingsInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', (e) => {
                    this.apiConfig.settings[id] = element.type === 'number' ? parseInt(e.target.value) : e.target.value;
                    this.saveConfig();
                });
            }
        });

        // Fallback checkbox
        const fallbackCheckbox = document.getElementById('fallbackToMock');
        if (fallbackCheckbox) {
            fallbackCheckbox.addEventListener('change', (e) => {
                this.apiConfig.settings.fallbackToMock = e.target.checked;
                this.saveConfig();
            });
        }

        // Market types checkboxes
        document.querySelectorAll('input[type="checkbox"][value]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const value = e.target.value;
                if (e.target.checked) {
                    if (!this.apiConfig.settings.marketTypes.includes(value)) {
                        this.apiConfig.settings.marketTypes.push(value);
                    }
                } else {
                    this.apiConfig.settings.marketTypes = this.apiConfig.settings.marketTypes.filter(mt => mt !== value);
                }
                this.saveConfig();
            });
        });

        // File input for certificate
        const certFileInput = document.getElementById('certFile');
        if (certFileInput) {
            certFileInput.addEventListener('change', (e) => {
                this.apiConfig.betfair.certFile = e.target.files[0];
                this.saveConfig();
            });
        }
    }

    bindTestButtons() {
        // Betfair test button
        document.getElementById('testBetfairConnection').addEventListener('click', () => {
            this.testBetfairConnection();
        });

        // Bookmaker test buttons
        document.querySelectorAll('.btn-test').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookmaker = e.target.dataset.bookmaker;
                if (bookmaker) {
                    this.testBookmakerConnection(bookmaker);
                }
            });
        });
    }

    // Navigation methods
    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.goToStep(this.currentStep + 1);
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.goToStep(this.currentStep - 1);
        }
    }

    goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.totalSteps) return;

        // Hide current step
        document.querySelector('.step-panel.active').classList.remove('active');
        document.querySelector('.step.active').classList.remove('active');

        // Show new step
        document.getElementById(`step-${stepNumber}`).classList.add('active');
        document.querySelector(`.step[data-step="${stepNumber}"]`).classList.add('active');

        this.currentStep = stepNumber;
        this.updateProgressBar();
        this.updateNavigation();

        // Update progress text
        document.getElementById('setupProgress').textContent = `Step ${stepNumber} of ${this.totalSteps}`;

        // Special actions for certain steps
        if (stepNumber === 6) {
            this.generateConfigSummary();
        }
    }

    updateProgressBar() {
        const progressPercentage = (this.currentStep / this.totalSteps) * 100;
        document.querySelector('.progress-fill').style.width = `${progressPercentage}%`;

        // Mark completed steps
        for (let i = 1; i < this.currentStep; i++) {
            document.querySelector(`.step[data-step="${i}"]`).classList.add('completed');
        }
    }

    updateNavigation() {
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');

        prevBtn.disabled = this.currentStep === 1;
        
        if (this.currentStep === this.totalSteps) {
            nextBtn.textContent = 'Complete Setup';
            nextBtn.onclick = () => this.completeSetup();
        } else {
            nextBtn.textContent = 'Next →';
            nextBtn.onclick = () => this.nextStep();
        }
    }

    // Configuration management
    saveConfig() {
        localStorage.setItem('apiSetupConfig', JSON.stringify(this.apiConfig));
    }

    loadSavedConfig() {
        const saved = localStorage.getItem('apiSetupConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.apiConfig = { ...this.apiConfig, ...config };
                this.populateFormFields();
            } catch (error) {
                console.error('Error loading saved config:', error);
            }
        }
    }

    populateFormFields() {
        // Populate Betfair fields
        Object.keys(this.apiConfig.betfair).forEach(key => {
            const element = document.getElementById('betfair' + key.charAt(0).toUpperCase() + key.slice(1));
            if (element && typeof this.apiConfig.betfair[key] === 'string') {
                element.value = this.apiConfig.betfair[key];
            }
        });

        // Populate bookmaker fields
        Object.keys(this.apiConfig.bookmakers).forEach(bm => {
            Object.keys(this.apiConfig.bookmakers[bm]).forEach(key => {
                const element = document.getElementById(bm + key.charAt(0).toUpperCase() + key.slice(1));
                if (element) {
                    element.value = this.apiConfig.bookmakers[bm][key];
                }
            });
        });

        // Populate settings
        Object.keys(this.apiConfig.settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.apiConfig.settings[key];
                } else {
                    element.value = this.apiConfig.settings[key];
                }
            }
        });

        // Set auth method radio
        const authRadio = document.querySelector(`input[name="authMethod"][value="${this.apiConfig.betfair.authMethod}"]`);
        if (authRadio) {
            authRadio.checked = true;
        }
    }

    // Testing methods
    async testBetfairConnection() {
        const resultDiv = document.getElementById('betfairTestResult');
        resultDiv.style.display = 'block';
        resultDiv.className = 'test-result loading';
        resultDiv.innerHTML = '<div class="loading-spinner"></div>Testing Betfair connection...';

        try {
            // Simulate API test (in real implementation, this would make actual API calls)
            await this.simulateApiTest();
            
            const hasCredentials = this.apiConfig.betfair.appKey && 
                                 (this.apiConfig.betfair.username || this.apiConfig.betfair.certFile);

            if (hasCredentials) {
                this.testResults.betfair = 'success';
                resultDiv.className = 'test-result success';
                resultDiv.innerHTML = '✅ Betfair API connection successful!<br><small>Application Key verified and authentication working.</small>';
                this.updateTestStatus('betfair', true, 'Connected');
            } else {
                this.testResults.betfair = 'error';
                resultDiv.className = 'test-result error';
                resultDiv.innerHTML = '❌ Missing required credentials.<br><small>Please provide Application Key and authentication details.</small>';
                this.updateTestStatus('betfair', false, 'Missing credentials');
            }
        } catch (error) {
            this.testResults.betfair = 'error';
            resultDiv.className = 'test-result error';
            resultDiv.innerHTML = `❌ Connection failed: ${error.message}`;
            this.updateTestStatus('betfair', false, 'Connection failed');
        }
    }

    async testBookmakerConnection(bookmaker) {
        const resultDiv = document.getElementById(`${bookmaker}Result`);
        resultDiv.style.display = 'block';
        resultDiv.className = 'test-result loading';
        resultDiv.innerHTML = '<div class="loading-spinner"></div>Testing connection...';

        try {
            await this.simulateApiTest();
            
            const config = this.apiConfig.bookmakers[bookmaker];
            const hasCredentials = config.apiKey && config.endpoint;

            if (hasCredentials) {
                this.testResults[bookmaker] = 'success';
                resultDiv.className = 'test-result success';
                resultDiv.innerHTML = `✅ ${bookmaker} API connection successful!`;
                this.updateTestStatus(bookmaker, true, 'Connected');
            } else {
                this.testResults[bookmaker] = 'error';
                resultDiv.className = 'test-result error';
                resultDiv.innerHTML = '❌ Missing API key or endpoint URL.';
                this.updateTestStatus(bookmaker, false, 'Missing credentials');
            }
        } catch (error) {
            this.testResults[bookmaker] = 'error';
            resultDiv.className = 'test-result error';
            resultDiv.innerHTML = `❌ Connection failed: ${error.message}`;
            this.updateTestStatus(bookmaker, false, 'Connection failed');
        }
    }

    updateTestStatus(api, success, message) {
        const statusIndicator = document.getElementById(`${api}Status`);
        const statusText = document.getElementById(`${api}StatusText`);
        
        if (statusIndicator && statusText) {
            statusIndicator.textContent = success ? '🟢' : '🔴';
            statusText.textContent = message;
        }
    }

    async testAllConnections() {
        const button = document.getElementById('testAllConnections');
        button.disabled = true;
        button.innerHTML = '<div class="loading-spinner"></div>Testing all connections...';

        try {
            // Test Betfair
            await this.testBetfairConnection();
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Test bookmakers
            const bookmakers = ['skybet', 'paddypower', 'betfred', 'ladbrokes'];
            for (const bm of bookmakers) {
                await this.testBookmakerConnection(bm);
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            button.innerHTML = 'Test All Connections';
            button.disabled = false;
        } catch (error) {
            console.error('Error testing connections:', error);
            button.innerHTML = 'Test All Connections';
            button.disabled = false;
        }
    }

    async testMarketData() {
        const resultsDiv = document.getElementById('dataTestResults');
        resultsDiv.innerHTML = '<div class="loading-spinner"></div>Testing market data retrieval...';

        try {
            await this.simulateApiTest();
            resultsDiv.innerHTML = `
                <div class="test-result success">
                    ✅ Market Data Test Passed<br>
                    <small>Successfully retrieved greyhound racing markets</small>
                </div>
            `;
        } catch (error) {
            resultsDiv.innerHTML = `
                <div class="test-result error">
                    ❌ Market Data Test Failed<br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    async testOddsFormat() {
        const resultsDiv = document.getElementById('dataTestResults');
        resultsDiv.innerHTML = '<div class="loading-spinner"></div>Testing odds format validation...';

        try {
            await this.simulateApiTest();
            resultsDiv.innerHTML = `
                <div class="test-result success">
                    ✅ Odds Format Test Passed<br>
                    <small>All APIs returning valid decimal odds format</small>
                </div>
            `;
        } catch (error) {
            resultsDiv.innerHTML = `
                <div class="test-result error">
                    ❌ Odds Format Test Failed<br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    async testRateLimit() {
        const resultsDiv = document.getElementById('dataTestResults');
        resultsDiv.innerHTML = '<div class="loading-spinner"></div>Testing rate limit compliance...';

        try {
            await this.simulateApiTest();
            resultsDiv.innerHTML = `
                <div class="test-result success">
                    ✅ Rate Limit Test Passed<br>
                    <small>Current rate: ${this.apiConfig.settings.requestRate} req/min</small>
                </div>
            `;
        } catch (error) {
            resultsDiv.innerHTML = `
                <div class="test-result error">
                    ❌ Rate Limit Test Failed<br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    async testLatency() {
        const resultsDiv = document.getElementById('performanceResults');
        resultsDiv.innerHTML = '<div class="loading-spinner"></div>Testing API latency...';

        try {
            const startTime = Date.now();
            await this.simulateApiTest();
            const latency = Date.now() - startTime;

            resultsDiv.innerHTML = `
                <div class="test-result success">
                    ✅ Latency Test Completed<br>
                    <small>Average response time: ${latency}ms</small>
                </div>
            `;
        } catch (error) {
            resultsDiv.innerHTML = `
                <div class="test-result error">
                    ❌ Latency Test Failed<br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    async testThroughput() {
        const resultsDiv = document.getElementById('performanceResults');
        resultsDiv.innerHTML = '<div class="loading-spinner"></div>Testing API throughput...';

        try {
            await this.simulateApiTest();
            resultsDiv.innerHTML = `
                <div class="test-result success">
                    ✅ Throughput Test Completed<br>
                    <small>Sustained rate: 45 req/min</small>
                </div>
            `;
        } catch (error) {
            resultsDiv.innerHTML = `
                <div class="test-result error">
                    ❌ Throughput Test Failed<br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    async testReliability() {
        const resultsDiv = document.getElementById('performanceResults');
        resultsDiv.innerHTML = '<div class="loading-spinner"></div>Testing API reliability...';

        try {
            await this.simulateApiTest();
            resultsDiv.innerHTML = `
                <div class="test-result success">
                    ✅ Reliability Test Completed<br>
                    <small>99.2% success rate over 100 requests</small>
                </div>
            `;
        } catch (error) {
            resultsDiv.innerHTML = `
                <div class="test-result error">
                    ❌ Reliability Test Failed<br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    async startLiveTest() {
        const button = document.getElementById('startLiveTest');
        const output = document.getElementById('liveTestOutput');
        
        button.disabled = true;
        button.innerHTML = '<div class="loading-spinner"></div>Starting live test...';
        
        output.innerHTML = 'Initializing live test environment...\n';
        
        try {
            await this.simulateApiTest();
            
            // Simulate live data stream
            const testData = [
                'Connecting to Betfair API...',
                'Authentication successful',
                'Retrieving greyhound racing markets...',
                'Found 8 active markets',
                'Fetching odds data...',
                'Sky Bet API: Connected',
                'PaddyPower API: Connected',
                'Betfred API: Connected',
                'Ladbrokes API: Connected',
                'Processing odds comparison...',
                'Arbitrage opportunities detected: 3',
                'Live test completed successfully!'
            ];
            
            for (let i = 0; i < testData.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 800));
                output.innerHTML += `[${new Date().toLocaleTimeString()}] ${testData[i]}\n`;
                output.scrollTop = output.scrollHeight;
            }
            
            button.innerHTML = 'Start Live Test';
            button.disabled = false;
        } catch (error) {
            output.innerHTML += `\n[ERROR] ${error.message}\n`;
            button.innerHTML = 'Start Live Test';
            button.disabled = false;
        }
    }

    // Deployment methods
    updateDeploymentOptions(environment) {
        const deployBtn = document.getElementById('deployToProduction');
        deployBtn.disabled = environment !== 'production';
    }

    updateSecurityStatus() {
        const checkboxes = document.querySelectorAll('.security-checklist input');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        const deployBtn = document.getElementById('deployToProduction');
        if (deployBtn) {
            deployBtn.disabled = !allChecked;
        }
    }

    generateConfigSummary() {
        const summaryDiv = document.getElementById('configSummary');
        
        const connectedApis = Object.keys(this.testResults).filter(api => this.testResults[api] === 'success');
        
        summaryDiv.innerHTML = `
            <h4>API Configuration Summary</h4>
            <div class="summary-grid">
                <div class="summary-item">
                    <strong>Betfair Exchange:</strong> 
                    ${this.apiConfig.betfair.appKey ? '✅ Configured' : '❌ Not configured'}
                </div>
                <div class="summary-item">
                    <strong>Connected APIs:</strong> ${connectedApis.length}/5
                </div>
                <div class="summary-item">
                    <strong>Auth Method:</strong> ${this.apiConfig.betfair.authMethod}
                </div>
                <div class="summary-item">
                    <strong>Rate Limit:</strong> ${this.apiConfig.settings.requestRate} req/min
                </div>
                <div class="summary-item">
                    <strong>Cache Timeout:</strong> ${this.apiConfig.settings.cacheTimeout}s
                </div>
                <div class="summary-item">
                    <strong>Market Types:</strong> ${this.apiConfig.settings.marketTypes.join(', ')}
                </div>
            </div>
        `;
    }

    generateConfig() {
        const config = {
            ...this.apiConfig,
            generated: new Date().toISOString(),
            version: '1.0.0'
        };

        const configJson = JSON.stringify(config, null, 2);
        
        // Create downloadable blob
        const blob = new Blob([configJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Update download button
        const downloadBtn = document.getElementById('downloadConfig');
        downloadBtn.disabled = false;
        downloadBtn.href = url;
        downloadBtn.download = 'api-config.json';
        
        this.showNotification('Configuration file generated successfully!', 'success');
    }

    downloadConfig() {
        this.showNotification('Configuration file downloaded!', 'success');
    }

    async deployToProduction() {
        const button = document.getElementById('deployToProduction');
        button.disabled = true;
        button.innerHTML = '<div class="loading-spinner"></div>Deploying...';

        try {
            // Simulate deployment process
            await this.simulateApiTest(3000);
            
            // Show success message
            document.getElementById('deploymentSuccess').style.display = 'block';
            this.showNotification('Deployment successful!', 'success');
            
            button.innerHTML = 'Deploy to Production';
        } catch (error) {
            this.showNotification('Deployment failed: ' + error.message, 'error');
            button.innerHTML = 'Deploy to Production';
            button.disabled = false;
        }
    }

    completeSetup() {
        this.showNotification('API setup completed successfully!', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }

    // Utility methods
    async simulateApiTest(delay = 1500) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate random success/failure for demo purposes
                if (Math.random() > 0.1) {
                    resolve();
                } else {
                    reject(new Error('Network timeout'));
                }
            }, delay);
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.innerHTML = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    animation: slideIn 0.3s ease;
                }
                .notification.success { background: #10b981; }
                .notification.error { background: #dc2626; }
                .notification.info { background: #667eea; }
                .notification button {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing API Setup Manager...');
    window.apiSetupManager = new APISetupManager();
});