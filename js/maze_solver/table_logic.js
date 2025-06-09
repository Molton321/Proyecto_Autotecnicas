// filepath: /home/notmnt903/Documentos/GitHub/Front/js/maze_solver/table_logic.js
let matrixData = null;
let solutionPath = null;
let currentStepIndex = -1; // -1: origin, 0: first step, etc.
let universeInstance = null;

// DOM elements - will be assigned in DOMContentLoaded
let matrixContainer;
let nextStepButton;
let solutionStatusElement;
let jsonFileInput;
let fileNameDisplay;
let loadMatrixButton;

// Function to calculate color based on cost
function getCostColor(cost) {
    // Normalize cost to be within 1-10 for this specific gradient
    const normalizedCost = Math.max(1, Math.min(10, cost));

    // Hue interpolation: Green (120) -> Yellow (60) -> Red (0)
    // Map 1-10 to a 0-1 scale
    const t = (normalizedCost - 1) / (10 - 1); // t is 0 for cost 1, 1 for cost 10

    let hue;
    if (t <= 0.5) { // From Green to Yellow (cost 1 to 5.5)
        hue = 120 - (t * 2) * 60; // t=0 -> hue=120; t=0.5 -> hue=60
    } else { // From Yellow to Red (cost 5.5 to 10)
        hue = 60 - ((t - 0.5) * 2) * 60; // t=0.5 -> hue=60; t=1 -> hue=0
    }
    return `hsl(${hue}, 75%, 55%)`; // Saturation 75%, Lightness 55%
}

// Function to render the matrix in the DOM
function renderMatrix(container, universe) {
    if (!universe || 
        !universe.matriz || 
        typeof universe.matriz.filas !== 'number' || 
        typeof universe.matriz.columnas !== 'number' || 
        universe.matriz.filas <= 0 || 
        universe.matriz.columnas <= 0 ||
        !universe.matrizInicial || // Check for the actual grid data array
        universe.matrizInicial.length !== universe.matriz.filas ||
        (universe.matriz.filas > 0 && universe.matrizInicial[0] && universe.matrizInicial[0].length !== universe.matriz.columnas)
    ) {
        console.error("Datos de matriz inválidos para renderizar. Revisar estructura del JSON y la clase Universe. Universo recibido:", universe);
        container.innerHTML = '<p style="color:red;">Error: Datos de matriz no válidos o inconsistentes.</p>';
        return;
    }
    container.innerHTML = ''; // Clear previous matrix
    const rows = universe.matriz.filas;
    const cols = universe.matriz.columnas;

    const cellSize = 28; // From CSS
    container.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    container.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            cell.classList.add('matrix-cell');
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.innerHTML = ''; // Clear content for icons or text

            let isSpecialIconCell = false;
            let iconPath = null;
            let altText = '';

            if (universe.isBlackHole(i, j)) {
                iconPath = '../assets/icons/black_hole.svg';
                altText = 'Agujero Negro';
                cell.classList.add('black-hole-cell'); // Keep general class if needed
                isSpecialIconCell = true;
            } else if (universe.isGiantStar(i, j)) {
                iconPath = '../assets/icons/star.svg';
                altText = 'Estrella Gigante';
                cell.classList.add('star-cell');
                isSpecialIconCell = true;
            } else if (universe.getWormholeAt(i, j)) {
                iconPath = '../assets/icons/portal.svg';
                altText = 'Agujero de Gusano';
                cell.classList.add('wormhole-cell');
                isSpecialIconCell = true;
            } else if (universe.isRechargeZone(i, j)) {
                iconPath = '../assets/icons/battery.svg';
                altText = 'Zona de Recarga';
                cell.classList.add('recharge-cell');
                isSpecialIconCell = true;
            }

            if (isSpecialIconCell) {
                const img = document.createElement('img');
                img.src = iconPath;
                img.alt = altText;
                img.classList.add('cell-icon');
                cell.appendChild(img);
            } else {
                // Not a special icon cell, check for Origin/Destination or display cost
                if (universe.origen && universe.origen.fila === i && universe.origen.columna === j) {
                    cell.classList.add('origin');
                    cell.textContent = 'O';
                } else if (universe.destino && universe.destino.fila === i && universe.destino.columna === j) {
                    cell.classList.add('destination');
                    cell.textContent = 'D';
                } else {
                    const cost = universe.matrizInicial[i][j];
                    if (typeof cost === 'number') {
                        cell.textContent = cost;
                        if (cost >= 1 && cost <= 10) {
                            cell.style.backgroundColor = getCostColor(cost);
                        } else if (cost === 0) {
                            cell.style.backgroundColor = '#f8f9fa'; // Light grey for 0-cost cells
                        }
                        // Cells with cost > 10 or other non-handled costs will have default background
                    } else {
                        // cell.textContent = '?'; // Fallback for non-numeric cost
                    }
                }
            }
            container.appendChild(cell);
        }
    }
}

// Function to highlight a cell
function highlightCell(row, col, className) {
    const cellElement = matrixContainer.querySelector(`.matrix-cell[data-row="${row}"][data-col="${col}"]`);
    if (cellElement) {
        cellElement.classList.add(className);
    }
}

// Function to clear a cell's highlight
function clearCellHighlight(row, col, className) {
    const cellElement = matrixContainer.querySelector(`.matrix-cell[data-row="${row}"][data-col="${col}"]`);
    if (cellElement) {
        cellElement.classList.remove(className);
    }
}

// Function to handle the "Next Step" button click
function handleNextStep() {
    if (!solutionPath || solutionPath.length === 0) {
        solutionStatusElement.textContent = "No hay solución para mostrar.";
        return;
    }

    // Clear previous step's 'current-step' highlight, mark it as 'path'
    if (currentStepIndex >= 0 && currentStepIndex < solutionPath.length) {
        const prevStep = solutionPath[currentStepIndex];
        clearCellHighlight(prevStep.fila, prevStep.columna, 'current-step');
        highlightCell(prevStep.fila, prevStep.columna, 'path');
    }

    currentStepIndex++;

    if (currentStepIndex < solutionPath.length) {
        const step = solutionPath[currentStepIndex];
        highlightCell(step.fila, step.columna, 'current-step');

        let statusText = `Paso ${currentStepIndex + 1}/${solutionPath.length}: `;
        statusText += `(${step.fila}, ${step.columna}). Carga: ${step.chargeAfterCell.toFixed(2)}. Acción: ${step.action}.`;
        solutionStatusElement.textContent = statusText;

        if (currentStepIndex === solutionPath.length - 1) {
            if (universeInstance.destino && step.fila === universeInstance.destino.fila && step.columna === universeInstance.destino.columna) {
                solutionStatusElement.textContent += " ¡Destino alcanzado!";
            }
            nextStepButton.textContent = "Reiniciar Visualización";
        }
    } else {
        // Reached the end, reset for a new visualization run
        solutionStatusElement.textContent = "Visualización completada. Presiona 'Reiniciar' para ver de nuevo.";
        nextStepButton.textContent = "Reiniciar Visualización";
        currentStepIndex = -1; // Reset index

        // Clear all path and current step highlights
        document.querySelectorAll('.matrix-cell.path, .matrix-cell.current-step').forEach(cell => {
            cell.classList.remove('path');
            cell.classList.remove('current-step');
        });

        // Re-highlight origin for the restart
        if (solutionPath && solutionPath.length > 0) {
            highlightCell(solutionPath[0].fila, solutionPath[0].columna, 'current-step');
            solutionStatusElement.textContent = "Laberinto reiniciado. Presiona 'Paso Siguiente'.";
            nextStepButton.textContent = "Paso Siguiente";
        }
    }
}

// Main function to load data, solve, and initialize UI
async function initializeMazeSolver(file) { // Added file parameter
    if (!file) {
        solutionStatusElement.textContent = "Por favor, selecciona un archivo JSON para cargar.";
        return;
    }
    solutionStatusElement.textContent = "Cargando y procesando laberinto...";
    nextStepButton.disabled = true;
    loadMatrixButton.disabled = true; // Disable while processing

    try {
        const fileContent = await file.text();
        matrixData = JSON.parse(fileContent);
        console.log('Datos de la matriz cargados desde el archivo:', matrixData);

        universeInstance = new Universe(matrixData);
        console.log('Universo inicializado:', universeInstance);

        renderMatrix(matrixContainer, universeInstance);

        const solver = new MazeSolver(universeInstance);
        console.log('Solver inicializado. Resolviendo...');

        solutionPath = solver.solve();
        currentStepIndex = -1; // Reset step index for new matrix

        // Clear previous highlights if any
        document.querySelectorAll('.matrix-cell.path, .matrix-cell.current-step').forEach(cell => {
            cell.classList.remove('path');
            cell.classList.remove('current-step');
        });

        if (solutionPath && solutionPath.length > 0) {
            console.log("Solución encontrada:", solutionPath);
            solutionStatusElement.textContent = "Laberinto cargado. Presiona 'Paso Siguiente' para iniciar.";
            nextStepButton.disabled = false;
            
            if (universeInstance.origen) {
                 highlightCell(universeInstance.origen.fila, universeInstance.origen.columna, 'origin');
            }
            if (universeInstance.destino) {
                highlightCell(universeInstance.destino.fila, universeInstance.destino.columna, 'destination');
            }
            highlightCell(solutionPath[0].fila, solutionPath[0].columna, 'current-step');
            solutionStatusElement.textContent = `Inicio en (${solutionPath[0].fila}, ${solutionPath[0].columna}). Presiona 'Paso Siguiente'.`;
            nextStepButton.textContent = "Paso Siguiente";
        } else {
            console.log("No se encontró solución.");
            solutionStatusElement.textContent = "No se encontró solución para este laberinto.";
            nextStepButton.disabled = true;
        }

    } catch (error) {
        console.error('Error al inicializar el visualizador del laberinto:', error);
        solutionStatusElement.textContent = `Error: ${error.message}`;
        nextStepButton.disabled = true;
    }
    loadMatrixButton.disabled = false; // Re-enable after processing
}

// Event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    matrixContainer = document.getElementById('matrix-container');
    nextStepButton = document.getElementById('next-step-button');
    solutionStatusElement = document.getElementById('solution-status');
    jsonFileInput = document.getElementById('jsonFile');
    fileNameDisplay = document.getElementById('fileName');
    loadMatrixButton = document.getElementById('loadMatrixButton');

    if (!matrixContainer || !nextStepButton || !solutionStatusElement || !jsonFileInput || !fileNameDisplay || !loadMatrixButton) {
        console.error('Error crítico: Uno o más elementos DOM requeridos no se encontraron.');
        document.body.innerHTML = '<p style="color:red; text-align:center; font-size:1.2em; margin-top: 50px;">Error: Faltan componentes esenciales de la página. La aplicación no puede iniciar.</p>';
        return;
    }

    nextStepButton.addEventListener('click', handleNextStep);
    nextStepButton.disabled = true;
    loadMatrixButton.disabled = true;

    jsonFileInput.addEventListener('change', () => {
        if (jsonFileInput.files.length > 0) {
            const file = jsonFileInput.files[0];
            fileNameDisplay.textContent = file.name;
            if (file.type === "application/json") {
                loadMatrixButton.disabled = false;
                solutionStatusElement.textContent = "Archivo seleccionado. Haz clic en 'Cargar y Visualizar'.";
            } else {
                fileNameDisplay.textContent = "Error: El archivo debe ser .json";
                loadMatrixButton.disabled = true;
            }
        } else {
            fileNameDisplay.textContent = "Ningún archivo seleccionado.";
            loadMatrixButton.disabled = true;
        }
    });

    loadMatrixButton.addEventListener('click', () => {
        if (jsonFileInput.files.length > 0) {
            const file = jsonFileInput.files[0];
            if (typeof Universe !== 'undefined' && typeof MazeSolver !== 'undefined') {
                initializeMazeSolver(file); // Pass the selected file
            } else {
                console.error('Clases Universe o MazeSolver no encontradas.');
                solutionStatusElement.textContent = 'Error de carga: Faltan scripts necesarios.';
            }
        }
    });

    // Initial message
    solutionStatusElement.textContent = "Por favor, selecciona un archivo de laberinto .json y haz clic en 'Cargar y Visualizar'.";
});
