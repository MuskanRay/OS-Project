let cpuChart, memoryChart; // Store chart instances for destruction

// Resource Allocation Logic
function allocateResources(cpu, memory) {
    if (cpu > 75 || memory > 4500) {
        return "High Allocation";
    } else if (cpu > 50 || memory > 3000) {
        return "Medium Allocation";
    } else {
        return "Low Allocation";
    }
}

// Load Prediction History
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('predictionHistory') || '[]').slice(-50);
    const historyTable = document.getElementById('historyTable');
    historyTable.innerHTML = '';
    history.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-3">${entry.cpu}</td>
            <td class="p-3">${entry.memory}</td>
            <td class="p-3">${entry.date}</td>
        `;
        historyTable.appendChild(row);
    });
    document.getElementById('clearHistory').classList.toggle('hidden', history.length === 0);
}

// Predict Resources
function predictResources() {
    const cpuInput = document.getElementById('cpuInput').value;
    const memoryInput = document.getElementById('memoryInput').value;
    const errorDiv = document.getElementById('error');
    const successDiv = document.getElementById('success');
    const resultsSection = document.getElementById('resultsSection');
    const chartSection = document.getElementById('chartSection');
    const predictionTable = document.getElementById('predictionTable');
    const predictBtn = document.getElementById('predictBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    const tipsList = document.getElementById('tipsList');
    const summaryText = document.getElementById('summaryText');

    // Disable button and show loading
    predictBtn.disabled = true;
    btnText.innerHTML = 'Predicting...';
    spinner.classList.remove('hidden');
    errorDiv.innerHTML = '';
    successDiv.innerHTML = '';

    setTimeout(() => {
        // Input validation
        if (!cpuInput || !memoryInput || cpuInput < 0 || memoryInput < 0) {
            errorDiv.innerHTML = 'Please enter valid positive numbers for CPU and Memory usage.';
            resultsSection.classList.add('hidden');
            chartSection.classList.add('hidden');
            predictBtn.disabled = false;
            btnText.innerHTML = 'Predict';
            spinner.classList.add('hidden');
            return;
        }

        const cpu = parseFloat(cpuInput);
        const memory = parseFloat(memoryInput);

        if (cpu > 100) {
            errorDiv.innerHTML = 'CPU usage cannot exceed 100%.';
            resultsSection.classList.add('hidden');
            chartSection.classList.add('hidden');
            predictBtn.disabled = false;
            btnText.innerHTML = 'Predict';
            spinner.classList.add('hidden');
            return;
        }

        if (memory > 50000) {
            errorDiv.innerHTML = 'Memory usage cannot exceed 50,000 MB.';
            resultsSection.classList.add('hidden');
            chartSection.classList.add('hidden');
            predictBtn.disabled = false;
            btnText.innerHTML = 'Predict';
            spinner.classList.add('hidden');
            return;
        }

        if (cpu < 5 || cpu > 95) {
            errorDiv.innerHTML = 'Warning: CPU usage is unusually low or high.';
        }

        // Clear previous results
        predictionTable.innerHTML = '';
        tipsList.innerHTML = '';
        summaryText.innerHTML = '';
        resultsSection.classList.remove('hidden');
        chartSection.classList.remove('hidden');

        // Predict for days 2 to 11
        const futureDays = Array.from({length: 10}, (_, i) => i + 2);
        const predictedCpu = futureDays.map(day => cpu + (day - 1) * 0.2);
        const predictedMemory = futureDays.map(day => memory + (day - 1) * 5);

        // Generate allocations and collect metrics
        const allocations = predictedCpu.map((cpu, i) => allocateResources(cpu, predictedMemory[i]));
        const maxCpu = Math.max(...predictedCpu);
        const maxMemory = Math.max(...predictedMemory);
        const highAllocationDay = allocations.indexOf('High Allocation') + 2;
        const allocationCounts = allocations.reduce((acc, alloc) => {
            acc[alloc] = (acc[alloc] || 0) + 1;
            return acc;
        }, {});
        const dominantAllocation = Object.entries(allocationCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

        // Populate prediction table
        futureDays.forEach((day, i) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-3">${day}</td>
                <td class="p-3">${predictedCpu[i].toFixed(2)}</td>
                <td class="p-3">${predictedMemory[i].toFixed(2)}</td>
                <td class="p-3">${allocations[i]}</td>
            `;
            predictionTable.appendChild(row);
        });

        // Generate tips based on highest allocation
        const tips = [];
        if (allocations.includes('High Allocation')) {
            tips.push('Scale up resources (e.g., add CPU cores or RAM) to handle high usage.');
            tips.push('Optimize processes to reduce CPU or memory load (e.g., close unnecessary tasks, optimize code).');
            tips.push('Set alerts for CPU > 80% or memory nearing system limits to prevent slowdowns.');
        } else if (allocations.includes('Medium Allocation')) {
            tips.push('Monitor usage closely using tools like Task Manager or htop to catch spikes.');
            tips.push('Consider optimizing background processes or scheduling maintenance to prevent reaching High Allocation.');
            tips.push('Review prediction history to identify usage trends over time.');
        } else {
            tips.push('Consider downscaling resources (e.g., use a smaller cloud instance) to save costs.');
            tips.push('Maintain current setup, but monitor for unexpected usage increases.');
            tips.push('Use history tracking to confirm consistently low usage.');
        }
        tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            tipsList.appendChild(li);
        });

        // Generate summary
        summaryText.innerHTML = `
            Maximum CPU Usage: ${maxCpu.toFixed(2)}% on Day ${futureDays[predictedCpu.indexOf(maxCpu)]}<br>
            Maximum Memory Usage: ${maxMemory.toFixed(2)} MB on Day ${futureDays[predictedMemory.indexOf(maxMemory)]}<br>
            ${highAllocationDay < 12 ? `High Allocation reached on Day ${highAllocationDay}` : 'No High Allocation predicted in 10 days'}<br>
            Dominant Allocation: ${dominantAllocation}
        `;

        // Destroy old charts
        if (cpuChart) cpuChart.destroy();
        if (memoryChart) memoryChart.destroy();

        // CPU Chart
        cpuChart = new Chart(document.getElementById('cpuPredictionChart'), {
            type: 'line',
            data: {
                labels: futureDays,
                datasets: [{
                    label: 'Predicted CPU Usage (%)',
                    data: predictedCpu,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: { title: { display: true, text: 'Day' } },
                    y: {
                        title: { display: true, text: 'CPU Usage (%)' },
                        min: Math.max(0, Math.min(...predictedCpu) - 5),
                        max: Math.min(100, Math.max(...predictedCpu) + 5)
                    }
                }
            }
        });

        // Memory Chart
        memoryChart = new Chart(document.getElementById('memoryPredictionChart'), {
            type: 'line',
            data: {
                labels: futureDays,
                datasets: [{
                    label: 'Predicted Memory Usage (MB)',
                    data: predictedMemory,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: { title: { display: true, text: 'Day' } },
                    y: {
                        title: { display: true, text: 'Memory Usage (MB)' },
                        min: Math.max(0, Math.min(...predictedMemory) - 50),
                        max: Math.max(...predictedMemory) + 50
                    }
                }
            }
        });

        // Save to history
        const history = JSON.parse(localStorage.getItem('predictionHistory') || '[]');
        history.push({
            cpu: cpu.toFixed(2),
            memory: cpu.toFixed(2),
            date: new Date().toLocaleString()
        });
        localStorage.setItem('predictionHistory', JSON.stringify(history.slice(-50)));
        loadHistory();

        // Show success message
        successDiv.innerHTML = 'Predictions generated successfully!';
        setTimeout(() => successDiv.innerHTML = '', 3000);

        // Reset button
        predictBtn.disabled = false;
        btnText.innerHTML = 'Predict';
        spinner.classList.add('hidden');
    }, 500);
}

// Clear History
document.getElementById('clearHistory').onclick = () => {
    localStorage.removeItem('predictionHistory');
    loadHistory();
};

// Load history on page load
loadHistory();